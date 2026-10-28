# Trading JARVIS AI — Demo-first prototype

A responsive web app/PWA starter that runs on iPhone, iPad, and desktop browsers. This is an original prototype, not a clone of another site's code or branding.

## What works now
- Responsive navigation and dashboard.
- Locally stored demo balance, paper positions, and simulated closed-trade outcomes.
- Transparent, hard-coded illustrative scanner scores for three placeholder markets.
- Create/pause/delete paper bot configurations; manually simulate one paper outcome.
- Trade journal with local browser storage and CSV export.
- Simple risk calculator.
- Basic local performance metrics and illustrative equity bars.
- PWA manifest/service worker for install-like behavior when hosted over HTTPS.

## Simulated / not connected
- Prices and market changes are illustrative constants, not live quotes.
- Scanner scores are hard-coded demonstration rules, not AI/ML and not validated trading signals.
- Paper trades and bot outcomes are randomized simulations; no broker order is placed.
- No Deriv, MT4/MT5, forex broker, Gold feed, account, or authentication is connected.
- Position-sizing "units" is generic arithmetic, not a broker-specific lot-size calculator.
- LocalStorage data stays in the current browser profile and is not synced between devices.

## Run locally
1. Extract the ZIP.
2. Open `index.html` in a modern browser. Most dashboard features work; service-worker/PWA install requires HTTPS or localhost.
3. For an iPhone/iPad install-style experience, host the folder on a static HTTPS host (e.g. GitHub Pages) and open the URL in Safari.
4. Safari Share → Add to Home Screen.

## Free hosting using GitHub Pages (iPhone/iPad)
1. Sign in/create a GitHub account.
2. Create a new public repository, e.g. `trading-jarvis-ai`.
3. Upload `index.html`, `styles.css`, `app.js`, `manifest.json`, and `sw.js` from this ZIP (you can upload the ZIP's extracted files using GitHub's mobile website or the GitHub app where supported).
4. In the repository, open Settings → Pages.
5. Under build/deployment, choose deploy from branch, select `main` and `/ (root)`, then Save.
6. Wait for GitHub Pages to publish the URL. Open it in Safari, test it, then Share → Add to Home Screen.
7. The app's local data is saved per browser/device. Export your journal CSV regularly if you need a backup.

## Security architecture for a real connected version
- Front end: this responsive PWA; display quotes/signals and allow user controls.
- Backend: a small HTTPS API (e.g. a serverless function) handles provider authorization, market-data requests, strategy execution, and audit logs.
- Secrets: broker/API tokens live only in server-side secret storage, never in `app.js`, HTML, GitHub, or browser LocalStorage.
- Broker connection: implement a provider-specific OAuth/token flow after reviewing the provider's current API terms and supported account types. Begin with demo-only credentials and minimum permissions.
- Execution: server-side order service must enforce max risk/trade, max daily loss, symbol allowlist, duplicate-order protection, rate limits, and a kill switch. Require explicit opt-in before any future live-trading mode.
- Reliability: log each signal, quote timestamp, order request/response, and error; reject stale quotes; handle disconnects safely.
- Validation: historical backtest, walk-forward/out-of-sample test, paper trading, and monitoring before considering live use.

## Important next build milestones
1. Replace placeholder quotes with a real-time data provider for each selected market.
2. Define exact contract specs and supported symbols for Deriv Volatility, forex, and Gold.
3. Implement the scanner as transparent, testable strategy rules; do not call it AI unless a real model is built and evaluated.
4. Build backend demo-account connection and paper execution using real quote streams.
5. Add login, encrypted server-side storage, database sync, and data export.
6. Only after extensive demo validation, assess broker order execution and add a disabled-by-default live switch with hard risk limits.

## Disclaimer
This is educational software, not financial advice or a promise of profit. Simulation results do not predict live performance. Trading can lose money.
