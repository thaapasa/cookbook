import postgres from 'postgres';
import type { TestProject } from 'vitest/node';

/** Creates the test database if it does not exist and applies the migrations. */
export default async function setup(project: TestProject): Promise<void> {
  const url = project.config.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set for the server tests');
  const testUrl = new URL(url);
  const name = testUrl.pathname.slice(1);

  const adminUrl = new URL(testUrl);
  adminUrl.pathname = '/postgres';
  const admin = postgres(adminUrl.href, { onnotice: () => {} });
  try {
    const [exists] = await admin`SELECT 1 FROM pg_database WHERE datname = ${name}`;
    if (!exists) await admin`CREATE DATABASE ${admin(name)}`;
  } finally {
    await admin.end();
  }

  // `db.ts` reads the URL when it is first imported.
  process.env.DATABASE_URL = testUrl.href;
  const { migrate } = await import('../migrate.ts');
  const { sql } = await import('../db.ts');
  try {
    await migrate();
  } finally {
    await sql.end();
  }
}
