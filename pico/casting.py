"""
By Wallace
Casting Minigame

1. User pressed button to start
2. User moves cursor to wanted casting distance, shown by led bar, and controlled by potentiometer
3. User presses button to lock in casting distance
4. Random blinking led lights up, representing the fish
5. User moves cursor to random led
6. User pressed button, then moves on to casting minigame
"""

from machine import ADC, Pin
import random
import time
from my74HC595 import Chip74HC595

from reeling import startReelingMinigame
from WriteToLcd import WriteToLcd

lcd = WriteToLcd()
chip = Chip74HC595(3, 4, 5)
chip.clear()

BUTTON_PIN         = 6
POTENTIOMETER_PN   = 26
LED_COUNT          = 8

TARGET_FLASH_SPEED = 250
MATCH_FLASH_SPEED  = 100

button = Pin(BUTTON_PIN, Pin.IN, Pin.PULL_DOWN)
potentiometer = ADC(Pin(POTENTIOMETER_PN))

def showLeds(pattern):
    chip.shiftOut(1, pattern)

def readPosition():
    reading = potentiometer.read_u16()
    position = (reading * LED_COUNT) // 65536
    return position


def showPosition():
    position = readPosition()
    showLeds(1 << position)
    return position

def startCastingMinigame(userHash):
    stage = 1
    castingDistance = None
    target = None

    previousButton = button.value()
    chip.clear()

    while True:
        currentButton = button.value()
        pressed = previousButton == 0 and currentButton == 1
        previousButton = currentButton

        if stage == 1: # Move cursor to wanted casting distance
            position = showPosition()
            lcd.write(1, "casting distance")
            if pressed:
                castingDistance = position
                target = random.randint(0, LED_COUNT - 1)
                stage = 2
        elif stage == 2: # Move cursor to random led displayed
            position = readPosition()
            pattern = 1 << position
            lcd.write(1, "catching fish")

            if target is not None:
                if position != target:
                    if (time.ticks_ms() // TARGET_FLASH_SPEED) % 2 == 0:
                        pattern |= 1 << target
                else:
                    if (time.ticks_ms() // MATCH_FLASH_SPEED) % 2 == 1:
                        pattern = 0

                    if pressed:
                        stage = 3

            showLeds(pattern)
        elif stage == 3: # Success
            showLeds(0xFF)
            # TODO: currently, casting distance doesn't do anything, so could use it in randomFish.py if time allows
            startReelingMinigame(target, userHash)
            break

        # Overall speed of minigame
        time.sleep_ms(5)
