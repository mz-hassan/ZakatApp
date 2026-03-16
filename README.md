# Zakat Manager

A local-first Progressive Web App (PWA) to track, calculate, and distribute Zakat for your household — built with privacy in mind. All data stays on your device.

## Features

### Core
- **Multi-profile support** — track Zakat for yourself, spouse, parents, or anyone in your household
- **Zakat year management** — create yearly cycles with automatic holding snapshots when rolling over
- **2.5% auto-calculation** — Zakat due is computed from eligible holdings minus interest
- **Allocation tracking** — see what's been given, planned, and still unallocated at a glance

### Holdings & Interest
- **Holdings management** — add bank accounts, gold, investments, property, and other assets with categories
- **Interest exclusion** — log interest entries individually, optionally linked to specific holdings, to exclude from Zakat calculation
- **Edit & delete** — full CRUD on holdings and interest entries with update timestamps

### Payments & Recipients
- **Payment recording** — log completed payments with date, amount, notes
- **Payment planning** — plan future payments and mark them as paid when done
- **Recipient directory** — maintain a list of recipients with full payment history and totals
- **Trustee system** — optionally assign a trustee (person distributing on your behalf) to any payment
- **Trustee directory** — view all trustees with their total distributed amounts and transaction history

### Data & Security
- **PIN lock** — 4-digit PIN with SHA-256 hashing protects app access
- **Full backup/restore** — export all data as JSON, restore on any device
- **Spreadsheet export** — download all transactions as CSV for record-keeping
- **100% offline** — works without internet as a PWA, installable on any device

### Design
- **Mobile-first** — large touch targets, optimized for phones
- **Dark theme** — elegant dark UI with emerald and gold accents
- **No tracking, no ads, no server** — your financial data never leaves your device

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build | Vite 6 |
| Database | Dexie.js (IndexedDB) |
| PWA | vite-plugin-pwa + Workbox |
| Styling | CSS custom properties |

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+ installed

### Install & Run

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/ZakatApp.git
cd ZakatApp

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Install on Android

This is a PWA — no app store needed:

1. **Build & deploy** the app to any static host (GitHub Pages, Vercel, Netlify, etc.)
2. Open the deployed URL in **Chrome on Android**
3. Tap the **⋮ menu** → **"Add to Home screen"** or **"Install app"**
4. The app will install with its own icon and open in standalone mode (no browser chrome)

See the [Deployment](#deploy-to-github-pages) section below for free hosting with GitHub Pages.

## Deploy to GitHub Pages

1. Update `vite.config.js` — add your repo name as the base path:
   ```js
   export default defineConfig({
     base: '/ZakatApp/',
     // ... rest of config
   });
   ```

2. Install the deploy plugin:
   ```bash
   npm install -D gh-pages
   ```

3. Add a deploy script to `package.json`:
   ```json
   "scripts": {
     "deploy": "npm run build && npx gh-pages -d dist"
   }
   ```

4. Deploy:
   ```bash
   npm run deploy
   ```

5. Go to **GitHub → Settings → Pages** and set source to `gh-pages` branch

Your app will be live at `https://YOUR_USERNAME.github.io/ZakatApp/`

## Project Structure

```
src/
├── components/       # Reusable UI (Modal, PinLock, EmptyState)
├── db/               # Dexie database schema
├── screens/          # App screens (Home, Profile, Settings, etc.)
├── services/         # Business logic (Zakat calc, backup, CRUD)
└── utils/            # Formatters, constants
```

## License

MIT
