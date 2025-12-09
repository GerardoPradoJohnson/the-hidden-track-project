import { MAX_SEARCH_RESULTS, PLAYLIST_DESCRIPTION } from "./config.js";

const API_BASE = "https://api.spotify.com/v1";

export class SpotifyClient {
  constructor(accessToken) {
    if (!accessToken) {
      throw new Error("Se requiere SPOTIFY_ACCESS_TOKEN para interactuar con la API.");
    }
    this.accessToken = accessToken;
  }

  async request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Spotify API error ${response.status}: ${body}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }
    return response.text();
  }

  async searchTracks(query, { limit = MAX_SEARCH_RESULTS } = {}) {
    const encoded = encodeURIComponent(query);
    const data = await this.request(`/search?q=${encoded}&type=track&limit=${limit}`);
    return data.tracks.items;
  }

  async getCurrentUser() {
    return this.request("/me");
  }

  async createPlaylist(userId, name, { isPublic = false, description = PLAYLIST_DESCRIPTION } = {}) {
    const payload = { name, public: isPublic, description };
    const playlist = await this.request(`/users/${userId}/playlists`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return playlist;
  }

  async getArtist(artistId) {
    if (!artistId) return null;
    return this.request(`/artists/${artistId}`);
  }

  async addTracksToPlaylist(playlistId, uris) {
    if (!uris.length) return;
    await this.request(`/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: JSON.stringify({ uris }),
    });
  }

  async getPlaylistTracks(playlistId, { limit = 100 } = {}) {
    const tracks = [];
    let next = `/playlists/${playlistId}/tracks?limit=${limit}`;

    while (next) {
      const data = await this.request(next.replace(API_BASE, ""));
      data.items.forEach((item) => {
        if (item.track) tracks.push(item.track);
      });
      next = data.next;
    }
    return tracks;
  }
}

export function playlistUrlFromId(playlistId) {
  return `https://open.spotify.com/playlist/${playlistId}`;
}

export function playlistIdFromUrl(url) {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}
