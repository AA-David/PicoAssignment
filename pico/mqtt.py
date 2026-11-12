import machine
import ubinascii
import json
from simple import MQTTClient

import binascii

BROKER = b'broker.hivemq.com'
CLIENT_ID = b'pico-' + ubinascii.hexlify(machine.unique_id())

def getFish():
	return 

mqtt = MQTTClient(
	client_id=CLIENT_ID,
	server=BROKER,
	port=8883,
	keepalive=5000,
	ssl=True,
	ssl_params={'server_hostname': BROKER}
)

mqtt.connect()

def publishFish(userHash, randomFish):
	PUB_TOPIC = b"picoAssignmentDWL/%s/catch" % userHash

	message = randomFish
	print('Publish topic %s message %s' % (PUB_TOPIC, message))
	mqtt.publish(topic=PUB_TOPIC, msg=message)