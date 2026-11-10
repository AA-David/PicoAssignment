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
    return min (position, len(leds) - 1)
