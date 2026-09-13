# Production Deployment

Target domains:
- Frontend: `https://live.carvingsoft.com`
- API: `https://api.live.carvingsoft.com`
- MediaMTX: private server (no public API/RTSP)

## Automated deploy (Ubuntu 22.04 EC2)

Use the scripts in [`deploy/`](../deploy/README.md):

1. Complete [deploy/aws-prereqs.md](../deploy/aws-prereqs.md) (EC2, Elastic IP, DNS, secrets)
2. Copy `backend/.env.production.example` → `backend/.env` and fill in values
3. Run `bash deploy/install-production.sh`
4. Run `bash deploy/setup-ssl.sh` after DNS propagates
5. Verify with `bash deploy/verify-deployment.sh <site-slug>`

### Git-based updates (recommended)

See **[docs/GIT-DEPLOY.md](GIT-DEPLOY.md)** for full setup (Windows → GitHub → EC2).

After Git is configured, deploy code changes on EC2 with:

```bash
cd /var/www/livestreaming
bash deploy/update-from-git.sh
```

## Server Layout

```
Internet
  → Nginx (443)
      → live.carvingsoft.com     → Angular static files
      → api.live.carvingsoft.com → Node.js API (PM2)
  → MediaMTX (private, localhost/VPC only)
  → MongoDB (localhost/VPC only)
```

## Environment Variables (Production)

```env
NODE_ENV=production
PORT=5280
MONGODB_URI=mongodb://127.0.0.1:27017/cctv_platform

JWT_SECRET=<strong-random-secret-min-32-chars>
JWT_EXPIRES_IN=1h
PLAYBACK_JWT_SECRET=<different-strong-secret>
PLAYBACK_TOKEN_TTL_SECONDS=300
ENCRYPTION_KEY=<base64-32-byte-key>

FRONTEND_URL=https://live.carvingsoft.com
CORS_ORIGINS=https://live.carvingsoft.com
API_PUBLIC_URL=https://api.live.carvingsoft.com

MEDIAMTX_API_URL=http://127.0.0.1:9997
MEDIAMTX_WEBRTC_URL=http://127.0.0.1:8889
MEDIAMTX_HLS_URL=http://127.0.0.1:8888

RTSP_DEFAULT_PATH_TEMPLATE=/cam/realmonitor?channel={channel}&subtype={subtype}
STATUS_POLL_INTERVAL_MS=15000

SEED_ADMIN_NAME=Super Admin
SEED_ADMIN_EMAIL=admin@carvingsoft.com
SEED_ADMIN_PASSWORD=<strong-password-min-8-chars>
```

Copy from [`backend/.env.production.example`](../backend/.env.production.example). Production API URL is already set in `frontend/src/environments/environment.prod.ts`.

### Seed admin (one-time)

```bash
cd backend
npm run build
npm run seed:prod
```

Creates a `super_admin` if the email does not exist. Remove `SEED_ADMIN_PASSWORD` from `.env` after first login.

## Build

```bash
# Backend
cd backend
npm ci
npm run build

# Frontend
cd ../frontend
npm ci
npm run build
```

Deploy `frontend/dist/frontend/browser/` to the web root.

## PM2

```bash
cd backend
npm install -g pm2
pm2 start dist/server.js --name cctv-api
pm2 save
pm2 startup
```

## MediaMTX Production Config

Production uses the minimal config in [`mediamtx/mediamtx-prod.yml`](../mediamtx/mediamtx-prod.yml) (not the full [`mediamtx/mediamtx.yml`](../mediamtx/mediamtx.yml) dev template).

```yaml
api: true
apiAddress: 127.0.0.1:9997   # NEVER 0.0.0.0

rtspAddress: :8554
webrtcAddress: :8889
hlsAddress: :8888

hlsVariant: mpegts   # required — LL-HLS Secure cookies break HTTP backend proxy

webrtcAllowOrigins: ['https://live.carvingsoft.com']

pathDefaults:
  sourceOnDemand: true
  rtspTransport: tcp
```

### Install (automated)

[`deploy/install-server.sh`](../deploy/install-server.sh) downloads the Linux MediaMTX binary to `/opt/mediamtx/`, copies `mediamtx-prod.yml` to `/opt/mediamtx/mediamtx.yml`, and enables the systemd service from [`deploy/systemd/mediamtx.service`](../deploy/systemd/mediamtx.service).

### Manage on EC2

```bash
sudo systemctl status mediamtx
sudo systemctl restart mediamtx
sudo journalctl -u mediamtx -f
curl http://127.0.0.1:9997/v3/paths/list
```

Camera paths are created dynamically by the backend when you add cameras in admin — you do not edit `paths:` manually in production.

After updating `mediamtx-prod.yml` on EC2:

```bash
sudo cp /var/www/livestreaming/mediamtx/mediamtx-prod.yml /opt/mediamtx/mediamtx.yml
sudo systemctl restart mediamtx
sudo systemctl status mediamtx
curl -i http://127.0.0.1:8888/site-<slug>-<camera>/index.m3u8
```

