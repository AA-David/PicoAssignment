# How a random fish is selected

## The three player upgrades

| Upgrade              | What it does                                                                                                                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rod** (tier 0–4)   | Hard cap. A rod can catch fish of its own rarity and every rarity below it.                                                                                                                                                                           |
| **Bait** (tier 0–4)  | Multiplies the chance of the rarity that matches the bait tier, **including common bait**. The player can equip any bait tier they have unlocked and so chooses which rarity to target. A bait above the rod's tier does nothing (the rod blocks it). |
| **Luck** (level 0–5) | Shifts odds towards rarer fish. Helps rarer tiers much more than common ones. Bait multipliers are sized so a bait still targets its rarity at max luck.                                                                                              |

Common bait is the free starter bait and is equipped by default.

## Selection algorithm

A cast has two steps: pick a rarity, then pick a fish inside that rarity.

### Step 1 – pick a rarity

For each rarity index `rarity` (0 = common, 1 = uncommon, 2 = rare, 3 = epic, 4 = legendary):

```
if rarity > rodTier:  weight[rarity] = 0        // the rod can't catch it

else:
  weight[rarity] = base_weight[rarity]                // [100, 35, 10, 2.5, 0.5]
  weight[rarity] *= (1 + 0.25 * luckLevel) ^ rarity   // luck
  if rarity == equippedBaitTier:  weight[rarity] *= bait_multiplier[rarity]   // [6, 5, 5, 6, 10]
  if rarity == rodTier and rodTier > 0:  weight[rarity] *= 1.5  // rod bonus
  if rarity > 0:  weight[rarity] *= random(0.8, 1.2)  // randomness, new each cast

chance_of_rarity = weight[rarity] / sum of all rarity weights
```

Roll against those probabilities to get a rarity.

**Worked example.** A player with a rare rod (`rodTier` = 2), rare bait equipped and luck level 2 (luck factor 1.5):

| Rarity          | Calculation                      | Weight |
| --------------- | -------------------------------- | ------ |
| Common          | 100                              | 100    |
| Uncommon        | 35 × 1.5                         | 52.5   |
| Rare            | 10 × 1.5² × 5 (bait) × 1.5 (rod) | 168.75 |
| Epic, legendary | above the rod                    | 0      |

Total weight is 321.25, so the chance of a rare is 168.75 / 321.25 ≈ 52.5%. The randomness then nudges each weight a little on every cast.

### Step 2 – pick a fish in that rarity

For every fish in the chosen rarity:

```
fish_weight = price ^ -0.25
if the player has never caught this fish:  fish_weight *= 3
```

Then pick one fish at random, with probability `fish_weight / sum of fish_weight` across the fish in that rarity.

- `price ^ -0.25` is a gentle price effect. Within a rarity, the cheapest fish is only about 1.2–1.7× as likely as the priciest, so no fish is a nightmare to find. For example, in common the cheapest is 4.8% and the priciest 2.8%; in legendary it is 28.6% and 21.5%.
- `new_fish_boost` makes undiscovered fish 3× as likely, so the player does not get stuck catching duplicates while hunting the last few fish. Once a fish is in the collection it goes back to normal weight.

## Reference tables

### Upgrade prices

| Tier          | Rod         | Bait        |
| ------------- | ----------- | ----------- |
| Common (0)    | 0 (starter) | 0 (starter) |
| Uncommon (1)  | 300         | 250         |
| Rare (2)      | 1,800       | 800         |
| Epic (3)      | 5,000       | 1,500       |
| Legendary (4) | 10,000      | 2,500       |

| Luck level | 1   | 2     | 3     | 4      | 5      |
| ---------- | --- | ----- | ----- | ------ | ------ |
| Price      | 500 | 1,500 | 4,000 | 10,000 | 25,000 |

Suggested buy order: rod first (unlocks the tier), then its bait, then luck whenever affordable. A new rod alone adds little money (it mostly lets you target new fish with bait), so the bait is where the payoff comes from.

### Fish by rarity (100 total)

| Rarity    | Count | Price range | Average price | Average price of a caught fish |
| --------- | ----- | ----------- | ------------- | ------------------------------ |
| Common    | 27    | 5–40        | ~17           | 15.7                           |
| Uncommon  | 35    | 45–150      | ~93           | 90                             |
| Rare      | 23    | 160–480     | ~281          | 274                            |
| Epic      | 11    | 520–1,250   | ~812          | 797                            |
| Legendary | 4     | 1,600–5,000 | ~3,075        | 2,936                          |

