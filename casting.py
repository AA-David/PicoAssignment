from machine import ADC, Pin
import random
import time
ledPins = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
buttonPin = 14        
potPin = 26                                           
catchingRows = 9               
targetFlash = 250           
matchFlash = 100

leds = []

for pin in ledPins:
    leds.append(Pin(pin, Pin.OUT))

button = Pin(buttonPin, Pin.IN, Pin.PULL_UP)

pot = ADC(Pin(potPin))

def turnOffLeds():
    for led in leds:
        led.value(0)

def readPosition():
    reading = pot.read_u16()
    position = (reading * len(leds)) // 65536
    return position

def showPosition():
    turnOffLeds()
    position = readPosition()
    leds[position].value(1)
    return position

stage = 0
distance = None
target = None
landingLed = None

while True:
    if stage == 0:
        if button.value() == 0:
            stage = 1

    elif stage == 1:
        position = showPosition()

        if button.value() == 0:
            distance = position
            target = random.randint(0, len(leds) - 1)
            stage = 2

    elif stage == 2:
        position = readPosition()
        turnOffLeds()
        leds[position].value(1)

        if target is not None:
            if position != target:
                if (time.ticks_ms() // targetFlash) % 2 == 0:
                    leds[target].value(1)

            else:
                if (time.ticks_ms() // matchFlash) % 2 == 1:
                    leds[position].value(0)

                if button.value() == 0:
                    landingLed  = distance
                    stage = 3

    elif stage == 3:
        turnOffLeds()
        break