# GitHub Secrets Configuration

Configure GitHub repository secrets for Into the Void CI/CD pipeline.

## Prerequisites

- GitHub repository with Actions enabled
- DigitalOcean VM provisioned (see [VM_SETUP.md](./VM_SETUP.md))
- SSH key pair for deployment access

## Secrets Overview

### Repository Secrets (Build Phase)

| Secret | Required | Description |
|--------|----------|-------------|
| *None* | - | GITHUB_TOKEN automatically provides GHCR write access |

**Note:** GitHub Actions automatically provides `GITHUB_TOKEN` with `write:packages` permission for pushing to GitHub Container Registry.

### Environment Secrets (Deploy Phase)

These secrets are configured in the `production` environment:

| Secret | Required | Description |
|--------|----------|-------------|
| SSH_PRIVATE_KEY | Yes | SSH private key for Swarm manager access |
| DEPLOY_HOST | Yes | IP address or hostname of Swarm manager |
| DEPLOY_USER | Yes | SSH username (typically `root`) |
| POSTGRES_PASSWORD | Yes | PostgreSQL database password |
| JWT_SECRET | Yes | JWT signing secret for authentication |
| DOMAIN | No | Domain name (defaults to `innervoid.online`) |

## Generate Required Values

### 1. SSH Key Pair

Generate a dedicated deployment key:

```bash
# Generate Ed25519 key pair (recommended)
ssh-keygen -t ed25519 -f ~/.ssh/itv_deploy_key -N "" -C "itv-deployment"

# Or RSA if Ed25519 not supported
ssh-keygen -t rsa -b 4096 -f ~/.ssh/itv_deploy_key -N "" -C "itv-deployment"
```

### 2. Add Public Key to VM

```bash
# Copy public key to the server
ssh-copy-id -i ~/.ssh/itv_deploy_key.pub root@YOUR_VM_IP

# Or manually append to authorized_keys
cat ~/.ssh/itv_deploy_key.pub | ssh root@YOUR_VM_IP "cat >> ~/.ssh/authorized_keys"

# Test SSH connection
ssh -i ~/.ssh/itv_deploy_key root@YOUR_VM_IP "echo 'SSH connection successful'"
```

### 3. Get Private Key Content

```bash
# Display private key (copy entire output including BEGIN/END lines)
cat ~/.ssh/itv_deploy_key
```

Output will look like:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
... (multiple lines) ...
-----END OPENSSH PRIVATE KEY-----
```

### 4. Generate Secure Passwords

```bash
# Generate POSTGRES_PASSWORD
openssl rand -base64 32
# Example output: K7xP2mN9qR4wS1vY8zA3bC6dE5fG0hJ1kL2m

# Generate JWT_SECRET
openssl rand -base64 32
# Example output: mN9qR4wS1vY8zA3bC6dE5fG0hJ1kL2mP7xK8
```

**Important:** Save these values securely. You'll need them for both GitHub Secrets and potential troubleshooting.

## Configure GitHub Secrets

### 1. Navigate to Settings

1. Go to your GitHub repository
2. Click **Settings** tab
3. In left sidebar, click **Secrets and variables** > **Actions**

### 2. Create Production Environment

1. Click **Environments** in left sidebar
2. Click **New environment**
3. Name: `production`
4. Click **Configure environment**
5. (Optional) Add protection rules:
   - **Required reviewers** - Require approval before deploy
   - **Wait timer** - Add delay before deployment

### 3. Add Environment Secrets

In the `production` environment configuration:

1. Scroll to **Environment secrets**
2. Click **Add secret** for each:

#### SSH_PRIVATE_KEY
```
Name: SSH_PRIVATE_KEY
Value: (paste entire private key including BEGIN/END lines)
```

#### DEPLOY_HOST
```
Name: DEPLOY_HOST
Value: YOUR_VM_IP (e.g., 164.90.xxx.xxx)
```

#### DEPLOY_USER
```
Name: DEPLOY_USER
Value: root
```

#### POSTGRES_PASSWORD
```
Name: POSTGRES_PASSWORD
Value: (paste generated password)
```

#### JWT_SECRET
```
Name: JWT_SECRET
Value: (paste generated secret)
```

#### DOMAIN (Optional)
```
Name: DOMAIN
Value: innervoid.online
```

### 4. Verify Configuration

After adding all secrets, you should see:

```
Environment: production

Environment secrets (6):
- SSH_PRIVATE_KEY        Updated just now
- DEPLOY_HOST            Updated just now
- DEPLOY_USER            Updated just now
- POSTGRES_PASSWORD      Updated just now
- JWT_SECRET             Updated just now
- DOMAIN                 Updated just now (optional)
```

## Enable GitHub Actions

### 1. Check Actions Settings

1. Go to **Settings** > **Actions** > **General**
2. Under **Actions permissions**, select:
   - **Allow all actions and reusable workflows**
   - Or **Allow owner, and select non-owner, actions and reusable workflows**

### 2. Configure Workflow Permissions

1. Scroll to **Workflow permissions**
2. Select **Read and write permissions**
3. Check **Allow GitHub Actions to create and approve pull requests** (optional)
4. Click **Save**

## Security Best Practices

### Secret Management

- **Never commit secrets** to the repository
- **Rotate secrets** periodically (every 90 days recommended)
- **Use environment protection** for production deployments
- **Limit secret access** to necessary workflows only

### SSH Key Security

- **Use Ed25519** keys (more secure than RSA)
- **No passphrase** required for CI/CD (key is encrypted at rest in GitHub)
- **Dedicated key** for deployment only (don't reuse personal keys)
- **Revoke immediately** if compromised

### Deploy User (Optional Security Enhancement)

Instead of using `root`, create a dedicated deploy user:

```bash
# On the VM
useradd -m -s /bin/bash deploy
usermod -aG docker deploy

# Copy authorized_keys
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Give deploy user access to /opt/itv
chown -R deploy:deploy /opt/itv
```

Then update DEPLOY_USER secret to `deploy`.

## Troubleshooting

### SSH Connection Failed

```bash
# Test SSH from local machine
ssh -i ~/.ssh/itv_deploy_key -o StrictHostKeyChecking=no root@YOUR_VM_IP

# Check authorized_keys on server
ssh root@YOUR_VM_IP "cat ~/.ssh/authorized_keys"

# Check SSH service status
ssh root@YOUR_VM_IP "systemctl status sshd"
```

### GHCR Authentication Failed

- Verify GitHub Actions has `packages: write` permission in workflow
- Check repository visibility (private repos need extra token setup)

### Environment Secrets Not Available

- Ensure workflow uses `environment: production`
- Check environment protection rules aren't blocking

### Secret Value Truncated

- Ensure no trailing newlines when pasting
- For multi-line secrets (SSH key), include all lines

## Next Steps

1. Perform first deployment: [FIRST_DEPLOYMENT.md](./FIRST_DEPLOYMENT.md)
