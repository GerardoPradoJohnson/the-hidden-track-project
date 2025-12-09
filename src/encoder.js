import { CIPHER_ID, DEFAULT_CHUNK_SIZE, DEFAULT_DECOY_FILTER, DEFAULT_DECOY_RULE } from "./config.js";
import { normalizeText, chunkText, applyRotToChunks } from "./normalizer.js";
import { encodeOptionsHash } from "./options.js";

export function generateRotShift() {
  // 1..25 to avoid identity ROT 0.
  return Math.floor(Math.random() * 25) + 1;
}

async function findTrackForChunk(chunk, spotify) {
  // Prefer titles that START with the chunk to make decoding deterministic.
  const candidates = await spotify.searchTracks(chunk);
  const normalizedChunk = chunk.toUpperCase();

  const starts = candidates.filter((track) => track.name.toUpperCase().startsWith(normalizedChunk));
  if (starts.length) return starts[0];

  const matches = candidates.filter((track) => track.name.toUpperCase().includes(normalizedChunk));
  if (matches.length) return matches[0];

  return candidates[0];
}

export async function encodeMessage({
  message,
  rotShift = 3,
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
  const searchChunks = encryptedChunks.map((c) => c === "_" ? "SPACE" : c);

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
