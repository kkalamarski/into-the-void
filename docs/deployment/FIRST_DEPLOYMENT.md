# First Deployment Checklist

Step-by-step guide for the first production deployment of Into the Void.

## Prerequisites Checklist

Complete all prerequisites before triggering deployment:

### Infrastructure

- [ ] **VM provisioned** - DigitalOcean Droplet created ([VM_SETUP.md](./VM_SETUP.md))
- [ ] **Docker installed** - `docker --version` returns 24.x+
- [ ] **Swarm initialized** - `docker info | grep Swarm` shows "active"
- [ ] **Firewall configured** - Ports 22, 80, 443 open
- [ ] **/opt/itv created** - Deployment directory exists
- [ ] **traefik-public network** - `docker network ls | grep traefik-public`
- [ ] **Traefik deployed** - `docker stack services traefik` shows 1/1 replicas

### DNS

- [ ] **A records configured** - play, api, game subdomains point to VM IP ([DNS_CONFIGURATION.md](./DNS_CONFIGURATION.md))
- [ ] **DNS propagated** - `dig +short play.innervoid.online` returns VM IP

### GitHub

- [ ] **Secrets configured** - All 5 required secrets in production environment ([GITHUB_SECRETS.md](./GITHUB_SECRETS.md))
- [ ] **Actions enabled** - Repository Actions permissions configured

## Trigger First Deployment

### 1. Create and Push Version Tag

```bash
# Ensure you're on the main branch with latest code
git checkout main
git pull origin main

# Create version tag
git tag v1.19.0

# Push tag to trigger deployment
git push origin v1.19.0
```

### 2. Monitor GitHub Actions

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Find the workflow run for tag `v1.19.0`

#### Build Phase (~5-8 minutes)

Watch for three parallel build jobs:
- `Build api` - NestJS REST API image
- `Build game-server` - NestJS WebSocket server image
- `Build web` - React/Vite client image

All three should show green checkmarks.

#### Deploy Phase

After all builds complete:
1. **Environment approval** - If configured, approve the production deployment
2. **Deploy to Swarm** - SSH to VM and deploy stack
3. **Verify deployment** - Check service status

Total time: ~8-12 minutes

## Verify Deployment on Server

### 1. SSH to VM

```bash
ssh root@YOUR_VM_IP
```

### 2. Check Stack Services

```bash
docker stack services itv
```

Expected output:
```
ID             NAME              MODE         REPLICAS   IMAGE                                           PORTS
xxxx           itv_api           replicated   1/1        ghcr.io/owner/repo/api:1.19.0
xxxx           itv_game-server   replicated   1/1        ghcr.io/owner/repo/game-server:1.19.0
xxxx           itv_postgres      replicated   1/1        postgres:16-alpine
xxxx           itv_redis         replicated   1/1        redis:7-alpine
xxxx           itv_web           replicated   1/1        ghcr.io/owner/repo/web:1.19.0
```

**All services should show 1/1 replicas.**

### 3. Check Service Logs

```bash
# API logs
docker service logs itv_api --tail 50

# Game server logs
docker service logs itv_game-server --tail 50

# Web logs
docker service logs itv_web --tail 50
```

Look for startup messages without errors.

## Verify SSL Certificates

### 1. Check Certificate Status

```bash
# Check Traefik logs for certificate issuance
docker service logs traefik_traefik 2>&1 | grep -i "certificate\|acme"
```

Look for:
```
level=info msg="Certificate for domain play.innervoid.online was obtained successfully"
```

### 2. Test HTTPS

```bash
# From local machine
curl -I https://play.innervoid.online

# Expected response includes:
# HTTP/2 200
# (no certificate errors)
```

**Note:** First certificate may take 1-2 minutes after initial HTTPS request.

## Verify Application

### 1. Web Client

Open in browser: **https://play.innervoid.online**

Expected:
- Page loads without SSL warnings
- Game login/registration screen appears
- No JavaScript console errors (F12 > Console)

### 2. REST API Health

```bash
curl https://api.innervoid.online/health
```

Expected response:
```json
{"status":"ok"}
```

Or test in browser: https://api.innervoid.online/health

