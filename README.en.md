# THE HIDDEN TRACK PROJECT

Encrypt and decrypt messages using Spotify playlists. The message lives in the order and fragments of track titles. Cipher options come from environment variables; decoder uses the same config (no hash needed now).

## Quick flow
1) Configure `.env` (see below) and deploy to Vercel.  
2) In the web UI, log in with Spotify (Authorization Code + PKCE).  
3) In the **Coder** tab, send a message: you get `playlistUrl`.  
4) In **Decoder**, paste the playlist URL to rebuild the message (it uses the same config you used to encode).

## Environment variables
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI` (e.g. `https://the-hidden-track-project.vercel.app/callback`)
- `CIPHER_ROT_SHIFT` (default 3)
- `CIPHER_CHUNK_SIZE` (default 1)
- `CIPHER_DECOY_RULE` (currently off; defaults to `none`)
- `CIPHER_DECOY_FILTER` (kept for compatibility)

## Serverless API
- `POST /api/encode`  
  Body: `{ "message": "ENCRYPTED MESSAGE", "playlistName": "Optional", "isPublic": false }`  
  Headers: `Authorization: Bearer <access_token>`  
  Response: `{ ok, playlistUrl, playlistId }`

- `POST /api/decode`  
  Body: `{ "playlistUrl": "https://open.spotify.com/playlist/XXXX" }`  
  Headers: `Authorization: Bearer <access_token>`  
  Response: `{ ok, message, decryptedChunks, playlistId }`.

## How the cipher works (short)
- Normalize text: uppercase, remove accents, spaces become `_`.
- Split in chunks (`CIPHER_CHUNK_SIZE`).
- Apply ROT (`CIPHER_ROT_SHIFT`) to each chunk.
- For each chunk, search Spotify for a track whose title starts with that chunk; build a playlist in order.
- Decode: read titles in order, take the starting chunk, apply inverse ROT, replace `_` with spaces.
  Note: encoder/decoder must share the same config to align ROT and chunk size.

## Main structure
- `index.html`: UI with Coder/Decoder tabs and Spotify login.
- `api/encode.js`: creates playlist.
- `api/decode.js`: reads playlist and rebuilds the message using shared config.
- `api/auth/exchange.js`: exchanges `code` for `access_token` (PKCE).
- `api/config.js`: exposes `clientId` and `redirectUri` to the front end.
- `src/encoder.js`, `src/decoder.js`, `src/spotifyClient.js`, `src/options.js`, `src/normalizer.js`.

## Deploy on Vercel
- `vercel.json` includes a rewrite to `/callback.html`.
- Required vars: see “Environment variables”.
- After login, the token is stored in `localStorage` and sent in `Authorization` to the APIs.
