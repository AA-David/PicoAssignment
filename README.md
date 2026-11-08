# Pico Assignment

A Stardew Valley-style fishing game played on a Raspberry Pi Pico, with a web dashboard for the shop and fish almanac. The Pico handles the gameplay and identifies the player via RFID. The website and backend store the progress.

## Stardew Valley fishing game plan

### Two actions

- Casting minigame
    - LED single-colour bar used
    - Potentiometer to move position (Shown by lit up LED)
    - First, move to wanted casting distance,
    - Then move to random LED light (for extra interaction)
- Fishing minigame (Like Stardew Valley)
    - Button used
    - Bar moves up when button pressed, and down when not (to simulate gravity)
    - Three columns of 9 LED rows
        - First column: Bar position
        - Second column: Fish position
        - Third column (actually the same LED bar): Progress tracking

### Catch display

- LCD screen shown after a successful catch
    - Shows the name of the fish caught and its rarity
    - Option A: one LCD with the fish name on one line and the rarity on the other
    - Option B: two LCDs, one for the fish name and one for the rarity (undecided)

### Game loop

1. Log in / register with RFID card
2. Catch fish (the LCD shows what you caught and its rarity)
3. Buy upgrades
4. Check what fish you caught
5. Automatically gets updated in database
6. Log out automatically at the end ie every time the pico is powered on you'll need to use rfid

### Website

- Display shop upgrades, collected fish (i.e. your almanac), money balance, fish in inventory
- Backend: MongoDB + Mongoose + Express + Node

## Architecture

```
 RFID card -> Pico -> USB serial -> Website (React) -> HTTP + Bearer token -> Express API -> MongoDB
                |                                                                 |
                |-- HTTP: POST /api/register (empty cards only) ----------------->|
                |                                                                 |
                '-- MQTT (HiveMQ broker): shop updates in, caught fish out <------'
```

1. The player taps their RFID card on the RFID module.
2. The Pico sends the card's token to the browser over USB serial (Web Serial API). The Pico also talks to the rest of the system over Wi-Fi: one HTTP call to register new cards and MQTT for everything else (see [MQTT](#mqtt)).
3. The website sends that token with every request to the backend. There is no login route: authentication is done by middleware that runs before every protected route.
4. The middleware hashes the token with SHA-256 and looks the user up by that hash. Only the hash is stored, never the token itself.

### Repository layout

| Path                             | Contents                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `backend/`                       | Express + Mongoose API (TypeScript)                                           |
| `backend/src/config/`            | DB connection and `game.ts`, the single source of truth for game rules/prices |
| `backend/src/models/`            | `User` schema (money, rod, luck, baits, almanac)                              |
| `backend/src/routes/`            | API routes                                                                    |
| `backend/src/controllers/`       | Request handlers                                                              |
| `frontend/`                      | Vite + React + Tailwind dashboard                                             |
| `frontend/src/components/`       | `Shop`, `BaitUpgradeMenu`, `Almanac`, `Fish`                                  |
| `frontend/src/utils/readPico.ts` | Web Serial reader that receives the token from the Pico                       |
| `frontend/src/fishData.json`     | The 100 catchable fish                                                        |
| `frontend/public/`               | Fish, gear and background sprites                                             |
| `randomFishSelection.md`         | Full design of the catch odds and balancing tables                            |

## Game mechanics

### Upgrades

| Upgrade | Levels | Effect                                                                   |
| ------- | ------ | ------------------------------------------------------------------------ |
| Rod     | 0-4    | Hard cap on the rarest fish you can catch (common → legendary)           |
| Bait    | 0-4    | Boosts the chance of the matching rarity. You can equip any bait you own |
| Luck    | 0-5    | Shifts the odds towards rarer fish                                       |

| Level | Rod (tier)         | Bait (tier)       | Luck   |
| ----- | ------------------ | ----------------- | ------ |
| 0     | free (common)      | free (common)     | free   |
| 1     | 300 (uncommon)     | 250 (uncommon)    | 500    |
| 2     | 1,800 (rare)       | 800 (rare)        | 1,500  |
| 3     | 5,000 (epic)       | 1,500 (epic)      | 4,000  |
| 4     | 10,000 (legendary) | 2,500 (legendary) | 10,000 |
| 5     | -                  | -                 | 25,000 |

### Catching a fish

A cast first picks a rarity (weighted by rod, equipped bait, luck and a small random factor), then picks a fish within that rarity. Fish the player has never caught are 3× as likely. The Pico calculates this itself. The complete algorithm, tuning values and odds tables are in [randomFishSelection.md](randomFishSelection.md).

