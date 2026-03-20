import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'resident',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS communities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(255),
        state VARCHAR(100),
        zip_code VARCHAR(20),
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        address TEXT NOT NULL,
        unit_number VARCHAR(50),
        lot_number VARCHAR(50),
        property_type VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS violations (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        violation_type VARCHAR(100),
        severity VARCHAR(50) NOT NULL DEFAULT 'low',
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        due_date DATE,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inspections (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        inspector_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        violation_id INTEGER REFERENCES violations(id) ON DELETE SET NULL,
        scheduled_date TIMESTAMP WITH TIME ZONE,
        completed_date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
        notes TEXT,
        result VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS fines (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        issued_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        amount NUMERIC(10, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
        due_date DATE,
        paid_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS hearings (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        scheduled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
        location TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
        outcome TEXT,
        notes TEXT,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id INTEGER NOT NULL,
        action VARCHAR(100) NOT NULL,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_properties_community_id ON properties(community_id);
      CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
      CREATE INDEX IF NOT EXISTS idx_violations_property_id ON violations(property_id);
      CREATE INDEX IF NOT EXISTS idx_violations_community_id ON violations(community_id);
      CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
      CREATE INDEX IF NOT EXISTS idx_inspections_property_id ON inspections(property_id);
      CREATE INDEX IF NOT EXISTS idx_inspections_violation_id ON inspections(violation_id);
      CREATE INDEX IF NOT EXISTS idx_fines_violation_id ON fines(violation_id);
      CREATE INDEX IF NOT EXISTS idx_fines_property_id ON fines(property_id);
      CREATE INDEX IF NOT EXISTS idx_fines_status ON fines(status);
      CREATE INDEX IF NOT EXISTS idx_hearings_violation_id ON hearings(violation_id);
      CREATE INDEX IF NOT EXISTS idx_hearings_community_id ON hearings(community_id);
      CREATE INDEX IF NOT EXISTS idx_audit_entries_entity ON audit_entries(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_entries_user_id ON audit_entries(user_id);
    `);

    await client.query("COMMIT");
    console.log("Migration completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
