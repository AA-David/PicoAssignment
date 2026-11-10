# Pico Assignment

A Stardew Valley-style fishing game played on a Raspberry Pi Pico, with a web dashboard for the shop and fish almanac. The Pico handles the gameplay and identifies the player via RFID. The website and backend store the progress.

## Stardew Valley fishing game plan

### Two actions

The same single button is used for every step of a cast.

- Casting minigame
    - Started by pressing the button
    - LED single-colour bar used
    - Potentiometer to move position (Shown by lit up LED)
    - First, move to wanted casting distance, then press the button to lock it in
    - Then a second, random LED lights up as a target (for extra interaction). The player's position is also a lit LED, so the player moves their LED onto the target LED with the potentiometer and presses the button
    - The button only counts when the player's LED is on the target LED. Pressing anywhere else is ignored and nothing happens, so the player keeps trying until they hit it
    - Once the player has pressed the button on the target, the fishing minigame starts automatically
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
                |-- HTTP at login: POST /api/register (empty cards only) -------->|
                |-- HTTP at login: GET /api/state (starting state) -------------->|
                |                                                                 |
                |                  MQTT (HiveMQ broker)                           |
                '-- caught fish out ---------> broker ---------> backend ---------|
                    <-- live state updates <-- broker <-- backend <---------------'
```

1. The player taps their RFID card on the RFID module.
2. The Pico sends the card's token to the browser over USB serial (Web Serial API). The Pico also talks to the rest of the system over Wi-Fi. At login it makes HTTP calls: one to register new cards and one to load the player's starting state. During play it uses MQTT, because HTTP requests are too slow for the game loop. The broker's only other client is the backend; the browser never connects to it (see [MQTT](#mqtt)).
3. The website sends that token with every request to the backend. There is no login route: authentication is done by middleware that runs before every protected route.
4. The middleware hashes the token with SHA-256 and looks the user up by that hash. Only the hash is stored, never the token itself.

### Repository layout

| Path                             | Contents                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------- |
| `backend/`                       | Express + Mongoose API (TypeScript)                                              |
| `backend/src/config/`            | DB connection and `game.ts`, the single source of truth for game rules/prices    |
| `backend/src/models/`            | `User` schema (money, rod, luck, baits, almanac, inventory) and the `Fish` model |
| `backend/src/routes/`            | API routes                                                                       |
| `backend/src/controllers/`       | Request handlers                                                                 |
| `pico/`                          | `fish.json`: the Pico's trimmed fish list (`_id`, `rarity`, `name`)              |
| `frontend/`                      | Vite + React + Tailwind dashboard                                                |
| `frontend/src/components/`       | `Shop`, `BaitUpgradeMenu`, `FishGrid` (almanac and inventory tabs), `Fish`       |
| `frontend/src/utils/readPico.ts` | Web Serial reader that receives the token from the Pico                          |
| `frontend/public/`               | Fish, gear and background sprites (the `Fish` documents hold the file name)      |
| `randomFishSelection.md`         | Full design of the catch odds and balancing tables                               |

## Game mechanics

### Upgrades

| Upgrade | Levels | Effect                                                                   |
| ------- | ------ | ------------------------------------------------------------------------ |
| Rod     | 0-4    | Hard cap on the rarest fish you can catch (common → legendary)           |
| Bait    | 0-4    | Boosts the chance of the matching rarity. You can equip any bait you own |
| Luck    | 0-5    | Shifts the odds towards rarer fish                                       |

| Level | Rod (tier)         | Bait (tier)       | Luck   |
| ----- | ------------------ | ----------------- | ------ |
| 0     | free (common)      | free (common)     | -      |
| 1     | 300 (uncommon)     | 250 (uncommon)    | 500    |
| 2     | 1,800 (rare)       | 800 (rare)        | 1,500  |
| 3     | 5,000 (epic)       | 1,500 (epic)      | 4,000  |
| 4     | 10,000 (legendary) | 2,500 (legendary) | 10,000 |
| 5     | -                  | -                 | 25,000 |

### Catching a fish

A cast first picks a rarity (weighted by rod, equipped bait, luck and a small random factor), then picks a fish within that rarity. Fish the player has never caught are 3× as likely. The Pico calculates this itself. The complete algorithm, tuning values and odds tables are in [randomFishSelection.md](randomFishSelection.md).

There are 100 fish: 27 common, 35 uncommon, 23 rare, 11 epic and 4 legendary.

### Fish data

Every fish is a document in the `Fish` collection in MongoDB, which is the single source of truth for fish data (`name`, `img`, `rarity`, `price`). A fish's id is its MongoDB `_id`: an `ObjectId` that MongoDB generates when the fish is inserted. The API sends it as a 24-character hex string, for example `"665f1c2e9b1d4a0012ab34cd"`. The website and backend read fish from the database; nothing reads a fish JSON file at runtime.

Because MongoDB generates the ids, the Pico can't know them in advance. The Pico keeps a trimmed copy of the fish list on its flash, with only what it needs: `_id`, `rarity` and `name` (for the LCD). That copy is [pico/fish.json](pico/fish.json), exported from the database. Fish are identified by `_id` everywhere.

The Pico's copy is only valid for the database it was exported from. If the `Fish` collection is wiped and reseeded, every fish gets a new id, so the Pico's list must be re-exported and reflashed. Never delete a fish or insert it twice. The repo has no seed script: the collection is filled with a one-off command, and if it ever has to be seeded again it should upsert by `name`, so it doesn't create duplicates or change the ids of existing fish.

To add a fish, insert it into the database, then re-export the Pico's copy to `pico/fish.json` (the same `_id`, `rarity` and `name` fields, from `GET /api/fish` or the collection). Update the backend first and the Pico second, so the Pico never sends an id the backend doesn't know.

Users store only fish ids (and quantities for the inventory), not copies of fish data. Prices are always read from the `Fish` collection, never from the client or the Pico.

## Backend API

Base URL: `http://localhost:8000/api`. There is no login route. Every route except `/register` goes through the `requireAuth` middleware, which reads the `Authorization: Bearer <token>` header, hashes the token, finds the matching user and attaches their id to the request. A missing or unknown token gets a `401`.

