import os, json, network, requests, time
import secrets

SSID = secrets.SSID
WIFI_PASSWORD = secrets.WIFI_PASSWORD
API_URL = secrets.API_URL.rstrip("/")

def wifi_connect():
	print('Connecting to wifi...')
	wlan = network.WLAN(network.STA_IF)
	wlan.active(True)
	wlan.connect(SSID, WIFI_PASSWORD)
	while wlan.isconnected() == False:
		print('Waiting for collection...')
		time.sleep(0.5)
	print("Connected")

wifi_connect()

def register():
	response = None
	try:
		response = requests.post(API_URL + "/api/register")
		if response.status_code != 201:
			print('Register failed: HTTP', response.status_code)
			return None
		return response.json()["token"]
	except Exception as e:
		print('Error during request:', e)
		return None
	finally:
		if response:
			response.close()

def fileExists(f):
	try:
		os.stat(f)
		return True
	except OSError:
		return False

def getLogin():
	if not fileExists("login.txt"):
		with open("login.txt", "w", encoding="utf-8") as f:
			loginToken = register()
			f.write(loginToken)
			value = loginToken
	else:
		with open("login.txt", "r", encoding="utf-8") as f:
			value = f.read()

	print(json.dumps({
		"value": value,
		"done": "false"
	}))
	print(json.dumps({"done": "true"}))

	return value