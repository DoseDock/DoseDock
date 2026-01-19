# Hardware Integration Guide

This document explains how the software application connects to the Raspberry Pi hardware system described in the flowchart.

## Overview

The software provides:
- **GraphQL API** (Go backend) - Database with schedules, medications, and dispense events
- **`dueNow` Endpoint** - Server-side RRULE expansion that returns medications due RIGHT NOW
- **Event Tracking** - Records of all dispense attempts and outcomes

The Raspberry Pi hardware needs to:
- Query `dueNow` every minute (backend handles all RRULE logic)
- Control hardware (motors, trapdoors, sensors)
- Record dispense events via `recordDispenseAction`
- Send notifications

## Quick Start - Firmware Endpoint

**The firmware only needs ONE query to check for due medications:**

```graphql
query DueNow($patientId: ID!) {
  dueNow(patientId: $patientId) {
    schedule {
      id
      title
    }
    dueAtISO
    medications {
      medication {
        id
        name
      }
      qty
      siloSlot           # Which physical silo (0-9)
      hardwareProfile    # Full hardware config JSON
    }
  }
}
```

**Response when medication is due:**
```json
{
  "data": {
    "dueNow": [
      {
        "schedule": { "id": "schedule_123", "title": "Morning Meds" },
        "dueAtISO": "2024-01-15T08:00:00Z",
        "medications": [
          {
            "medication": { "id": "med_456", "name": "Aspirin" },
            "qty": 2,
            "siloSlot": 3,
            "hardwareProfile": {
              "siloSlot": 3,
              "trapdoorOpenMs": 1000,
              "trapdoorHoldMs": 500
            }
          }
        ]
      }
    ]
  }
}
```

**Response when nothing is due:**
```json
{
  "data": {
    "dueNow": []
  }
}
```

## Integration Flow

### 1. **Every 1 Minute: Query `dueNow` Endpoint**

**Raspberry Pi Action:**
```python
#!/usr/bin/env python3
import requests
import json
import time
from datetime import datetime

GRAPHQL_URL = "http://localhost:8081/query"  # Your backend URL
PATIENT_ID = "patient_demo_001"

# Simple query - backend handles all RRULE expansion
QUERY_DUE_NOW = """
query DueNow($patientId: ID!, $windowMinutes: Int) {
  dueNow(patientId: $patientId, windowMinutes: $windowMinutes) {
    schedule {
      id
      title
      lockoutMinutes
    }
    dueAtISO
    medications {
      medication {
        id
        name
        cartridgeIndex
      }
      qty
      siloSlot
      hardwareProfile
    }
  }
}
"""

def check_due_medications():
    response = requests.post(GRAPHQL_URL, json={
        "query": QUERY_DUE_NOW,
        "variables": {
            "patientId": PATIENT_ID,
            "windowMinutes": 1  # ±1 minute window (default)
        }
    })
    data = response.json()
    return data.get("data", {}).get("dueNow", [])
```

