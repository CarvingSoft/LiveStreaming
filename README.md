# Carvingsoft Multi-Site CCTV Live Streaming Platform

Live streaming only platform for government offices and customer sites. **No recording, no playback history, no video storage.**

## Architecture

```
CP Plus DVR/NVR → RTSP → MediaMTX → WebRTC/HLS (via backend proxy) → Angular browser player
```

## Project Structure

```
LiveStreaming/
├── backend/          Express + MongoDB API
├── frontend/         Angular admin + public live view
├── mediamtx/         MediaMTX configuration
└── docs/             Setup and deployment guides
```

## Quick Start (Windows)

See [docs/SETUP-WINDOWS.md](docs/SETUP-WINDOWS.md) for full instructions.

1. Install Node.js 20+, MongoDB, Angular CLI
2. Download MediaMTX Windows binary into `mediamtx/`
3. Configure `backend/.env` from `backend/.env.example`
4. Start MongoDB, MediaMTX, backend, and frontend
5. Seed admin: `cd backend && npm run seed`
6. Login at `http://localhost:4200/login`
7. Create a site and camera, then open `http://localhost:4200/{slug}`

## Production (AWS EC2 Ubuntu 22.04)

See [deploy/README.md](deploy/README.md) for step-by-step scripts.

1. [AWS prerequisites](deploy/aws-prereqs.md) — EC2, Elastic IP, DNS, secrets
2. Configure `backend/.env` from `backend/.env.production.example`
3. `bash deploy/install-production.sh`
4. `bash deploy/setup-ssl.sh`
5. Log in at `https://live.carvingsoft.com/login`

- Frontend: `https://live.carvingsoft.com`
- API: `https://api.live.carvingsoft.com`
- MediaMTX: private server only (never expose API/RTSP publicly)

Full reference: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Security Notes

- RTSP credentials are encrypted at rest
- Browser receives only short-lived playback tokens and proxied stream URLs
- MediaMTX Control API binds to `127.0.0.1` in development