Use **systemd only** — do not run `./mediamtx` manually while the service is active (causes `bind: address already in use` on ports 8000/8554/8888).

If the service is stuck in `activating (auto-restart)`:

```bash
sudo journalctl -u mediamtx -n 30 --no-pager
bash /var/www/livestreaming/deploy/restart-mediamtx.sh
```

Ensure `/etc/systemd/system/mediamtx.service` uses **`/opt/mediamtx/mediamtx.yml`** (not `mediamtx-prod.yml`).

A working HLS manifest returns `HTTP/1.1 200` with `#EXTM3U` (not a 302 cookie redirect).

## Nginx + SSL

Nginx configs live in [`deploy/nginx/`](../deploy/nginx/). Applied by `deploy/setup-nginx.sh`. Certbot runs via `deploy/setup-ssl.sh`.

**Do not** proxy MediaMTX ports (8554, 8888, 8889, 9997) to the public internet. All browser playback goes through the API stream proxy.

## Firewall Recommendations

| Port | Access |
|---|---|
| 443 | Public (Nginx) |
| 5280 | Localhost only (API behind Nginx) |
| 27017 | Private/VPC only (MongoDB) |
| 9997 | Localhost only (MediaMTX API) |
| 8554 | Private only (RTSP) |
| 8888/8889 | Private only (internal playback) |

## MediaMTX Security

- Bind Control API to `127.0.0.1`
- Do not enable recording paths
- Disable unused protocols if not needed
- Optional: enable internal auth for defense-in-depth
- Keep MediaMTX updated

## Troubleshooting

### "CORS blocked" + `502 Bad Gateway`

These usually appear together. **502 is the real problem** — Nginx could not reach the Node API on `127.0.0.1:5280`. The API never responded, so no `Access-Control-Allow-Origin` header was sent, and the browser reports a CORS error.

On EC2, run:

```bash
pm2 status
pm2 logs cctv-api --lines 50
curl -i http://127.0.0.1:5280/api/health
sudo systemctl status mongod
```

**Common fixes:**

| Symptom | Fix |
|---------|-----|
| `pm2` shows `errored` / `stopped` | Check logs — often invalid `.env` after deploy |
| `Invalid environment configuration` in logs | Set `API_PUBLIC_URL=https://...`, `FRONTEND_URL=https://...`, `CORS_ORIGINS=https://live.carvingsoft.com` |
| `curl localhost:5280` connection refused | `cd backend && npm run build && pm2 restart cctv-api` |
| Health returns `db: disconnected` | `sudo systemctl start mongod` |
| Local curl works, public URL 502 | Check Nginx: `sudo nginx -t && sudo systemctl reload nginx` |

After fixing, verify:

```bash
curl -i https://api.live.carvingsoft.com/api/health
```

You should see `HTTP/2 200` and JSON with `"status":"ok"`.

### CORS error without 502

If the API returns 200/401/403 but the browser still blocks CORS, ensure `.env` has:

```env
CORS_ORIGINS=https://live.carvingsoft.com
FRONTEND_URL=https://live.carvingsoft.com
```

No trailing slash. Must match the browser origin exactly.

### Stream works locally but not on EC2

Local dev and production use **different machines** to pull RTSP. The browser only plays video from MediaMTX; **MediaMTX on EC2** must reach the DVR over the internet.

```
Local dev:   Your PC (MediaMTX) ──RTSP──► DVR on office LAN / public IP
Production:  EC2 (MediaMTX)     ──RTSP──► DVR (must allow EC2 Elastic IP)
```

| Local dev works because… | Production fails because… |
|--------------------------|---------------------------|
| Your PC is on the same LAN as the DVR | EC2 is in AWS, not on the office LAN |
| Camera IP is `192.168.x.x` (private) | EC2 **cannot** reach `192.168.x.x` addresses |
| Office firewall trusts your home/office IP | DVR/router must **whitelist EC2 Elastic IP** |
| Port 554 is open on LAN | Internet RTSP often uses **11554** (port-forward), not 554 or 1154 |

**Fix checklist:**

1. **Use the DVR public IP** in admin (e.g. `59.96.x.x`), not `192.168.0.50`.
2. **Use the forwarded RTSP port** (often **11554** for CP Plus), not the LAN port 554.
3. **Whitelist EC2 Elastic IP** on the DVR or office router for inbound TCP on that port.
4. **Test from EC2** (SSH):

```bash
# Replace with your DVR IP and port
nc -zv 59.96.60.54 11554

sudo journalctl -u mediamtx -f
curl -s http://127.0.0.1:9997/v3/paths/list
```

5. Confirm MediaMTX is running: `sudo systemctl status mediamtx`
6. Re-save the camera in admin after fixing IP/port so MediaMTX gets the updated RTSP URL.

If `nc` times out from EC2, the problem is **network/firewall at the DVR site**, not the Angular app or Nginx.

## Future Multi-Site Architecture

Remote government offices may use:

```
Office DVR → Local connector/VPN → Cloud MediaMTX → Public live URL
```

The `sourceType` field supports `rtsp`, `connector`, and `vpn` for future expansion without schema changes.
