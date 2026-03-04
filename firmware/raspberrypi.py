from machine import Pin, I2C
import time
import network
import urequests
import time
import ujson
import utime

time.sleep(2)
i2c = I2C(0, scl=Pin(5), sda=Pin(4), freq=100000)

slave_address = 0x08
led = Pin('LED', Pin.OUT)
led.value(1)

# SSID = 'Aaron iPhone'
# PASSWORD = '12345678'

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

def api_call(time):
    try:
        r = urequests.post(
            URL,
            headers=HEADERS,
            data=ujson.dumps(QUERY)
        )
        print("Status code:", r.status_code)
        text = r.text        # read BEFORE closing
        r.close()
        print("HTTP OK")
        return ujson.loads(text)   # parse JSON here so caller gets a dict
    except Exception as e:
        print("HTTP FAILED:", e)
        return None


wifi_connect()
#test_http()
led.value(1)
while True:
    now = utime.localtime()
    data = api_call(now)
    if data:
        due = data.get("data", {}).get("dueNow", [])
        if len(due) != 0:
            for slot in due:
                for medication in slot.get("medications", []):
                    for count in range(medication.get("qty", 0)):
                        silo = medication.get("siloSlot", 0)
                        print(medication, medication.get("qty", 0), silo)
                        i2c.writeto(slave_address, bytes([SILO_TO_ARDUINO_BYTE[silo]]))
                        time.sleep(10)

    utime.sleep_ms(30000)

#i2c.writeto(slave_address, bytes([3]))
#while True:
#message = b'Hello friends'
#i2c.writeto(slave_address, bytes([0]))
#time.sleep(1)
