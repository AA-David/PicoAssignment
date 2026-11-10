# Leon
"""
Overview 
Reeling MiniGame
User presses button moves the paddle
if the used does not press the button the paddle goes down 
the fish starts randomly and randomly moves up or down 
if the fish is in the same row(mabye colum i cant remember the diffrence) for a total of 2.5 seconds then one out of 9 leds light up 
when all led on the completion bar light up the program ends 
"""
from machine import Pin # pyright: ignore[reportMissingImports]
import time
from random import randint

def isOverFish(fishPosition,paddlePosition):
    if fishPosition >= paddlePosition-1 and fishPosition <= paddlePosition+1:
        return True

""" 
THE PADLE
"""


"""
The two following functions turns of the led for the paddle and turns on the leds for the paddle 
"""
def paddleBarLedControlerON(paddlePosition,ledPaddle):
    ledPaddle[paddlePosition].on()
    ledPaddle[paddlePosition+1].on()
    ledPaddle[paddlePosition-1].on()

def paddleBarLedControlerOFF(paddlePosition,ledPaddle):
    ledPaddle[paddlePosition].off()
    ledPaddle[paddlePosition+1].off()
    ledPaddle[paddlePosition-1].off()

"""
This function controls the movment of the paddle
it turns of the previse position of the led 
checkes if the button is pressed 
check if it the paddle is touching the edges of the led coloum 
and changes the positon of the paddle based off the checks
and turns on the leds 
"""
def paddleMover(paddlePosition,button,ledPaddle):
    paddleBarLedControlerOFF(paddlePosition,ledPaddle) 
    if button.value(): 
        if paddlePosition <8: 
            paddlePosition+=1 
    else:
        if paddlePosition >1:
            paddlePosition-=1
    paddleBarLedControlerON(paddlePosition,ledPaddle)
    return paddlePosition



"""
THE FISH
"""



"""
This function controls the movment of the fish 
it first turns of the previous led for the fish 
gets the direction for the fish 
and then changes the position and turns on the led
"""
def fishMover(fishPosition,ledFish):
    ledFish[fishPosition].off()
    direction= randint(0,1)
    if direction == 1:
        if fishPosition<8:
            fishPosition+=1 
    else:
        if fishPosition>1:
            fishPosition-=1
    ledFish[fishPosition].on()
    return fishPosition



"""
THE COMPLETION BAR
"""



"""
This is the function that controls the completion bar
it first check if the fish is the same positon as the paddle
then checks if the fish and paddle has been at the same position for 2.5 seconds
then lights a led 
"""
def completionBarFunc(completionCounter, completionPosition,fishPosition,paddlePosition):
    if isOverFish(fishPosition,paddlePosition) and completionPosition <8:
        completionCounter +=1
        if completionCounter ==5:
            ledCompletionBar[completionPosition].on()
            completionPosition += 1
            completionCounter=0
    return completionCounter, completionPosition


"""
THE MAIN PROGRAM 
"""



#This is where the leds we are using go 
ledPaddleLedPinNumbers=[0,0,0,0,0,0,0,0,0] 
ledFishLedPinNumbers=[0,0,0,0,0,0,0,0,0] 
ledCompletionBarLedPinNumbers=[0,0,0,0,0,0,0,0,0] 


ledCompletionBar=[]
ledFish=[]
ledPaddle=[]

#sets up all of the led in a array 
for counter in range(0,8):
    ledCompletionBar.append(Pin(ledCompletionBarLedPinNumbers[counter],Pin.OUT))
    ledFish.append(Pin(ledFishLedPinNumbers[counter],Pin.OUT))
    ledPaddle.append(Pin(ledPaddleLedPinNumbers[counter],Pin.OUT))

button = Pin(0 , Pin.IN,Pin.PULL_DOWN)

paddlePosition=1
fishPosition=randint(0,9)
completionPosition=0
completionCounter=0

#This runs everything and ends when the completion bar is full 
while True:
    paddlePosition=paddleMover(paddlePosition,button,ledPaddle)
    fishPosition=fishMover(fishPosition,ledFish)
    completionCounter, completionPosition=completionBarFunc(completionCounter,completionPosition,fishPosition,paddlePosition)
    time.sleep(0.5)
    if completionPosition ==8:
        break