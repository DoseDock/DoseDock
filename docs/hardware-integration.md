# Hardware Integration Guide

This document explains how the software application connects to the Raspberry Pi hardware system described in the flowchart.

## Overview

The software provides:
- **GraphQL API** (Go backend) - Database with schedules, medications, and dispense events
- **Scheduler Engine** - Logic to determine when medications are due
- **Event Tracking** - Records of all dispense attempts and outcomes

The Raspberry Pi hardware needs to:
- Query the database every minute
- Check if medication is due
- Control hardware (motors, trapdoors, sensors)
- Record dispense events
- Send notifications

## Integration Flow

### 1. **Every 1 Minute: Check Database for Medication Details**

**Raspberry Pi Action:**
```python
# Pseudo-code for Raspberry Pi
import requests
from datetime import datetime

GRAPHQL_URL = "http://localhost:8081/query"  # or your backend URL
PATIENT_ID = "patient_demo_001"  # from your system

# Query for upcoming dispense events
query = """
query GetDueMedications($patientId: ID!) {
  dispenseEvents(
    patientId: $patientId
    range: {
      start: "2024-01-01T00:00:00Z"
      end: "2024-01-01T23:59:59Z"
    }
  ) {
    id
    dueAtISO
    status
    schedule {
      id
      items {
        qty
        medication {
          id
          name
          cartridgeIndex
          metadata
        }
      }
    }
  }
}
"""
```

**What the Software Provides:**
- GraphQL endpoint at `/query` (default: `http://localhost:8081/query`)
- `dispenseEvents` query that returns scheduled medication times
- `schedules` query to get all active schedules for a patient
- Database tables: `schedules`, `medications`, `dispense_events`

### 2. **Check: Does Current Time and Medication Schedule Align?**

**Raspberry Pi Logic:**
```python
current_time = datetime.now()
due_events = get_due_medications(patient_id)

for event in due_events:
    due_time = parse_datetime(event['dueAtISO'])
    time_diff = abs((current_time - due_time).total_seconds())
    
    # Check if within 1 minute window
    if time_diff <= 60 and event['status'] == 'PENDING':
        # Medication is due - proceed to dispense
        dispense_medication(event)
```

**What the Software Provides:**
- `DispenseEvent.status` field: `PENDING`, `TAKEN`, `SKIPPED`, `MISSED`, `FAILED`
- `DispenseEvent.dueAtISO` - ISO timestamp of when medication is due
- Scheduler engine (`src/engine/scheduler.ts`) that expands RRULE schedules into specific times

### 3. **If Aligned: Activate Hardware**

**Raspberry Pi Action:**
```python
def dispense_medication(event):
    schedule = event['schedule']
    
    # For each medication in the schedule
    for item in schedule['items']:
        medication = item['medication']
        qty = item['qty']
        
        # Get hardware profile from medication metadata
        hardware_profile = medication['metadata'].get('hardwareProfile', {})
        silo_slot = hardware_profile.get('siloSlot') or medication.get('cartridgeIndex')
        
        # Activate vibration motors
        activate_vibration_motors()
        
        # Wait 1 minute (as per flowchart)
        time.sleep(60)
        
        # Open trapdoor incrementally
        open_trapdoor(silo_slot, hardware_profile)
        
        # Check beam sensor
        if check_beam_sensor():
            # Pill detected - success
            stop_vibration()
            close_trapdoor()
            record_success(event)
        else:
            # No pill detected - check timeout
            if trapdoor_open_time > 60:
                stop_vibration()
                close_trapdoor()
                record_failure(event)
```

**What the Software Provides:**
- `Medication.metadata.hardwareProfile` - Contains:
  - `siloSlot` - Which physical silo slot contains this medication
  - `trapdoorOpenMs` - How long to open trapdoor
  - `trapdoorHoldMs` - How long to hold open
  - Physical dimensions (diameter, length, width, height)
- `Medication.cartridgeIndex` - Alternative field for hardware slot (0-9)

### 4. **If Not Aligned: Check for Reminders (20 Minutes After Scheduled Time)**

**Raspberry Pi Logic:**
```python
# Check if 20 minutes have passed since scheduled time
for event in due_events:
    if event['status'] == 'PENDING':
        due_time = parse_datetime(event['dueAtISO'])
        time_since_due = (current_time - due_time).total_seconds()
        
        if time_since_due >= 20 * 60:  # 20 minutes
            # Check weight sensor
            if weight_sensor_detects_pills():
                # Pills still in cup - send reminder
                send_reminder_notification(event)
            else:
                # Pills taken - mark as TAKEN
                record_dispense_action(event, status='TAKEN')
```

**What the Software Provides:**
- `recordDispenseAction` GraphQL mutation to update event status:
```graphql
mutation RecordAction($input: DispenseActionInput!) {
  recordDispenseAction(input: $input) {
    id
    status
    actedAtISO
  }
}
```

### 5. **Record Dispense Events**

