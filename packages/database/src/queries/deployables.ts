import { eq, or } from 'drizzle-orm';
import { DbClient } from '../client';
import { deployables, Deployable, NewDeployable } from '../schema/deployables';

/**
 * Create a new deployable structure
 */
export async function createDeployable(db: DbClient, data: NewDeployable): Promise<Deployable> {
  const [deployable] = await db.insert(deployables).values(data).returning();
  return deployable;
}

/**
 * Get a deployable by ID
 */
export async function getDeployableById(db: DbClient, id: string): Promise<Deployable | null> {
  const [deployable] = await db
    .select()
    .from(deployables)
    .where(eq(deployables.id, id))
    .limit(1);
  return deployable || null;
}

/**
 * Get all deployables owned by a character
 */
export async function getDeployablesByOwner(db: DbClient, ownerId: string): Promise<Deployable[]> {
  return db
    .select()
    .from(deployables)
    .where(eq(deployables.ownerId, ownerId));
}

/**
 * Get all active/depleted deployables (for server startup load)
 */
export async function getAllActiveDeployables(db: DbClient): Promise<Deployable[]> {
  return db
    .select()
    .from(deployables)
    .where(
      or(
        eq(deployables.status, 'active'),
        eq(deployables.status, 'depleted')
      )
    );
}

/**
 * Update specific fields of a deployable
 */
export async function updateDeployable(
  db: DbClient,
  id: string,
  data: Partial<Omit<Deployable, 'id'>>
): Promise<void> {
  await db
    .update(deployables)
    .set(data)
    .where(eq(deployables.id, id));
}

/**
 * Atomic update for flush cycle — updates accumulated resources, fuel, and last tick timestamp
 */
export async function updateDeployableAccumulated(
  db: DbClient,
  id: string,
  resources: { itemId: string; quantity: number }[],
  fuelRemaining: number,
  lastTickAt: Date
): Promise<void> {
  await db
    .update(deployables)
    .set({
      accumulatedResources: resources,
      fuelRemaining,
      lastTickAt,
    })
    .where(eq(deployables.id, id));
}

/**
 * Hard delete a deployable (for dismantle)
 */
export async function deleteDeployable(db: DbClient, id: string): Promise<void> {
  await db
    .delete(deployables)
    .where(eq(deployables.id, id));
}
