# Trading JARVIS AI v0.2 — Deriv public market data

Responsive PWA starter for iPhone/iPad and desktop browsers.

## New in v0.2
- Connect/Disconnect button for Deriv's public WebSocket market-data endpoint.
- Checks the current `active_symbols` list for `1HZ100V` before subscribing.
- Requests historical 5-minute OHLC candles (`granularity: 300`, count 100).
- Subscribes to ticks for live quotes and aggregates incoming ticks into local 5-minute candles.
- Displays live quote, candle direction/time, and a compact recent-candle strip.
- Derives a transparent rule-based BUY/SELL/WAIT label and score from recent five-minute candles when enough data is available.
- No API token, account login, balance request, proposal, buy, or sell request is used.

## What is real vs not real
**Real when connected:** quote ticks and OHLC history received from Deriv's public market-data WebSocket, if the endpoint is reachable and `1HZ100V` appears in the returned active-symbol list. The app shows a connection status and verifies the symbol instead of assuming success.

**Still illustrative/simulated:** Forex and Gold prices/signals remain placeholders; paper trade results and bot outcomes are randomized simulations; the rule score is a simple example rule, not AI/ML, not backtested, and not a claim of profitability. No real/demo broker orders are placed. The app's `$10,000` balance is a local paper balance, not a Deriv account balance.

## API behavior used
- Public WebSocket: `wss://ws.derivws.com/websockets/v3?app_id=1089` (the official docs use app ID 1089 for testing; register your own app ID before public release). Public market-data requests do not require account authentication.
- `active_symbols: "brief"` verifies current symbol availability.
- `ticks_history` with `style: "candles"`, `granularity: 300`, `count: 100`, `end: "latest"` requests 5-minute candles.
- `ticks` with `subscribe: 1` subscribes to new quotes.
- Symbol used: `1HZ100V` (Volatility 100 Index (1s)); this is also used in Deriv's published market-data workflow example. The code still checks `active_symbols` at runtime and displays an error if it is not listed.
- No authenticated demo account is required for public market data. This is separate from authenticated demo-account trading, which is not implemented.

## Deploy the upgrade from iPad
1. Extract this ZIP in Files.
2. Open your GitHub repository: `https://github.com/denario24-glitch/jarvis-trading-bot-`.
3. For each of these existing root files, open it and choose the pencil/edit option, replace its complete contents with the matching file from this v0.2 package, then commit: `index.html`, `styles.css`, `app.js`, `sw.js`, and `README.md`. (You may also use Add file → Upload files and upload these updated files together; GitHub may ask you to confirm replacing existing files.)
4. Commit message: `Upgrade JARVIS with Deriv public 5m data`.
5. In Settings → Pages, keep `main` and `/(root)`. Wait for the deployment to finish.
6. Open the website in Safari and reload. If an old version remains, close the tab and reopen it; the updated service worker uses a new cache version.
7. Open AI Scanner and tap **Connect Deriv feed**. Wait for status `CONNECTED`, a symbol verification message, a live quote, and candle history. If the API doesn't return the symbol or connection fails, the app reports that rather than pretending data is live.

## Security and limits
- Public feed is read-only. No token is requested or stored.
- Never paste Deriv passwords, API tokens, or account secrets into the app's front-end files.
- This build intentionally has no order execution. Keep demo testing separate from live trading.
- Data availability, supported symbols, and API behavior can change; confirm using Deriv's official docs and the live `active_symbols` response.
- The 5-minute label is a basic rule demonstration, not financial advice or an expectation of profit.

## Official API references
- API overview: https://developers.deriv.com/docs/intro/api-overview/
- Active symbols: https://developers.deriv.com/docs/data/active-symbols/
- Ticks stream: https://developers.deriv.com/docs/data/ticks/
- Ticks history: https://developers.deriv.com/docs/data/ticks-history/
- Deriv market-data workflow examples: https://developers.deriv.com/docs/workflows/

## Connection troubleshooting update
The WebSocket URL uses Deriv's documented `ws.derivws.com` host and includes the documented testing app ID `1089`. The app ID identifies the application; it is not an account token. If the connection still fails, test another network (Wi-Fi vs hotspot), then inspect Safari/Web Inspector for the WebSocket close/error details. Do not paste account credentials into the frontend.

## Connection diagnostic build
This revision sends a public `ping` immediately after the socket opens and shows the WebSocket close code/reason in the status area/toast when the browser provides it. Browser `error` events often do not expose a precise cause; close details can still be unavailable. If it reports a network error without a close code, test a different network and confirm the deployed `app.js` URL contains `wss://ws.derivws.com/websockets/v3?app_id=1089`.

## Diagnostic visibility fix v0.2.1
This patch preserves the WebSocket close code/reason in the scanner's Data source details. Earlier code accidentally overwrote that message during display refresh, so `CLOSED 1006` appeared while the reason was hidden. This patch does not itself fix a network/handshake failure; it makes the next result more informative.