| Route           | Methods           | Description                                                                                                                                                |
| --------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/register`     | POST              | Creates a user and returns their login `token` (shown once; only its hash is stored)                                                                       |
| `/money`        | GET, POST         | Get balance / add `{ amount }` (may be negative)                                                                                                           |
| `/rod`          | GET, POST         | Get rod level / buy the next level (price deducted atomically)                                                                                             |
| `/luck`         | GET, POST         | Get luck level / buy the next level                                                                                                                        |
| `/baits`        | GET, POST         | List owned baits / buy `{ bait }` (rarity index 0-4)                                                                                                       |
| `/equippedBait` | GET, POST         | Get equipped bait / equip an owned `{ bait }`                                                                                                              |
| `/almanac`      | GET, POST         | List the ids of caught fish / add `{ fishId }` (no duplicates)                                                                                             |
| `/inventory`    | GET, POST, DELETE | List unsold fish as `{ fish: id, quantity }` entries / add one `{ fishId }` / sell one `{ fishId }` (its price from the `Fish` collection is added to money) |
| `/state`        | GET               | The Pico's starting state in one JSON object: `{ money, rod, luck, baits, equippedBait, almanac }` (read from a single user document, so it is consistent) |
| `/fish`         | GET               | List every fish in the game as `{ fish: [{ _id, name, img, rarity, price }] }`                                                                             |

Purchases use a single atomic update, so players can't overspend or buy the same bait twice. Errors are returned as JSON with a `message`.

Every route that takes a `fishId` (`POST /almanac`, `POST /inventory`, `DELETE /inventory`) checks that it is a valid ObjectId hex string (otherwise `400`) and that the fish exists in the `Fish` collection (otherwise `404`). `GET /almanac` and `GET /inventory` return ids only; the fish data itself comes from `GET /fish`.

### Almanac and inventory

The almanac (every fish the player has ever caught) and the inventory (fish caught but not yet sold) are separate lists. Both reference fish by id. The inventory also stores a `quantity` per fish: adding a fish already held increments it, and selling decrements it and removes the entry at 0. The website fetches the full list from `/fish` once after login, keeps it in a lookup by `_id`, and uses it to draw both lists: the almanac shows every fish and unlocks the ones whose id is in `/almanac`, and the inventory looks up each entry's `fish` id. The backend never populates fish data into the user's lists, and the website makes no per-fish requests. While logged in, the website re-fetches the visible tab (almanac or inventory) every 15 seconds to show new catches.

Inventory updates are two atomic steps, with no transaction: increment the entry's `quantity` if the fish is already held, otherwise push a new `{ fish, quantity: 1 }`. Selling decrements the quantity in one atomic update that also adds the price, then removes entries that have reached 0. The schema's `min: 1` on `quantity` isn't checked by these update queries (Mongoose only runs validators on `save` and `create`, or when `runValidators` is set), so the real guard against going below 0 is the `quantity >= 1` condition in the sell filter.

### TODO: state endpoint and MQTT

None of the MQTT design or `GET /state` exists in the code yet (the backend has no MQTT dependency).

- [ ] Add `GET /state`, returning `{ money, rod, luck, baits, equippedBait, almanac }` from one user document.
- [ ] Add the backend MQTT module: connect to the broker, subscribe to `picoAssignmentDWL/+/catch` and add each caught fish to the player's inventory and almanac.
- [ ] Publish a `state` message after every rod, luck, bait, equip and almanac change.
- [ ] Make the broker host and port configurable on both the backend and the Pico.
- [ ] Add reconnect handling on both sides.

## Signing in and registering

The RFID card itself holds the player's token, so the card is the account. When a card is scanned, the Pico does the following:

1. Read the card.
2. **Empty card (new player):** the Pico makes an HTTP request to `POST /api/register` and writes the returned un-hashed token to the card.
3. **Card has a value (returning player):** the Pico treats the value as the token.
4. **Load the starting state:** the Pico subscribes to its MQTT `state` topic first, then makes an HTTP request to `GET /api/state` with the token as a Bearer token, and keeps the response in memory (see [MQTT](#mqtt)). If the backend answers `401`, the card's token is unknown (for example the database was wiped), so the Pico treats the card as invalid and doesn't start the game.
5. The Pico sends the token to the website.
6. The website sends the token as a Bearer token with each API request, and the backend middleware authenticates it (see [Backend API](#backend-api)).

These are the only HTTP calls the Pico makes. Both happen once at login, where the extra latency doesn't matter; everything during play goes over MQTT.

Logging out:

- **Website:** the Logout button refreshes the page, which drops the token. The player has to scan their card again to log back in.
- **Pico:** unplugging it from the PC closes the serial connection and so logs the player out. They have to log in again when it is plugged back in.

## MQTT

The Pico and the backend both connect to the public HiveMQ broker (`broker.hivemq.com`, TLS on port 8883, no credentials). The browser never connects to the broker. MQTT is used during play, because an HTTP request per action adds noticeable latency. It carries two things:

- **Live state updates reach the Pico.** The Pico gets its starting state over HTTP at login (see [Signing in and registering](#signing-in-and-registering)). After that, when the player buys or equips something on the website (rod, luck, bait), the backend publishes the player's new state, so the Pico's copy stays current.
- **Caught fish are sent to the inventory.** The Pico works out the random catch itself and publishes the fish's id. The backend receives it and adds the fish to the player's inventory and almanac.

The Pico runs the fish selection from [randomFishSelection.md](randomFishSelection.md) (rarity, then fish), using the rod, bait, luck and almanac it holds in memory. It adds each newly caught fish to its own almanac straight away, so the new-fish boost works without waiting for the backend.

### Topics

All topics start with the group prefix `picoAssignmentDWL` (topic names are case-sensitive; there is no leading slash). `<id>` is the player's id: the SHA-256 hash of their token. The Pico computes it from the token on the card, and the backend already stores it as the user's `login`, so no extra identifier is needed.

| Topic                          | Published by | Subscribed by | Retained | QoS |
| ------------------------------ | ------------ | ------------- | -------- | --- |
| `picoAssignmentDWL/<id>/state` | Backend      | Pico          | No       | 1   |
| `picoAssignmentDWL/<id>/catch` | Pico         | Backend       | No       | 1   |

The backend subscribes to `picoAssignmentDWL/+/catch` (`+` matches any player id) and takes the player from the topic. Each Pico only subscribes to its own player's `state` topic.

### Messages

State (backend → Pico), published after every successful rod, luck, bait or equip change and after every almanac change. Each message is a full snapshot, never a diff, so applying it twice gives the same result and a missed message is fixed by the next one:

```json
{
    "rod": 2,
    "luck": 1,
    "equippedBait": 3,
    "baits": [0, 3],
    "almanac": ["665f1c2e9b1d4a0012ab34cd", "665f1c2e9b1d4a0012ab34ce"]
}
```

`almanac` is the list of caught fish ids (the 24-character hex `_id` strings), used for the new-fish boost. Money isn't included, because the Pico doesn't need it.

Catch (Pico → backend):

```json
{ "fishId": "665f1c2e9b1d4a0012ab34cd" }
```

The backend rejects ids that aren't valid ObjectId hex strings, looks the fish up in the `Fish` collection and rejects unknown ids, so the Pico never supplies a name or price.

QoS 1 is "at least once", so a catch could occasionally be delivered twice and add a duplicate fish. This is accepted: it needs a lost acknowledgement, it costs at most one extra fish in the player's own account, and avoiding it (QoS 0 or a unique id per catch) is worse or more work. To make it unlikely, the Pico shouldn't retry a publish by itself and the backend should connect with a clean session.

### Keeping the Pico's state current

The starting state comes from `GET /api/state`, not from the broker, so nothing depends on the broker remembering messages (state messages are not retained). The Pico follows these rules:

- **Subscribe first, then fetch.** If the player buys something between the two steps, the change arrives over MQTT instead of being missed. The HTTP response is the baseline and any later MQTT state message overwrites it.
- **Refetch after a reconnect.** If the Pico's MQTT connection drops and comes back, it may have missed updates, so it calls `GET /api/state` again. The public broker gives no uptime guarantee and may drop messages, and clients are expected to reconnect on their own.
- **Keep the connection alive.** The Pico mostly listens between casts, so it calls `ping()` regularly and checks for messages in the game loop without blocking.

### Website updates

The Pico's catches arrive at the backend, not the browser, so the website polls `GET /api/inventory` every few seconds to show new fish.

### Security

The connection to the broker is encrypted with TLS, but the broker is public and has no accounts: anyone who knows a topic can read it and publish to it. The player id in the topic is therefore the only protection, so it is a hash and not guessable, and nothing sensitive (tokens, passwords) is ever put in a message. State and catches only contain game data.

### CORS

The backend currently only allows requests from `http://localhost:5173` ([server.ts](backend/src/server.ts)). `POST /api/register` is called by the Pico, not a browser, so CORS doesn't block it. MQTT is between the Pico, the broker and the backend, so it isn't affected either. If the website and backend are no longer both on localhost (for example the website is served from another address), the allowed origin needs to be reconfigured.

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