### 3. WebSocket Connection

In browser console on play.innervoid.online:
```javascript
// Check if Socket.IO connected
// Should see connection logs in console
```

Or check game server logs:
```bash
docker service logs itv_game-server 2>&1 | grep -i "connection\|socket"
```

### 4. Full Flow Test

1. **Register** a new account
2. **Log in** with created account
3. **Create** a character
4. **Enter** the game
5. **Verify** movement and basic interactions work

## Troubleshooting

### SSL Certificate Not Issued

**Symptoms:** Browser shows SSL error, certificate invalid

**Check:**
```bash
# Verify DNS resolves
dig +short play.innervoid.online

# Verify port 80 is open (needed for ACME challenge)
curl -I http://play.innervoid.online

# Check Traefik logs for ACME errors
docker service logs traefik_traefik 2>&1 | grep -i "error\|acme"
```

**Common causes:**
- DNS not propagated yet - wait longer
- Port 80 blocked by firewall - check `ufw status`
- Traefik not running - check `docker stack services traefik`

### Service Not Starting

**Symptoms:** REPLICAS shows 0/1

**Check:**
```bash
# View service status
docker service ps itv_api --no-trunc

# View error logs
docker service logs itv_api
```

**Common causes:**
- Image pull failed - check GHCR authentication
- Health check failing - check logs for startup errors
- Resource constraints - check available memory

### Database Connection Failed

**Symptoms:** API logs show "connection refused" or "timeout"

**Check:**
```bash
# Verify postgres is running
docker service ps itv_postgres

# Check postgres logs
docker service logs itv_postgres

# Verify internal network exists
docker network ls | grep internal
```

**Common causes:**
- POSTGRES_PASSWORD mismatch - verify GitHub secret matches
- Postgres not healthy - wait for it to start
- Network isolation issue - recreate stack

### SSH Deployment Failed

**Symptoms:** GitHub Actions deploy job fails

**Check:**
- SSH_PRIVATE_KEY - ensure includes BEGIN/END lines
- DEPLOY_HOST - verify IP is correct
- DEPLOY_USER - verify user exists and has docker access

**Test locally:**
```bash
ssh -i ~/.ssh/itv_deploy_key root@YOUR_VM_IP "docker stack services itv"
```

### WebSocket Connection Failed

**Symptoms:** Game loads but doesn't connect to server

**Check:**
```bash
# Verify game server is running
docker service ps itv_game-server

# Check for WebSocket errors in logs
docker service logs itv_game-server 2>&1 | grep -i "error\|socket"
```

**Common causes:**
- Wrong VITE_GAME_SERVER_URL in build - check workflow build args
- game subdomain DNS not configured
- Sticky sessions not working - check Traefik labels

## Post-Deployment

### Monitor Logs

```bash
# Follow all service logs
docker service logs -f itv_api
docker service logs -f itv_game-server
```

### Check Resource Usage

```bash
# Container stats
docker stats

# Service resource usage
docker service inspect itv_api --format '{{.Spec.TaskTemplate.Resources}}'
```

### Verify Data Persistence

After deployment, verify volumes exist:

```bash
docker volume ls | grep itv
```

Expected:
```
local     itv_postgres_data
local     itv_redis_data
```

## Rollback (If Needed)

If deployment fails and needs rollback:

```bash
# On VM, rollback to previous version
docker service update --rollback itv_api
docker service update --rollback itv_game-server
docker service update --rollback itv_web
```

Or deploy previous tag:

```bash
git tag v1.18.0  # previous working version
git push origin v1.18.0
```

## Success Criteria

Deployment is successful when:

- [ ] All 5 services show 1/1 replicas
- [ ] https://play.innervoid.online loads game client
- [ ] https://api.innervoid.online/health returns OK
- [ ] WebSocket connects successfully
- [ ] User can register, login, create character, and enter game
- [ ] No errors in service logs

## Next Steps

After successful deployment:

1. **Set up monitoring** - Consider adding Prometheus/Grafana
2. **Configure backups** - PostgreSQL and Redis data
3. **Set up alerts** - For service failures and resource usage
4. **Document runbooks** - For common operational tasks
