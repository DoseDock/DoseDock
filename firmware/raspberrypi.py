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

# URL = "http://172.20.10.3:8081/query"
URL = "https://dosedock-backend.onrender.com/query"

HEADERS = {
    "Content-Type": "application/json"
}

SILO_TO_ARDUINO_BYTE = {0: 3, 1: 2, 2: 3}

# Cached active patient ID (fetched dynamically from backend)
PATIENT_ID = None

# Cup monitoring state
monitoring_cup = False
cup_monitor_start = None
last_schedule_id = None
last_dispense_time = None


def get_active_patient():
    """Fetch the active patient ID from the backend."""
    global PATIENT_ID
    query = {
        "query": '''
query ActivePatient {
  activePatient {
    id
  }
}
'''
    }
    try:
        r = urequests.post(URL, headers=HEADERS, data=ujson.dumps(query))
        text = r.text
        r.close()
        data = ujson.loads(text)
        patient = data.get("data", {}).get("activePatient")
        if patient:
            PATIENT_ID = patient.get("id")
            print(f"Active patient ID: {PATIENT_ID}")
            return PATIENT_ID
        print("No active patient set")
        return None
    except Exception as e:
        print("Failed to get active patient:", e)
        return None

def build_due_now_query():
    """Build the dueNow query with dynamic patient ID."""
    return {
        "query": '''
query GetMedicationsDueNow($patientId: ID!, $windowMinutes: Int) {
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
        label
      }
      qty
      siloSlot
    }
  }
}
''',
        "variables": {
            "patientId": PATIENT_ID,
            "windowMinutes": 1
        }
    }

def build_mutation(patient_id, schedule_id, due_at_iso, acted_at_iso, status="TAKEN", action_source="device"):
    query = """
mutation recordDispense($input: DispenseActionInput!) {
  recordDispenseAction(input: $input) {
    id
    status
    actedAtISO
  }
}
"""
    variables = {
        "input": {
            "patientId": patient_id,
            "scheduleId": schedule_id,
            "dueAtISO": due_at_iso,
            "actedAtISO": acted_at_iso,
            "status": status,
            "actionSource": action_source
        }
    }
    return {"query": query, "variables": variables}


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


def mutation_call(schedule_id, due_at_iso, status):
    """Call the recordDispenseAction mutation."""
    acted_at_iso = get_iso_timestamp()
    mutation = build_mutation(PATIENT_ID, schedule_id, due_at_iso, acted_at_iso, status)
    print(mutation)
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
    i2c.writeto(slave_address, bytes([silo_slot]))
    while True:
        time.sleep(0.2)
        resp = i2c.readfrom(slave_address, 1)
        status = resp[0]

        if status == 1:
            print("Arduino busy...")
        elif status == 2:
            print("SUCCESS")
            return "TAKEN"
        elif status == 3:
            print("FAILURE - EMPTY SILO")
            return "EMPTY_SILO"
        elif status == 4:
            print("FAILURE - CUP NOT IN PLACE")
            return "CUP_ABSENT"
        else:
            print("Idle")


def api_call():
    """Query for medications due now."""
    if not PATIENT_ID:
        print("No active patient ID - cannot query")
        return None
    try:
        r = urequests.post(
            URL,
            headers=HEADERS,
            data=ujson.dumps(build_due_now_query())
        )
        print("Query status code:", r.status_code)
        text = r.text
        r.close()
        print("Query response OK")
        return ujson.loads(text)
    except Exception as e:
        print("Query FAILED:", e)
        return None


def run_dispense_procedure():
    global last_schedule_id, last_dispense_time
    data = api_call()
    if data:
        due = data.get("data", {}).get("dueNow", [])
        if len(due) != 0:
            for slot in due:
                schedule = slot.get("schedule", {})
                schedule_id = schedule.get("id")
                due_at_iso = slot.get("dueAtISO")

                if not schedule_id:
                    print("No schedule_id found, skipping slot")
                    continue

                all_dispenses_successful = True
                total_dispenses = 0
                successful_dispenses = 0
                failure_status = "FAILED"

                print("Processing schedule:", schedule.get("title", "Unknown"))

                for medication in slot.get("medications", []):
                    med_name = medication.get("medication", {}).get("label", "Unknown")
                    qty = medication.get("qty", 0)
                    silo = medication.get("siloSlot", 0)
                    arduino_silo = SILO_TO_ARDUINO_BYTE[silo]

                    print(f"Dispensing {qty}x {med_name} from silo {silo}")

                    for count in range(qty):
                        total_dispenses += 1
                        result = dispense_pill(arduino_silo)

                        if result == "TAKEN":
                            successful_dispenses += 1
                            print(f"  Dispense {count + 1}/{qty} successful")
                        else:
                            all_dispenses_successful = False
                            print(f"  Dispense {count + 1}/{qty} failed with status={result}")
                            failure_status = result

                        time.sleep(10)

                if total_dispenses == 0:
                    print("No medications to dispense for this schedule")
                    continue

                status = "TAKEN" if all_dispenses_successful else failure_status
                print(f"Recording dispense event: {successful_dispenses}/{total_dispenses} successful, status={status}")

                result = mutation_call(schedule_id, due_at_iso, status)
                if result:
                    dispense_data = result.get("data", {}).get("recordDispenseAction", {})
                    print(f"Dispense event recorded: id={dispense_data.get('id')}, status={dispense_data.get('status')}")
                else:
                    print("Failed to record dispense event")

                last_schedule_id = schedule_id
                last_dispense_time = due_at_iso

                return all_dispenses_successful
    return False


def check_cup_monitor():
    """Check cup status each second after a successful dispense."""
    global monitoring_cup, cup_monitor_start, last_schedule_id, last_dispense_time

    if monitoring_cup:
        elapsed = utime.time() - cup_monitor_start

        if elapsed > 10:
            print("MEDICATION NOT TAKEN")
            # mutation for failure
            mutation_call(last_schedule_id, last_dispense_time, "MISSED")
            monitoring_cup = False
        else:
            i2c.writeto(slave_address, bytes([4]))
            time.sleep(0.1)
            resp = i2c.readfrom(slave_address, 1)
            status = resp[0]
            print(f"  Cup check at {elapsed}s: status={status}")

            if status == 6:
                print("Medication taken — cup removed!")
                monitoring_cup = False


# --- Startup ---
wifi_connect()
print("Fetching active patient...")
get_active_patient()
led.value(1)

last_minute = utime.localtime()[4]

while True:
    current_minute = utime.localtime()[4]

    if current_minute != last_minute:
        last_minute = current_minute
        dispense_successful = run_dispense_procedure()
        if dispense_successful:
            monitoring_cup = True
            cup_monitor_start = utime.time()
        else:
            print("Dispense had failures — skipping cup monitor")

    check_cup_monitor()

    utime.sleep_ms(1000)

