# THE HIDDEN TRACK PROJECT

Cifra y descifra mensajes usando playlists de Spotify. El mensaje vive en el orden y en fragmentos de los títulos; las opciones de cifrado vienen desde variables de entorno y se empaquetan en un hash que sirve como clave para el decoder.

## Flujo rápido
1) Configura `.env` (ver más abajo) y despliega en Vercel.  
2) En la UI web haz login con Spotify (Authorization Code + PKCE).  
3) En la pestaña **Coder**, envía un mensaje: recibes `playlistUrl` y `hash` (clave).  
4) En **Decoder**, pega la URL del playlist y el `hash` para reconstruir el mensaje.

## Variables de entorno
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI` (ej. `https://the-hidden-track-project.vercel.app/callback`)
- `CIPHER_ROT_SHIFT` (por defecto 3)
- `CIPHER_CHUNK_SIZE` (por defecto 1)
- `CIPHER_DECOY_RULE` (por defecto `every_3rd_track`)
- `CIPHER_DECOY_FILTER` (por defecto `duration_is_odd`)

## API serverless
- `POST /api/encode`  
  Body: `{ "message": "MENSAJE CIFRADO", "playlistName": "Opcional", "isPublic": false }`  
  Headers: `Authorization: Bearer <access_token>`  
  Respuesta: `{ ok, playlistUrl, playlistId, hash }` (el hash codifica las opciones de cifrado).

- `POST /api/decode`  
  Body: `{ "playlistUrl": "https://open.spotify.com/playlist/XXXX", "hash": "<clave>" }`  
  Headers: `Authorization: Bearer <access_token>`  
  Respuesta: `{ ok, message, decryptedChunks, playlistId }`.

## ¿Qué contiene el hash?
Las opciones usadas para cifrar: `chunk_size`, `rot_shift`, `decoy_rule`, `decoy_filter` (tomadas de `.env`, con defaults si faltan). El decoder toma el hash, lo decodifica y aplica esas reglas para saltar señuelos, extraer chunks y revertir ROT.

## Estructura principal
- `index.html`: UI con pestañas Coder/Decoder y login Spotify.
- `api/encode.js`: crea playlist y devuelve hash de opciones.
- `api/decode.js`: lee playlist y reconstruye mensaje usando hash.
- `api/auth/exchange.js`: intercambio de `code` por `access_token` (PKCE).
- `api/config.js`: expone `clientId` y `redirectUri` al front.
- `src/encoder.js`, `src/decoder.js`, `src/spotifyClient.js`, `src/options.js`, `src/normalizer.js`.

## Despliegue en Vercel
- Incluye `vercel.json` con rewrite a `/callback.html`.
- Variables requeridas: las del bloque “Variables de entorno”.
- Tras login, el token se guarda en `localStorage` y se envía en `Authorization` a las APIs.
