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
      CREATE TABLE IF NOT EXISTS communities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(50),
        zip VARCHAR(20),
        phone VARCHAR(30),
        email VARCHAR(255),
        website VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(30),
        role VARCHAR(50) NOT NULL DEFAULT 'resident' CHECK (role IN ('super_admin', 'admin', 'manager', 'resident', 'board_member')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        address TEXT NOT NULL,
        unit VARCHAR(50),
        lot_number VARCHAR(50),
        parcel_number VARCHAR(100),
        property_type VARCHAR(50) DEFAULT 'residential',
        is_rental BOOLEAN NOT NULL DEFAULT FALSE,
        tenant_name VARCHAR(255),
        tenant_email VARCHAR(255),
        tenant_phone VARCHAR(30),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS violation_types (
        id SERIAL PRIMARY KEY,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        default_fine_amount NUMERIC(10, 2) DEFAULT 0.00,
        grace_period_days INTEGER DEFAULT 14,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS violations (
        id SERIAL PRIMARY KEY,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        violation_type_id INTEGER NOT NULL REFERENCES violation_types(id) ON DELETE RESTRICT,
        reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'notified', 'in_review', 'appealed', 'resolved', 'closed', 'escalated')),
        severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        description TEXT,
        location_detail TEXT,
        fine_amount NUMERIC(10, 2) DEFAULT 0.00,
        due_date DATE,
        resolved_at TIMESTAMPTZ,
        resolution_notes TEXT,
        photo_urls TEXT[],
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        recipient_name VARCHAR(255),
        recipient_email VARCHAR(255),
        recipient_address TEXT,
        notice_type VARCHAR(50) NOT NULL DEFAULT 'first_notice' CHECK (notice_type IN ('first_notice', 'second_notice', 'final_notice', 'hearing_notice', 'resolution_notice', 'custom')),
        subject VARCHAR(500),
        body TEXT,
        sent_via VARCHAR(50) DEFAULT 'email' CHECK (sent_via IN ('email', 'mail', 'hand_delivered', 'portal')),
        sent_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        opened_at TIMESTAMPTZ,
        is_draft BOOLEAN NOT NULL DEFAULT FALSE,
        ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS appeals (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'denied', 'withdrawn')),
        reason TEXT NOT NULL,
        supporting_documents TEXT[],
        reviewer_notes TEXT,
        decision_reason TEXT,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS hearings (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        appeal_id INTEGER REFERENCES appeals(id) ON DELETE SET NULL,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        scheduled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')),
        hearing_type VARCHAR(50) DEFAULT 'standard' CHECK (hearing_type IN ('standard', 'appeal', 'emergency')),
        scheduled_at TIMESTAMPTZ NOT NULL,
        location TEXT,
        virtual_link VARCHAR(500),
        attendees INTEGER[],
        agenda TEXT,
        minutes TEXT,
        outcome VARCHAR(50) CHECK (outcome IN ('violation_upheld', 'violation_dismissed', 'fine_reduced', 'fine_waived', 'pending_decision')),
        outcome_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS violation_status_log (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        change_reason TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Indexes for performance
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
      CREATE INDEX IF NOT EXISTS idx_notices_violation_id ON notices(violation_id);
      CREATE INDEX IF NOT EXISTS idx_notices_community_id ON notices(community_id);
      CREATE INDEX IF NOT EXISTS idx_appeals_violation_id ON appeals(violation_id);
      CREATE INDEX IF NOT EXISTS idx_appeals_community_id ON appeals(community_id);
      CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);
      CREATE INDEX IF NOT EXISTS idx_hearings_violation_id ON hearings(violation_id);
      CREATE INDEX IF NOT EXISTS idx_hearings_community_id ON hearings(community_id);
      CREATE INDEX IF NOT EXISTS idx_hearings_scheduled_at ON hearings(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_violation_status_log_violation_id ON violation_status_log(violation_id);
      CREATE INDEX IF NOT EXISTS idx_violation_status_log_community_id ON violation_status_log(community_id);
    `);

    await client.query("COMMIT");
    console.log(
      "✅ Migration completed successfully. All 9 tables created (if not already existing).",
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed, rolling back:", error);
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
