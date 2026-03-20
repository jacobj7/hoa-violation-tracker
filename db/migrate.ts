import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Communities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS communities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(50),
        zip_code VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(255),
        website VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        role VARCHAR(50) NOT NULL DEFAULT 'resident' CHECK (role IN ('admin', 'manager', 'resident', 'board_member')),
        is_active BOOLEAN DEFAULT TRUE,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_community_id ON users(community_id)
    `);

    // Properties table
    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        address TEXT NOT NULL,
        unit_number VARCHAR(50),
        lot_number VARCHAR(50),
        property_type VARCHAR(50) DEFAULT 'residential',
        square_footage DECIMAL(10, 2),
        bedrooms INTEGER,
        bathrooms DECIMAL(3, 1),
        is_rental BOOLEAN DEFAULT FALSE,
        tenant_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_properties_community_id ON properties(community_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id)
    `);

    // Violation categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS violation_categories (
        id SERIAL PRIMARY KEY,
        community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        default_fine_amount DECIMAL(10, 2) DEFAULT 0.00,
        grace_period_days INTEGER DEFAULT 14,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violation_categories_community_id ON violation_categories(community_id)
    `);

    // Violations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS violations (
        id SERIAL PRIMARY KEY,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES violation_categories(id) ON DELETE SET NULL,
        reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'appealed')),
        severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        violation_date DATE,
        due_date DATE,
        resolved_date DATE,
        resolution_notes TEXT,
        photos JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_community_id ON violations(community_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_property_id ON violations(property_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_category_id ON violations(category_id)
    `);

    // Fines table
    await client.query(`
      CREATE TABLE IF NOT EXISTS fines (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        issued_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived', 'appealed', 'overdue')),
        due_date DATE,
        paid_date DATE,
        payment_method VARCHAR(50),
        payment_reference VARCHAR(255),
        waiver_reason TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fines_violation_id ON fines(violation_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fines_property_id ON fines(property_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fines_community_id ON fines(community_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fines_status ON fines(status)
    `);

    // Notices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER REFERENCES violations(id) ON DELETE CASCADE,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        recipient_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notice_type VARCHAR(50) NOT NULL DEFAULT 'warning' CHECK (notice_type IN ('warning', 'fine', 'hearing', 'legal', 'reminder', 'general')),
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        delivery_method VARCHAR(50) DEFAULT 'email' CHECK (delivery_method IN ('email', 'mail', 'hand_delivered', 'portal')),
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'delivered', 'failed', 'read')),
        sent_at TIMESTAMP WITH TIME ZONE,
        delivered_at TIMESTAMP WITH TIME ZONE,
        read_at TIMESTAMP WITH TIME ZONE,
        ai_generated BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notices_violation_id ON notices(violation_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notices_community_id ON notices(community_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notices_property_id ON notices(property_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notices_recipient_id ON notices(recipient_id)
    `);

    // Appeals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS appeals (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER REFERENCES violations(id) ON DELETE CASCADE,
        fine_id INTEGER REFERENCES fines(id) ON DELETE CASCADE,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        submitted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        appeal_type VARCHAR(50) DEFAULT 'violation' CHECK (appeal_type IN ('violation', 'fine', 'both')),
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'denied', 'withdrawn')),
        reason TEXT NOT NULL,
        supporting_documents JSONB DEFAULT '[]',
        reviewer_notes TEXT,
        decision_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appeals_violation_id ON appeals(violation_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appeals_fine_id ON appeals(fine_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appeals_community_id ON appeals(community_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appeals_submitted_by ON appeals(submitted_by)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status)
    `);

    // Hearings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hearings (
        id SERIAL PRIMARY KEY,
        appeal_id INTEGER REFERENCES appeals(id) ON DELETE CASCADE,
        violation_id INTEGER REFERENCES violations(id) ON DELETE CASCADE,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        scheduled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')),
        hearing_date TIMESTAMP WITH TIME ZONE NOT NULL,
        location VARCHAR(255),
        is_virtual BOOLEAN DEFAULT FALSE,
        meeting_link VARCHAR(500),
        attendees JSONB DEFAULT '[]',
        minutes TEXT,
        outcome VARCHAR(50) CHECK (outcome IN ('upheld', 'overturned', 'modified', 'dismissed', 'no_decision')),
        outcome_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_appeal_id ON hearings(appeal_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_violation_id ON hearings(violation_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_community_id ON hearings(community_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_hearing_date ON hearings(hearing_date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_status ON hearings(status)
    `);

    await client.query("COMMIT");

    console.log("Migration completed successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Fatal migration error:", error);
  process.exit(1);
});
