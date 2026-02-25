import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@into-the-void/database';
import { factions, defaultFactions } from '@into-the-void/database';

type DbClient = ReturnType<typeof drizzle<typeof schema>>;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;
  private db!: DbClient;

  async onModuleInit() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/into_the_void';

    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.db = drizzle(this.pool, { schema });

    // Test connection
    try {
      const client = await this.pool.connect();
      client.release();
      console.log('Database connection established');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }

    // Auto-seed essential data
    await this.seedDatabase();
  }

  private async seedDatabase() {
    try {
      // Check if factions exist
      const existingFactions = await this.db.select().from(factions).limit(1);

      if (existingFactions.length === 0) {
        console.log('Seeding factions...');
        for (const faction of defaultFactions) {
          await this.db.insert(factions).values(faction).onConflictDoNothing();
        }
        console.log(`Seeded ${defaultFactions.length} factions`);
      }
    } catch (error) {
      console.error('Database seeding failed:', error);
      // Don't throw - seeding failure shouldn't prevent app startup
    }
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  getClient(): DbClient {
    return this.db;
  }

  getPool(): Pool {
    return this.pool;
  }
}
