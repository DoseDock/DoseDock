#include <Wire.h>

#define LEDPIN 13
#define SENSORPIN 5
#define VIBRATIONPIN1 2
#define VIBRATIONPIN2 3
#define VIBRATIONPIN3 4

#define SLAVE_ADDRESS 0x08

int sensorState = 0, lastState = 0;
volatile bool newCommand = false;
volatile byte command = 0;


void setup() {
  Wire.begin(SLAVE_ADDRESS); // I2C as slave
  Wire.onReceive(receiveEvent);
  Serial.begin(9600);
  Serial.println("BEGIN RECEIVING");

  pinMode(LEDPIN, OUTPUT);      
  pinMode(SENSORPIN, INPUT_PULLUP);

  // digitalWrite(SENSORPIN, HIGH); // turn on the pullup
  pinMode(VIBRATIONPIN1, OUTPUT);
  pinMode(VIBRATIONPIN2, OUTPUT);
  pinMode(VIBRATIONPIN3, OUTPUT);
  // digitalWrite(VIBRATIONPIN, HIGH);
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
    Serial.println(command);
  }
}

void dispense(int vibrationPin) {

  Serial.println("Motor ON");
  digitalWrite(vibrationPin, HIGH);

  lastState = digitalRead(SENSORPIN);
  while (true) {

    sensorState = digitalRead(SENSORPIN);

    if (!sensorState && lastState) {
      Serial.println("Beam Broken");
      
      digitalWrite(vibrationPin, LOW);
      Serial.println("Motor OFF");


      delay(300);  // small debounce
      break;
    }

    lastState = sensorState;
  }
}
