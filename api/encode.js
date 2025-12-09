import { SpotifyClient } from "../src/spotifyClient.js";
import { encodeMessage, generateRotShift } from "../src/encoder.js";
import { getCipherOptionsFromEnv, encodeOptionsHash } from "../src/options.js";
import { handleOptions, parseJsonBody, sendJson } from "./utils.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Método no permitido. Usa POST." });
  }

  try {
    const body = await parseJsonBody(req);
    const {
      message,
      playlistName = "THE HIDDEN TRACK PROJECT",
      isPublic = true,
      access_token,
    } = body;

    if (!message) return sendJson(res, 400, { error: "Falta 'message' en el cuerpo." });

    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const token = access_token || bearer;
    if (!token) return sendJson(res, 401, { error: "Falta access_token. Inicia sesión con Spotify primero." });

    const spotifyClient = new SpotifyClient(token);
    const me = await spotifyClient.getCurrentUser();
    const userId = me?.id;
    if (!userId) return sendJson(res, 500, { error: "No se pudo obtener el userId desde Spotify /me." });

    const envOptions = getCipherOptionsFromEnv();
    const options = {
      chunkSize: envOptions.chunk_size,
      rotShift: envOptions.rot_shift || generateRotShift(),
      decoyRule: envOptions.decoy_rule,
      decoyFilter: envOptions.decoy_filter,
    };

    const result = await encodeMessage({
      message,
      rotShift: options.rotShift,
      chunkSize: options.chunkSize,
      decoyRule: options.decoyRule,
      decoyFilter: options.decoyFilter,
      spotifyClient,
      userId,
      playlistName,
      isPublic,
    });

    const hash = encodeOptionsHash({
      chunk_size: options.chunkSize,
      rot_shift: options.rotShift,
      decoy_rule: options.decoyRule,
      decoy_filter: options.decoyFilter,
    });

    return sendJson(res, 200, {
      ok: true,
      playlistUrl: result.playlistUrl,
      playlistId: result.playlistId,
      hash,
    });
  } catch (err) {
    return sendJson(res, 500, { error: err.message || "Error interno en encode." });
  }
}