### Catch odds (rod tier = bait tier, no randomness)

Each row shows the chance of each rarity, then the average coin value per cast.

| Rod / bait | Luck | Common | Uncommon | Rare  | Epic  | Legendary | Avg per cast |
| ---------- | ---- | ------ | -------- | ----- | ----- | --------- | ------------ |
| Common     | any  | 100%   | –        | –     | –     | –         | 15.7         |
| Uncommon   | 0    | 27.6%  | 72.4%    | –     | –     | –         | 70           |
| Uncommon   | 2    | 20.3%  | 79.7%    | –     | –     | –         | 75           |
| Uncommon   | 5    | 14.5%  | 85.5%    | –     | –     | –         | 79           |
| Rare       | 0    | 47.6%  | 16.7%    | 35.7% | –     | –         | 120          |
| Rare       | 2    | 31.1%  | 16.3%    | 52.5% | –     | –         | 164          |
| Rare       | 5    | 17.9%  | 14.1%    | 68.0% | –     | –         | 202          |
| Epic       | 0    | 59.7%  | 20.9%    | 6.0%  | 13.4% | –         | 152          |
| Epic       | 2    | 39.9%  | 20.9%    | 9.0%  | 30.3% | –         | 291          |
| Epic       | 5    | 20.6%  | 16.2%    | 10.4% | 52.8% | –         | 467          |
| Legendary  | 0    | 64.5%  | 22.6%    | 6.5%  | 1.6%  | 4.8%      | 203          |
| Legendary  | 2    | 45.2%  | 23.7%    | 10.2% | 3.8%  | 17.1%     | 590          |
| Legendary  | 5    | 22.2%  | 17.5%    | 11.2% | 6.3%  | 42.7%     | 1,355        |

### What each bait does with the best rod (legendary rod)

This is what the player's bait choice changes. Rows are the equipped bait.

Luck 0:

| Bait      | Common | Uncommon | Rare  | Epic | Legendary |
| --------- | ------ | -------- | ----- | ---- | --------- |
| Common    | 92.6%  | 5.4%     | 1.5%  | 0.4% | 0.1%      |
| Uncommon  | 34.7%  | 60.7%    | 3.5%  | 0.9% | 0.3%      |
| Rare      | 53.1%  | 18.6%    | 26.6% | 1.3% | 0.4%      |
| Epic      | 62.2%  | 21.8%    | 6.2%  | 9.3% | 0.5%      |
| Legendary | 64.5%  | 22.6%    | 6.5%  | 1.6% | 4.8%      |

Luck 5:

| Bait      | Common | Uncommon | Rare  | Epic  | Legendary |
| --------- | ------ | -------- | ----- | ----- | --------- |
| Common    | 77.2%  | 10.1%    | 6.5%  | 3.7%  | 2.5%      |
| Uncommon  | 16.9%  | 66.5%    | 8.6%  | 4.8%  | 3.2%      |
| Rare      | 20.9%  | 16.4%    | 52.8% | 5.9%  | 4.0%      |
| Epic      | 23.8%  | 18.8%    | 12.1% | 40.7% | 4.6%      |
| Legendary | 22.2%  | 17.5%    | 11.2% | 6.3%  | 42.7%     |

Whichever bait is equipped, its own rarity is the most likely result at luck 5, and the common bait is a real tool (92.6% common at luck 0 and 77.2% at luck 5) for finishing the common fish.

### How long does it take to collect all 100 fish?

Simulated with a legendary rod, all baits unlocked, and the player always equipping the bait for the rarest rarity still missing a fish. Average over 200 runs:

| Luck | Without new-fish boost | With new-fish boost ×3 |
| ---- | ---------------------- | ---------------------- |
| 0    | ~730 casts             | ~390 casts             |
| 5    | ~440 casts             | ~230 casts             |

This is only the final collecting phase after all upgrades are bought, not the total game length.

## Fish list

**Common (27):** goldfish 5, guppy 6, zebrafish 6, shrimp 8, common starfish 8, sailfin molly 8, tiger barb 10, cherry barb 10, european anchovy 10, perch 12, common hermit crab 12, tench 14, rainbow trout 15, common carp 15, river lamprey 16, atlantic cod 18, hake 18, garfish 18, cardinal tetra 20, petticoat tetra 20, dwarf gourami 22, silver seabream 24, blackspot seabream 26, catfish 28, common barbel 30, flying fish 35, atlantic crayfish 40

