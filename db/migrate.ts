import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create role enum for users
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('manager', 'owner');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create violation status enum
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE violation_status AS ENUM ('open', 'pending', 'resolved', 'closed', 'disputed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create appeal status enum
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE appeal_status AS ENUM ('pending', 'under_review', 'approved', 'denied', 'withdrawn');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create notice status enum
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE notice_status AS ENUM ('draft', 'sent', 'delivered', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 1. communities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS communities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(50),
        zip_code VARCHAR(20),
        phone VARCHAR(50),
        email VARCHAR(255),
        website VARCHAR(255),
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        password_hash VARCHAR(255),
        role user_role NOT NULL DEFAULT 'owner',
        phone VARCHAR(50),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        email_verified_at TIMESTAMPTZ,
        last_login_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. properties table
    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
        address TEXT NOT NULL,
        unit_number VARCHAR(50),
        lot_number VARCHAR(50),
        property_type VARCHAR(100),
        square_footage NUMERIC(10, 2),
        bedrooms INTEGER,
        bathrooms NUMERIC(4, 1),
        is_rental BOOLEAN NOT NULL DEFAULT FALSE,
        tenant_name VARCHAR(255),
        tenant_email VARCHAR(255),
        tenant_phone VARCHAR(50),
        notes TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 4. violation_types table
    await client.query(`
      CREATE TABLE IF NOT EXISTS violation_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        fine_amount NUMERIC(10, 2) DEFAULT 0,
        grace_period_days INTEGER DEFAULT 0,
        escalation_fine_amount NUMERIC(10, 2),
        escalation_days INTEGER,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 5. violations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS violations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        violation_type_id UUID REFERENCES violation_types(id) ON DELETE SET NULL,
        reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        status violation_status NOT NULL DEFAULT 'open',
        title VARCHAR(255) NOT NULL,
        description TEXT,
        fine_amount NUMERIC(10, 2) DEFAULT 0,
        fine_paid BOOLEAN NOT NULL DEFAULT FALSE,
        fine_paid_at TIMESTAMPTZ,
        occurred_at TIMESTAMPTZ,
        due_date TIMESTAMPTZ,
        resolved_at TIMESTAMPTZ,
        resolution_notes TEXT,
        images JSONB DEFAULT '[]',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 6. notices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        violation_id UUID REFERENCES violations(id) ON DELETE SET NULL,
        property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
        sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
        recipient_name VARCHAR(255),
        recipient_email VARCHAR(255),
        recipient_address TEXT,
        subject VARCHAR(500),
        body TEXT,
        status notice_status NOT NULL DEFAULT 'draft',
        sent_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        delivery_method VARCHAR(50) DEFAULT 'email',
        ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 7. appeals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS appeals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        status appeal_status NOT NULL DEFAULT 'pending',
        reason TEXT NOT NULL,
        supporting_documents JSONB DEFAULT '[]',
        reviewer_notes TEXT,
        decision_reason TEXT,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        decided_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 8. audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100),
        entity_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_community_id ON users(community_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_properties_community_id ON properties(community_id);
      CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
      CREATE INDEX IF NOT EXISTS idx_violation_types_community_id ON violation_types(community_id);
      CREATE INDEX IF NOT EXISTS idx_violations_community_id ON violations(community_id);
      CREATE INDEX IF NOT EXISTS idx_violations_property_id ON violations(property_id);
      CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
      CREATE INDEX IF NOT EXISTS idx_violations_violation_type_id ON violations(violation_type_id);
      CREATE INDEX IF NOT EXISTS idx_notices_community_id ON notices(community_id);
      CREATE INDEX IF NOT EXISTS idx_notices_violation_id ON notices(violation_id);
      CREATE INDEX IF NOT EXISTS idx_notices_property_id ON notices(property_id);
      CREATE INDEX IF NOT EXISTS idx_appeals_community_id ON appeals(community_id);
      CREATE INDEX IF NOT EXISTS idx_appeals_violation_id ON appeals(violation_id);
      CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_community_id ON audit_logs(community_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `);

    await client.query("COMMIT");
    console.log("✅ Migrations completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed, rolling back:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  try {
    await runMigrations();
    process.exit(0);
  } catch (error) {
    console.error("Migration script failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