**Raspberry Pi Action:**
```python
def record_dispense_action(event_id, status, action_source='device'):
    mutation = """
    mutation RecordAction($input: DispenseActionInput!) {
      recordDispenseAction(input: $input) {
        id
        status
      }
    }
    """
    
    variables = {
        "input": {
            "eventId": event_id,
            "patientId": PATIENT_ID,
            "scheduleId": event['scheduleId'],
            "dueAtISO": event['dueAtISO'],
            "actedAtISO": datetime.now().isoformat(),
            "status": status,  # 'TAKEN', 'FAILED', 'MISSED'
            "actionSource": action_source,
            "metadata": {
                "hardwareSession": {
                    "beamSensorDetected": True,
                    "weightSensorReading": 0.5,
                    "trapdoorOpenDuration": 1200
                }
            }
        }
    }
    
    response = requests.post(GRAPHQL_URL, json={
        "query": mutation,
        "variables": variables
    })
```

**What the Software Provides:**
- `DispenseEvent` table stores all events
- Status values: `PENDING`, `TAKEN`, `SKIPPED`, `SNOOZED`, `FAILED`, `MISSED`
- `actionSource` field to distinguish `"device"` vs `"app"` actions
- `metadata` JSON field for hardware-specific data

### 6. **Send Notifications**

**Raspberry Pi Action:**
```python
def send_notification(event, notification_type='dispense_success'):
    # Option 1: Call mobile app notification API
    # (Your app uses expo-notifications, but you may want a webhook)
    
    # Option 2: Update dispense event with notification sent flag
    record_dispense_action(event, status='TAKEN', metadata={
        "notificationSent": True,
        "notificationType": notification_type
    })
```

**What the Software Provides:**
- The mobile app handles notifications via `expo-notifications`
- You may want to add a webhook endpoint in the Go backend to trigger push notifications
- Or the app can poll for updated dispense events and show notifications

## Database Schema Reference

### Key Tables for Hardware Integration

**`schedules`** - When medications should be dispensed
- `rrule` - Recurrence rule (e.g., "DAILY at 08:00")
- `status` - `ACTIVE`, `PAUSED`, `ARCHIVED`
- `start_date_iso`, `end_date_iso` - Valid date range

**`schedule_items`** - Which medications are in each schedule
- `medication_id` - Links to medication
- `qty` - How many pills to dispense

**`medications`** - Medication details
- `cartridge_index` - Physical slot (0-9)
- `metadata.hardwareProfile` - Hardware configuration
- `stock_count` - Current inventory

**`dispense_events`** - All dispense attempts
- `due_at_iso` - When medication was scheduled
- `acted_at_iso` - When action was taken (null if pending)
- `status` - Current state
- `action_source` - `"device"` or `"app"`

## Implementation Checklist

### On Raspberry Pi:

1. **Set up GraphQL client**
   - Install HTTP client (Python: `requests`, Node.js: `axios`, etc.)
   - Point to your backend URL

2. **Create 1-minute polling loop**
   - Query `dispenseEvents` for current patient
   - Filter for `PENDING` events within ±1 minute window

3. **Implement hardware control**
   - Vibration motor control
   - Trapdoor servo control
   - Beam sensor reading
   - Weight sensor reading

4. **Implement dispense logic**
   - Match flowchart: activate motors → wait → open trapdoor → check sensor
   - Handle timeout (1 minute) and retry logic

5. **Record events**
   - Call `recordDispenseAction` mutation after each attempt
   - Set appropriate status: `TAKEN`, `FAILED`, `MISSED`

6. **Implement reminder logic**
   - Check for events 20+ minutes past due time
   - Check weight sensor to see if pills still in cup
   - Send reminder if needed

### Optional Enhancements:

1. **Add hardware status endpoint**
   - Create GraphQL mutation to report hardware status
   - Store in `metadata` or separate table

2. **Real-time updates**
   - Use WebSockets or polling to get immediate schedule changes
   - React to `PAUSED` schedules without waiting for next poll

3. **Error handling**
   - Retry failed GraphQL requests
   - Log hardware errors to `dispense_events.metadata`
   - Alert on repeated failures

## Example GraphQL Queries

### Get Due Medications Right Now
```graphql
query GetDueNow($patientId: ID!) {
  dispenseEvents(
    patientId: $patientId
    range: {
      start: "2024-01-15T08:00:00Z"
      end: "2024-01-15T08:05:00Z"
    }
  ) {
    id
    dueAtISO
    status
    schedule {
      id
      items {
        qty
        medication {
          id
          name
          cartridgeIndex
          metadata
        }
      }
    }
  }
}
```

### Record Successful Dispense
```graphql
mutation RecordSuccess($input: DispenseActionInput!) {
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
    "eventId": "event_123",
    "patientId": "patient_demo_001",
    "scheduleId": "schedule_456",
    "dueAtISO": "2024-01-15T08:00:00Z",
    "actedAtISO": "2024-01-15T08:01:30Z",
    "status": "TAKEN",
    "actionSource": "device",
    "metadata": {
      "beamSensorDetected": true,
      "hardwareSession": "session_789"
    }
  }
}
```

## Summary

The software provides:
- ✅ Database with schedules and medications
- ✅ GraphQL API to query and update data
- ✅ Event tracking system
- ✅ Hardware profile metadata

The Raspberry Pi needs to:
- ✅ Poll database every minute
- ✅ Check if medication is due
- ✅ Control hardware (motors, trapdoors, sensors)
- ✅ Record results via GraphQL mutations
- ✅ Handle reminders and notifications

The connection is straightforward: **Raspberry Pi queries the GraphQL API, controls hardware based on schedules, and records outcomes back to the database.**








