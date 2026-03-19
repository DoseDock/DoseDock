#include <Wire.h>

#define LEDPIN 13
#define VIBRATIONPIN1 2
#define VIBRATIONPIN2 4
#define VIBRATIONPIN3 6
#define SENSORPIN 9

#define RED_LED 10
#define YELLOW_LED 11
#define GREEN_LED 12



#define FSR_PIN A0

#define SLAVE_ADDRESS 0x08

int sensorState = 0, lastState = 0;
volatile bool newCommand = false;
volatile byte command = 0;
volatile byte dispenseStatus = 0;   // 0 = idle, 1 = busy, 2 = success, 3 = error: jam, 
                                    // 4 = error: no cup, 5 = cup on platform, 6 = cup not on platform
int fsrValue = 0; // force exhibited on platform
int dispenseMaxTimeMillis = 20000;


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
        digitalWrite(YELLOW_LED, HIGH);
        dispense(VIBRATIONPIN1);
        break;
      case 2:
        Serial.println("vibration motor 2 activate");
        digitalWrite(YELLOW_LED, HIGH);
        dispense(VIBRATIONPIN2);
        break;
      case 3:
        Serial.println("vibration motor 3 activate");
        digitalWrite(YELLOW_LED, HIGH);
        dispense(VIBRATIONPIN3);
        break;
      case 4:
        checkCup();
        break;
      case 5:
        // dispense worked
        digitalWrite(RED_LED, LOW);
        digitalWrite(YELLOW_LED, LOW);
        digitalWrite(GREEN_LED, HIGH);
        delay(15000);
        digitalWrite(GREEN_LED, LOW);
      case 6:
        // dispense worked
        digitalWrite(RED_LED, HIGH);
        digitalWrite(YELLOW_LED, LOW);
        digitalWrite(GREEN_LED, LOW);
        delay(15000);
        digitalWrite(RED_LED, LOW);

    }
    
  }
  delay(100);
}

void receiveEvent(int bytes) {
  while (Wire.available()) {
    command = Wire.read();
    newCommand = true;
    // Only set busy if it's a dispense command, not a cup-check
    if (command >= 1 && command <= 3) {
      dispenseStatus = 1;
    }
    Serial.println(command);
  }
}

void requestEvent() {
  Wire.write(dispenseStatus);

  // If result was success or error, reset after sending
  if (dispenseStatus != 0 && dispenseStatus != 1) {
    dispenseStatus = 0;
  }
}

void dispense(int vibrationPin) {

  // error checks 
  fsrValue = analogRead(FSR_PIN);
  Serial.println(fsrValue);
  if (fsrValue <= 100) {
    Serial.println("Cup not on platform - dispense stopped");
    dispenseStatus = 4;

    return;
  }

  sensorState = digitalRead(SENSORPIN);
  if (sensorState == 0) {
    Serial.println("Beam already broken");
    dispenseStatus = 3; // error: if one pill is blocking the sensor
    return;
  }

  Serial.println("Motor ON");
  Serial.println(vibrationPin);
  digitalWrite(vibrationPin, HIGH);

  unsigned long startTime = millis();

  lastState = digitalRead(SENSORPIN);
  while (millis() - startTime < dispenseMaxTimeMillis) {

    sensorState = digitalRead(SENSORPIN);
    //Serial.println(sensorState);


    if (!sensorState && lastState) {
      Serial.println("Beam Broken");
      sensorState = digitalRead(SENSORPIN);
      
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

void checkCup() {
  fsrValue = analogRead(FSR_PIN);
  if (fsrValue == 0) {
    Serial.println("Cup not on platform");
    dispenseStatus = 6;
  }
  else {
    Serial.println("Cup on platform");
    dispenseStatus = 5;
  }

  return;
}
