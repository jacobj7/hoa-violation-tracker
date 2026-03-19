import { Pool } from "pg";

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
        phone VARCHAR(50),
        email VARCHAR(255),
        website VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) NOT NULL DEFAULT 'resident',
        phone VARCHAR(50),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
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
        unit VARCHAR(50),
        city VARCHAR(100),
        state VARCHAR(50),
        zip VARCHAR(20),
        lot_number VARCHAR(50),
        parcel_number VARCHAR(100),
        is_rental BOOLEAN NOT NULL DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS violation_categories (
        id SERIAL PRIMARY KEY,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        default_fine_amount NUMERIC(10, 2),
        escalation_days INTEGER DEFAULT 30,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

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
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        severity VARCHAR(50) NOT NULL DEFAULT 'medium',
        fine_amount NUMERIC(10, 2),
        due_date DATE,
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolution_notes TEXT,
        photo_urls TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id SERIAL PRIMARY KEY,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        violation_id INTEGER REFERENCES violations(id) ON DELETE SET NULL,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notice_type VARCHAR(100) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE,
        delivery_method VARCHAR(50) NOT NULL DEFAULT 'email',
        delivery_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        recipient_email VARCHAR(255),
        recipient_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS hearings (
        id SERIAL PRIMARY KEY,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        violation_id INTEGER REFERENCES violations(id) ON DELETE SET NULL,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        scheduled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
        scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
        location TEXT,
        meeting_link VARCHAR(500),
        outcome TEXT,
        outcome_notes TEXT,
        fine_amount NUMERIC(10, 2),
        attendees INTEGER[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id SERIAL PRIMARY KEY,
        community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id INTEGER,
        action VARCHAR(100) NOT NULL,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Indexes for communities
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_communities_email ON communities(email);
    `);

    // Indexes for users
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_community_id ON users(community_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);

    // Indexes for properties
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_properties_community_id ON properties(community_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
    `);

    // Indexes for violation_categories
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violation_categories_community_id ON violation_categories(community_id);
    `);

    // Indexes for violations
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_community_id ON violations(community_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_property_id ON violations(property_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_category_id ON violations(category_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_reported_by ON violations(reported_by);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_assigned_to ON violations(assigned_to);
    `);

    // Indexes for notices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notices_community_id ON notices(community_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notices_violation_id ON notices(violation_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notices_property_id ON notices(property_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notices_delivery_status ON notices(delivery_status);
    `);

    // Indexes for hearings
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_community_id ON hearings(community_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_violation_id ON hearings(violation_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_property_id ON hearings(property_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_status ON hearings(status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_scheduled_at ON hearings(scheduled_at);
    `);

    // Indexes for audit_events
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_events_community_id ON audit_events(community_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_events_entity_type ON audit_events(entity_type);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_events_entity_id ON audit_events(entity_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);
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
