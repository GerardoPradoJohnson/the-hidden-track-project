#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { SpotifyClient } from "./spotifyClient.js";
import { encodeMessage } from "./encoder.js";
import { decodeMessage } from "./decoder.js";
import { DEFAULT_CHUNK_SIZE, DEFAULT_DECOY_FILTER, DEFAULT_DECOY_RULE } from "./config.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const args = {};
  argv.forEach((arg, idx) => {
    if (!arg.startsWith("--")) return;
    const key = arg.replace(/^--/, "");
    const value = argv[idx + 1] && !argv[idx + 1].startsWith("--") ? argv[idx + 1] : true;
    args[key] = value;
  });
  return args;
}

function loadKeyFile(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const raw = fs.readFileSync(abs, "utf8");
  return JSON.parse(raw);
}

function saveKeyFile(filePath, data) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  fs.writeFileSync(abs, JSON.stringify(data, null, 2), "utf8");
  return abs;
}

async function handleEncode(args) {
  const message = args.message || args.m;
  const userId = args.user || args["user-id"];
  const playlistName = args.name || args["playlist-name"] || "SPOTIFY CIPHER ESPÍA";
  const rotShift = args.rot ? Number(args.rot) : undefined;
  const chunkSize = args.chunk ? Number(args.chunk) : DEFAULT_CHUNK_SIZE;
  const decoyRule = args["decoy-rule"] || DEFAULT_DECOY_RULE;
  const decoyFilter = args["decoy-filter"] || DEFAULT_DECOY_FILTER;
  const keyFile = args["key-file"] || "secret-key.json";
  const isPublic = args.public === "true" || args.public === true;

  const accessToken = process.env.SPOTIFY_ACCESS_TOKEN;
  const spotify = new SpotifyClient(accessToken);

  const result = await encodeMessage({
    message,
    rotShift,
    chunkSize,
    decoyRule,
    decoyFilter,
    spotifyClient: spotify,
    userId,
    playlistName,
    isPublic,
  });

  const saved = saveKeyFile(keyFile, result.secret);
  console.log("Playlist creada:", result.playlistUrl);
  console.log("Clave guardada en:", saved);
}

async function handleDecode(args) {
  const playlistUrl = args.url || args.playlist || args["playlist-url"];
  const keyFile = args["key-file"] || "secret-key.json";
  const accessToken = process.env.SPOTIFY_ACCESS_TOKEN;
  const spotify = new SpotifyClient(accessToken);

  const key = loadKeyFile(keyFile);
  const result = await decodeMessage({ playlistUrl, key, spotifyClient: spotify });

  console.log("Mensaje desencriptado:");
  console.log(result.message);
}

async function main() {
  const [, , command, ...rest] = process.argv;
  const args = parseArgs(rest);

  if (!command || !["encode", "decode"].includes(command)) {
    console.log("Uso:");
    console.log("  node src/cli.js encode --message \"TE AMO\" --user <spotify_user_id> [--playlist-name \"Nombre\"]");
    console.log("  node src/cli.js decode --playlist-url <url> --key-file secret-key.json");
    process.exit(1);
  }

  try {
    if (command === "encode") {
      await handleEncode(args);
    } else {
      await handleDecode(args);
    }
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
