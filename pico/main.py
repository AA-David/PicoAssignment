from machine import Pin
from time import sleep
import hashlib, binascii

from startup import getLogin
from casting import startCastingMinigame

userHash = None
button =  Pin(6, Pin.IN, Pin.PULL_DOWN)

previousButton = button.value()
while True:
	currentButton = button.value()
	pressed = previousButton == 0 and currentButton == 1
	previousButton = currentButton

	if pressed:
		if userHash == None:
			userHash = binascii.hexlify(hashlib.sha256(getLogin()).digest()).decode()
		else:
			startCastingMinigame(userHash)
	else:
		sleep(0.1)
