# Affinity Play — implementation and verification

Route: https://affinityfc.org/teste/tesla/

The existing static route was retained inside the live repository and existing Cloudflare deployment. No separate application, hosting service, paid proxy or new infrastructure was created. The main site and existing private Worker routes remain in the same project.

## Features

- Affinity navy, gold and light palette; wide player, large touch controls, fullscreen and responsive single-column mobile presentation.
- Initial YouTube video `3HOKK2MTtNQ`, loaded only after the visitor chooses to load it. Playback itself is manual. Official YouTube IFrame API, nocookie embed host, onError handling and an official YouTube fallback link. Public search is implemented through the official YouTube Data API with a server-only `YOUTUBE_DATA_API_KEY`.
- Search results use validated video IDs, public titles/channel names and thumbnails on the official thumbnail host. Search is disabled with an explicit setup message until an administrator configures the official API key. No Google visitor-account connection is required for public search. The YouTube Data API is enabled in the authorized Affinity Portal Google Cloud project; a dedicated key restricted to that API is stored as a Cloudflare Worker secret.
- IPTV account configuration: connection name, HTTPS server, username and password. Supports providers with the Xtream-compatible live-stream API and browser CORS support. A searchable channel list stays in session memory. Credentials go directly to the configured provider, with no cookies, redirects or referrer; they are never sent to Affinity APIs, analytics or persistent browser storage. Disconnecting/leaving clears the connection and releases playback.
- Direct authorized HTTPS HLS links remain available. Safari/native HLS is preferred; MSE browsers dynamically import the local pinned `hls.js` 1.7.4 package only when needed. Library source maps are not deployed. The Apache license is included.
- Switching sources, stopping or leaving releases old HLS/YouTube players and removes the old video source. Pending asynchronous loads cannot resurrect an old player.
- Netflix opens its official service. No Netflix interception, DRM circumvention or vehicle restriction bypass is implemented.

## Verification

- Local build: `npm run build:media --prefix recovered-live/dependencies`; dependencies installed and pinned through npm, not a third-party CDN.
- 24 targeted checks across parsing, URL validation, source cleanup/races, no autoplay, native HLS preference, credential-safe errors, provider configuration, search/API-key handling, rate limits, local HLS artifact consistency, static-file boundaries and homepage availability.
- Browser: the specified initial YouTube video rendered and played in the embedded player; its playback time advanced. The requested Mux HLS sample played, reaching readyState 4 with no media error. Playback started only after manual action.
- Browser: three cycles between YouTube and HLS removed the prior iframe or native video source, leaving a single active source.
- Mobile viewport 390 px: document width 390 px, player 356 px, control card 358 px; no horizontal overflow. Desktop layout was visually inspected. These are viewport checks, not a real iPhone/Android/Tesla hardware certification.
- IPTV account connection and failed/malformed provider responses were validated using synthetic fixtures. An actual subscription/provider was not available for testing; HTTPS, CORS and HLS output support are required from that provider.
- Public search logic and quota guards were tested with synthetic official-API responses. Live public search returned 12 real NASA-related results on the deployed page, and selecting a result loaded its official embedded player and manual playback advanced to 9.19 seconds (readyState 4, no video error). The credential never appears in static files, repository or public responses.

## Main changed files

- `public/teste/tesla/index.html`, `player.css`, `player.js`, `player-core.js`, `iptv-account.js`, local HLS module and license, and a scoped local Affinity logo.
- `worker/media-youtube-search.js` and a small route hook in `worker/current-worker.js`.
- `dependencies/package.json`, lockfile, `build-media-player.mjs`, scoped `public/_headers`, and regression tests.

The page explicitly respects vehicle playback restrictions. Compatibility and behavior in an actual Tesla still require a real vehicle test while parked. The search setup limit is 90 provider calls/day and 10 requests/source per 15 minutes; repeated public result queries can use a short in-memory cache. No additional paid search plan is enabled.
