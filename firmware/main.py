# PillBox Dispenser Firmware
# Main entry point for Raspberry Pi Pico

import network
from time import sleep, gmtime
from config import (
    WIFI_SSID,
    WIFI_PASSWORD,
    WIFI_TIMEOUT_SEC,
    POLL_INTERVAL_MS
)
from graphql import ping_backend, get_due_medications, record_dispense
from hardware import (
    init_hardware,
    test_hardware,
    led_on,
    led_off,
    led_blink,
    motor_pulse,
    dispense_from_silo
)

# VERSION
FIRMWARE_VERSION = "1.0.0"

# WIFI
wlan = None


def wifi_connect():
    """Connect to WiFi network."""
    global wlan
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)

    if wlan.isconnected():
        print(f"Already connected: {wlan.ifconfig()[0]}")
        return True

    print(f"Connecting to {WIFI_SSID}...")
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)

    for i in range(WIFI_TIMEOUT_SEC):
        if wlan.isconnected():
            print(f"Connected: {wlan.ifconfig()[0]}")
            return True
        status = wlan.status()
        print(f"  WiFi status: {status} ({i + 1}/{WIFI_TIMEOUT_SEC}s)")
        sleep(1)

    print("WiFi connection failed")
    return False


def ensure_wifi():
    """Reconnect to WiFi if disconnected."""
    if wlan and wlan.isconnected():
        return True
    print("WiFi lost, reconnecting...")
    return wifi_connect()


def get_iso_timestamp():
    """Get current time as ISO 8601 string."""
    t = gmtime()
    return f"{t[0]:04d}-{t[1]:02d}-{t[2]:02d}T{t[3]:02d}:{t[4]:02d}:{t[5]:02d}Z"


# DISPENSING LOGIC

def process_due_medications():
    """Query backend for due medications and dispense them."""
    if not ensure_wifi():
        print("No WiFi - skipping this cycle")
        return

    due_list = get_due_medications(window_minutes=1)

    if not due_list:
        print("No medications due")
        return

    print(f"Found {len(due_list)} schedule(s) due")

    for due in due_list:
        schedule = due.get("schedule", {})
        schedule_id = schedule.get("id")
        schedule_title = schedule.get("title", "Unknown")
        due_at_iso = due.get("dueAtISO")
        medications = due.get("medications", [])

        print(f"\nProcessing: {schedule_title}")
        motor_pulse(500)

        all_success = True
        dispensed_silos = []
        total_pills = 0
        pills_dispensed = 0

        for med in medications:
            med_info = med.get("medication", {})
            med_name = med_info.get("name", "Unknown")
            silo_slot = med.get("siloSlot", 0)
            qty = med.get("qty", 1)

            print(f"  {med_name}: {qty} pill(s) from silo {silo_slot}")
            total_pills += qty

            success, count = dispense_from_silo(silo_slot, qty)

            pills_dispensed += count
            if success:
                dispensed_silos.append(silo_slot)
            else:
                all_success = False

        # Record result to backend
        status = "TAKEN" if all_success else "FAILED"
        acted_at_iso = get_iso_timestamp()

        record_dispense(
            schedule_id=schedule_id,
            due_at_iso=due_at_iso,
            acted_at_iso=acted_at_iso,
            status=status
        )

        if all_success:
            led_blink(3, 200)
        else:
            led_blink(6, 100)


# MAIN

def main():
    """Main entry point."""
    print(f"\n{'=' * 40}")
    print(f"PillBox Firmware v{FIRMWARE_VERSION}")
    print(f"{'=' * 40}\n")

    init_hardware()

    print("\n[1/3] Connecting to WiFi...")
    if not wifi_connect():
        print("Failed to connect. Retrying in 10s...")
        led_blink(10, 100)
        sleep(10)
        return main()

    led_on()

    print("\n[2/3] Testing backend connection...")
    result = ping_backend()
    if result:
        print(f"Backend OK: {result}")
    else:
        print("Warning: Backend unreachable")
        led_blink(5, 200)

    print("\n[3/3] Hardware check...")
    test_hardware()

    print(f"\nEntering main loop (polling every {POLL_INTERVAL_MS // 1000}s)...")
    print("-" * 40)

    while True:
        try:
            timestamp = get_iso_timestamp()
            print(f"\n[{timestamp}] Checking for due medications...")
            process_due_medications()

        except Exception as e:
            print(f"Error in main loop: {e}")
            led_blink(5, 100)

        sleep(POLL_INTERVAL_MS // 1000)


if __name__ == "__main__":
    main()
