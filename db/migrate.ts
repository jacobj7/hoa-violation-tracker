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
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('manager', 'inspector', 'owner', 'board');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE violation_status AS ENUM (
          'open',
          'confirmed',
          'notice_issued',
          'fine_applied',
          'resolved',
          'appealed'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE appeal_status AS ENUM ('pending', 'approved', 'denied');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS communities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name VARCHAR(255) NOT NULL,
        role user_role NOT NULL,
        community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        address TEXT NOT NULL,
        unit VARCHAR(100),
        community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS violation_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        default_fine_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS violations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        category_id UUID REFERENCES violation_categories(id) ON DELETE SET NULL,
        inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
        status violation_status NOT NULL DEFAULT 'open',
        description TEXT,
        cure_deadline DATE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        pdf_url TEXT,
        content TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS fines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        paid_at TIMESTAMPTZ,
        paid BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS appeals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT NOT NULL,
        status appeal_status NOT NULL DEFAULT 'pending',
        board_notes TEXT,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        decided_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS evidence_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_violations_updated_at ON violations;
      CREATE TRIGGER update_violations_updated_at
        BEFORE UPDATE ON violations
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query("COMMIT");

    console.log("✅ Migration completed successfully.");
    console.log("   Tables created:");
    console.log("   - communities");
    console.log("   - users");
    console.log("   - properties");
    console.log("   - violation_categories");
    console.log("   - violations");
    console.log("   - notices");
    console.log("   - fines");
    console.log("   - appeals");
    console.log("   - evidence_photos");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", error);
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
