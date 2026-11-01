# Katūbayá: a DaVinci-style agroforest notebook (offline-first)

This app promote freedom by empowering people to farm smart and easier, it helps farmers to own their own farm data and connect directly to customers network, audited by AI-powered technology.

> 1 Peter 2:16 - Live as free people, but do not use your freedom as a cover or pretext for evil, but [use it and live] as bond-servants of God.

## One-line

A local-first agroforestry log that turns field observations into a weekly, sellable availability list, while helping farmers learn the ecology of their system over time.

## Why

Agroforestry thrives through cooperation: soil life, plants, fungi, insects, animals, water, light, and human rhythm. Farmers need a tool that records reality, strengthens learning, and produces a simple market output without surrendering ownership.

## MVP scope

This MVP builds **katubaya only**:

* Runs fully offline after install
* Requires no account
* Keeps all data with the farmer
* Exports contract-defined data so others can build optional services around it

## The cooperation principle (humans, like ecosystems)

> Vovó Katūbayá protege a natureza

[Xohãhi-Pataxó, Katūbayá](https://www.tiktok.com/@xohahi_pataxo/video/7288410734961134853)

katubaya is the **Seed**: open, resilient, farmer-owned.
A healthy ecosystem also creates niches for others to thrive. So katubaya is designed to enable a **Bridge ecosystem** that other builders can create (hosting, automation, signature/verification, premium setup/help, marketplace integrations), **without controlling farmers**.

The rule is simple:

* **Farmers own their history**
* **Exports are portable and inspectable**
* **No lock-in is required for value**
  This keeps “cooperation” aligned with nature: you help and also get helped, without domination.

## MVP outcome (the weekly ritual)

Observe → Log harvest → Update inventory → Generate availability → Share on WhatsApp → Export/backup (or sync to your own server).

## MVP modules

1. Harvest logging

* Record harvest event: crop, quantity, unit, date/time, plot/zone (optional but recommended)
* Estimated expiration date (configurable shelf-life defaults per crop/cultivar)

2. Offline-first PWA

* Works completely offline after install
* Local storage is the source of truth
* No cloud dependency

3. Inventory management (manual, farmer-truthful)

* Current stock by lot (or by crop if simplified)
* Adjustments for loss, damage, self-consumption, gifts, or sales
* Notes for context (why inventory changed)

4. WhatsApp availability template

* Generates a clean copy/paste message:
  items, quantities, units, pickup/delivery windows, ordering instructions (text-only for MVP)
* Designed for fast customer replies and low confusion

5. Export data with datatype contracts

* Contract-validated exports (versioned schemas)
* Export JSON + CSV as a portable “Availability Pack”
* Local backup workflow (download/share file)

6. Register crops (cultures) by category

* Crop catalog: category, cultivar/breed, typical units, shelf-life defaults, notes
* Optional tags for guild/function and seasonality

7. Sync to your own server

* One tap sends the whole local database to a server the farmer controls
* The server keeps dated, inspectable JSON copies and never writes back
* Optional: the app is complete without it

## Offline-first architecture

katubaya is one app with one source of truth: the database on the farmer's device.

### Where the data lives

* **IndexedDB on the device** (`FarmerCoreDB`, through Dexie) holds every table: crops, lots, harvests, adjustments, animal lots, plots, observations, availability lists, settings. Every screen reads it and every action writes to it. No request is needed to read or write anything.
* **The app shell is precached** by a service worker, so once the app has been opened it loads with no network at all. Browsers only install service workers over https or `localhost`, so over plain http on the LAN the phone still needs the server to load the app; its data is local either way. For true offline on phones, serve over https or use the native build.
* **No account, no identity.** The only id the app creates for itself is a random `deviceId`, generated on the first sync so a server can tell two phones apart.

### Two ways to run it

| How | Where the app comes from | Server address in Settings |
| --- | --- | --- |
| **PWA on the local network** | The farmer's own machine serves the built app (`npm run serve`), or the dev server does (`npm run dev`). Phones open `http://<that machine>:<port>` and install it from the browser | Leave empty: the app talks to the origin it was loaded from |
| **Native build (Ionic / Capacitor)** | Installed as an app, so the page has no web origin to talk to | Required: the machine's address, e.g. `192.168.0.10:8787` |

### Sync: a copy on your own server, only when you tap

Settings → **Sincronizar** → **Enviar para o servidor**.

1. The app reads every local table and wraps it as a `SyncPack`: the same manifest the chest export carries (schema version, app version, timestamp, pack id, device id, farm name) plus `tables`, one array per table, exactly as stored.
2. It `POST`s the pack as JSON to `/api/sync` on the configured server.
3. The server writes it to `server/data/<deviceId>/<exportedAt>.json` and answers with how many records it kept. Files are never merged or overwritten, so a phone that was reset cannot erase an earlier copy.

What this deliberately is **not**:

* **Not automatic.** Nothing leaves the device unless the farmer taps the button. No background sync, no polling, no telemetry.
* **Not a source of truth.** The server never writes back. If the phone and the server disagree, the phone is right, so there is no conflict to resolve.
* **Not a cloud.** The server is one Node script with no dependencies that the farmer, or someone they trust, runs on a laptop, a Raspberry Pi or a rented machine. The copies are plain JSON in a folder, readable with any text editor, in the same data contract as the exported chest.

Restoring from a copy is not built in yet. Because the file is the full contract-defined dump, a restore, or a merge of two phones, is a Bridge another builder can write without changing the app.

### Running the server

```bash
npm run build   # once: produces dist/
npm run serve   # serves dist/ and receives syncs on http://<your LAN IP>:8787
```

`PORT` changes the port and `KATUBAYA_DATA_DIR` changes where copies are kept (default `server/data/`, git-ignored). The script prints the addresses to type into the phone. During development `npm run dev` mounts the same receiver on port 8080, so a phone on the Wi-Fi can sync to the dev machine without typing anything.

The receiver accepts any device on the network. That is the right default for a farm's Wi-Fi and the wrong one for the open internet: if you expose it beyond the LAN, put it behind your own VPN or a reverse proxy with authentication. The handler is one function in `server/sync.mjs` if you prefer to add a shared token.

## The cooperation lens (minimal but powerful)

Each record can optionally include:

* Plot/zone
* Guild/function tags (N-fixer, soil-builder, pollinator support, shade, windbreak)
* Context snapshots (soil moisture, weather notes, phenology stage)
* Signals (pest pressure, disease signs, pollinator activity)

These fields keep the MVP lean while building long-term ecological understanding.

## Principles (freedom through rhythm, responsibility through clarity)

* Local-first sovereignty: your data stays yours
* Contracts over guesswork: typed schemas, versioned formats, clear docs
* Share intentionally: exports are explicit and inspectable
* Enable a service ecosystem: others can build Bridges without capturing farmers
* No rankings: protect dignity and community health

## Non-goals for MVP

* No AI dependency
* No social feeds, public leaderboards, or reputation scores
* No required cloud accounts
* No hidden analytics or behavioral tracking
* No built-in marketplace or messaging automation (those belong to optional Bridges)
