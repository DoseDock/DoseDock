# PillBox Firmware Configuration

# WiFi Settings
WIFI_SSID = 'Foosball'
WIFI_PASSWORD = 'Foos123!'

# Backend Settings
BACKEND_URL = 'http://10.36.128.167:8081/query'  # GraphQL endpoint
PATIENT_ID = '627987c9-b849-4fbc-bec2-0794aac86816'  # Your patient ID from the database

# Polling Settings
POLL_INTERVAL_MS = 60000  # 60 seconds between checks
WIFI_TIMEOUT_SEC = 30

# Hardware Pin Assignments
LED_PIN = 'LED'           # Onboard LED for status

# Per-silo vibration motor pins
VIBRATION_MOTOR_PINS = [16, 17, 18]

# Per-silo beam break sensor pins
BEAM_SENSOR_PINS = [14, 13, 12]

# Dispensing timing
VIBRATION_TIMEOUT_MS = 10000  # Max vibration time before giving up (no pill detected)
PILL_SETTLE_MS = 300          # Delay after pill detection before dispensing next pill
