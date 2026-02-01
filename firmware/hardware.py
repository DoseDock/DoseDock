# Hardware control for PillBox dispenser
# Per-silo vibration motors + per-silo beam break sensors

from machine import Pin
from time import sleep_ms
from config import (
    LED_PIN,
    VIBRATION_MOTOR_PINS,
    BEAM_SENSOR_PINS,
    VIBRATION_TIMEOUT_MS,
    PILL_SETTLE_MS
)

# ============ PIN INITIALIZATION ============

# Status LED
led = Pin(LED_PIN, Pin.OUT)

# Per-silo vibration motors (one pancake motor per silo)
vibration_motors = [Pin(pin, Pin.OUT) for pin in VIBRATION_MOTOR_PINS]

# Per-silo beam break sensors (LOW when beam is broken = pill detected)
beam_sensors = [Pin(pin, Pin.IN, Pin.PULL_UP) for pin in BEAM_SENSOR_PINS]

NUM_SILOS = len(VIBRATION_MOTOR_PINS)


# ============ LED STATUS ============

def led_on():
    """Turn status LED on."""
    led.on()


def led_off():
    """Turn status LED off."""
    led.off()


def led_blink(times=3, interval_ms=200):
    """Blink LED for visual feedback."""
    for _ in range(times):
        led.on()
        sleep_ms(interval_ms)
        led.off()
        sleep_ms(interval_ms)


# ============ VIBRATION MOTOR CONTROL ============

def motor_on(silo_slot):
    """Start vibration motor for a specific silo."""
    if silo_slot < 0 or silo_slot >= NUM_SILOS:
        print(f"Invalid silo slot: {silo_slot}")
        return
    vibration_motors[silo_slot].on()


def motor_off(silo_slot):
    """Stop vibration motor for a specific silo."""
    if silo_slot < 0 or silo_slot >= NUM_SILOS:
        print(f"Invalid silo slot: {silo_slot}")
        return
    vibration_motors[silo_slot].off()


def stop_all_motors():
    """Safety function to stop all vibration motors."""
    for m in vibration_motors:
        m.off()


def motor_pulse(duration_ms=500, silo_slot=None):
    """Pulse a motor briefly for haptic feedback. If no silo_slot, pulses all."""
    if silo_slot is not None:
        motor_on(silo_slot)
        sleep_ms(duration_ms)
        motor_off(silo_slot)
    else:
        for i in range(NUM_SILOS):
            vibration_motors[i].on()
        sleep_ms(duration_ms)
        for i in range(NUM_SILOS):
            vibration_motors[i].off()


# ============ BEAM BREAK SENSOR ============

def pill_detected(silo_slot):
    """
    Check if beam sensor detects a pill for a specific silo.
    Returns True if pill broke the beam (active-low sensor).
    """
    if silo_slot < 0 or silo_slot >= NUM_SILOS:
        print(f"Invalid silo slot: {silo_slot}")
        return False
    return beam_sensors[silo_slot].value() == 0


def wait_for_pill(silo_slot, timeout_ms=None):
    """
    Wait for a pill to be detected by the silo's beam sensor.

    Args:
        silo_slot: Which silo to monitor
        timeout_ms: Max time to wait (defaults to VIBRATION_TIMEOUT_MS)

    Returns:
        True if pill detected, False if timeout
    """
    if timeout_ms is None:
        timeout_ms = VIBRATION_TIMEOUT_MS

    elapsed = 0
    check_interval = 50  # Check every 50ms

    while elapsed < timeout_ms:
        if pill_detected(silo_slot):
            return True
        sleep_ms(check_interval)
        elapsed += check_interval

    return False


# ============ DISPENSING ============

def dispense_from_silo(silo_slot, qty):
    """
    Dispense pills from a specific silo using vibration.

    Flow per pill:
      1. Start vibration motor for silo
      2. Wait for beam break sensor to detect pill falling
      3. Stop vibration motor
      4. Wait for pill to settle before next dispense

    Args:
        silo_slot: Which silo to dispense from (0-2)
        qty: Number of pills to dispense

    Returns:
        Tuple of (success: bool, pills_dispensed: int)
    """
    if silo_slot < 0 or silo_slot >= NUM_SILOS:
        print(f"Invalid silo slot: {silo_slot}")
        return False, 0

    pills_dispensed = 0

    for i in range(qty):
        print(f"  Dispensing pill {i + 1}/{qty} from silo {silo_slot}")

        # Start vibrating
        motor_on(silo_slot)

        # Wait for beam break sensor to detect a pill
        detected = wait_for_pill(silo_slot)

        # Stop vibrating immediately
        motor_off(silo_slot)

        if detected:
            pills_dispensed += 1
            led_blink(1, 100)  # Quick blink for each pill
            # Wait for pill to settle before dispensing next
            if i < qty - 1:
                sleep_ms(PILL_SETTLE_MS)
        else:
            print(f"  Warning: Pill {i + 1} not detected (timeout after {VIBRATION_TIMEOUT_MS}ms)")
            # Continue trying remaining pills

    success = pills_dispensed == qty
    if not success:
        print(f"  Only dispensed {pills_dispensed}/{qty} pills")

    return success, pills_dispensed


# ============ INITIALIZATION ============

def init_hardware():
    """Initialize all hardware to safe state."""
    print("Initializing hardware...")
    led_off()
    stop_all_motors()
    print("Hardware initialized")


def test_hardware():
    """Run a quick hardware test sequence."""
    print("Running hardware test...")

    # Test LED
    print("  Testing LED...")
    led_blink(3, 200)

    # Test each vibration motor (brief pulse)
    for i in range(NUM_SILOS):
        print(f"  Testing motor {i}...")
        motor_pulse(200, silo_slot=i)
        sleep_ms(100)

    # Test each beam sensor
    for i in range(NUM_SILOS):
        status = 'blocked' if pill_detected(i) else 'clear'
        print(f"  Beam sensor {i}: {status}")

    print("Hardware test complete")
