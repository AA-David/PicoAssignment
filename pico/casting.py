from machine import ADC, Pin
import random
import time
from my74HC595 import Chip74HC595

chip = Chip74HC595(3, 4, 5)
chip.clear()

ledCount = 8  # one 74HC595 drives Q0-Q7
buttonPin = 6
potPin = 26
catchingRows = 9
targetFlash = 250
matchFlash = 100

button = Pin(buttonPin, Pin.IN, Pin.PULL_DOWN)
pot = ADC(Pin(potPin))

def showLeds(mask):
    # direction 1: bit n of mask lights output Qn
    chip.shiftOut(1, mask)

def turnOffLeds():
    showLeds(0)

def readPosition():
    reading = pot.read_u16()
    position = (reading * ledCount) // 65536
    return position


def showPosition():
    position = readPosition()
    showLeds(1 << position)
    return position


stage = 0
# stage 0: press to start; 1: choose distance; 2: match target; 3: finished
distance = None
target = None
landingLed = None

# Demo-only press detection (NOT debouncing).
previousButton = button.value()
turnOffLeds()

while True:
    currentButton = button.value()
    pressed = previousButton == 0 and currentButton == 1
    previousButton = currentButton

    if stage == 0:
        if pressed:
            stage = 1

    elif stage == 1:
        position = showPosition()
        if pressed:
            distance = position
            target = random.randint(0, ledCount - 1)
            stage = 2

    elif stage == 2:
        position = readPosition()
        mask = 1 << position

        if target is not None:
            if position != target:
                if (time.ticks_ms() // targetFlash) % 2 == 0:
                    mask |= 1 << target
            else:
                if (time.ticks_ms() // matchFlash) % 2 == 1:
                    mask = 0

                if pressed:
                    landingLed = distance
                    stage = 3

        showLeds(mask)

    elif stage == 3:
        # Demo-only success indicator: all LEDs light up.
        # Your friend's catching minigame can use landingLed here.
        showLeds(0xFF)

        # Press again to try another cast.
        if pressed:
            turnOffLeds()
            distance = None
            target = None
            landingLed = None
            stage = 0

    # This short loop pause is not a button debounce delay.
    time.sleep_ms(5)