**Uncommon (35):** fireworm 45, blue crab 50, common squid 55, emperor tetra 55, fighting fish 60, roules goby 60, great scallop 60, yellow tang 65, atlantic spadefish 65, greater weever 70, lumpfish 70, hillstream loach 70, sockeye salmon 75, atlantic salmon 80, atlantic trumpetfish 80, european seabass 85, boesemans rainbowfish 85, pike 90, sailfin tang 90, masu 95, oscar 100, clownfish 100, blue acara 105, angelfish 110, porcupinefish 110, bluehead wrasse 115, red piranha 120, longhorn cowfish 120, red scorpionfish 125, common lobster 130, saddled bichir 130, common stingray 135, spotted pufferfish 140, common octopus 145, hogfish 150

**Rare (23):** blue tang 160, seahorse 170, spiny lobster 180, turbot 190, barracuda 200, red king crab 200, french angelfish 210, gem tang 220, queen angelfish 230, bartletts anthias 240, moorish idol 250, koi carp 260, european angler 270, ribbon eel 280, harlequin snake eel 300, giant cuttlefish 320, hairy frogfish 340, giant clam 350, lake sturgeon 360, taimen 380, striped marlin 420, green sea turtle 450, axolotl 480

**Epic (11):** shortfin mako shark 520, starry sturgeon 580, portuguese man o war 600, bluefin tuna 650, giant isopod 700, humphead wrasse 780, arapaima 850, yeti crab 900, asian arowana 1000, opah 1100, humpback anglerfish 1250

**Legendary (4):** ocean sunfish 1600, oarfish 2200, african coelacanth 3500, progenetica 5000

## Explaining `catch_config.json`

| Field                                    | Value                             | Meaning                                                                                                                                                                                                                                |
| ---------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rarities`                               | common … legendary                | The five tiers, in index order 0–4.                                                                                                                                                                                                    |
| `base_weight`                            | `[100, 35, 10, 2.5, 0.5]`         | Starting weight per rarity before upgrades. Common is by far the most likely, and each tier up is roughly 3–5× rarer.                                                                                                                  |
| `rod_top_tier_bonus`                     | `1.5`                             | Multiplier for the rod's highest allowed rarity, so a new rod helps a little by itself.                                                                                                                                                |
| `bait_multiplier`                        | `[6, 5, 5, 6, 10]`                | Multiplier for the rarity matching the equipped bait. Common is now 6 (was 1), so common bait is a real targeting tool. The values are large enough that a bait stays effective even against max luck, which pushes towards rare fish. |
| `luck_per_level`                         | `0.25`                            | Luck factor per level. The multiplier on a rarity is `(1 + 0.25 × level) ^ rarity`, so at level 5 it is 1× for common, 2.25× for uncommon, about 5× for rare, 11× for epic and 26× for legendary.                                      |
| `luck_max_level`                         | `5`                               | Highest luck level the player can buy.                                                                                                                                                                                                 |
| `noise`                                  | `min 0.8, max 1.2`                | Each non-common weight is multiplied by a random number in this range on every cast. Increase the spread for more unpredictable catches.                                                                                               |
| `fish_pick_within_rarity.price_exponent` | `0.25`                            | Fish weight is `price ^ -0.25`. Higher means cheap fish dominate more (0 is a fully uniform pick; 0.5 was the old setting).                                                                                                            |
| `fish_pick_within_rarity.new_fish_boost` | `3`                               | Weight multiplier for fish the player has not caught yet. Set to 1 to turn the feature off.                                                                                                                                            |
| `prices.rod`                             | `[0, 300, 1800, 5000, 10000]`     | Rod price by tier (index 0 is the free starter).                                                                                                                                                                                       |
| `prices.bait`                            | `[0, 250, 800, 1500, 2500]`       | Bait price by tier (index 0 is the free starter).                                                                                                                                                                                      |
| `prices.luck`                            | `[500, 1500, 4000, 10000, 25000]` | Price of luck levels 1 to 5 (index 0 is level 1).                                                                                                                                                                                      |

Notes on the file:

- Your game code has to apply `noise` and the formula for `fish_pick_within_rarity`. The numbers can be read directly from the file.
- To make the whole game faster or slower, multiply all the prices by one factor and leave the odds alone.
- To make luck matter earlier, raise `luck_per_level` (for example to 0.35) and lower the bait multipliers a little to compensate.
- The tables above leave out the 0.8–1.2 randomness, so real casts will wobble around them.
