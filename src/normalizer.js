// Text normalization and ROT helpers for the cipher.

const ACCENT_REGEX = /[\u0300-\u036f]/g;

export function normalizeText(message) {
  const upper = message.toUpperCase();
  const noAccents = upper.normalize("NFD").replace(ACCENT_REGEX, "");
  return noAccents.replace(/\s+/g, "_");
}

export function chunkText(normalized, chunkSize = 2) {
  const chunks = [];
  for (let i = 0; i < normalized.length; i += chunkSize) {
    chunks.push(normalized.slice(i, i + chunkSize));
  }
  return chunks;
}

export function applyRot(value, shift) {
  const wrap = (code) => {
    const start = "A".charCodeAt(0);
    return ((code - start + shift + 26) % 26) + start;
  };

  return [...value].map((char) => {
    if (char >= "A" && char <= "Z") {
      return String.fromCharCode(wrap(char.charCodeAt(0)));
    }
    return char;
  }).join("");
}

export function applyRotToChunks(chunks, shift) {
  return chunks.map((chunk) => applyRot(chunk, shift));
}
