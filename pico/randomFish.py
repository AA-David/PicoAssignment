#
#Leon 
#Steps
#1. use the rod form the mqtt to get the base rarity weights
#2 use the luck and the bait from the mqtt to get the rartity weights
#3 randomly pick a rarity using the weghts calculated 
#4 get all the fish and weights for the chosen rarity 
#5 use the weghts to randomly pick a fish and return that to the main file 
import random
import json
from mqtt import state 
baitMultiplier=[6, 5, 5, 6, 10]
"""
Stuff for the rarity picking 
"""

def rodWeights(rod):
    if rod == 0:
        rarityWeight=[100,0,0,0,0]
    elif rod ==1:
        rarityWeight=[100,35,0,0,0]
    elif rod == 2:
        rarityWeight=[100,35,10,0,0]
    elif rod == 3:
        rarityWeight=[100,35,10,2.5,0]
    else:
        rarityWeight=[100,35,10,2.5,0.5]    
    return rarityWeight    

def rarityCalculator(rarityWeight,bait,rod,luck):
    for counter in range(0,rod+1):
        rarityWeight[counter] *= (1 + 0.25 * luck)  ** counter
        if counter == bait:
            rarityWeight[counter] *= baitMultiplier[counter]
        if counter == rod and rod > 0:
            rarityWeight[counter] *= 1.5
        if counter > 0:
            rarityWeight[counter] *= random.uniform(0.8, 1.2)
    return rarityWeight

def rarityPicker(rod,bait,luck):
    rarityWeight=rodWeights(rod)
    rarityWeight=rarityCalculator(rarityWeight,bait,rod,luck)
    return weightPicker(rarityWeight)


""""
Stuff for the Fish picking 
"""
def fishGetter(rarityChosen,fishWeight,almanac):
    fishRarity=[]
    for fish in fishWeight:
        if fish["rarity"] == rarityChosen:
            fishRarity.append(fish)
    fishWeights=[]
    for fish in fishRarity:
        fishWeights.append((fish["weight"]))
        if fish["_id"] not in almanac:
            fishWeights[-1]*=3
    return fishRarity[weightPicker(fishWeights)]

def fishLoader():
    with open("fish.json") as file:
        return json.load(file)

def weightPicker(weight):
    total=sum(weight)
    roll=random.random() *total
    running=0 
    for counter in range (len(weight)):
        running+= weight[counter]
        if roll < running:
            return counter
    return len(weight-1)

def randomFishMain(rod,luck,bait,almanac):
    fishWeight=fishLoader()
    rarityChosen=rarityPicker(rod,bait,luck)
    return fishGetter(rarityChosen,fishWeight,almanac)



