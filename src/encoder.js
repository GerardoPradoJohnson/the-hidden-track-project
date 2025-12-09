import { CIPHER_ID, DEFAULT_CHUNK_SIZE, DEFAULT_DECOY_FILTER, DEFAULT_DECOY_RULE } from "./config.js";
import { normalizeText, chunkText, applyRotToChunks } from "./normalizer.js";
import { encodeOptionsHash } from "./options.js";

const DECOY_FILTERS = {
  duration_is_odd: (track) => (track.duration_ms ?? 0) % 2 === 1,
  album_starts_with_vowel: (track) => /^[AEIOU]/i.test(track.album?.name || ""),
  popularity_gt_50: (track) => (track.popularity ?? 0) > 50,
};

async function getArtistGenres(artistId, spotify, cache) {
  if (!artistId) return [];
  if (cache.has(artistId)) return cache.get(artistId);
  const artist = await spotify.getArtist(artistId);
  const genres = artist?.genres || [];
  cache.set(artistId, genres);
  return genres;
}

async function pickGenrePreference(track, spotify, cache) {
  const firstArtist = track?.artists?.[0];
  if (!firstArtist) return null;
  const genres = await getArtistGenres(firstArtist.id, spotify, cache);
  return genres[0] || null;
}

export function generateRotShift() {
  // 1..25 to avoid identity ROT 0.
  return Math.floor(Math.random() * 25) + 1;
}

function isDecoyPosition(index, rule) {
  if (rule === "every_3rd_track") {
    return (index + 1) % 3 === 0;
  }
  return false;
}

async function findTrackForChunk(chunk, spotify, genrePreference, cache) {
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
  const filtered = genrePreference
    ? primaryList.filter((track) => trackHasGenre(track, genrePreference, spotify, cache))
    : primaryList;

  if (filtered && filtered.length) return filtered[0];
  if (starts.length) return starts[0];
  if (matches.length) return matches[0];
  if (partials.length) return partials[0];
  return candidates[0];
}

async function trackHasGenre(track, genrePreference, spotify, cache) {
  if (!genrePreference) return true;
  const firstArtist = track?.artists?.[0];
  if (!firstArtist) return false;
  const genres = await getArtistGenres(firstArtist.id, spotify, cache);
  return genres.some((g) => g.toLowerCase() === genrePreference.toLowerCase());
}

async function findDecoyTrack(ruleId, spotify, forbiddenPieces, genrePreference, cache) {
  const filters = DECOY_FILTERS;
  const filterFn = filters[ruleId] || (() => true);

  // Use a neutral query unlikely to collide with encrypted chunks.
  const decoyQueries = ["love", "night", "sky", "time", "dream"];
  const query = decoyQueries[Math.floor(Math.random() * decoyQueries.length)];
  const candidates = await spotify.searchTracks(query);
  const candidate = candidates.find((track) => {
    const title = track.name.toUpperCase();
    const collides = forbiddenPieces.some((piece) => title.includes(piece));
    return !collides && filterFn(track);
  });
  const genreFiltered = genrePreference
    ? await Promise.all(candidates.map(async (track) => ({ track, ok: await trackHasGenre(track, genrePreference, spotify, cache) && filterFn(track) && !forbiddenPieces.some((p) => track.name.toUpperCase().includes(p)) })))
    : [];
  const genreCandidate = genreFiltered.find((item) => item.ok)?.track;
  return genreCandidate || candidate || candidates[0];
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
  const artistGenreCache = new Map();
  let genrePreference = null;
  for (const chunk of searchChunks) {
    const track = await findTrackForChunk(chunk, spotifyClient, genrePreference, artistGenreCache);
    if (!genrePreference) {
      genrePreference = await pickGenrePreference(track, spotifyClient, artistGenreCache);
    }
    realTracks.push(track);
  }

  const playlistTracks = [];
  const decoyPositions = [];
  let chunkPointer = 0;

  while (chunkPointer < realTracks.length) {
    const currentIndex = playlistTracks.length;
    if (isDecoyPosition(currentIndex, decoyRule)) {
      const decoy = await findDecoyTrack(decoyFilter, spotifyClient, searchChunks, genrePreference, artistGenreCache);
      if (decoy) {
        decoyPositions.push(currentIndex + 1);
        playlistTracks.push(decoy);
        continue;
      }
    }

    playlistTracks.push(realTracks[chunkPointer]);
    chunkPointer += 1;
  }

  // If the last track is expected to be decoy because of the rule, add it.
  if (isDecoyPosition(playlistTracks.length, decoyRule)) {
    const decoy = await findDecoyTrack(decoyFilter, spotifyClient, searchChunks, genrePreference, artistGenreCache);
    if (decoy) {
      decoyPositions.push(playlistTracks.length + 1);
      playlistTracks.push(decoy);
    }
  }

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
