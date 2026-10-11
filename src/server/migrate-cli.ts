import { sql } from './db.ts';
import { migrate } from './migrate.ts';

await migrate();
await sql.end();
