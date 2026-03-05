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
echo "Step 1/3: Pulling new images..."
docker pull "$REGISTRY/api:$TAG"
docker pull "$REGISTRY/game-server:$TAG"
docker pull "$REGISTRY/web:$TAG"
echo "✓ Images pulled successfully"

# Step 2: Run database migrations
echo ""
echo "Step 2/4: Running database migrations..."
POSTGRES_CONTAINER=$(docker ps -q -f name=itv_postgres)
if [ -n "$POSTGRES_CONTAINER" ] && [ -d "/opt/itv/drizzle" ]; then
  # Create migration tracking table if it doesn't exist
  docker exec "$POSTGRES_CONTAINER" psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-into_the_void}" -c "
    CREATE TABLE IF NOT EXISTS __deploy_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  " > /dev/null

  APPLIED=0
  SKIPPED=0
  for migration in /opt/itv/drizzle/[0-9]*.sql; do
    [ -f "$migration" ] || continue
    name=$(basename "$migration")
    already_applied=$(docker exec "$POSTGRES_CONTAINER" psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-into_the_void}" -t -c "
      SELECT COUNT(*) FROM __deploy_migrations WHERE name = '$name';
    " | tr -d ' ')

    if [ "$already_applied" = "0" ]; then
      echo "  Applying: $name"
      docker exec -i "$POSTGRES_CONTAINER" psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-into_the_void}" < "$migration"
      docker exec "$POSTGRES_CONTAINER" psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-into_the_void}" -c "
        INSERT INTO __deploy_migrations (name) VALUES ('$name');
      " > /dev/null
      APPLIED=$((APPLIED + 1))
    else
      SKIPPED=$((SKIPPED + 1))
    fi
  done
  echo "✓ Migrations complete ($APPLIED applied, $SKIPPED already up-to-date)"
else
  echo "⚠ Skipping migrations (postgres container or migration files not found)"
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
echo "Migration Strategy (Expand-Contract Pattern):"
echo "  - Schema changes should be backward-compatible"
echo "  - Old code works with new schema during rollout"
echo "  - API health checks gate traffic routing"
echo "  - Migrations can run on container startup or manually"
echo ""
echo "Zero-Downtime Rolling Update Process:"
echo "  1. New containers start and run health checks"
echo "  2. Only healthy containers receive traffic"
echo "  3. Old containers continue serving during transition"
echo "  4. Old containers gracefully shut down after new ones are ready"
echo ""
echo "For breaking schema changes:"
echo "  1. Deploy compatible code first (works with old schema)"
echo "  2. Run migrations manually after deployment stabilizes"
echo "  3. Deploy follow-up code that uses new schema features"
