#!/bin/bash
set -euo pipefail

# Deployment script for Docker Swarm
# Runs on the Swarm manager node to deploy new versions with zero downtime

# Accept version tag and registry as parameters
TAG="${1:?TAG required (e.g., 1.19.0)}"
REGISTRY="${2:?REGISTRY required (e.g., ghcr.io/owner/repo)}"

echo "=========================================="
echo "Deployment starting"
echo "Tag: $TAG"
echo "Registry: $REGISTRY"
echo "=========================================="

# Step 1: Pull new images
echo ""
echo "Step 1/4: Pulling new images..."
docker pull "$REGISTRY/api:$TAG"
docker pull "$REGISTRY/game-server:$TAG"
docker pull "$REGISTRY/web:$TAG"
echo "✓ Images pulled successfully"

# Step 2: Verify database connectivity
echo ""
echo "Step 2/4: Verifying database connectivity..."
docker run --rm \
  --network itv_internal \
  -e PGPASSWORD="${POSTGRES_PASSWORD}" \
  postgres:16-alpine \
  pg_isready -h postgres -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-into_the_void}"

if [ $? -eq 0 ]; then
  echo "✓ Database is reachable"
else
  echo "✗ Database connection failed"
  exit 1
fi

# Step 3: Deploy stack with rolling update
echo ""
echo "Step 3/4: Deploying stack (rolling update)..."
export TAG="$TAG"
export REGISTRY="$REGISTRY"
docker stack deploy -c docker-stack.yml --with-registry-auth itv
echo "✓ Stack deployment initiated"

# Step 4: Wait for services to stabilize
echo ""
echo "Step 4/4: Waiting for services to stabilize..."
sleep 30

# Check service status
echo ""
echo "Service status:"
docker stack services itv

# Verify update status for each service
echo ""
echo "Update status:"
for service in api game-server web; do
  status=$(docker service inspect --format '{{.UpdateStatus.State}}' "itv_$service" 2>/dev/null || echo "unknown")
  replicas=$(docker service ls --filter "name=itv_$service" --format "{{.Replicas}}" 2>/dev/null || echo "0/0")

  if [ "$status" = "completed" ] || [ "$status" = "unknown" ]; then
    echo "✓ itv_$service: $replicas (status: $status)"
  else
    echo "⚠ itv_$service: $replicas (status: $status - may still be updating)"
  fi
done

echo ""
echo "=========================================="
echo "Deployment complete"
echo "=========================================="
echo ""
echo "Note: Migrations run automatically on API container startup."
echo "The rolling update strategy ensures zero downtime:"
echo "  1. New containers start and pass health checks"
echo "  2. Traffic routes to healthy new containers"
echo "  3. Old containers gracefully shut down"
