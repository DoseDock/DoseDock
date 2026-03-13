#include <Wire.h>

#define LEDPIN 13
#define SENSORPIN 5
#define VIBRATIONPIN1 2
#define VIBRATIONPIN2 3
#define VIBRATIONPIN3 4

#define FSR_PIN A0

#define SLAVE_ADDRESS 0x08

int sensorState = 0, lastState = 0;
volatile bool newCommand = false;
volatile byte command = 0;
volatile byte dispenseStatus = 0;   // 0 = idle, 1 = busy, 2 = success, 3 = error: jam, 4 = error: no cup
int fsrValue = 0; // force exhibited on platform


void setup() {
  Wire.begin(SLAVE_ADDRESS); // I2C as slave
  Wire.onReceive(receiveEvent);
  Wire.onRequest(requestEvent);
  Serial.begin(9600);
  Serial.println("BEGIN RECEIVING");
  

  pinMode(LEDPIN, OUTPUT);      
  pinMode(SENSORPIN, INPUT_PULLUP);

  pinMode(VIBRATIONPIN1, OUTPUT);
  pinMode(VIBRATIONPIN2, OUTPUT);
  pinMode(VIBRATIONPIN3, OUTPUT);
}

void loop() {
  // put your main code here, to run repeatedly:
  if (newCommand) {
    newCommand = false;

    switch (command) {
      case 0:
        Serial.println("all off");
        break;
      case 1:
        Serial.println("vibration motor 1 activate");
        dispense(VIBRATIONPIN1);
        break;
      case 2:
        Serial.println("vibration motor 2 activate");
        dispense(VIBRATIONPIN2);
        break;
      case 3:
        Serial.println("vibration motor 3 activate");
        dispense(VIBRATIONPIN3);
        break;
    }
    
  }
  delay(100);
}

void receiveEvent(int bytes) {
  while (Wire.available()) {
    command = Wire.read();
    newCommand = true;
    dispenseStatus = 1;   // busy
    Serial.println(command);
  }
}

void requestEvent() {
  Wire.write(dispenseStatus);

  // If result was success or error, reset after sending
  if (dispenseStatus == 2 || dispenseStatus == 3 || dispenseStatus == 4) {
    dispenseStatus = 0;
  }
}

void dispense(int vibrationPin) {

  fsrValue = analogRead(FSR_PIN);
  if (fsrValue == 0) {
    Serial.println("Cup not on platform - dispense stopped");
    dispenseStatus = 4;

    return;
  }

  Serial.println("Motor ON");
  digitalWrite(vibrationPin, HIGH);
  unsigned long startTime = millis();

  lastState = digitalRead(SENSORPIN);
  while (millis() - startTime < 20000) {

    sensorState = digitalRead(SENSORPIN);

    if (!sensorState && lastState) {
      Serial.println("Beam Broken");
      
      digitalWrite(vibrationPin, LOW);
      Serial.println("Motor OFF");

      dispenseStatus = 2; // return success byte

      delay(300);  // small debounce
      return;
    }

    lastState = sensorState;
  }

  // Timeout reached
  Serial.println("Dispense timeout");

  digitalWrite(vibrationPin, LOW);
  Serial.println("Motor OFF");

  dispenseStatus = 3;   // error
  
}
