# AWS Prerequisites (Phase 0)

Complete these steps **before** running the deployment scripts on EC2.

## 1. EC2 instance

| Setting | Value |
|---------|-------|
| AMI | Ubuntu Server **22.04 LTS** (amd64) |
| Instance type | **t3.medium** (2 vCPU, 4 GB RAM) or larger |
| Storage | 30 GB gp3 minimum |
| Key pair | Create/download a `.pem` SSH key |

## 2. Elastic IP

1. EC2 → **Elastic IPs** → Allocate
2. Associate with your instance
3. Use this IP for all DNS records below

## 3. Security Group (inbound)

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your office IP (recommended) | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP (Let's Encrypt) |
| 443 | TCP | 0.0.0.0/0 | HTTPS (Nginx) |

**Do NOT open:** 5280, 27017, 8554, 8888, 8889, 9997

Outbound: allow all (default).

## 4. DNS A records

Point both subdomains to the Elastic IP:

| Host | Type | Value |
|------|------|-------|
| `live.carvingsoft.com` | A | `<ELASTIC_IP>` |
| `api.live.carvingsoft.com` | A | `<ELASTIC_IP>` |

Verify propagation before SSL:

```bash
dig +short live.carvingsoft.com
dig +short api.live.carvingsoft.com
```

## 5. Generate secrets (run on your PC)

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # PLAYBACK_JWT_SECRET
openssl rand -base64 32   # ENCRYPTION_KEY
```

Save these securely. **Never change `ENCRYPTION_KEY` after cameras are saved.**

## 6. Camera / DVR connectivity

EC2 must reach each DVR **outbound** on RTSP (port 554 or custom). Test from EC2 after launch:

```bash
nc -zv <DVR_PUBLIC_IP> 554
```

## 7. SSH access

```bash
ssh -i your-key.pem ubuntu@<ELASTIC_IP>
```

Then clone the repo and run the deployment scripts (see [README.md](README.md)).
