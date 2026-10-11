/** Quotes a string as an SQL literal, for statements printed for manual use. */
export function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

/** Writes bytes as an SQL `bytea` expression. */
export function sqlBytes(value: Buffer): string {
  return `decode('${value.toString('hex')}', 'hex')`;
}
