import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { sql } from './db.ts';

const migrationsDir = path.join(import.meta.dirname, '../../migrations');

/** Applies the numbered `.sql` files in `migrations/` that have not run yet. */
export async function migrate(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  const applied = new Set(
    (await sql<{ name: string }[]>`SELECT name FROM migrations`).map((r) => r.name),
  );
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const content = await readFile(path.join(migrationsDir, file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO migrations (name) VALUES (${file})`;
    });
    console.log(`Applied migration ${file}`);
  }
}
