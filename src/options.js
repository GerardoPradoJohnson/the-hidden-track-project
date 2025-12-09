import {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_DECOY_FILTER,
  DEFAULT_DECOY_RULE,
} from "./config.js";

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getCipherOptionsFromEnv() {
  return {
    chunk_size: toNumber(process.env.CIPHER_CHUNK_SIZE, DEFAULT_CHUNK_SIZE),
    rot_shift: toNumber(process.env.CIPHER_ROT_SHIFT, 3),
    decoy_rule: process.env.CIPHER_DECOY_RULE || DEFAULT_DECOY_RULE,
    decoy_filter: process.env.CIPHER_DECOY_FILTER || DEFAULT_DECOY_FILTER,
  };
}

function base64UrlEncode(str) {
  return Buffer.from(str, "utf8").toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const normalized = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(normalized, "base64").toString("utf8");
}

export function encodeOptionsHash(options) {
  return base64UrlEncode(JSON.stringify(options));
}

export function decodeOptionsHash(hash) {
  const raw = base64UrlDecode(hash);
  return JSON.parse(raw);
}
