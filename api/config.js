export default function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const host = req.headers.host ? `https://${req.headers.host}` : "";
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${host}/callback`;

  if (!clientId) {
    res.status(500).json({ error: "Falta SPOTIFY_CLIENT_ID en el servidor." });
    return;
  }

  res.status(200).json({
    ok: true,
    clientId,
    redirectUri,
  });
}
