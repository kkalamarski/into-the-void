# VM Setup Guide

Complete guide for provisioning and configuring a DigitalOcean VM for Into the Void production deployment.

## Prerequisites

- DigitalOcean account
- SSH key pair generated locally
- Domain configured (see [DNS_CONFIGURATION.md](./DNS_CONFIGURATION.md))

## 1. Create DigitalOcean Droplet

### Recommended Specifications

| Spec | Recommended | Minimum |
|------|-------------|---------|
| vCPUs | 2 | 1 |
| RAM | 4 GB | 2 GB |
| Storage | 80 GB SSD | 50 GB |
| Region | Closest to users | Any |
| Image | Ubuntu 24.04 LTS | Ubuntu 22.04 LTS |

### Creation Steps

1. Log in to [DigitalOcean Control Panel](https://cloud.digitalocean.com/)
2. Click **Create** > **Droplets**
3. Select **Ubuntu 24.04 (LTS) x64**
4. Choose plan: **Basic** > **Regular** > **$24/mo** (2 vCPU, 4 GB RAM, 80 GB SSD)
5. Select datacenter region closest to your users
6. Authentication: Select **SSH keys** and add your public key
7. Hostname: `itv-production` (or your preference)
8. Click **Create Droplet**

### Note the IP Address

After creation, note the public IPv4 address. You'll need it for:
- DNS configuration
- GitHub Secrets (DEPLOY_HOST)

## 2. Initial Server Access

```bash
# Connect to the server
ssh root@YOUR_DROPLET_IP

# Update system packages
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git htop
```

## 3. Install Docker

Install Docker CE using the official repository:

```bash
# Remove any old Docker installations
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Install prerequisites
apt install -y ca-certificates curl gnupg

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Verify installation
docker --version
docker compose version
```

## 4. Initialize Docker Swarm

```bash
# Initialize Swarm (replace with your actual IP)
docker swarm init --advertise-addr YOUR_DROPLET_IP

# Verify Swarm is active
docker info | grep -A 5 "Swarm"
```

Expected output:
```
Swarm: active
  NodeID: xxxxx
  Is Manager: true
  ClusterID: xxxxx
  Managers: 1
  Nodes: 1
```

**Note:** This creates a single-node Swarm. For multi-node deployments, additional worker nodes can join using the token displayed by `docker swarm join-token worker`.

## 5. Configure Firewall (UFW)

```bash
# Enable UFW
ufw --force enable

# Allow SSH (critical - do this first!)
ufw allow 22/tcp

# Allow HTTP (for Let's Encrypt ACME challenge)
ufw allow 80/tcp

# Allow HTTPS
ufw allow 443/tcp

# Verify rules
ufw status verbose
```

Expected output:
```
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)
New profiles: skip

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
22/tcp (v6)                ALLOW IN    Anywhere (v6)
80/tcp (v6)                ALLOW IN    Anywhere (v6)
443/tcp (v6)               ALLOW IN    Anywhere (v6)
```

**For multi-node Swarm (optional):**
```bash
# Swarm management
ufw allow 2377/tcp
# Swarm node communication
ufw allow 7946/tcp
ufw allow 7946/udp
# Overlay network
ufw allow 4789/udp
```

## 6. Create Deployment Directory

```bash
# Create main deployment directory
mkdir -p /opt/itv

# Create Traefik configuration directory
mkdir -p /opt/itv/traefik

# Set permissions (if using non-root deploy user)
# chown -R deploy:deploy /opt/itv
```

## 7. Configure Traefik

Create the Traefik static configuration file:

```bash
cat > /opt/itv/traefik/traefik.yml << 'EOF'
# Traefik v3 Static Configuration
# For Docker Swarm with Let's Encrypt SSL

# API and Dashboard
api:
  dashboard: true
  insecure: false  # Dashboard secured via routers in traefik-stack.yml

# Entrypoints
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true

  websecure:
    address: ":443"
    http:
      tls:
        certResolver: letsencrypt

# Docker Provider
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    swarmMode: true
    exposedByDefault: false
    network: traefik-public
    watch: true

# Certificate Resolvers
certificatesResolvers:
  letsencrypt:
    acme:
      email: ${ACME_EMAIL:-admin@innervoid.online}
      storage: /letsencrypt/acme.json
      caServer: https://acme-v02.api.letsencrypt.org/directory
      httpChallenge:
        entryPoint: web

# Logging
log:
  level: INFO
  format: json

accessLog:
  format: json
  fields:
    defaultMode: keep
    headers:
      defaultMode: keep
EOF
```

## 8. Create Traefik Stack File

```bash
cat > /opt/itv/traefik-stack.yml << 'EOF'
version: '3.8'

services:
  traefik:
    image: traefik:v3.3
    deploy:
      mode: global
      placement:
        constraints:
          - node.role == manager  # Run on manager nodes only
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 128M
      labels:
        # Dashboard routing (secured)
        - "traefik.enable=true"
        - "traefik.http.routers.traefik-dashboard.rule=Host(`traefik.${DOMAIN:-innervoid.online}`)"
        - "traefik.http.routers.traefik-dashboard.entrypoints=websecure"
        - "traefik.http.routers.traefik-dashboard.tls=true"
        - "traefik.http.routers.traefik-dashboard.tls.certresolver=letsencrypt"
        - "traefik.http.routers.traefik-dashboard.service=api@internal"
        - "traefik.http.routers.traefik-dashboard.middlewares=auth"
        # Basic auth middleware (generate with: htpasswd -nb admin YOUR_PASSWORD)
        - "traefik.http.middlewares.auth.basicauth.users=${TRAEFIK_DASHBOARD_AUTH:-admin:$$apr1$$8EVjn/nj$$GiLUZqcbueTFeD23SuB6x0}"
        # Port for Docker provider (Swarm API)
        - "traefik.http.services.dummy.loadbalancer.server.port=9999"
    ports:
      - target: 80
        published: 80
        protocol: tcp
        mode: host
      - target: 443
        published: 443
        protocol: tcp
        mode: host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - traefik_certs:/letsencrypt
    environment:
      - DOMAIN=${DOMAIN:-innervoid.online}
      - ACME_EMAIL=${ACME_EMAIL:-admin@innervoid.online}
    networks:
      - traefik-public

volumes:
  traefik_certs:
    driver: local

networks:
  traefik-public:
    driver: overlay
    attachable: true
EOF
```

## 9. Create Traefik Network

```bash
# Create the external overlay network
docker network create --driver=overlay --attachable traefik-public

# Verify network exists
docker network ls | grep traefik-public
```

## 10. Deploy Traefik Stack

```bash
cd /opt/itv

# Set environment variables (optional - uses defaults)
export DOMAIN=innervoid.online
export ACME_EMAIL=admin@innervoid.online

# Deploy Traefik
docker stack deploy -c traefik-stack.yml traefik

# Verify Traefik is running
docker stack services traefik
```

Expected output:
```
ID             NAME              MODE      REPLICAS   IMAGE           PORTS
xxxx           traefik_traefik   global    1/1        traefik:v3.3
```

## 11. Verify Setup

Run these commands to verify everything is configured correctly:

```bash
# Check Docker is running
systemctl status docker

# Check Swarm is active
docker info | grep -A 2 "Swarm"

# Check traefik-public network exists
docker network ls | grep traefik-public

# Check Traefik is running
docker stack services traefik

# Check ports are listening
ss -tlnp | grep -E ':(80|443|22)\s'

# Check firewall rules
ufw status
```

## Troubleshooting

### Docker commands fail with permission denied
```bash
# If not running as root, add user to docker group
usermod -aG docker $USER
# Then log out and back in
```

### Traefik not starting
```bash
# Check logs
docker service logs traefik_traefik

# Common issues:
# - Port 80/443 already in use (stop other web servers)
# - traefik.yml syntax error
```

### Swarm init fails
```bash
# Make sure IP is correct
ip addr show

# If using private networking, use public IP
docker swarm init --advertise-addr PUBLIC_IP
```

## Next Steps

1. Configure DNS records: [DNS_CONFIGURATION.md](./DNS_CONFIGURATION.md)
2. Set up GitHub Secrets: [GITHUB_SECRETS.md](./GITHUB_SECRETS.md)
3. Perform first deployment: [FIRST_DEPLOYMENT.md](./FIRST_DEPLOYMENT.md)
