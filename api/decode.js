import { SpotifyClient } from "../src/spotifyClient.js";
import { decodeMessage } from "../src/decoder.js";
import { handleOptions, parseJsonBody, sendJson } from "./utils.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Método no permitido. Usa POST." });
  }

  try {
    const body = await parseJsonBody(req);
    const { playlistUrl, hash, access_token } = body;

    if (!playlistUrl) return sendJson(res, 400, { error: "Falta 'playlistUrl' en el cuerpo." });
    if (!hash) return sendJson(res, 400, { error: "Falta 'hash' (clave generada por encode)." });

    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const token = access_token || bearer;
    if (!token) return sendJson(res, 401, { error: "Falta access_token. Inicia sesión con Spotify primero." });

    const spotifyClient = new SpotifyClient(token);
    const result = await decodeMessage({ playlistUrl, hash, spotifyClient });

    return sendJson(res, 200, {
      ok: true,
      message: result.message,
      decryptedChunks: result.decryptedChunks,
      playlistId: result.playlistId,
    });
  } catch (err) {
    return sendJson(res, 500, { error: err.message || "Error interno en decode." });
  }
}
