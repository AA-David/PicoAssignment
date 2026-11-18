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

# POST /api/register. Returns unhashed token given from API, to be stored in login.txt
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

class InvalidToken(Exception):
	pass

# GET /api/state. Returns the state dict, or None if the request failed.
def fetchState(token):
	response = None
	try:
		response = requests.get(API_URL + "/api/state", headers={"Authorization": "Bearer " + token})
		if response.status_code == 200:
			return response.json()
		print('Fetch state failed: HTTP', response.status_code)
		if response.status_code == 401:
			raise InvalidToken()
		return None
	except InvalidToken:
		raise
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
	wifi_connect()
	value = None
	if fileExists("login.txt"):
		with open("login.txt", "r", encoding="utf-8") as f:
			value = f.read()

	# No file, or an empty one: register a new player. Write to the file once API responded with token
	if not value:
		value = register()
		if value is None:
			print('Could not register a new player.')
			return None
		with open("login.txt", "w", encoding="utf-8") as f:
			f.write(value)

	print(json.dumps({
		"value": value,
		"done": "false"
	}))
	print(json.dumps({"done": "true"}))

	return value