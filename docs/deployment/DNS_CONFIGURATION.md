# DNS Configuration Guide

Configure GoDaddy DNS records for Into the Void production deployment.

## Prerequisites

- DigitalOcean VM provisioned (see [VM_SETUP.md](./VM_SETUP.md))
- VM public IP address
- Access to GoDaddy account managing intothevoid.online

## Required A Records

| Subdomain | Type | Value | TTL | Purpose |
|-----------|------|-------|-----|---------|
| play | A | YOUR_VM_IP | 600 | Web client (game) |
| api | A | YOUR_VM_IP | 600 | REST API |
| game | A | YOUR_VM_IP | 600 | WebSocket server |
| traefik | A | YOUR_VM_IP | 600 | Traefik dashboard (optional) |

**Note:** All subdomains point to the same VM IP. Traefik routes traffic to the correct service based on hostname.

## GoDaddy DNS Configuration Steps

### 1. Access DNS Management

1. Log in to [GoDaddy](https://www.godaddy.com/)
2. Navigate to **My Products** > **Domains**
3. Find **intothevoid.online**
4. Click **DNS** (or **Manage DNS**)

### 2. Add A Records

For each subdomain (play, api, game, traefik):

1. In the **Records** section, click **Add**
2. Fill in the fields:

| Field | Value |
|-------|-------|
| Type | A |
| Name | play (or api, game, traefik) |
| Value | YOUR_VM_IP (e.g., 164.90.xxx.xxx) |
| TTL | 600 seconds (or Custom: 10 minutes) |

3. Click **Save**

### 3. Example Configuration

After adding all records, your DNS settings should show:

```
Type    Name      Value           TTL
A       play      164.90.xxx.xxx  600 seconds
A       api       164.90.xxx.xxx  600 seconds
A       game      164.90.xxx.xxx  600 seconds
A       traefik   164.90.xxx.xxx  600 seconds
```

## Verify DNS Propagation

### Using dig

```bash
# Check each subdomain
dig +short play.intothevoid.online
dig +short api.intothevoid.online
dig +short game.intothevoid.online
dig +short traefik.intothevoid.online

# Expected output for each: YOUR_VM_IP
```

### Using nslookup

```bash
nslookup play.intothevoid.online

# Expected output:
# Server:         xxx.xxx.xxx.xxx
# Address:        xxx.xxx.xxx.xxx#53
#
# Non-authoritative answer:
# Name:   play.intothevoid.online
# Address: YOUR_VM_IP
```

### Using Online Tools

- [DNS Checker](https://dnschecker.org/) - Check propagation globally
- [MX Toolbox](https://mxtoolbox.com/DNSLookup.aspx) - Detailed DNS lookup

## Propagation Time

| Scenario | Expected Time |
|----------|---------------|
| First creation | 5-30 minutes |
| TTL change | Up to old TTL value |
| Global propagation | 1-48 hours |

**Tip:** Using a low TTL (600 seconds) allows faster updates. Once stable, you can increase to 3600 (1 hour) for better caching.

## SSL Certificate Requirements

### Let's Encrypt ACME HTTP Challenge

Traefik uses Let's Encrypt's HTTP-01 challenge for automatic SSL certificates. Requirements:

1. **DNS must resolve** - A records must be configured and propagated
2. **Port 80 must be open** - Firewall allows HTTP traffic
3. **Traefik must be running** - Handles ACME challenge automatically

### Certificate Issuance Flow

```
1. Browser requests https://play.intothevoid.online
2. Traefik detects no certificate exists
3. Traefik requests certificate from Let's Encrypt
4. Let's Encrypt makes HTTP request to http://play.intothevoid.online/.well-known/acme-challenge/xxx
5. Traefik responds with challenge token
6. Let's Encrypt issues certificate
7. Traefik stores certificate and serves HTTPS
```

### First Certificate Timing

- **Initial request:** 1-2 minutes after first HTTPS request
- **Certificate stored in:** Traefik's `traefik_certs` volume
- **Auto-renewal:** 30 days before expiration

## Troubleshooting

### DNS Not Resolving

```bash
# Check if nameservers are correct
dig NS intothevoid.online

# Verify GoDaddy is the authoritative nameserver
# Should show: ns*.domaincontrol.com
```

### Propagation Issues

1. Wait longer (up to 48 hours for global propagation)
2. Clear local DNS cache:
   ```bash
   # macOS
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

   # Linux
   sudo systemd-resolve --flush-caches

   # Windows
   ipconfig /flushdns
   ```

### SSL Certificate Not Issued

1. **Verify DNS resolves:**
   ```bash
   dig +short play.intothevoid.online
   ```

2. **Verify port 80 is open on VM:**
   ```bash
   sudo ufw status | grep 80
   ```

3. **Check Traefik logs:**
   ```bash
   docker service logs traefik_traefik 2>&1 | grep -i "acme\|certificate\|error"
   ```

4. **Rate limits:** Let's Encrypt has [rate limits](https://letsencrypt.org/docs/rate-limits/). If exceeded, wait 1 hour.

### Wrong IP in DNS

1. Go to GoDaddy DNS settings
2. Edit the A record
3. Update the Value to the correct IP
4. Wait for TTL to expire (check old TTL value)

## Security Notes

- **Never expose database ports** - PostgreSQL (5432) and Redis (6379) should NOT have A records
- **Traefik dashboard** - Consider removing the traefik A record in production, or ensure strong authentication is configured
- **HTTPS only** - Traefik automatically redirects HTTP to HTTPS

## Next Steps

1. Set up GitHub Secrets: [GITHUB_SECRETS.md](./GITHUB_SECRETS.md)
2. Perform first deployment: [FIRST_DEPLOYMENT.md](./FIRST_DEPLOYMENT.md)