There are 100 fish: 27 common, 35 uncommon, 23 rare, 11 epic and 4 legendary.

## Backend API

Base URL: `http://localhost:8000/api`. There is no login route. Every route except `/register` goes through the `requireAuth` middleware, which reads the `Authorization: Bearer <token>` header, hashes the token, finds the matching user and attaches their id to the request. A missing or unknown token gets a `401`.

| Route           | Methods   | Description                                                                          |
| --------------- | --------- | ------------------------------------------------------------------------------------ |
| `/register`     | POST      | Creates a user and returns their login `token` (shown once; only its hash is stored) |
| `/money`        | GET, POST | Get balance / add `{ amount }` (may be negative)                                     |
| `/rod`          | GET, POST | Get rod level / buy the next level (price deducted atomically)                       |
| `/luck`         | GET, POST | Get luck level / buy the next level                                                  |
| `/baits`        | GET, POST | List owned baits / buy `{ bait }` (rarity index 0-4)                                 |
| `/equippedBait` | GET, POST | Get equipped bait / equip an owned `{ bait }`                                        |
| `/almanac`      | GET, POST | List caught fish / add `{ fish }` (no duplicates)                                    |

Purchases use a single atomic update, so players can't overspend or buy the same bait twice. Errors are returned as JSON with a `message`.

### TODO: inventory route

Not implemented yet. It will manage the fish the player has caught but not sold (currently the `fish` field on the user model, which will be renamed to `inventory`), separate from the almanac.

| Route        | Method | Description                                                          |
| ------------ | ------ | -------------------------------------------------------------------- |
| `/inventory` | GET    | See all fish in the inventory                                        |
| `/inventory` | POST   | Add one fish to the inventory                                        |
| `/inventory` | DELETE | Sell a fish: remove it from the inventory (and add its price to money) |

## Signing in and registering

The RFID card itself holds the player's token, so the card is the account. When a card is scanned, the Pico does the following:

1. Read the card.
2. **Empty card (new player):** the Pico makes an HTTP request to `POST /api/register` (this is the only call that doesn't go over MQTT) and writes the returned un-hashed token to the card. It then sends that token to the website.
3. **Card has a value (returning player):** the Pico treats the value as the token and sends it to the website.
4. The website sends the token as a Bearer token with each API request, and the backend middleware authenticates it (see [Backend API](#backend-api)).

Logging out:

- **Website:** the Logout button refreshes the page, which drops the token. The player has to scan their card again to log back in.
- **Pico:** unplugging it from the PC closes the serial connection and so logs the player out. They have to log in again when it is plugged back in.

## MQTT

The Pico connects to a HiveMQ MQTT broker over Wi-Fi. MQTT is used for two things:

- **Shop updates reach the Pico.** When the player buys or equips something on the website (rod, luck, bait), the Pico is told, so it always knows the current upgrades.
- **Caught fish are sent to the inventory.** The Pico works out the random catch itself, then publishes the fish so it is added to the player's inventory (see the TODO inventory route in [Backend API](#backend-api)).

The Pico runs the fish selection from [randomFishSelection.md](randomFishSelection.md) (rarity, then fish), using the rod, bait and luck it received over MQTT, and the almanac to apply the new-fish boost.

Still to decide:

- **Who talks to the broker on the other side:** the backend server or the website (frontend). The backend is the safer choice because it already checks the token and writes to MongoDB, while a browser would need MQTT over WebSockets.
- **Topics and message formats**, for example one topic per player so one player's updates don't reach another's Pico.
- **How the Pico gets the full state when it connects**, such as money, upgrades and almanac, since MQTT only delivers messages published after it subscribes (unless retained messages are used).

### CORS

The backend currently only allows requests from `http://localhost:5173` ([server.ts](backend/src/server.ts)). `POST /api/register` is called by the Pico, not a browser, so CORS doesn't block it. But if the website and backend are no longer both on localhost (for example the website is served from another address, or the browser talks to the broker directly), the allowed origin needs to be reconfigured.

## Pico serial protocol

The Pico must open a USB serial connection at **115200 baud** and send one JSON object per line when a card is scanned:

```json
{ "value": "<token>" }
```

The browser filters for USB vendor ID `0x2e8a` (Raspberry Pi) and uses the `value` as the player's token (see [Signing in and registering](#signing-in-and-registering)).

## Parts list

- 2 Raspberry Pi Pico (v1/2) W
- 2 breadboards
- 1 LED bar
- 18 green LEDS
- 1 Button
- 1 Potentiometer
- 1 LCD screen (or 2, if the fish name and rarity are shown on separate screens)
- 1 RFID module (plus card)
