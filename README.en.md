# THE HIDDEN TRACK PROJECT

Encrypt and decrypt messages using Spotify playlists. The message lives in the order and fragments of track titles. Cipher options come from environment variables and are packed into a hash that acts as the decoder key.

## Quick flow
1) Configure `.env` (see below) and deploy to Vercel.  
2) In the web UI, log in with Spotify (Authorization Code + PKCE).  
3) In the **Coder** tab, send a message: you get `playlistUrl` and `hash` (the key).  
4) In **Decoder**, paste the playlist URL and the `hash` to rebuild the message.

## Environment variables
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI` (e.g. `https://the-hidden-track-project.vercel.app/callback`)
- `CIPHER_ROT_SHIFT` (default 3)
- `CIPHER_CHUNK_SIZE` (default 1)
- `CIPHER_DECOY_RULE` (default `every_3rd_track`)
- `CIPHER_DECOY_FILTER` (default `duration_is_odd`)

## Serverless API
- `POST /api/encode`  
  Body: `{ "message": "ENCRYPTED MESSAGE", "playlistName": "Optional", "isPublic": false }`  
  Headers: `Authorization: Bearer <access_token>`  
  Response: `{ ok, playlistUrl, playlistId, hash }` (hash encodes the cipher options).

- `POST /api/decode`  
  Body: `{ "playlistUrl": "https://open.spotify.com/playlist/XXXX", "hash": "<key>" }`  
  Headers: `Authorization: Bearer <access_token>`  
  Response: `{ ok, message, decryptedChunks, playlistId }`.

## What’s inside the hash?
The options used to encrypt: `chunk_size`, `rot_shift`, `decoy_rule`, `decoy_filter` (taken from `.env`, with defaults if absent). The decoder reads the hash, applies those rules to skip decoys, extract chunks, and reverse ROT.

## Main structure
- `index.html`: UI with Coder/Decoder tabs and Spotify login.
- `api/encode.js`: creates playlist and returns options hash.
- `api/decode.js`: reads playlist and rebuilds the message using the hash.
- `api/auth/exchange.js`: exchanges `code` for `access_token` (PKCE).
- `api/config.js`: exposes `clientId` and `redirectUri` to the front end.
- `src/encoder.js`, `src/decoder.js`, `src/spotifyClient.js`, `src/options.js`, `src/normalizer.js`.

## Deploy on Vercel
- `vercel.json` includes a rewrite to `/callback.html`.
- Required vars: see “Environment variables”.
- After login, the token is stored in `localStorage` and sent in `Authorization` to the APIs.
