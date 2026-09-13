# Windows Development Setup

This guide covers local setup on Windows without Docker.

## Prerequisites

| Software | Version | Download |
|---|---|---|
| Node.js | 20+ | https://nodejs.org/ |
| MongoDB Community | 7+ | https://www.mongodb.com/try/download/community |
| Angular CLI | latest | `npm install -g @angular/cli` |
| MediaMTX | latest | https://github.com/bluenviron/mediamtx/releases |

## 1. MongoDB

Install MongoDB Community Server and start the service:

```powershell
# Verify MongoDB is running
mongosh --eval "db.runCommand({ ping: 1 })"
```

Default connection: `mongodb://127.0.0.1:27017/cctv_platform`

## 2. MediaMTX

1. Download `mediamtx_v*_windows_amd64.zip` from GitHub releases
2. Extract `mediamtx.exe` to `e:\Projects\LiveStreaming\mediamtx\`
3. Start MediaMTX with the **development** config (Control API must be enabled):

```powershell
cd e:\Projects\LiveStreaming\mediamtx
.\mediamtx.exe mediamtx-dev.yml
```

You should see a log line like `[API] listener opened on 127.0.0.1:9997`.

**Important:** Always start with `mediamtx-dev.yml` (not the full `mediamtx.yml` template). The backend requires the Control API on port 9997 and `hlsVariant: mpegts`.

When MediaMTX restarts, camera paths are cleared. The backend re-syncs them automatically on startup. To sync manually:

```powershell
cd e:\Projects\LiveStreaming\backend
npm run sync:mediamtx
```

Verify Control API (localhost only):

```powershell
curl http://127.0.0.1:9997/v3/paths/list
```

## 3. Backend

```powershell
cd e:\Projects\LiveStreaming\backend
copy .env.example .env
```

Generate a secure encryption key:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Set in `.env`:
- `ENCRYPTION_KEY` — output from above
- `JWT_SECRET` — min 32 random characters
- `PLAYBACK_JWT_SECRET` — different random secret
- `SEED_ADMIN_PASSWORD` — your local admin password

Install and start:

```powershell
npm install
npm run seed
npm run dev
```

API: http://localhost:5280/api/health

## 4. Frontend

```powershell
cd e:\Projects\LiveStreaming\frontend
npm install
npm start
```

App: http://localhost:4200

## 5. Create First Site and Camera

1. Open http://localhost:4200/login
2. Login with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
3. Go to **Sites → Create Site**
   - Name: `Kuttippuram RTO`
   - Slug: `kuttippuram-rto`
4. Open the site and **Add Camera**
   - Name: `Main Entrance`
   - DVR Host: your CP Plus IP (example: `192.168.0.50`)
   - RTSP Port: `554`
   - Username / Password: your DVR credentials
   - Channel: `1`
   - Stream Type: Main stream
   - Custom path override if needed (CP Plus models vary)

## 6. Verify MediaMTX Path

After saving a camera, confirm the path exists:

```powershell
curl http://127.0.0.1:9997/v3/paths/list
```

Look for a path like `site-kuttippuram-rto-main-entrance`.

Test RTSP locally with VLC (on the same LAN as the DVR):

```
Media → Open Network Stream → rtsp://user:pass@192.168.0.50:554/...
```

Use the same path template configured in the admin UI.

## 7. Open Public Live Page

http://localhost:4200/kuttippuram-rto

Expected behavior:
- Site header with name and organization
- Camera grid with live/offline status
- WebRTC video (HLS fallback if WebRTC fails)

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Camera offline | DVR unreachable from MediaMTX host | Ping DVR, test RTSP in VLC |
| API `db: disconnected` | MongoDB not running | Start MongoDB service |
| API `mediamtx: ok: false` | MediaMTX not running | Start mediamtx.exe |
| Black screen | Wrong RTSP path | Use custom path override in camera form |
| WebRTC fails, HLS works | UDP/firewall | HLS fallback is expected in some networks |
| 401 on private site | Site marked private | Login as admin first |

## CP Plus RTSP Path Note

Many CP Plus DVRs use:

```
/cam/realmonitor?channel=1&subtype=0
```

This is **not guaranteed** for all models. Configure via admin UI; do not hardcode in code.
