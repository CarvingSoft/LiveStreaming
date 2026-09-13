# Git-Based Deployment

Use Git instead of WinSCP to deploy code to EC2. Secrets (`.env`) stay **only on the server** — never commit them.

## Overview

```
Windows (dev)                    GitHub (private)              EC2 (production)
─────────────                    ────────────────              ─────────────────
Edit code  ──push──►  origin/main  ◄──pull──  /var/www/livestreaming
                                                              ├── backend/.env  (server only)
                                                              └── bash deploy/update-from-git.sh
```

---

## Part 1 — Windows: first-time Git setup

### 1. Install Git (if needed)

Download: https://git-scm.com/download/win

### 2. Create a private GitHub repository

1. Go to https://github.com/new
2. Name: `LiveStreaming` (or `carvingsoft-cctv`)
3. Visibility: **Private**
4. Do **not** add README, .gitignore, or license (project already has them)
5. Create repository

### 3. Push your local project

```powershell
cd E:\Projects\LiveStreaming

git status
# Confirm backend\.env is NOT listed (secrets must stay local)

git add -A
git commit -m "Initial commit: Carvingsoft multi-site CCTV platform"

git remote add origin https://github.com/YOUR_ORG/LiveStreaming.git
git push -u origin main
```

Use your GitHub username/org in the URL. Git will prompt for credentials (use a **Personal Access Token**, not your password).

---

## Part 2 — EC2: migrate from WinSCP to Git

SSH into the server as `ubuntu` (or your deploy user).

### 1. Install Git

```bash
sudo apt update
sudo apt install -y git
```

### 2. Back up production secrets

```bash
# If you deployed manually to /var/www/livestreaming:
sudo cp /var/www/livestreaming/backend/.env ~/backend.env.backup
ls -la ~/backend.env.backup
```

### 3. Replace manual folder with Git clone

**Option A — fresh clone (recommended)**

```bash
sudo mv /var/www/livestreaming /var/www/livestreaming.winscp-backup
sudo mkdir -p /var/www
sudo chown "$USER:$USER" /var/www

git clone https://github.com/YOUR_ORG/LiveStreaming.git /var/www/livestreaming
cd /var/www/livestreaming
```

**Option B — keep existing folder, attach Git**

```bash
cd /var/www/livestreaming
git init
git remote add origin https://github.com/YOUR_ORG/LiveStreaming.git
git fetch origin
git checkout -B main origin/main
```

### 4. Restore `.env` and set permissions

```bash
cp ~/backend.env.backup /var/www/livestreaming/backend/.env
chmod 600 /var/www/livestreaming/backend/.env
```

### 5. Fix MediaMTX and deploy

```bash
cd /var/www/livestreaming
bash deploy/restart-mediamtx.sh
bash deploy/update-from-git.sh
```

Or first-time full deploy if nginx/PM2 not set up yet:

```bash
bash deploy/install-production.sh
bash deploy/setup-ssl.sh
```

---

## Part 3 — EC2 authentication for private repos

### HTTPS + Personal Access Token (simplest)

When `git clone` or `git pull` asks for password, paste a GitHub **PAT** with `repo` scope.

Cache credentials on EC2:

```bash
git config --global credential.helper store
git pull   # enter username + PAT once; saved for future pulls
```

### SSH deploy key (better for servers)

On EC2:

```bash
ssh-keygen -t ed25519 -C "ec2-livestreaming" -f ~/.ssh/github_livestreaming -N ""
cat ~/.ssh/github_livestreaming.pub
```

Add the public key in GitHub → **Settings → Deploy keys** (read-only is enough).

```bash
cat >> ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_livestreaming
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config

cd /var/www/livestreaming
git remote set-url origin git@github.com:YOUR_ORG/LiveStreaming.git
git pull
```

---

## Part 4 — Day-to-day workflow

### On Windows (after code changes)

```powershell
cd E:\Projects\LiveStreaming
git add -A
git commit -m "Describe your change"
git push
```

### On EC2 (deploy)

```bash
cd /var/www/livestreaming
bash deploy/update-from-git.sh
```

This script:

1. `git pull`
2. Restarts MediaMTX with `mediamtx-prod.yml`
3. Builds backend + frontend
4. Restarts PM2 (`cctv-api` syncs cameras to MediaMTX on startup)

---

## What never goes in Git

| File | Keep on |
|------|---------|
| `backend/.env` | EC2 only |
| `backend/dist/`, `node_modules/` | Built on server |
| `frontend/dist/`, `node_modules/` | Built on server |
| MediaMTX binary | Installed by `install-server.sh` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `git pull` conflicts | `git stash` or resolve; never overwrite `backend/.env` |
| MediaMTX port in use | `bash deploy/restart-mediamtx.sh` |
| No camera paths after restart | `pm2 restart cctv-api` (auto-syncs on startup) |
| Wrong mediamtx.yml (887 lines) | `sudo cp mediamtx/mediamtx-prod.yml /opt/mediamtx/mediamtx.yml` |

---

## Remove WinSCP backup (optional)

After verifying production works:

```bash
sudo rm -rf /var/www/livestreaming.winscp-backup
```
