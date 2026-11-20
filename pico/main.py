from machine import Pin
from time import sleep
import hashlib, binascii

from startup import getLogin, InvalidToken
from casting import startCastingMinigame
from reeling import startReelingMinigame
import mqtt
from mqtt import subscribeState, loadState, checkState, pingBroker
from WriteToLcd import WriteToLcd

lcd = WriteToLcd()
userHash = None
button =  Pin(6, Pin.IN, Pin.PULL_DOWN)

previousButton = button.value()
while True:
	currentButton = button.value()
	pressed = previousButton == 0 and currentButton == 1
	previousButton = currentButton

	if userHash == None:
		lcd.write(0, "please log in")
	else:
		lcd.write(0, "press to cast")

	if mqtt.subscribedHash != None:
		checkState()
		pingBroker()

	if pressed:
		if userHash == None:
			lcd.write(0, "connecting wifi")
			token = getLogin()
			if token is None:
				continue  # registration failed, tries again on the next button press
			userHash = binascii.hexlify(hashlib.sha256(token).digest()).decode()
			subscribeState(userHash)  # subscribe first, then fetch, so no update is missed
			try:
				if loadState(token):
					lcd.write(0, "logged in")
				else:
					userHash = None
					lcd.write(0, "state load fail")
					lcd.write(1, "press btn. again")
				sleep(1)
			except InvalidToken:
				lcd.write(0, "invalid token")
				print('Token rejected by the backend. Delete login.txt to register a new player.')
				raise SystemExit # End the program
		else:
			fishPos=startCastingMinigame(userHash)
			startReelingMinigame(fishPos, userHash)


	else:
		sleep(0.1)
