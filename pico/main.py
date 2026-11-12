from mqtt import publishFish
from time import sleep
import hashlib, binascii
import json

from startup import getLogin

sleep(5)

userHash = binascii.hexlify(hashlib.sha256(getLogin()).digest()).decode()
randomFish = json.dumps({"fishId": "6af34c5d8206eed0f9702bb0"})
randomFish2 = json.dumps({"fishId": "6af34c5d8206eed0f9702bb6"})
randomFish3 = json.dumps({"fishId": "6af34c5d8206eed0f9702bb7"})

print(1)
publishFish(userHash, randomFish)
print(2)
publishFish(userHash, randomFish2)
print(3)
publishFish(userHash, randomFish3)