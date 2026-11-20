from machine import Pin
from time import sleep
import hashlib, binascii

from startup import getLogin, InvalidToken
from casting import startCastingMinigame
from reeling import startReelingMinigame
from mqtt import subscribeState, loadState, checkState, pingBroker

userHash = None
button =  Pin(6, Pin.IN, Pin.PULL_DOWN)

previousButton = button.value()
while True:
	currentButton = button.value()
	pressed = previousButton == 0 and currentButton == 1
	previousButton = currentButton

	if userHash != None:
		checkState()
		pingBroker()

	if pressed:
		if userHash == None:
			token = getLogin()
			if token is None:
				continue  # registration failed, tries again on the next button press
			userHash = binascii.hexlify(hashlib.sha256(token).digest()).decode()
			subscribeState(userHash)  # subscribe first, then fetch, so no update is missed
			try:
				# TODO: loadState doesn't retry if the fetch fails, so state stays empty
				loadState(token)
			except InvalidToken:
				print('Token rejected by the backend. Delete login.txt to register a new player.')
				raise SystemExit # End the program
		else:
			fishPos=startCastingMinigame(userHash)
			startReelingMinigame(fishPos, userHash)


	else:
		sleep(0.1)
