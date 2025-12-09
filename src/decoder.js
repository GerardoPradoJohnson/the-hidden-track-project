import { applyRot, normalizeText } from "./normalizer.js";
import { playlistIdFromUrl } from "./spotifyClient.js";
import { getCipherOptionsFromEnv } from "./options.js";

function isDecoyPosition(index, rule, decoyPositions) {
  if (rule === "none") return false;
  if (Array.isArray(decoyPositions) && decoyPositions.length) {
    return decoyPositions.includes(index + 1);
  }

  if (rule === "every_3rd_track") {
    return (index + 1) % 3 === 0;
  }
  return false;
}

function extractChunkFromTitle(title, chunkSize) {
  const normalized = normalizeText(title); // upper + accents removed + spaces -> _
  if (normalized.includes("SPACE")) return "_";

  if (chunkSize === 1) {
    // Use the first valid char; encode siempre elige títulos que inician con el chunk.
    for (const char of normalized) {
      if (/^[A-Z0-9_]$/.test(char)) return char;
    }
  }
  for (let i = 0; i <= normalized.length - chunkSize; i++) {
    const candidate = normalized.slice(i, i + chunkSize);
    if (/^[A-Z0-9_]+$/.test(candidate)) return candidate;
  }
  return null;
}

export async function decodeMessage({
  playlistUrl,
  spotifyClient,
  options: providedOptions,
}) {
  if (!playlistUrl) throw new Error("Falta la URL del playlist.");
  if (!spotifyClient) throw new Error("Se requiere un SpotifyClient configurado.");

  const options = providedOptions || getCipherOptionsFromEnv();

  const playlistId = playlistIdFromUrl(playlistUrl);
  if (!playlistId) throw new Error("No se pudo extraer playlist_id de la URL.");

  const tracks = await spotifyClient.getPlaylistTracks(playlistId);
  const realChunks = [];

  let realIndex = 0;
  tracks.forEach((track, idx) => {
    if (isDecoyPosition(idx, options.decoy_rule, options.decoy_positions)) return;
    const chunkSize = options.chunk_size || 1;
    const chunk = extractChunkFromTitle(track.name, chunkSize);
    if (chunk) {
      realChunks.push(chunk);
      realIndex += 1;
    }
  });

  const decrypted = realChunks.map((chunk) => applyRot(chunk, -(options.rot_shift || 0)));
  const message = decrypted.join("").replace(/_/g, " ").replace(/0/g, " ");

  return {
    message,
    decryptedChunks: decrypted,
    playlistId,
  };
}
