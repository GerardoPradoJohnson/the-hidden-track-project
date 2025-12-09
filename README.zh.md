# THE HIDDEN TRACK PROJECT

使用 Spotify 播放列表加密/解密消息。消息隐藏在曲目标题的顺序和片段中。加密选项来自环境变量，并被打包成一个哈希，作为解码密钥。

## 快速流程
1) 配置 `.env`（见下）并部署到 Vercel。  
2) 在 Web UI 中用 Spotify 登录（Authorization Code + PKCE）。  
3) 在 **Coder** 选项卡提交消息：得到 `playlistUrl` 和 `hash`（密钥）。  
4) 在 **Decoder** 选项卡输入播放列表 URL 和 `hash` 还原消息。

## 环境变量
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI`（例如 `https://the-hidden-track-project.vercel.app/callback`）
- `CIPHER_ROT_SHIFT`（默认 3）
- `CIPHER_CHUNK_SIZE`（默认 1）
- `CIPHER_DECOY_RULE`（默认 `every_3rd_track`）
- `CIPHER_DECOY_FILTER`（默认 `duration_is_odd`）

## 无服务 API
- `POST /api/encode`  
  Body: `{ "message": "加密的消息", "playlistName": "可选", "isPublic": false }`  
  Headers: `Authorization: Bearer <access_token>`  
  Response: `{ ok, playlistUrl, playlistId, hash }`（hash 编码了加密选项）。

- `POST /api/decode`  
  Body: `{ "playlistUrl": "https://open.spotify.com/playlist/XXXX", "hash": "<密钥>" }`  
  Headers: `Authorization: Bearer <access_token>`  
  Response: `{ ok, message, decryptedChunks, playlistId }`.

## 哈希包含什么？
加密用到的选项：`chunk_size`、`rot_shift`、`decoy_rule`、`decoy_filter`（来自 `.env`，缺失时用默认值）。解码器读取 hash，按规则跳过诱饵、提取 chunk，并反向 ROT。

## 主要结构
- `index.html`：Coder/Decoder 选项卡与 Spotify 登录。
- `api/encode.js`：创建播放列表并返回选项哈希。
- `api/decode.js`：读取播放列表并用哈希还原消息。
- `api/auth/exchange.js`：使用 PKCE 将 `code` 换成 `access_token`。
- `api/config.js`：对前端暴露 `clientId` 和 `redirectUri`。
- `src/encoder.js`、`src/decoder.js`、`src/spotifyClient.js`、`src/options.js`、`src/normalizer.js`。

## 部署到 Vercel
- `vercel.json` 包含到 `/callback.html` 的 rewrite。
- 需要的变量：见“环境变量”。
- 登录后，token 存储在 `localStorage`，并随请求头 `Authorization` 发送给 API。
