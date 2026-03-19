import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export { pool };

export async function query<T = any>(
  sql: string,
  params?: any[],
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount ?? 0,
    };
  } finally {
    client.release();
  }
}
