# Pico Assignment

A Stardew Valley-style fishing game played on a Raspberry Pi Pico, with a web dashboard for the shop and fish almanac. The Pico handles the gameplay and identifies the player by a login token saved on its flash (the original plan was an RFID card, see [RFID](#rfid)). The website shows the progress and backend stores it.

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
    - Option B: two LCDs, one for the fish name and one for the rarity (undecided: depends on the size of the LCD, and general pins available)

### Game loop

1. Log in / register with RFID card (replaced by a token saved on the Pico, see [RFID](#rfid))
2. Catch fish (the LCD shows what you caught and its rarity)
3. Buy upgrades
4. Check what fish you caught
5. Automatically gets updated in database
6. Log out automatically at the end i.e every time the pico is powered on you'll need to use rfid

### Website

- React
- Display shop upgrades, collected fish (i.e. your almanac), money balance, fish in inventory
- Backend: MongoDB + Mongoose + Express + Node

## Architecture

```
 login.txt -> Pico -> USB serial -> Website -> HTTP + Bearer token -> Express API -> MongoDB
                |                                                                 |
                |-- HTTP at login: POST /api/register (first boot only) --------->|
                |-- HTTP at login: GET /api/state (starting state) -------------->|
                |                                                                 |
                |                  MQTT (HiveMQ broker)                           |
                '-- caught fish out ---------> broker ---------> backend ---------|
                    <-- live state updates <-- broker <-- backend <---------------'
```

1. The Pico boots and reads the player's token from `login.txt` on its flash, registering a new player first if the file doesn't exist (see [Signing in and registering](#signing-in-and-registering)).
2. The Pico sends the token to the browser over USB serial (Web Serial API). The Pico also talks to the rest of the system over Wi-Fi. At login it makes HTTP calls: one to register a new player and one to load the player's starting state. During play, it uses MQTT because HTTP requests are too slow for the game loop. The broker's only other client is the backend; the browser never connects to it (see [MQTT](#mqtt)).
3. The website sends that token with every request to the backend. There is no login route: authentication is done by middleware that runs before every protected route.
4. The middleware hashes the token with SHA-256 and looks the user up by that hash. Only the hash is stored, never the token itself.

### Repository layout

```
.
├── backend/                  Express + Mongoose API (TypeScript)
│   ├── .env.example          Template for .env (PORT, MONGO_URI, FRONTEND_URL)
│   └── src/
│       ├── server.ts         Express app: security middleware, routes, starts the DB and MQTT
│       ├── config/           DB connection and game.ts, the backend's source of truth for game rules/prices
│       ├── models/           User and Fish models
│       ├── routes/           API routes
│       ├── middleware/       Bearer token check and error handling
│       ├── controllers/      Thin HTTP handlers that call the services
│       ├── services/         user.service.ts: the database logic, shared by the HTTP and MQTT entry points
│       ├── mqtt/             mqtt.ts: the broker connection, catch subscriber and state publisher
│       └── utils/            AppError, an error carrying an HTTP status code
├── pico/                     MicroPython code for the Pico (see Pico implementation status)
│   ├── main.py               Entry point: logs in, then publishes caught fish
│   ├── startup.py            Wi-Fi connection, registration and the login token in login.txt
│   ├── mqtt.py               MQTT connection to the broker, publishes caught fish
│   ├── simple.py             MicroPython umqtt.simple MQTT client library
│   ├── fish.json             The Pico's trimmed fish list (_id, rarity, name)
│   ├── secrets.example.py    Template for secrets.py (SSID, WIFI_PASSWORD, API_URL); secrets.py is git-ignored
│   └── .micropico            Marks the folder as a MicroPico project for the VS Code extension
├── frontend/                 Vite + React + Tailwind dashboard
│   ├── .env.example          Template for .env (VITE_API_URL)
│   ├── public/               All sprites used
│   └── src/
│       ├── config.ts         API_URL, the backend base URL read from VITE_API_URL
│       ├── components/       Shop, BaitUpgradeMenu, Fish, FishGrid (almanac and inventory tabs)
│       ├── hooks/
│       │   └── useApiRequest.ts   Sends an API request with the Bearer token and updates state with the response
│       ├── types/            Global TypeScript types (IStats, IFish, IInventoryFish)
│       └── utils/
│           └── readPico.ts   Web Serial reader that receives the token from the Pico
└── randomFishSelection.md    Full design of the catch odds and balancing tables
```

> **TODO:** Give the frontend and backend one source of truth for game rules. For now, the upgrade prices are hard-coded in the frontend as well as in `backend/src/config/game.ts`: the rod and luck prices in [Shop.tsx](frontend/src/components/Shop.tsx) (`ROD_PRICES`, `LUCK_PRICES`) and the bait prices in [BaitUpgradeMenu.tsx](frontend/src/components/BaitUpgradeMenu.tsx). The rarity names are also duplicated, in `Shop.tsx` and [Fish.tsx](frontend/src/components/Fish.tsx). Changing a price or rarity in `game.ts` means updating these files too.

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

Every fish is a document in the `Fish` collection in MongoDB, which is the single source of truth for fish data (`name`, `img`, `rarity`, `price`). A fish's id is its MongoDB `_id`: an `ObjectId` that MongoDB generates when the fish is inserted. The API sends it as a 24-character hex string, for example `"665f1c2e9b1d4a0012ab34cd"`. The website and backend read fish from the database.

Because MongoDB generates the ids, the Pico can't know them in advance. The Pico keeps a trimmed copy of the fish list on its flash, with only what it needs: `_id`, `rarity` and `name` (for the LCD). That copy is [pico/fish.json](pico/fish.json), exported from the database. Fish are identified by `_id` everywhere.

The Pico's copy is only valid for the database it was exported from. If the `Fish` collection is wiped and reseeded, every fish gets a new id, so the Pico's list must be re-exported and reflashed.

## Backend API

Base URL: `http://localhost:8000/api` locally (the port comes from `PORT`, default `8000`), or the deployed backend's URL followed by `/api` (see [Configuration and deployment](#configuration-and-deployment)). There is no login route. Every route except `/register` goes through the `requireAuth` middleware, which reads the `Authorization: Bearer <token>` header, hashes the token, finds the matching user and attaches their id and token hash (`login`) to the request.

There is also `GET /health`, outside `/api` and without authentication, which returns `{ "status": "ok" }` so the host can check the server is up.

| Route           | Methods           | Description                                                                                                                                                  |
| --------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/register`     | POST              | Creates a user and returns their login `token`                                                                                                               |
| `/money`        | GET               | Get balance                                                                                                                                                  |
| `/rod`          | GET, POST         | Get rod level / buy the next level                                                                                                                           |
| `/luck`         | GET, POST         | Get luck level / buy the next level                                                                                                                          |
| `/baits`        | GET, POST         | List owned baits / buy `{ bait }`                                                                                                                            |
| `/equippedBait` | GET, POST         | Get equipped bait / equip an owned `{ bait }`                                                                                                                |
| `/almanac`      | GET               | List the ids of caught fish                                                                                                                                  |
| `/inventory`    | GET, DELETE       | List unsold fish as `{ fish: id, quantity }` entries / sell one `{ fishId }` (its price from the `Fish` collection is added to money)                        |
| `/state`        | GET               | The Pico's starting state in one JSON object: `{ money, rod, luck, baits, equippedBait, almanac }`                                                           |
| `/fish`         | GET               | List every fish in the game as `{ fish: [{ _id, name, img, rarity, price }] }`                                                                               |

Purchases use a single atomic update, so players can't overspend or buy the same bait twice.

Fish are only added to the almanac and inventory by MQTT catches, never over HTTP, so players can't give themselves fish. Every route that takes a `fishId` (`DELETE /inventory`, and the MQTT catch handler) checks that it is a valid ObjectId hex string (otherwise `400`) and that the fish exists in the `Fish` collection (otherwise `404`). `GET /almanac` and `GET /inventory` return ids only; the fish data itself comes from `GET /fish`.

### Server middleware

[server.ts](backend/src/server.ts) sets up the following before the routes, in this order:

- **`trust proxy` set to 1.** The deployed backend runs behind one reverse proxy (Render's), so Express reads the client's IP from the proxy's `X-Forwarded-For` header. Without this, every request would look like it came from the proxy and share one rate limit.
- **`helmet`.** Sets standard security headers on every response.
- **`GET /health`.** Registered here, so it skips CORS and the rate limit.
- **CORS.** See [CORS](#cors).
- **Rate limit.** `express-rate-limit` allows 300 requests per IP every 15 minutes, across all routes. The website's 15-second polling uses 60 of these per 15 minutes.
- **JSON body parser**, limited to 1 MB per request.

After the routes, unknown paths get a `404` from the `notFound` middleware, and all errors go through `errorHandler`, which sends `{ message }` with the right status code. Outside production it also sends the stack trace. In production (`NODE_ENV=production`) it hides the stack trace and the message of `500` errors.

When the server starts, it raises the HTTP keep-alive timeout to 65 seconds (Render's proxy keeps idle connections open for 60 seconds, and Node's default of 5 seconds would close them first and cause occasional `502` errors). On `SIGTERM`, sent by the host when it stops or redeploys the service, the server finishes open requests before exiting.

### Almanac and inventory

The almanac (every fish the player has ever caught) and the inventory (fish caught but not yet sold) are separate lists. Both reference fish by id. The inventory also stores a `quantity` per fish: adding a fish already held increments it, and selling decrements it and removes the entry at 0. The website fetches the full list from `/fish` once after login, keeps it in a lookup by `_id`, and uses it to draw both lists: the almanac shows every fish and unlocks the ones whose id is in `/almanac`, and the inventory looks up each entry's `fish` id. The backend never populates fish data into the user's lists, and the website makes no per-fish requests. While logged in, the website re-fetches the visible tab (almanac or inventory) when switching and every 15 seconds, to show new catches.

Inventory updates are two atomic steps: increment the entry's `quantity` if the fish is already held, otherwise push a new `{ fish, quantity: 1 }`. Selling decrements the quantity in one atomic update that also adds the price, then removes entries that have reached 0. The schema's `min: 1` on `quantity` isn't checked by these update queries (Mongoose only runs validators on `save` and `create`, or when `runValidators` is set), so the real guard against going below 0 is the `quantity >= 1` condition in the sell filter.

## Signing in and registering

The player's token is saved in a file called `login.txt` on the Pico's flash, so the Pico itself is the account. (The plan was to keep the token on an RFID card instead; see [RFID](#rfid) for why it isn't.) When the Pico boots, `getLogin()` in [pico/startup.py](pico/startup.py) does the following:

1. Check whether `login.txt` exists.
2. **No file (new player):** the Pico makes an HTTP request to `POST /api/register` and saves the returned un-hashed token in `login.txt`.
3. **File exists (returning player):** the Pico reads the token from it.
4. **Load the starting state** (planned, see [Pico implementation status](#pico-implementation-status)): the Pico subscribes to its MQTT `state` topic first, then makes an HTTP request to `GET /api/state` with the token as a Bearer token, and keeps the response in memory (see [MQTT](#mqtt)). If the backend answers `401`, the Pico treats the token as invalid and doesn't start the game.
5. The Pico sends the token to the website. To receive it, the player first clicks the website's **Login** button and picks the Pico's serial port in the browser's prompt (see [Pico serial protocol](#pico-serial-protocol)).
6. The website sends the token as a Bearer token with each API request, and the backend middleware authenticates it (see [Backend API](#backend-api)).

These are the only HTTP calls the Pico makes. Both happen once at login, where the extra latency doesn't matter; everything during play goes over MQTT.

Because the token only exists in `login.txt`, deleting that file (or reflashing the Pico without it) loses the account: the next boot registers a new player.

Logging out:

- **Website:** the Logout button refreshes the page, which drops the token. To log back in, the player clicks **Login** again while the Pico is plugged in.
- **Pico:** unplugging it from the PC closes the serial connection and so logs the player out. When it is plugged back in, it reads the same token from `login.txt` and sends it again.

### RFID

The original design used an RFID card as the account, and an RFID module is still in the [parts list](#parts-list). It was going to work like this:

- The card holds the player's token, instead of `login.txt`.
- When the player taps a card on the module, the Pico reads it. An empty card is a new player: the Pico calls `POST /api/register` and writes the returned token to the card. A card that already has a value is a returning player, and the value is their token.
- Because the account lives on the card, a player could log in on any Pico by tapping their card. Every time the Pico is powered on, the player has to tap their card again, which logs them out at the end of each session.

We couldn't get the RFID module on the breadboard to work. To troubleshoot it, we:

- tried different code for the module,
- tried modules of the same type from different kits,
- tried different RFID cards,
- checked with an NFC scanner app on a phone that the cards were the right type for the module.

None of these fixed it, so the token is saved in `login.txt` instead. Everything after the token is read stays the same: the backend, the SHA-256 player id used in MQTT topics, and sending the token to the website over serial only need the token, not where it came from. Switching back to a card would only change where `getLogin()` reads and writes the token.

## MQTT

The Pico and the backend both connect to the public HiveMQ broker (`broker.hivemq.com`, TLS on port 8883, no credentials). The browser never connects to the broker. MQTT is used during play, because an HTTP request per action adds noticeable latency. It carries two things:

- **Live state updates reach the Pico.** The Pico gets its starting state over HTTP at login (see [Signing in and registering](#signing-in-and-registering)). After that, when the player buys an upgrade or equips a bait on the website, the backend publishes the player's new state, so the Pico's copy stays current.
- **Caught fish are sent to the inventory.** The Pico works out the random catch itself and publishes the fish's id. The backend receives it and adds the fish to the player's inventory and almanac.

The Pico runs the fish selection from [randomFishSelection.md](randomFishSelection.md) (rarity, then fish), using the rod, bait, luck and almanac it holds in memory. It adds each newly caught fish to its own almanac straight away, so the new-fish boost works without waiting for the backend.

### Topics

All topics start with the group prefix `picoAssignmentDWL`. `<id>` is the player's id: the SHA-256 hash of their token. The Pico computes it from its token, and the backend already stores it as the user's `login`.

| Topic                          | Published by | Subscribed by | QoS |
| ------------------------------ | ------------ | ------------- | --- |
| `picoAssignmentDWL/<id>/state` | Backend      | Pico          | 1   |
| `picoAssignmentDWL/<id>/catch` | Pico         | Backend       | 1   |

The backend subscribes to `picoAssignmentDWL/+/catch` (`+` matches any player id) and takes the player from the topic. Each Pico only subscribes to its own player's `state` topic.

### Messages

State (backend → Pico), published after every successful rod, luck, bait or equip change and after every fish added to the almanac (even if it was already there, so every catch publishes one). Each message is a full snapshot, so applying it twice gives the same result and a missed message is fixed by the next one:

```json
{
    "rod": 2,
    "luck": 1,
    "equippedBait": 3,
    "baits": [0, 3],
    "almanac": ["665f1c2e9b1d4a0012ab34cd", "665f1c2e9b1d4a0012ab34ce"]
}
```

`almanac` is the list of caught fish ids (the 24-character hex `_id` strings), used for the new-fish boost. Money and inventory aren't included, because the Pico doesn't need them.

Catch (Pico → backend):

```json
{ "fishId": "665f1c2e9b1d4a0012ab34cd" }
```

The backend rejects ids that aren't valid ObjectId hex strings, looks the fish up in the `Fish` collection and rejects unknown ids, so the Pico never supplies a name or price.

QoS 1 is "at least once", so a catch could occasionally be delivered twice and add a duplicate fish. This is accepted: it needs a lost acknowledgement, it costs at most one extra fish in the player's own account, and avoiding it (QoS 0 or a unique id per catch) is worse or more work for the given timeframe.

### Backend implementation

The backend side is [backend/src/mqtt/mqtt.ts](backend/src/mqtt/mqtt.ts). `startMqtt()` is called from [server.ts](backend/src/server.ts) once the database is connected. The broker address (`mqtts://broker.hivemq.com:8883`) is set in that file, and on the Pico it is the `BROKER` constant in [pico/mqtt.py](pico/mqtt.py).

- **Catches.** For every message on `picoAssignmentDWL/+/catch`, the backend parses the JSON, finds the user whose `login` equals the id in the topic, then calls the same `addToInventory` and `addToAlmanac` service functions ([user.service.ts](backend/src/services/user.service.ts)). Invalid JSON, unknown players and invalid or unknown fish ids are ignored or logged.
- **State.** The service functions that change the rod, luck, baits, equipped bait, or add to the almanac, call `publishState(login, state)` after the update succeeds. The HTTP controllers pass `req.user.login`, which the auth middleware sets to the token hash, and the catch handler passes the id from the topic.
- **Connection.** The backend uses a clean session. The client reconnects by itself and subscribes again each time it connects, and `reconnect`, `offline` and `error` events are logged. Catches published while the backend is offline are not queued by the broker, so they are lost.

### Pico implementation status

The Pico code is a work in progress. [pico/main.py](pico/main.py) is the entry point and uses the other files:

- **Wi-Fi.** [startup.py](pico/startup.py) connects to Wi-Fi with the `SSID` and `WIFI_PASSWORD` from `secrets.py` (copy [secrets.example.py](pico/secrets.example.py) to make it).
- **Login.** `getLogin()` in `startup.py` registers with `POST /api/register` on first boot and saves the token in `login.txt`, or reads the saved token (see [Signing in and registering](#signing-in-and-registering)). The backend URL is `API_URL` from `secrets.py`. It then prints the token over serial for the website (see [Pico serial protocol](#pico-serial-protocol)).
- **Player id.** `main.py` hashes the token with SHA-256 to get the player id used in the topic.
- **Catches.** [mqtt.py](pico/mqtt.py) connects to the broker over TLS, and `publishFish(userHash, fish)` publishes one catch to `picoAssignmentDWL/<id>/catch` with QoS 1.

Until the fish selection is added, the caught fish is a placeholder: `main.py` passes a hard-coded `fishId` from [fish.json](pico/fish.json). `getFish()` in `mqtt.py` will hold the fish selection from [randomFishSelection.md](randomFishSelection.md).

Not implemented yet:

- Loading the starting state with `GET /api/state` at login, and the `401` check.
- Subscribing to the `state` topic, and the rules in the next section.
- The gameplay itself (LED bar, button, potentiometer and LCD).

### Keeping the Pico's state current

The starting state comes from `GET /api/state`, not from the broker, so nothing depends on the broker retaining messages. The Pico follows these rules:

- **Subscribe first, then fetch.** If the player buys something between the two steps, the change arrives over MQTT instead of being missed. The HTTP response is the baseline and any later MQTT state message overwrites it.
- **Refetch after a reconnect.** If the Pico's MQTT connection drops and comes back, it may have missed updates, so it calls `GET /api/state` again. The public broker gives no uptime guarantee and may drop messages, and clients are expected to reconnect on their own.
- **Keep the connection alive.** The Pico mostly listens between casts, so it calls `ping()` regularly and checks for messages in the game loop without blocking.

### Website updates

The Pico's catches arrive at the backend, not the browser, so the website polls for them: every 15 seconds it re-fetches the visible tab (`GET /api/almanac` or `GET /api/inventory`), and it fetches a tab straight away when the player switches to it (see [Almanac and inventory](#almanac-and-inventory)).

### Security

The connection to the broker is encrypted with TLS, but the broker is public and has no accounts: anyone who knows a topic can read it and publish to it. The player id in the topic is therefore the only protection, so it is a hash and not guessable, and nothing sensitive (tokens, passwords) is ever put in a message. State and catches only contain game data.

### CORS

The backend allows browser requests from `http://localhost:5173` (the Vite dev server) and from the address in the `FRONTEND_URL` environment variable, if it is set ([server.ts](backend/src/server.ts)). When the website is deployed, `FRONTEND_URL` is set to its address. `POST /api/register` is called by the Pico, not a browser, so CORS doesn't block it. MQTT is between the Pico, the broker and the backend, so it isn't affected either.

## Pico serial protocol

The Pico must open a USB serial connection at **115200 baud** and send one JSON object per line once it has the player's token at boot:

```json
{ "value": "<token>" }
```

The browser filters for USB vendor ID `0x2e8a` (Raspberry Pi) and uses the `value` as the player's token (see [Signing in and registering](#signing-in-and-registering)).

## Configuration and deployment

Each part reads its settings from a file that is git-ignored. Copy the example file next to it and fill it in.

| Part     | File                                             | Setting         | Meaning                                                                                                    |
| -------- | ------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------- |
| Backend  | `backend/.env` (from `.env.example`)             | `PORT`          | Port to listen on. Defaults to `8000`.                                                                     |
|          |                                                  | `MONGO_URI`     | MongoDB connection string. Required: the server exits if it is missing or the connection fails.            |
|          |                                                  | `FRONTEND_URL`  | The deployed website's address, allowed by CORS in addition to `http://localhost:5173`.                    |
|          |                                                  | `NODE_ENV`      | Not in the example file. Set to `production` to hide stack traces and `500` messages in error responses.   |
| Frontend | `frontend/.env` (from `.env.example`)            | `VITE_API_URL`  | Backend base URL, without `/api`. Read at build time in [config.ts](frontend/src/config.ts). Defaults to `http://localhost:8000`; trailing slashes are removed. |
| Pico     | `pico/secrets.py` (from `secrets.example.py`)    | `SSID`          | Wi-Fi network name.                                                                                        |
|          |                                                  | `WIFI_PASSWORD` | Wi-Fi password.                                                                                            |
|          |                                                  | `API_URL`       | Backend base URL, without `/api`. The deployed backend, or `http://<LAN IP>:8000` when running it locally. |

The backend needs Node 20 or later.

- **Backend.** `npm run dev` runs it with `tsx watch`, loading `backend/.env`. For deployment, `npm run build` compiles it to `dist/` and `npm start` runs `node dist/server.js`. TypeScript and the type packages are regular dependencies, not dev dependencies, so the host's build step installs them.
- **Frontend.** `npm run dev` runs the Vite dev server on `http://localhost:5173`. `npm run build` builds the static site into `dist/`, with `VITE_API_URL` baked in.

The backend and website are set up to deploy on Render. The Render-specific parts of the backend (`trust proxy`, the keep-alive timeout and `SIGTERM` handling) are described in [Server middleware](#server-middleware).

## Parts list

- 2 Raspberry Pi Pico W (v1/2)
- 2 breadboards
- 1 LED bar
- 18 LEDS
- 2 Button
- 1 Potentiometer
- 1 LCD screen (or 2, if the fish name and rarity are shown on separate screens)
- 1 RFID module (plus card), not used in the end (see [RFID](#rfid))
