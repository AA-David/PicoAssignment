"""
By Leon 
Random fish generation

1. Use rod from state to get baseline rarity weights
2. Use luck and bait from state to update rarity weights accordingly
3. Choose rarity using weights calculated
4. Get all fish and their updated weights from chosen rarity 
5. Use calculated fish weights to select a fish
"""

import random
import json
from mqtt import state

BAIT_MULTIPLIER = [6, 5, 5, 6, 10]

# Rarity

def rodWeights(rod):
    if rod == 0:
        rarityWeight = [100,0,0,0,0]
    elif rod == 1:
        rarityWeight = [100,35,0,0,0]
    elif rod == 2:
        rarityWeight = [100,35,10,0,0]
    elif rod == 3:
        rarityWeight = [100,35,10,2.5,0]
    else:
        rarityWeight = [100,35,10,2.5,0.5]
    return rarityWeight    

def rarityCalculator(rarityWeight):
    for counter in range(0, state["rod"] + 1):
        rarityWeight[counter] *= (1 + 0.25 * state["luck"]) ** counter

        if counter == state["equippedBait"]:
            rarityWeight[counter] *= BAIT_MULTIPLIER[counter]
        if counter == state["rod"] and state["rod"] > 0:
            rarityWeight[counter] *= 1.5
        if counter > 0:
            rarityWeight[counter] *= random.uniform(0.8, 1.2)

    return rarityWeight

def rarityPicker():
    rarityWeight = rodWeights(state["rod"])
    rarityWeight = rarityCalculator(rarityWeight)

    return weightPicker(rarityWeight)

# Fish

def fishLoader():
    with open("fish.json") as file:
        return json.load(file)

def weightPicker(weight):
    total = sum(weight)
    roll = random.random() * total
    running = 0 

    for counter in range (len(weight)):
        running += weight[counter]
        if roll < running:
            return counter

    return len(weight) - 1

def generateFish():
    fishFromFile = fishLoader()
    rarityChosen = rarityPicker()

    eligibleFish = []
    for fish in fishFromFile:
        if fish["rarity"] == rarityChosen:
            eligibleFish.append(fish)

    fishWeights = []
    for fish in eligibleFish:
        fishWeights.append((fish["weight"]))
        if fish["_id"] not in state["almanac"]:
            fishWeights[-1] *= 3

    fish = eligibleFish[weightPicker(fishWeights)]
    state["almanac"].append(fish["_id"])
    return fish
