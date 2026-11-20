# Pico Assignment

A Stardew Valley-style fishing game played on a Raspberry Pi Pico, with a web dashboard for the shop and fish almanac. The Pico handles the gameplay and identifies the player by a login token saved on its flash (the original plan was an RFID card, see [RFID](#rfid)). The website shows the progress and backend stores it.

## Stardew Valley fishing game plan

### Two actions

- Casting minigame
    - Started by pressing the button
    - LED single-colour bar used
    - Potentiometer to move position shown by single lit up LED (cursor)
    - First, move to the wanted casting distance, then press the button to lock it in (the distance doesn't affect the catch yet, see [V2 plans](#v2-plans))
    - Then a second, random flashing LED lights up as a target (for extra interaction): the player moves the cursor to its position
    - Pressing anywhere else other than the target LED's position is ignored and nothing happens
    - Once the player has pressed the button on the target, the fishing minigame starts automatically
- Fishing minigame (like Stardew Valley)
    - Bar moves up when the same button is pressed, and down when not (to simulate gravity)
    - Three columns of 8 LED rows
        - First column: Bar position
        - Second column: Fish position
        - same LED bar: Progress tracking

### Catch display

- A 16x2 I2C LCD screen is shown after a successful catch
    - The fish name is on the first line and its rarity on the second
- The LCD also shows status messages, such as "please log in", "connecting wifi", "invalid token" and "reconnecting"

### Game loop

1. Log in / register 
2. Catch fish (the LCD shows what you caught and its rarity)
3. Buy upgrades
4. Check what fish you caught
5. Database is updated automatically
6. Log out from website and Pico

### Website

- React
- Display shop upgrades, collected fish (i.e. your almanac), money balance, fish in inventory
- Backend: MongoDB + Node + Express + Mongoose 

## Architecture

```
 login.txt -> Pico -> USB serial -> Website -> HTTP + Bearer token -> Express API -> MongoDB
                |                                                                 |
                |-- HTTP at login: POST /api/register (first boot only) --------->|
                |-- HTTP at login: GET /api/state (starting state) -------------->|
                |                                                                 |
                |                  MQTT (HiveMQ broker)                           |
                '-- caught fish -------------> broker ---------> backend ---------|
                    <-- live state updates <-- broker <--------- backend <--------'
```

1. The Pico boots and reads the player's token from `login.txt` on its flash, registering a new player first if the file doesn't exist (see [Signing in and registering](#signing-in-and-registering)).
2. The Pico sends the token to the browser over USB serial (Web Serial API). The Pico also talks to the rest of the system over Wi-Fi. At login it makes HTTP calls: one to register a new player and one to load the player's starting state. During play, it uses MQTT because HTTP requests are too slow for the game loop. The broker's only other client is the backend; the browser never connects to it (see [MQTT](#mqtt)).
3. The website sends that token with every request to the backend. There is no login route: authentication is done by middleware that runs before every protected route (i.e. every route except `/api/register`).
4. The middleware hashes the Bearer token with SHA-256 and looks the user up by that hash.

### Repository layout

```
.
├── backend/                  Express + Mongoose API (TypeScript)
│   ├── .env.example          Template for .env (PORT, MONGO_URI, FRONTEND_URL)
│   └── src/
│       ├── server.ts         Express app: security middleware, routes, starts the DB and MQTT
│       ├── express.d.ts      Types `req.user` (id and token hash), set by the auth middleware
│       ├── config/           DB connection and game.ts, the backend's source of truth for game rules/prices
│       ├── models/           User and Fish models
│       ├── routes/           API routes
│       ├── middleware/       Bearer token check and error handling
│       ├── controllers/      Thin HTTP handlers that call the services
│       ├── services/         user.service.ts: the database logic, shared by the HTTP and MQTT entry points
│       ├── mqtt/             mqtt.ts: the broker connection, catch subscriber and state publisher
│       └── utils/            AppError, an error carrying an HTTP status code
├── frontend/                 Vite + React + Tailwind dashboard
│   ├── .env.example          Template for .env (VITE_API_URL)
│   ├── public/               All sprites used
│   └── src/
│       ├── main.tsx          Entry point: renders App
│       ├── App.tsx           Page layout, Login/Logout buttons, holds the token and the player's stats
│       ├── config.ts         API_URL, the backend base URL read from VITE_API_URL
│       ├── components/       Shop, BaitUpgradeMenu, Fish, FishGrid (almanac and inventory tabs)
│       ├── hooks/
│       │   └── useApiRequest.ts   Sends an API request with the Bearer token and updates state with the response
│       ├── types/            Global TypeScript types (IStats, IFish, IInventoryFish)
│       └── utils/
│           └── readPico.ts   Web Serial reader that receives the token from the Pico
├── pico/                     MicroPython code for the Pico (see Pico implementation status)
│   ├── main.py               Entry point: logs in, subscribes to state, then runs the main loop that starts casts
│   ├── startup.py            Wi-Fi connection, registration, the login token in login.txt, and the GET /api/state fetch
│   ├── mqtt.py               MQTT connection to the broker: publishes catches, subscribes to state updates, pings and reconnects
│   ├── casting.py            Casting minigame (LED bar and potentiometer); returns the position of the target LED when it succeeds
│   ├── reeling.py            Reeling minigame (button and LED columns); publishes the catch when the progress bar fills
│   ├── my74HC595.py          Driver for the 74HC595 shift register that drives the LED bar
│   ├── randomFish.py         Fish selection: picks a rarity, then a fish, from the player's state
│   ├── WriteToLcd.py         LCD wrapper: writes a line of text, skipping repeats of the same message
│   ├── I2C_LCD.py            I2C LCD driver
│   ├── LCD_API.py            Base class for the LCD driver
│   ├── simple.py             MicroPython umqtt.simple MQTT client library
│   ├── fish.json             The Pico's trimmed fish list (_id, rarity, name, weight)
│   ├── secrets.example.py    Template for secrets.py (SSID, WIFI_PASSWORD, API_URL); secrets.py is git-ignored
│   └── .micropico            Marks the folder as a MicroPico project for the VS Code extension
└── randomFishSelection.md    Full design of the catch odds and balancing tables
```

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

### Fish data

Every fish is a document in the `Fish` collection in MongoDB, which is the single source of truth for fish data (`name`, `img`, `rarity`, `price`). A fish's id is its MongoDB automatically generated `_id`. The API sends it as a 24-character hex string, for example `"665f1c2e9b1d4a0012ab34cd"`. 

Because MongoDB generates the ids, the Pico can't know them in advance. The Pico keeps a trimmed copy of the fish list on its flash, with only what it needs: `_id`, `rarity` and `name` (for the LCD), `weight` (for picking a fish within a rarity). That copy is [pico/fish.json](pico/fish.json), exported from the database. Fish are identified by `_id` everywhere.

The Pico's copy is only valid for the database it was exported from. If the `Fish` collection is wiped and reseeded, every fish gets a new id, so the Pico's list must be re-exported and reflashed; likwise when a new fish is added.

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

Fish are only added to the almanac and inventory by MQTT catches.`DELETE /inventory` and the MQTT catch handler check that it is a valid ObjectId hex string (otherwise `400`) and that the fish exists in the `Fish` collection (otherwise `404`). `GET /almanac` and `GET /inventory` return ids only; the fish data itself comes from `GET /fish`.

### Server middleware

[server.ts](backend/src/server.ts) sets up the following before the routes, in this order:

- **`trust proxy` set to 1.** The deployed backend runs behind one reverse proxy (Render's), so Express reads the client's IP from the proxy's `X-Forwarded-For` header. Without this, every request would look like it came from the proxy and share one rate limit.
- **`helmet`.** Sets standard security headers on every response.
- **`GET /health`.** Registered here, so it skips CORS and the rate limit.
- **CORS.** See [CORS](#cors).
- **Rate limit.** `express-rate-limit` allows 300 requests per IP every 15 minutes, across all routes. The website's 15-second polling uses 60 of these per 15 minutes.
- **JSON body parser**, limited to 1 MB per request.

Unknown paths get a `404` from the `notFound` middleware, and all errors go through `errorHandler`, which sends `{ message }` with the right status code. Outside production it also sends the stack trace. In production (`NODE_ENV=production`) it hides the stack trace and the message of `500` errors.

When the server starts, it raises the HTTP keep-alive timeout to 65 seconds (Render's proxy keeps idle connections open for 60 seconds, and Node's default of 5 seconds would close them first and cause occasional `502` errors). On `SIGTERM`, sent by the host when it stops or redeploys the service, the server finishes open requests before exiting.

### Almanac and inventory

The almanac (every fish the player has ever caught) and the inventory (fish caught but not yet sold) are separate lists. Both reference fish by id. The inventory also stores a `quantity` per fish: adding a fish already held increments it, and selling decrements it and removes the entry at 0. The website fetches the full list from `/fish` once after login, keeps it in a lookup by `_id`, and uses it to draw both lists: the almanac shows every fish and unlocks the ones whose id is in `/almanac`, and the inventory looks up each entry's `fish` id. The backend never populates fish data into the user's lists, and the website makes no per-fish requests. While logged in, the website re-fetches the visible tab (almanac or inventory) when switching or else every 15 seconds, to show new catches.

Inventory updates are two atomic steps: increment the entry's `quantity` if the fish is already held, otherwise push a new `{ fish, quantity: 1 }`. Selling decrements the quantity in one atomic update that also adds the price, then removes entries that have reached 0. The schema's `min: 1` on `quantity` isn't checked by these update queries (Mongoose only runs validators on `save` and `create`, or when `runValidators` is set), so the real guard against going below 0 is the `quantity >= 1` condition in the sell filter.

## Signing in and registering

The player's token is saved in a file called `login.txt` on the Pico's flash, so the Pico itself is the account. (The plan was to keep the token on an RFID card instead; see [RFID](#rfid) for why it isn't.) At login (the first button press after the Pico boots), `getLogin()` in [pico/startup.py](pico/startup.py) does steps 1 to 4, and `main.py` does step 5:

1. Check whether `login.txt` exists.
2. **No file (new player):** the Pico makes an HTTP request to `POST /api/register` and saves the returned un-hashed token in `login.txt`.
3. **File exists (returning player):** the Pico reads the token from it.
4. The Pico sends the token to the website. To receive it, the player first clicks the website's **Login** button and picks the Pico's serial port in the browser's prompt (see [Pico serial protocol](#pico-serial-protocol)).
5. **Load the starting state:** [pico/main.py](pico/main.py) hashes the token, subscribes to the Pico's MQTT `state` topic first, then makes an HTTP request to `GET /api/state` with the token as a Bearer token, and keeps the response in memory (see [MQTT](#mqtt)). If the backend answers `401`, the Pico treats the token as invalid, prints a message and stops without starting the game.
6. The website sends the token as a Bearer token with each API request, and the backend middleware authenticates it (see [Backend API](#backend-api)).

These are the only HTTP calls the Pico makes. Registration happens once, on first boot. The state fetch happens at login and again after every MQTT reconnect (see [Keeping the Pico's state current](#keeping-the-picos-state-current)). Neither happens per action, so the extra latency doesn't matter; everything during play goes over MQTT.

Because the token only exists in `login.txt`, deleting that file (or reflashing the Pico without it) loses the account: the next boot registers a new player.

Logging out takes two steps, because the website and the Pico each hold the login separately:

- **Website:** the Logout button refreshes the page, which drops the token. 
- **Pico:** unplugging it from the PC ends its session. When it is plugged back in, it reads the same token from `login.txt` and sends it again.

To log back in, the player plugs the Pico in, clicks **Login** on the website and picks the Pico's port, then presses the Pico's button.

### RFID

The original design used an RFID card as the account. It was going to work like this:

- The card holds the player's token, instead of `login.txt`.
- When the player taps a card on the module, the Pico reads it. An empty card is a new player: the Pico calls `POST /api/register` and writes the returned token to the card. A card that already has a value is a returning player, and the value is their token.
- Because the account lives on the card, a player could log in on any Pico by tapping their card. Every time the Pico is powered on, the player has to tap their card again, which logs them out at the end of each session.

We couldn't get the RFID module on the breadboard to work. To troubleshoot it, we:

- tried different code for the module,
- tried modules of the same type from different kits,
- tried different RFID cards,
- checked with an NFC scanner app on a phone that the cards were the right type for the module.

None of these fixed it, so the token is saved in `login.txt` instead. Everything after the token is read stays the same and switching back to a card would only change where `getLogin()` reads and writes the token.

## MQTT

The Pico and the backend both connect to the public HiveMQ broker (`broker.hivemq.com`; TLS on port 8883; no credentials). The frontend never connects to the broker. MQTT is used during play, because an HTTP request per action adds noticeable latency. It carries two things:

- **Live state updates reach the Pico.** The Pico gets its starting state (i.e. upgrade levels, almanac, and equipped bait) over HTTP at login (see [Signing in and registering](#signing-in-and-registering)). After that, when the player buys an upgrade or equips a bait on the website, the backend publishes the player's new state, so the Pico's copy stays current.
- **Caught fish are sent to the inventory.** The Pico works out the random catch itself and publishes the fish's id. The backend receives it and adds the fish to the player's inventory, and almanac if not already present.

The Pico runs the fish selection from [randomFishSelection.md](randomFishSelection.md), using the previously mentioned state holds in memory. It adds each newly caught fish to its own almanac straight away, so the new-fish boost works without waiting for the backend.

### Topics

All topics start with the group prefix `picoAssignmentDWL`. `<id>` is the player's id: the SHA-256 hash of their token.

| Topic                          | Published by | Subscribed by | QoS |
| ------------------------------ | ------------ | ------------- | --- |
| `picoAssignmentDWL/<id>/state` | Backend      | Pico          | 1   |
| `picoAssignmentDWL/<id>/catch` | Pico         | Backend       | 1   |

The backend subscribes to `picoAssignmentDWL/+/catch` (`+` matches any player id) and takes the player from the topic. Each Pico only subscribes to its own player's `state` topic.

### Messages

State (backend -> Pico), published after every successful rod, luck, bait or equip change and after every fish added to the almanac (even if it was already there, so every catch publishes one). Each message is a full snapshot, so applying it twice gives the same result and a missed message is fixed by the next one:

```json
{
    "rod": 2,
    "luck": 1,
    "equippedBait": 3,
    "baits": [0, 3],
    "almanac": ["665f1c2e9b1d4a0012ab34cd", "665f1c2e9b1d4a0012ab34ce"]
}
```

`almanac` is the list of caught fish ids, used for the new-fish boost. Money and inventory aren't included, because they don't affect what fish is generated. 

Catch (Pico -> backend):

```json
{ "fishId": "665f1c2e9b1d4a0012ab34cd" }
```

The backend rejects ids that aren't valid ObjectId hex strings, looks the fish up in the `Fish` collection and rejects unknown ids, so the Pico never supplies a name or price.

QoS 1 is "at least once", so a catch could occasionally be delivered twice and add a duplicate fish. This is accepted: it needs a lost acknowledgement, it costs at most one extra fish in the player's own account, and avoiding it (QoS 0 or a unique id per catch) is worse or more work for the given timeframe.

### Backend implementation

The backend side is [backend/src/mqtt/mqtt.ts](backend/src/mqtt/mqtt.ts). `startMqtt()` is called from [server.ts](backend/src/server.ts) once the database is connected.

- **Catches.** For every message on `picoAssignmentDWL/+/catch`, the backend parses the JSON, finds the user whose `login` equals the id in the topic, then calls the same `addToInventory` and `addToAlmanac` service functions ([user.service.ts](backend/src/services/user.service.ts)). Invalid JSON, unknown players and invalid or unknown fish ids are handled properly.
- **State.** The service functions that change the rod, luck, baits, equipped bait, or add to the almanac, call `publishState(login, state)` after the update succeeds. The HTTP controllers pass `req.user.login`, which the auth middleware sets to the token hash, and the catch handler passes the id from the topic.
- **Connection.** The backend uses a clean session. Catches published while the backend is offline are not queued by the broker (again, due to given time frame), so they are lost.

### Pico code flow

The Pico code is a set of nested loops. [main.py](pico/main.py) holds the main loop. Each minigame has its own loop that runs until the minigame ends and then returns to the loop that called it.

```
main.py: main loop
 ├─ every pass, once subscribed to MQTT: checkState(), pingBroker()         mqtt.py
 ├─ first button press (login): getLogin(), subscribeState(), loadState()   startup.py, mqtt.py
 └─ button presses after: startCastingMinigame(userHash)                    casting.py
      │    └─ casting loop: runs until the player presses on the target LED, then returns its position
      └─ startReelingMinigame(fishPos, userHash)                            reeling.py
           └─ reeling loop: runs until the progress bar is full
                └─ generateFish()                                           randomFish.py
                └─ publishFish(userHash, fish)                              mqtt.py
```

### Pico implementation status

[pico/main.py](pico/main.py) is the entry point and uses the other files:

- **Wi-Fi.** [startup.py](pico/startup.py) connects to Wi-Fi with the `SSID` and `WIFI_PASSWORD` from `secrets.py` (copy [secrets.example.py](pico/secrets.example.py) to make it).
- **Login.** `getLogin()` in `startup.py` registers with `POST /api/register` on first boot and saves the token in `login.txt`, or reads the saved token (see [Signing in and registering](#signing-in-and-registering)). The backend URL is `API_URL` from `secrets.py`. It then prints the token over serial for the website (see [Pico serial protocol](#pico-serial-protocol)).
- **Player id.** `main.py` hashes the token with SHA-256 to get the player id used in the topic.
- **State.** `subscribeState(userHash)` in [mqtt.py](pico/mqtt.py) subscribes to `picoAssignmentDWL/<id>/state` over TLS with QoS 1. `fetchState(token)` in `startup.py` makes the `GET /api/state` request, and `loadState(token)` stores the result in the module-level `state` dict. State messages from the broker update the same dict. Only `rod`, `luck`, `baits`, `equippedBait` and `almanac` are kept.
- **Connection upkeep.** `checkState()` and `pingBroker()` handle incoming messages and pings, and `reconnect()` reconnects, resubscribes and refetches the state when the connection drops (see [Keeping the Pico's state current](#keeping-the-picos-state-current)).
- **Catches.** `publishFish(userHash, fish)` publishes one catch to `picoAssignmentDWL/<id>/catch` with QoS 1. If the connection is dead, it reconnects and retries once; if that fails, the catch is dropped.

- **Fish selection.** When the reeling progress bar fills, [reeling.py](pico/reeling.py) calls `generateFish()` in [randomFish.py](pico/randomFish.py), which implements [randomFishSelection.md](randomFishSelection.md) using the rod, bait, luck and almanac in `state` and the fish in [fish.json](pico/fish.json). It then publishes the fish's id.
- **LCD.** [WriteToLcd.py](pico/WriteToLcd.py) writes to the 16x2 I2C LCD. Status messages go on the first line. After a catch, the first line shows the fish name and the second shows its rarity.

### Keeping the Pico's state current

The starting state comes from `GET /api/state`, not from the broker, so nothing depends on the broker retaining messages. The Pico follows these rules:

- **Subscribe first, then fetch.** If the player buys something between the two steps, the change arrives over MQTT instead of being missed. The HTTP response is the baseline and any later MQTT state message overwrites it.
- **Refetch after a reconnect.** If the Pico's MQTT connection drops and comes back, it may have missed updates, so it calls `GET /api/state` again. The public broker gives no uptime guarantee and may drop messages, and clients are expected to reconnect on their own. If a reconnect attempt fails, `checkState()` tries again at most every 10 seconds.
- **Keep the connection alive.** The Pico mostly listens between casts, so [main.py](pico/main.py) calls `pingBroker()` (a ping every 30 seconds, against a keepalive of 120) and `checkState()` (a non-blocking check for messages) on every pass of its loop, as soon as the Pico has subscribed to its `state` topic. This includes the time after a failed state load, so the connection doesn't time out while the player waits to retry. The casting and reeling minigames run their own loops and don't call them, so updates and pings wait until the minigame ends.

### Website updates

The Pico's catches arrive at the backend, not the browser, so the website polls for them: every 15 seconds it re-fetches the visible tab (`GET /api/almanac` or `GET /api/inventory`), and it fetches a tab straight away when the player switches to it (see [Almanac and inventory](#almanac-and-inventory)).

### Security

The connection to the broker is encrypted with TLS, but the broker is public and has no accounts: anyone who knows a topic can read it and publish to it. The player id in the topic is therefore the only protection, so it is a hash and not guessable, and nothing sensitive (tokens, passwords) is ever put in a message. State and catches only contain game data.

### CORS

The backend allows browser requests from `http://localhost:5173` (the Vite dev server) and from the address in the `FRONTEND_URL` environment variable, if it is set. When the website is deployed, `FRONTEND_URL` is set to its address. `POST /api/register` is called by the Pico, not a browser, so CORS doesn't block it. MQTT is between the Pico, the broker and the backend, so it isn't affected either.

## Pico serial protocol

The Pico must open a USB serial connection at **115200 baud** and send one JSON object per line once it has the player's token at boot. [startup.py](pico/startup.py) sends two lines:

```json
{ "value": "<token>", "done": "false" }
{ "done": "true" }
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

## V2 plans

Known gaps and planned improvements.

- **One source of truth for game rules.** Give the frontend, backend and Pico one source of truth for game rules. For now, the upgrade prices are hard-coded in the frontend as well as in `backend/src/config/game.ts`: the rod and luck prices in [Shop.tsx](frontend/src/components/Shop.tsx) (`ROD_PRICES`, `LUCK_PRICES`) and the bait prices in [BaitUpgradeMenu.tsx](frontend/src/components/BaitUpgradeMenu.tsx). The rarity names are also duplicated, in `Shop.tsx`, [Fish.tsx](frontend/src/components/Fish.tsx) and [reeling.py](pico/reeling.py) (the rarity shown on the LCD). The Pico's [randomFish.py](pico/randomFish.py) also hard-codes the base rarity weights and bait multipliers from [randomFishSelection.md](randomFishSelection.md). Changing a price or rarity in `game.ts` means updating these files too.
- **Casting distance affects the catch.** Make the distance the player locks in during the casting minigame affect which fish is caught. For now it is saved but never used, so every cast has the same odds.
- **Retry the first state fetch automatically.** If `GET /api/state` fails at login for a reason other than a `401`, such as a network error or a `500`, the Pico shows "state load fail" and goes back to "please log in" (it can't cast, because the fish selection needs the state), and the player has to press the button again to retry. The MQTT connection stays open and is kept alive in the meantime.
- **Reconnect Wi-Fi after it drops.** Only MQTT is reconnected for now.
- **Several accounts per Pico, and account recovery.** The Pico is the account: its single token lives in `login.txt`, so one Pico can only be one player, and deleting that file (or reflashing the Pico without it) loses the account for good (see [Signing in and registering](#signing-in-and-registering)). A later version could let one Pico switch between several accounts, and let a player get their account back if the token is lost.

## Schematic

<img width="1422" height="1822" alt="Pico Assignment Schematic" src="https://github.com/user-attachments/assets/fca84bd3-b23b-4e2a-9128-d12c18872d19" />

### Parts list
- 1 Raspberry Pi Pico W (v1/2)
- 1 breadboard
- 1 LED bar
- 16 LEDS
- 1 Button
- 1 Potentiometer
- 1 LCD screen
