const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function sendJson(res, status, payload) {
  res.statusCode = status;
  Object.entries(DEFAULT_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(payload));
}

export async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new Error("No se pudo parsear el cuerpo JSON."));
      }
    });
    req.on("error", reject);
  });
}

export function handleOptions(req, res) {
  if (req.method === "OPTIONS") {
    Object.entries(DEFAULT_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
    res.statusCode = 200;
    res.end();
    return true;
  }
  return false;
}
