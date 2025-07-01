# Parking Meter App 🅿️💰

**Fullstack Electron-based parking kiosk** app, built for real-world parking meters with hardware integrations and local-first resilience.

## ⚙️ What It Does

- 🧾 Handles real payments with:
  - Coin acceptor (ccTalk)
  - Bill acceptor
  - Card reader (via payment API)
- 🖨️ Prints receipts using thermal printers
- 🧠 Runs on Electron (desktop UI) with offline-first logic
- 🗃️ Stores transactions locally for later **cash collection**
- 🌐 Syncs with remote backend via REST API

## 🏗️ Tech Stack

- **Electron + React** — frontend & native app shell
- **Node.js** — hardware integration & services
- **SQLite** — embedded local DB for offline mode
- **SerialPort** — communication with coin/bill acceptors
- **Custom payment API integration**

## 💡 Why It Matters

This is not a demo — this app runs on actual parking meters in production.

It shows my ability to:
- Write production-grade fullstack apps with hardware integration
- Manage async IO with physical devices (ccTalk protocol, printers, card readers)
- Build fault-tolerant offline-first systems
- Design UX for kiosk/touchscreen hardware

## ▶️ Usage

bash
git clone https://github.com/nariman589/parking-meter
cd parking-meter
npm install
npm start

Requires access to actual parking meter hardware to fully test.

🔌 Hardware Integrations
Coin acceptor via ccTalk (serial)

Bill acceptor (USB/serial)

Card reader via vendor’s SDK

Thermal printer for receipts

Touchscreen display (Electron UI)

📁 Features
Dynamic pricing, time tracking

Change calculation logic

Reprint last ticket

Admin panel for cash-out

Error handling for device failures

Clean UI optimized for kiosk mode

🧪 Testability
Includes mock device modes for local development. Interfaces abstracted to swap real devices for testing.

Made for real-world deployment in Kazakhstan 🇰🇿.
Built end-to-end: from UI to embedded system behavior.
