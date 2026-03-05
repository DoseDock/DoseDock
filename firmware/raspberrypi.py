from machine import Pin, I2C
import time
import network
import urequests
import ujson
import utime

time.sleep(2)
i2c = I2C(0, scl=Pin(5), sda=Pin(4), freq=100000)

slave_address = 0x08
led = Pin('LED', Pin.OUT)
led.value(1)

SSID = 'Aaron iPhone'
PASSWORD = '12345678'

#SSID = 'Foosball'
#PASSWORD = 'Foos123!'

URL = "http://172.20.10.3:8081/query"

HEADERS= {
    "Content-Type": "application/json"
}

SILO_TO_ARDUINO_BYTE = {0: 1, 1: 2, 2: 3}

QUERY = {
    "query": '''
query GetMedicationsDueNow {
  dueNow(patientId: "627987c9-b849-4fbc-bec2-0794aac86816", windowMinutes: 1) {
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
    }
  }
}
'''
}

PATIENT_ID = "627987c9-b849-4fbc-bec2-0794aac86816"

def build_mutation(schedule_id, due_at_iso, acted_at_iso, status):
    """Build the recordDispenseAction mutation with dynamic parameters."""
    return {
        "query": '''
mutation recordDispense($patientId: ID!, $scheduleId: ID!, $dueAtISO: String!, $actedAtISO: String!, $status: DispenseStatus!, $actionSource: String!) {
  recordDispenseAction(patientId: $patientId, scheduleId: $scheduleId, dueAtISO: $dueAtISO, actedAtISO: $actedAtISO, status: $status, actionSource: $actionSource) {
    id
    status
    actedAtISO
  }
}
''',
        "variables": {
            "patientId": PATIENT_ID,
            "scheduleId": schedule_id,
            "dueAtISO": due_at_iso,
            "actedAtISO": acted_at_iso,
            "status": status,
            "actionSource": "device"
        }
    }


def get_iso_timestamp():
    """Get current time as ISO 8601 string."""
    now = utime.localtime()
    return "{:04d}-{:02d}-{:02d}T{:02d}:{:02d}:{:02d}Z".format(
        now[0], now[1], now[2], now[3], now[4], now[5]
    )


def wifi_connect():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(SSID, PASSWORD)
    while wlan.isconnected() == False:
        status = wlan.status()
        print("WiFi status:", status)
        time.sleep(1)
    print(f"Connected on {wlan.ifconfig()[0]}")

def test_http():
    print("Testing HTTP...")
    try:
        r = urequests.post(
            URL,
            headers=HEADERS,
            data=ujson.dumps(QUERY)
        )
        print("Status code:", r.status_code)
        print("response:", r.text)
        r.close()
        print("HTTP test OK")
    except Exception as e:
        print("HTTP test FAILED:", e)

def mutation_call(schedule_id, due_at_iso, status):
    """Call the recordDispenseAction mutation."""
    acted_at_iso = get_iso_timestamp()
    mutation = build_mutation(schedule_id, due_at_iso, acted_at_iso, status)
    try:
        r = urequests.post(
            URL,
            headers=HEADERS,
            data=ujson.dumps(mutation)
        )
        print("Mutation status code:", r.status_code)
        text = r.text
        r.close()
        print("Mutation response:", text)
        return ujson.loads(text)
    except Exception as e:
        print("Mutation FAILED:", e)
        return None


def dispense_pill(silo_slot):
    """Attempt to dispense a pill from the given silo. Returns True on success, False on failure."""
    try:
        i2c.writeto(slave_address, bytes([SILO_TO_ARDUINO_BYTE[silo_slot]]))
        return True
    except Exception as e:
        print("Dispense FAILED for silo", silo_slot, ":", e)
        return False


def api_call():
    """Query for medications due now."""
    try:
        r = urequests.post(
            URL,
            headers=HEADERS,
            data=ujson.dumps(QUERY)
        )
        print("Query status code:", r.status_code)
        text = r.text        # read BEFORE closing
        r.close()
        print("Query response OK")
        return ujson.loads(text)   # parse JSON here so caller gets a dict
    except Exception as e:
        print("Query FAILED:", e)
        return None


wifi_connect()
#test_http()
led.value(1)
while True:
    data = api_call()
    if data:
        due = data.get("data", {}).get("dueNow", [])
        if len(due) != 0:
            for slot in due:
                # Extract schedule info
                schedule = slot.get("schedule", {})
                schedule_id = schedule.get("id")
                due_at_iso = slot.get("dueAtISO")

                if not schedule_id:
                    print("No schedule_id found, skipping slot")
                    continue

                # Track overall success for this schedule
                all_dispenses_successful = True
                total_dispenses = 0
                successful_dispenses = 0

                print("Processing schedule:", schedule.get("title", "Unknown"))

                # Dispense all medications for this schedule
                for medication in slot.get("medications", []):
                    med_name = medication.get("medication", {}).get("name", "Unknown")
                    qty = medication.get("qty", 0)
                    silo = medication.get("siloSlot", 0)

                    print(f"Dispensing {qty}x {med_name} from silo {silo}")

                    for count in range(qty):
                        total_dispenses += 1
                        success = dispense_pill(silo)

                        if success:
                            successful_dispenses += 1
                            print(f"  Dispense {count + 1}/{qty} successful")
                        else:
                            all_dispenses_successful = False
                            print(f"  Dispense {count + 1}/{qty} FAILED")

                        # Wait between dispenses
                        time.sleep(10)

                # Determine status and record the dispense event
                if total_dispenses == 0:
                    print("No medications to dispense for this schedule")
                    continue

                status = "TAKEN" if all_dispenses_successful else "FAILED"
                print(f"Recording dispense event: {successful_dispenses}/{total_dispenses} successful, status={status}")

                result = mutation_call(schedule_id, due_at_iso, status)
                if result:
                    dispense_data = result.get("data", {}).get("recordDispenseAction", {})
                    print(f"Dispense event recorded: id={dispense_data.get('id')}, status={dispense_data.get('status')}")
                else:
                    print("Failed to record dispense event")

    utime.sleep_ms(30000)
