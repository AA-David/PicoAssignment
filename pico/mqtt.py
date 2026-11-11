import machine
import network
import time
import ubinascii
import json

from simple import MQTTClient

SSID = ""
WIFI_PASSWORD = ""

userToken = "sha256 hashed string of raw token on rfid card"
PUB_TOPIC = b"picoAssignmentDWL/%s/catch" % userToken

BROKER = b'broker.hivemq.com'
CLIENT_ID = b'pico-' + ubinascii.hexlify(machine.unique_id())

def wifi_connect():
	print('Connecting to wifi...')
	wlan = network.WLAN(network.STA_IF)
	wlan.active(True)
	wlan.connect(SSID, WIFI_PASSWORD)
	while wlan.isconnected() == False:
		print('Waiting for collection...')
		time.sleep(0.5)
	print('Connection details: %s' % str(wlan.ifconfig()))

wifi_connect()

# TODO: Import Leon's random fish function and use it here
def randomFish():
	return json.dumps({"fishId": "fishid101"})

mqtt = MQTTClient(
	client_id=CLIENT_ID,
	server=BROKER,
	port=8883,
	keepalive=5000,
	ssl=True,
	ssl_params={'server_hostname': BROKER}
)

mqtt.connect()

def publishFish():
	message = randomFish()
	print('Publish topic %s message %s' % (PUB_TOPIC, message))
	mqtt.publish(topic=PUB_TOPIC, msg=message, qos=1)

publishFish()