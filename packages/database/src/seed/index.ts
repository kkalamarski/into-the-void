import { seedFactions } from './seed-factions';

/**
 * Run all database seeds.
 * Safe to run multiple times — all seeds use onConflictDoNothing().
 */
async function runSeeds(): Promise<void> {
  console.log('Running database seeds...');

  await seedFactions();

  console.log('Database seeding complete');
  process.exit(0);
}

runSeeds().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
