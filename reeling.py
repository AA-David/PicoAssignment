# Leon
#
#I Am going to make all pins the same in this file untill we get closer to completion 
"""
all componets that are going to be used for my part 
led 3x9 (3 rows 9 columns 27)
slidy thing
or 
button 
"""




from machine import Pin # pyright: ignore[reportMissingImports]
import time
from random import randint

def isOverFish(fishPosition,paddlePosition):
    if fishPosition >= paddlePosition-1 and fishPosition <= paddlePosition+1:
        return True

"""
Completion bar 
#there are 27 leds in total 
#9 are for the completion bar 
#if there are 6 states and each state is changed per 0.1s
"""

def completionBar(completionCounter, completionPosition):
    if isOverFish(fishPosition,paddlePosition):
        if completionCounter == 65536:
            ledCompletionBar[completionPosition].on()
            completionPosition += 1
        completionCounter += 655.36
    return completionCounter, completionPosition
#MABYE DONE


""" 
THE PADLE
Three length for paddle
"""
def paddleBarLedControlerON(paddlePosition,ledPaddle):
    ledPaddle[paddlePosition].on
    ledPaddle[paddlePosition+1].on
    ledPaddle[paddlePosition-1].on

def paddleBarLedControlerOFF(paddlePosition,ledPaddle):
    ledPaddle[paddlePosition].off
    ledPaddle[paddlePosition+1].off
    ledPaddle[paddlePosition-1].off
 
"""
PADDLE stuff
"""
def paddleMover(paddlePosition,button,ledPaddle):
    paddleBarLedControlerOFF(paddlePosition,ledPaddle)
    if button.value():
        if paddlePosition <9:
            paddlePosition+=1
    else:
        if paddlePosition >2:
            paddlePosition-=1
    paddleBarLedControlerON(paddlePosition,ledPaddle)



        


def fishMover(fishPosition):
    direction= randint(0,1)
    if direction == 1:
        fishPosition+=1 
    else:
        fishPosition-=1
     
        

ledCompletionBar=[]
ledFish=[]
ledPaddle=[]
completionPosition=0
completionCounter=0
paddlePosition=0
fishPosition=0

button = Pin(0,Pin.IN)

for counter in range(9):
    ledCompletionBar.append(Pin(counter, Pin.OUT))
    ledFish.append(Pin(counter+9, Pin.OUT))
    ledPaddle.append(Pin(counter+18, Pin.OUT))
    

while True:
    completionCounter, currentPositionCompletionBar = completionBar(completionCounter, currentPositionCompletionBar)
    paddleMover(paddlePosition,button)
    






 
