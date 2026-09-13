# Production Deployment Scripts

Automated deployment for **Ubuntu 22.04 EC2** targeting:

- Frontend: `https://live.carvingsoft.com`
- API: `https://api.live.carvingsoft.com`

## Quick start

### 1. Complete AWS prerequisites

See [aws-prereqs.md](aws-prereqs.md) — EC2, Elastic IP, Security Group, DNS, secrets.

### 2. Clone repo on EC2

See **[docs/GIT-DEPLOY.md](../docs/GIT-DEPLOY.md)** if migrating from WinSCP manual uploads.

**EC2 repo path:** `/home/ubuntu/Liveserver/liveStreaming`

```bash
cd /home/ubuntu/Liveserver/liveStreaming
git clone <YOUR_REPO_URL> .   # first time only, if folder is empty
# — or attach git to existing WinSCP folder (see docs/GIT-DEPLOY.md)
```

### Ongoing deploys (after Git is set up)

```bash
cd /home/ubuntu/Liveserver/liveStreaming
bash deploy/update-from-git.sh
```

### 3. Configure production environment

```bash
cp backend/.env.production.example backend/.env
nano backend/.env   # fill JWT secrets, ENCRYPTION_KEY, SEED_ADMIN_PASSWORD
```

Generate secrets:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # PLAYBACK_JWT_SECRET
openssl rand -base64 32   # ENCRYPTION_KEY
```

### 4. Run full install

```bash
chmod +x deploy/*.sh
bash deploy/install-production.sh
```

### 5. Enable HTTPS (after DNS propagates)

```bash
bash deploy/setup-ssl.sh
```

### 6. Seed admin (included in deploy-app.sh)

If you need to re-run manually:

```bash
cd backend
npm run seed:prod
```

Log in at `https://live.carvingsoft.com/login` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

Remove `SEED_ADMIN_PASSWORD` from `.env` after first login.

### 7. Verify

```bash
bash deploy/verify-deployment.sh kochi-rto
```

## Scripts

| Script | Purpose |
|--------|---------|
| `install-server.sh` | Node 20, MongoDB, PM2, MediaMTX, UFW |
| `deploy-app.sh` | Build backend/frontend, seed admin, PM2 start |
| `setup-nginx.sh` | Nginx reverse proxy configs |
| `setup-ssl.sh` | Let's Encrypt certificates |
| `verify-deployment.sh` | Health checks (local + public HTTPS) |
| `install-production.sh` | Runs install-server + deploy-app + setup-nginx |

## Redeploy after code changes

```bash
cd /home/ubuntu/Liveserver/liveStreaming
bash deploy/update-from-git.sh
```

## Logs

```bash
pm2 logs cctv-api
sudo journalctl -u mediamtx -f
```