**What the Software Provides:**
- `dueNow(patientId, windowMinutes)` - Returns schedules due within ±N minutes of now
- Server-side RRULE expansion (firmware doesn't need any RRULE library)
- Pre-extracted `siloSlot` and `hardwareProfile` for easy hardware control
- Only returns `ACTIVE` schedules within their valid date range

### 2. **Dispense Logic - Backend Does the Time Check**

**Raspberry Pi Logic (Simplified):**
```python
def main_loop():
    while True:
        # Backend handles all time/RRULE logic - just check if array is non-empty
        due_schedules = check_due_medications()

        for due in due_schedules:
            print(f"⏰ Schedule '{due['schedule']['title']}' is DUE!")
            dispense_medication(due)

        time.sleep(60)  # Poll every minute
```

**What the Software Provides:**
- `dueNow` returns an EMPTY array if nothing is due
- `dueNow` returns schedules with medications if something IS due
- No client-side time comparison needed - the backend already checked

### 3. **Activate Hardware and Dispense**

**Raspberry Pi Action:**
```python
def dispense_medication(due_schedule):
    """Execute the dispense sequence for a due schedule."""
    schedule = due_schedule['schedule']
    due_time = due_schedule['dueAtISO']

    # For each medication in the schedule
    for med in due_schedule['medications']:
        medication = med['medication']
        qty = med['qty']
        silo_slot = med['siloSlot']  # Pre-extracted by backend!
        hardware_profile = med['hardwareProfile'] or {}

        trapdoor_ms = hardware_profile.get('trapdoorOpenMs', 1000)

        print(f"💊 Dispensing {qty}x {medication['name']} from silo {silo_slot}")

        # Activate vibration motors
        activate_vibration_motors()

        # Wait for pills to settle
        time.sleep(60)

        # Dispense each pill
        for i in range(qty):
            open_trapdoor(silo_slot, trapdoor_ms)

            # Check beam sensor
            if check_beam_sensor():
                close_trapdoor(silo_slot)
                print(f"✅ Pill {i+1}/{qty} detected")
            else:
                close_trapdoor(silo_slot)
                print(f"⚠️ Pill {i+1}/{qty} NOT detected")

        stop_vibration_motors()

    # Record the result
    record_dispense_action(schedule['id'], due_time, success=True)
```

**What the Backend Provides in `dueNow` Response:**
- `medications[].siloSlot` - Pre-extracted silo slot (0-9)
- `medications[].hardwareProfile` - Full hardware config JSON:
  - `trapdoorOpenMs` - How long to open trapdoor
  - `trapdoorHoldMs` - How long to hold open
  - Physical dimensions (diameter, length, width, height)
- `medications[].qty` - Number of pills to dispense

### 4. **Record Dispense Events**

**Raspberry Pi Action:**
```python
MUTATION_RECORD_DISPENSE = """
mutation RecordDispense($input: DispenseActionInput!) {
  recordDispenseAction(input: $input) {
    id
    status
    actedAtISO
  }
}
"""

def record_dispense_action(schedule_id, due_time, success, metadata=None):
    """Record the dispense result to the backend."""
    variables = {
        "input": {
            "patientId": PATIENT_ID,
            "scheduleId": schedule_id,
            "dueAtISO": due_time,
            "actedAtISO": datetime.now().isoformat() + "Z",
            "status": "TAKEN" if success else "FAILED",
            "actionSource": "device",
            "metadata": metadata or {
                "beamSensorDetected": success,
                "firmwareVersion": "1.0.0"
            }
        }
    }

    response = requests.post(GRAPHQL_URL, json={
        "query": MUTATION_RECORD_DISPENSE,
        "variables": variables
    })

    result = response.json()
    if "errors" in result:
        print(f"❌ Failed to record: {result['errors']}")
    else:
        event_id = result["data"]["recordDispenseAction"]["id"]
        print(f"✅ Recorded dispense event: {event_id}")
```

**What the Software Provides:**
- `recordDispenseAction` mutation creates a new `dispense_event` record
- Status values: `TAKEN`, `FAILED`, `MISSED`, `SKIPPED`, `SNOOZED`
- `actionSource: "device"` distinguishes hardware vs app actions
- `metadata` JSON field stores sensor readings, timestamps, etc.

### 5. **Reminder Logic (Optional)**

**Raspberry Pi Logic:**
```python
def check_reminders():
    """Check if pills are still in cup 20+ minutes after dispensing."""
    # Query for events that were dispensed but might not be taken
    # This could be a separate endpoint or use dispenseEvents with date range

    if weight_sensor_detects_pills():
        # Pills still in cup - send reminder
        send_push_notification("Don't forget to take your medication!")
    else:
        # Pills taken - all good
        pass
```

**What the Software Provides:**
- The mobile app handles notifications via `expo-notifications`
- Backend stores all dispense events for history/compliance tracking

## Complete Firmware Example

```python
#!/usr/bin/env python3
"""
Pillbox Firmware - Raspberry Pi
Polls GraphQL backend every 60 seconds using the dueNow endpoint.
"""

import requests
import json
import time
from datetime import datetime

# ============ CONFIGURATION ============
GRAPHQL_URL = "http://YOUR_SERVER_IP:8081/query"
PATIENT_ID = "patient_demo_001"
POLL_INTERVAL_SECONDS = 60

# ============ GRAPHQL QUERIES ============
QUERY_DUE_NOW = """
query DueNow($patientId: ID!, $windowMinutes: Int) {
  dueNow(patientId: $patientId, windowMinutes: $windowMinutes) {
    schedule { id title lockoutMinutes }
    dueAtISO
    medications {
      medication { id name }
      qty
      siloSlot
      hardwareProfile
    }
  }
}
"""

MUTATION_RECORD_DISPENSE = """
mutation RecordDispense($input: DispenseActionInput!) {
  recordDispenseAction(input: $input) { id status }
}
"""

# ============ MAIN LOOP ============
def main():
    print("🚀 Pillbox Firmware Starting...")
    dispensed_this_minute = set()

    while True:
        try:
            # Query backend for due medications
            response = requests.post(GRAPHQL_URL, json={
                "query": QUERY_DUE_NOW,
                "variables": {"patientId": PATIENT_ID, "windowMinutes": 1}
            }, timeout=10)

            due_schedules = response.json().get("data", {}).get("dueNow", [])

            for due in due_schedules:
                schedule_id = due["schedule"]["id"]
                cycle_key = f"{schedule_id}:{datetime.now().strftime('%Y-%m-%d-%H-%M')}"

                if cycle_key in dispensed_this_minute:
                    continue  # Already dispensed this minute

                print(f"⏰ {due['schedule']['title']} is DUE!")

                # Dispense each medication
                for med in due["medications"]:
                    silo = med["siloSlot"] or 0
                    qty = med["qty"]
                    print(f"💊 Dispensing {qty}x {med['medication']['name']} from silo {silo}")
                    # YOUR HARDWARE CODE HERE: open_trapdoor(silo), check_sensor(), etc.

                # Record success
                requests.post(GRAPHQL_URL, json={
                    "query": MUTATION_RECORD_DISPENSE,
                    "variables": {
                        "input": {
                            "patientId": PATIENT_ID,
                            "scheduleId": schedule_id,
                            "dueAtISO": due["dueAtISO"],
                            "actedAtISO": datetime.utcnow().isoformat() + "Z",
                            "status": "TAKEN",
                            "actionSource": "device"
                        }
                    }
                })

                dispensed_this_minute.add(cycle_key)

        except Exception as e:
            print(f"Error: {e}")

        time.sleep(POLL_INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
```

## Database Schema Reference

### Key Tables for Hardware Integration

**`schedules`** - When medications should be dispensed
- `rrule` - Recurrence rule (e.g., "FREQ=DAILY;BYHOUR=8;BYMINUTE=0")
- `status` - `ACTIVE`, `PAUSED`, `ARCHIVED`
- `start_date_iso`, `end_date_iso` - Valid date range

**`schedule_items`** - Which medications are in each schedule
- `medication_id` - Links to medication
- `qty` - How many pills to dispense

**`medications`** - Medication details
- `cartridge_index` - Physical slot (0-9)
- `metadata.hardwareProfile` - Hardware configuration JSON
- `stock_count` - Current inventory

**`dispense_events`** - All dispense attempts
- `due_at_iso` - When medication was scheduled
- `acted_at_iso` - When action was taken
- `status` - `TAKEN`, `FAILED`, `MISSED`, `SKIPPED`, `SNOOZED`
- `action_source` - `"device"` or `"app"`

## Implementation Checklist

### On Raspberry Pi:

1. **Set up HTTP client**
   - Install: `pip install requests`
   - Configure `GRAPHQL_URL` and `PATIENT_ID`

2. **Create 1-minute polling loop**
   - Call `dueNow(patientId)` every 60 seconds
   - Backend handles ALL RRULE expansion - no date parsing needed!

3. **Implement hardware control**
   - Use `siloSlot` from response to control correct trapdoor
   - Use `hardwareProfile.trapdoorOpenMs` for timing
   - Read beam/weight sensors

4. **Record events**
   - Call `recordDispenseAction` after each dispense
   - Set `status`: `TAKEN` (success) or `FAILED` (sensor didn't detect pill)
   - Set `actionSource`: `"device"`

### Optional Enhancements:

1. **Duplicate prevention**
   - Track `schedule_id + minute` to avoid double-dispensing
   - The example code above shows this pattern

2. **Error handling**
   - Retry failed HTTP requests
   - Store errors in `metadata` field
   - Alert on repeated failures

## Example GraphQL Queries

### 1. Check for Due Medications (Primary Firmware Endpoint)
```graphql
query DueNow($patientId: ID!, $windowMinutes: Int) {
  dueNow(patientId: $patientId, windowMinutes: $windowMinutes) {
    schedule {
      id
      title
      lockoutMinutes
    }
    dueAtISO
    medications {
      medication {
        id
        name
      }
      qty
      siloSlot
      hardwareProfile
    }
  }
}
```

Variables:
```json
{
  "patientId": "patient_demo_001",
  "windowMinutes": 1
}
```

### 2. Record Dispense Result
```graphql
mutation RecordDispense($input: DispenseActionInput!) {
  recordDispenseAction(input: $input) {
    id
    status
    actedAtISO
  }
}
```

Variables:
```json
{
  "input": {
    "patientId": "patient_demo_001",
    "scheduleId": "schedule_456",
    "dueAtISO": "2024-01-15T08:00:00Z",
    "actedAtISO": "2024-01-15T08:01:30Z",
    "status": "TAKEN",
    "actionSource": "device",
    "metadata": {
      "beamSensorDetected": true,
      "silosDispensed": [3, 5],
      "firmwareVersion": "1.0.0"
    }
  }
}
```

### 3. Get All Schedules (for debugging/display)
```graphql
query GetSchedules($patientId: ID!) {
  schedules(patientId: $patientId) {
    id
    title
    rrule
    status
    items {
      qty
      medication { id name cartridgeIndex }
    }
  }
}
```

## Summary

**What the Backend Provides:**
- ✅ `dueNow` endpoint with server-side RRULE expansion
- ✅ Pre-extracted `siloSlot` and `hardwareProfile` in response
- ✅ `recordDispenseAction` mutation for event tracking
- ✅ All time/schedule logic handled server-side

**What the Firmware Needs to Do:**
- ✅ Poll `dueNow` every 60 seconds
- ✅ If response is non-empty → dispense medications
- ✅ Use `siloSlot` to control correct hardware
- ✅ Call `recordDispenseAction` with result

**The flow is simple:**
```
┌─────────────┐    dueNow()     ┌─────────────┐
│  Firmware   │ ──────────────► │   Backend   │
│             │ ◄────────────── │             │
│  if due:    │   [DueSchedule] │  (expands   │
│   dispense  │                 │   RRULE)    │
│             │                 │             │
│             │ recordDispense  │             │
│             │ ──────────────► │             │
└─────────────┘                 └─────────────┘
```








