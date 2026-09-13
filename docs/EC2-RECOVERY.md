# EC2 Recovery Runbook

Use when cameras cannot be added, streams fail, or MediaMTX shows `path not found`.

**EC2 repo path:** `/home/ubuntu/LiveServer/LiveStreaming`

## Camera create returns "Internal server error"

Usually the API is still running an **old build** or PM2 did not reload `backend/.env`.

```bash
cd /home/ubuntu/LiveServer/LiveStreaming
bash deploy/diagnose-production.sh
bash deploy/update-from-git.sh
curl -s http://127.0.0.1:5280/api/health   # must include "encryptionKeyOk":true
pm2 logs cctv-api --lines 30               # look for "Unhandled error" or ENCRYPTION_KEY
```

If health has no `encryptionKeyOk` field at all, the deploy did not rebuild/restart the API.

## If `git pull` fails on `backend/dist/*`

Old builds on the server modified tracked compiled files. Reset to GitHub and redeploy (safe — `backend/.env` is gitignored):

```bash
cd /home/ubuntu/LiveServer/LiveStreaming
git fetch origin
git reset --hard origin/main
bash deploy/update-from-git.sh
```

## One-shot fix

```bash
cd /home/ubuntu/LiveServer/LiveStreaming
git pull
bash deploy/fix-production-cameras.sh
```

## Manual steps (if script fails)

### 1. Swap (required for `npm run build` on small instances)

```bash
bash deploy/setup-swap.sh
free -h
```

### 2. Valid ENCRYPTION_KEY (must decode to 32 bytes)

```bash
cd backend
openssl rand -base64 32
nano .env   # ENCRYPTION_KEY=<paste>

node -e "require('dotenv').config(); console.log(Buffer.from(process.env.ENCRYPTION_KEY,'base64').length)"
```

### 3. MediaMTX

```bash
bash deploy/restart-mediamtx.sh
grep hlsVariant /opt/mediamtx/mediamtx.yml   # mpegts
```

### 4. Build and deploy

```bash
cd /home/ubuntu/LiveServer/LiveStreaming
git pull
bash deploy/update-from-git.sh
```

Or build on Windows and copy `backend/dist/` via WinSCP if EC2 build OOM persists.

### 5. PM2 (must load backend/.env)

```bash
cd /home/ubuntu/LiveServer/LiveStreaming/backend
pm2 delete cctv-api
pm2 start dist/server.js --name cctv-api --cwd /home/ubuntu/LiveServer/LiveStreaming/backend
pm2 save
curl -s http://127.0.0.1:5280/api/health
```

Expect `"encryptionKeyOk":true`.

### 6. Reset cameras (required if ENCRYPTION_KEY was changed)

No backup of the old key means stored DVR passwords cannot be decrypted.

1. Open https://live.carvingsoft.com/admin
2. Delete broken cameras
3. Re-create each with full RTSP config + password

### 7. Verify

```bash
bash deploy/verify-deployment.sh <site-slug>
curl -s http://127.0.0.1:9997/v3/config/paths/list
```

## Common errors

| Error | Fix |
|-------|-----|
| `ENCRYPTION_KEY must be a base64-encoded 32-byte key` | Regenerate key, restart PM2 with `--cwd backend` |
| `itemCount: 0` | Re-create cameras or `npm run sync:mediamtx:prod` |
| `SIGKILL` during build | Add swap, use `npm run build:prod` |
| `address already in use` (MediaMTX) | `bash deploy/restart-mediamtx.sh` — never run `./mediamtx` manually |
| HLS 302 | Wrong mediamtx.yml — must have `hlsVariant: mpegts` |
