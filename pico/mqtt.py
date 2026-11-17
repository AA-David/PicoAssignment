import machine
import ubinascii
from simple import MQTTClient

BROKER = b'broker.hivemq.com'
CLIENT_ID = b'pico-' + ubinascii.hexlify(machine.unique_id())

mqtt = MQTTClient(
	client_id=CLIENT_ID,
	server=BROKER,
	port=8883,
	keepalive=5000,
	ssl=True,
	ssl_params={'server_hostname': BROKER}
)

connected = False

def publishFish(userHash, randomFish):
	global connected
	if not connected:
		mqtt.connect()
		connected = True

	PUB_TOPIC = b"picoAssignmentDWL/%s/catch" % userHash
	message = randomFish
	print('Publish topic %s message %s' % (PUB_TOPIC, message))
	mqtt.publish(topic=PUB_TOPIC, msg=message, qos=1)
