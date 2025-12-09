import { CIPHER_ID, DEFAULT_CHUNK_SIZE, DEFAULT_DECOY_FILTER, DEFAULT_DECOY_RULE } from "./config.js";
import { normalizeText, chunkText, applyRotToChunks } from "./normalizer.js";
import { encodeOptionsHash } from "./options.js";

export function generateRotShift() {
  // 1..25 to avoid identity ROT 0.
  return Math.floor(Math.random() * 25) + 1;
}

async function findTrackForChunk(chunk, spotify) {
  // Prefer exact inclusion match in the title, else fallback to partial/first letter.
  const candidates = await spotify.searchTracks(chunk);
  const normalizedChunk = chunk.toUpperCase();

  const starts = candidates.filter((track) => {
    const title = track.name.toUpperCase();
    return title.startsWith(normalizedChunk) || new RegExp(`\\b${normalizedChunk}`).test(title);
  });
  const matches = candidates.filter((track) => {
    const title = track.name.toUpperCase();
    return title.includes(normalizedChunk);
  });
  const partials = candidates.filter((track) => {
    const title = track.name.toUpperCase();
    return title.includes(normalizedChunk[0]);
  });

  const primaryList = starts.length ? starts : matches.length ? matches : partials;
  if (primaryList && primaryList.length) return primaryList[0];
  if (starts.length) return starts[0];
  if (matches.length) return matches[0];
  if (partials.length) return partials[0];
  return candidates[0];
}

export async function encodeMessage({
  message,
  rotShift = generateRotShift(),
  chunkSize = DEFAULT_CHUNK_SIZE,
  decoyRule = DEFAULT_DECOY_RULE,
  decoyFilter = DEFAULT_DECOY_FILTER,
  spotifyClient,
  userId,
  playlistName = "THE HIDDEN TRACK PROJECT",
  isPublic = false,
}) {
  if (!message) throw new Error("Se requiere un mensaje para encriptar.");
  if (!spotifyClient) throw new Error("Se requiere un SpotifyClient configurado.");
  if (!userId) throw new Error("Se requiere userId de Spotify para crear el playlist.");

  const normalized = normalizeText(message);
  const chunks = chunkText(normalized, chunkSize);
  const encryptedChunks = applyRotToChunks(chunks, rotShift);
  const searchChunks = encryptedChunks.map((c) => c === "_" ? "0" : c);

  const realTracks = [];
  for (const chunk of searchChunks) {
    const track = await findTrackForChunk(chunk, spotifyClient);
    realTracks.push(track);
  }

  const playlistTracks = [...realTracks];
  const decoyPositions = [];

  const trackUris = playlistTracks.map((track) => track.uri);
  const playlist = await spotifyClient.createPlaylist(userId, playlistName, { isPublic });
  await spotifyClient.addTracksToPlaylist(playlist.id, trackUris);

  const secret = {
    cipher: CIPHER_ID,
    chunk_size: chunkSize,
    rot_shift: rotShift,
    decoy_rule: decoyRule,
    decoy_filter: decoyFilter,
    message_length: chunks.length,
    chunks_encrypted: encryptedChunks,
    chunks_original_order: chunks.map((_, idx) => idx + 1),
    decoy_positions: decoyPositions,
    playlist_id: playlist.id,
    playlist_url: playlist.external_urls?.spotify || playlist.href,
    seed_timestamp: new Date().toISOString(),
  };

  const hash = encodeOptionsHash({
    chunk_size: chunkSize,
    rot_shift: rotShift,
    decoy_rule: decoyRule,
    decoy_filter: decoyFilter,
    decoy_positions: decoyPositions,
    chunks_encrypted: encryptedChunks,
    chunks_search: searchChunks,
  });

  return {
    playlistId: playlist.id,
    playlistUrl: secret.playlist_url,
    secret,
    hash,
  };
}
