import json
import machine
import time
import ubinascii
from simple import MQTTClient
from startup import fetchState, InvalidToken

BROKER = b'broker.hivemq.com'
KEEPALIVE_S = 120
PING_INTERVAL_MS = KEEPALIVE_S * 1000 // 4  # ping well inside the keepalive window
RECONNECT_INTERVAL_MS = 10000  # minimum gap between failed reconnect attempts
CLIENT_ID = b'pico-' + ubinascii.hexlify(machine.unique_id())

mqtt = MQTTClient(
	client_id=CLIENT_ID,
	server=BROKER,
	port=8883,
	keepalive=KEEPALIVE_S,
	ssl=True,
	ssl_params={'server_hostname': BROKER}
)

connected = False
lastPing = 0
lastReconnectAttempt = 0
subscribedHash = None  # set by subscribeState, used to resubscribe after a reconnect
stateToken = None  # set by loadState, used to refetch the state after a reconnect

# Latest upgrade state, from GET /api/state request and /state topic
STATE_FIELDS = ('rod', 'luck', 'baits', 'equippedBait', 'almanac')
state = {} # TODO: move inside randomFish.py

def ensureConnected():
	global connected
	global lastPing
	if not connected:
		mqtt.connect()
		connected = True
		lastPing = time.ticks_ms()

def setState(newState):
	# update in place so 'from mqtt import state' keeps seeing changes
	state.clear()
	for key in STATE_FIELDS:
		if key in newState:
			state[key] = newState[key]

def handleMessage(topic, msg):
	try:
		newState = json.loads(msg)
	except ValueError:
		print('Invalid state JSON: %s' % msg)
		return
	setState(newState)
	print('State updated: %s' % state)

# Fetch the starting state over HTTP and store it in state.
def loadState(token):
	global stateToken
	stateToken = token  # kept so reconnect() can refetch
	newState = fetchState(token)
	if newState is None:
		return False
	setState(newState)
	print('State loaded: %s' % state)
	return True

# Subscribe to picoAssignmentDWL/<userHash>/state.
def subscribeState(userHash):
	global subscribedHash
	subscribedHash = userHash
	ensureConnected()
	mqtt.set_callback(handleMessage)
	topic = b"picoAssignmentDWL/%s/state" % userHash
	print('Subscribe topic %s' % topic)
	mqtt.subscribe(topic, qos=1)

# Drop dead connection and then reconnect and resubscribe to /state. Based on what this returns, checkState() acts accordingly
def reconnect():
	global connected, lastReconnectAttempt
	lastReconnectAttempt = time.ticks_ms()

	# TODO: If the Pico's Wi-Fi dropped, reconnect Wi-Fi before reconnecting MQTT

	connected = False
	try:
		mqtt.disconnect()  # closes the old socket
	except OSError:
		pass
	try:
		if subscribedHash is not None:
			subscribeState(subscribedHash)
		else:
			ensureConnected()
	except OSError as e:
		connected = False
		print('MQTT reconnect failed: %s' % e)
		return False
	print('MQTT reconnected')

	# updates may have been missed while offline, so refetch the state with HTTP request
	if stateToken is not None:
		try:
			loadState(stateToken)
		except InvalidToken:
			print('Token rejected while refetching state')
	return True

# Non-blocking check for incoming state messages.
def checkState():
	if subscribedHash is None:
		return
	if not connected:
		if time.ticks_diff(time.ticks_ms(), lastReconnectAttempt) >= RECONNECT_INTERVAL_MS:
			reconnect()
		return
	try:
		mqtt.check_msg()
	except OSError:
		reconnect()

def pingBroker():
	global lastPing
	if connected and time.ticks_diff(time.ticks_ms(), lastPing) >= PING_INTERVAL_MS:
		try:
			mqtt.ping()
			lastPing = time.ticks_ms()
		except OSError:
			reconnect()

def publishFish(userHash, randomFish):
	global connected
	PUB_TOPIC = b"picoAssignmentDWL/%s/catch" % userHash
	message = randomFish
	print('Publish topic %s message %s' % (PUB_TOPIC, message))
	try:
		ensureConnected()
		mqtt.publish(topic=PUB_TOPIC, msg=message, qos=1)
	except OSError:
		# connection was dead: reconnect and retry once so the catch isn't lost
		if not reconnect():
			print('Catch dropped, no connection')
			return
		try:
			mqtt.publish(topic=PUB_TOPIC, msg=message, qos=1)
		except OSError as e:
			connected = False
			print('Catch dropped: %s' % e)
