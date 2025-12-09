export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido. Usa POST." });
    return;
  }

  try {
    const body = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => { data += chunk; });
      req.on("end", () => {
        try { resolve(JSON.parse(data || "{}")); }
        catch (e) { reject(new Error("JSON inválido")); }
      });
      req.on("error", reject);
    });

    const { code, code_verifier, redirect_uri } = body;
    if (!code) return res.status(400).json({ error: "Falta 'code'." });
    if (!code_verifier) return res.status(400).json({ error: "Falta 'code_verifier'." });

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const finalRedirect = redirect_uri || process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId) return res.status(500).json({ error: "Falta SPOTIFY_CLIENT_ID en el servidor." });
    if (!finalRedirect) return res.status(500).json({ error: "Falta SPOTIFY_REDIRECT_URI en el servidor." });

    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", finalRedirect);
    params.append("client_id", clientId);
    params.append("code_verifier", code_verifier);
    if (clientSecret) params.append("client_secret", clientSecret);

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const json = await tokenRes.json();
    if (!tokenRes.ok) {
      return res.status(tokenRes.status).json({ error: json.error || "Error al obtener token", details: json });
    }

    res.status(200).json({
      ok: true,
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_in: json.expires_in,
      scope: json.scope,
      token_type: json.token_type,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error interno en exchange" });
  }
}
