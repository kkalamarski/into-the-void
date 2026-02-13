import { eq } from 'drizzle-orm';
import { DbClient } from '../client';
import { accounts, Account, NewAccount } from '../schema/accounts';
import { sessions, Session, NewSession } from '../schema/sessions';

/**
 * Create a new account
 */
export async function createAccount(db: DbClient, data: NewAccount): Promise<Account> {
  const [account] = await db.insert(accounts).values(data).returning();
  return account;
}

/**
 * Find account by email
 */
export async function findAccountByEmail(db: DbClient, email: string): Promise<Account | null> {
  const [account] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);
  return account || null;
}

/**
 * Find account by ID
 */
export async function findAccountById(db: DbClient, id: string): Promise<Account | null> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return account || null;
}

/**
 * Update last login time
 */
export async function updateLastLogin(db: DbClient, accountId: string): Promise<void> {
  await db
    .update(accounts)
    .set({ lastLoginAt: new Date() })
    .where(eq(accounts.id, accountId));
}

/**
 * Create a new session
 */
export async function createSession(db: DbClient, data: NewSession): Promise<Session> {
  const [session] = await db.insert(sessions).values(data).returning();
  return session;
}

/**
 * Find session by token
 */
export async function findSessionByToken(db: DbClient, token: string): Promise<Session | null> {
  const [session] = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
  return session || null;
}

/**
 * Delete session
 */
export async function deleteSession(db: DbClient, id: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, id));
}

/**
 * Delete all sessions for an account
 */
export async function deleteAccountSessions(db: DbClient, accountId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.accountId, accountId));
}

/**
 * Delete expired sessions
 */
export async function deleteExpiredSessions(db: DbClient): Promise<void> {
  const now = new Date();
  await db.delete(sessions).where(eq(sessions.expiresAt, now));
}
