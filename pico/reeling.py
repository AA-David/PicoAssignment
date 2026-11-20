"""
By Leon
Reeling Minigame

1. User presses button to move paddle upwards, otherwise it falls back down
2. Fish starts in the location given from casting minigame, and randomly moves up or down 
3. If the fish is in the same row for a total of 1.2 seconds (4 ticks * 0.3s) then the number of leds on the progress bar increases
4. When the whole progress bar is lit up, the pico will calculate a random fish to be published via MQTT
"""

from machine import Pin
from random import randint
import time
from my74HC595 import Chip74HC595
import json

from mqtt import publishFish
from randomFish import generateFish
from WriteToLcd import WriteToLcd

lcd = WriteToLcd()
chip = Chip74HC595(3, 4, 5)

button              =  Pin(6, Pin.IN, Pin.PULL_DOWN)
paddleColumnPinNums =  [8, 9, 10, 11, 12, 13, 14, 15]
fishColumnPinNums   =  [28, 22, 21, 20, 19, 18, 17, 16]

fishColumnPins   =  []
paddleColumnPins =  []
for counter in range(0,8):
    fishColumnPins.append(Pin(fishColumnPinNums[counter], Pin.OUT))
    paddleColumnPins.append(Pin(paddleColumnPinNums[counter], Pin.OUT))

# Helpers
def isOverFish(fishPos, paddlePos):
    if fishPos >= paddlePos - 1 and fishPos <= paddlePos + 1:
        return True

def paddleColumnON(paddlePos, paddleColumnPins):
    paddleColumnPins[paddlePos].on()
    paddleColumnPins[paddlePos + 1].on()
    paddleColumnPins[paddlePos - 1].on()

def paddleColumnOFF(paddlePos, paddleColumnPins):
    paddleColumnPins[paddlePos].off()
    paddleColumnPins[paddlePos + 1].off()
    paddleColumnPins[paddlePos - 1].off()

# Minigame Columns
def movePaddle(paddlePos, button, paddleColumnPins):
    paddleColumnOFF(paddlePos, paddleColumnPins)

    # Game tracks middle of paddle position, so ± 1 for upper and lower limits of rows
    if button.value():
        if paddlePos < 6: # Upper limit - 1 
            paddlePos += 1
    else:
        if paddlePos > 1: # Lower limit + 1
            paddlePos -= 1

    paddleColumnON(paddlePos, paddleColumnPins)
    return paddlePos
    
def moveFish(fishPos, fishColumnPins):
    fishColumnPins[fishPos].off()

    # Calculate new fish position
    direction = randint(0, 1)
    if direction == 1:
        if fishPos < 7:
            fishPos += 1 
    else:
        if fishPos > 0:
            fishPos -= 1

    fishColumnPins[fishPos].on()
    return fishPos


def progressBar(progressTimer, progressPos, fishPos, paddlePos):
    if isOverFish(fishPos, paddlePos) and progressPos < 8:
        progressTimer += 1
        if progressTimer == 4: # Paddle must cover fish for 4 ticks in a row
            progressPos += 1
            chip.showBar(progressPos, 0)
            progressTimer = 0
    else:
        progressTimer = 0
    return progressTimer, progressPos

def startReelingMinigame(fishPos, userHash):
    lcd.write(0, "reeling fish")
    chip.clear()
    for i in range(0, 8):
        fishColumnPins[i].off()
        paddleColumnPins[i].off()

    paddlePos     = 1
    progressPos   = 0
    progressTimer = 0

    while True:
        progressTimer, progressPos = progressBar(progressTimer, progressPos, fishPos, paddlePos)
        paddlePos = movePaddle(paddlePos, button, paddleColumnPins)
        fishPos   = moveFish(fishPos, fishColumnPins)

        time.sleep(0.3) # Overall speed of minigame

        if progressPos == 8:
            fish = generateFish()
            randomFish = json.dumps({"fishId": fish["id"]}) 
            for i in range(0, 8):
                fishColumnPins[i].on()
                paddleColumnPins[i].on()
                
            lcd.write(0, fish["name"])

            if fish["rarity"] == 0:
                formattedRarity = "common"
            elif fish["rarity"] == 1:
                formattedRarity = "uncommon"
            elif fish["rarity"] == 2:
                formattedRarity = "rare"
            elif fish["rarity"] == 3:
                formattedRarity = "epic"
            else:
                formattedRarity = "legendary"

            lcd.write(1, "rarity %s" % formattedRarity)
            time.sleep(4)
            publishFish(userHash, randomFish)
            break