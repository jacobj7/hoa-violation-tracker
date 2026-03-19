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

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'resident',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);

    // Properties table
    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        address VARCHAR(500) NOT NULL,
        unit_number VARCHAR(50),
        city VARCHAR(255) NOT NULL,
        state VARCHAR(100) NOT NULL,
        zip_code VARCHAR(20) NOT NULL,
        property_type VARCHAR(100) NOT NULL DEFAULT 'residential',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
    `);

    // Violation categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS violation_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        severity VARCHAR(50) NOT NULL DEFAULT 'medium',
        base_fine_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violation_categories_severity ON violation_categories(severity);
    `);

    // Violations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS violations (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES violation_categories(id) ON DELETE RESTRICT,
        reported_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        severity VARCHAR(50) NOT NULL DEFAULT 'medium',
        incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
        resolved_date TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_property_id ON violations(property_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_category_id ON violations(category_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_reported_by ON violations(reported_by);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_assigned_to ON violations(assigned_to);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_severity ON violations(severity);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_violations_incident_date ON violations(incident_date);
    `);

    // Notices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        sent_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        notice_type VARCHAR(100) NOT NULL DEFAULT 'warning',
        subject VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE,
        delivery_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        response_deadline TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notices_violation_id ON notices(violation_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notices_sent_by ON notices(sent_by);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notices_recipient_id ON notices(recipient_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notices_delivery_status ON notices(delivery_status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notices_notice_type ON notices(notice_type);
    `);

    // Fines table
    await client.query(`
      CREATE TABLE IF NOT EXISTS fines (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        issued_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
        due_date TIMESTAMP WITH TIME ZONE NOT NULL,
        paid_at TIMESTAMP WITH TIME ZONE,
        payment_method VARCHAR(100),
        transaction_id VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fines_violation_id ON fines(violation_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fines_property_id ON fines(property_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fines_issued_by ON fines(issued_by);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fines_owner_id ON fines(owner_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fines_status ON fines(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fines_due_date ON fines(due_date);
    `);

    // Hearings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hearings (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        fine_id INTEGER REFERENCES fines(id) ON DELETE SET NULL,
        requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        presided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
        location VARCHAR(500),
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
        outcome VARCHAR(100),
        outcome_notes TEXT,
        fine_adjustment NUMERIC(10, 2),
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_violation_id ON hearings(violation_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_fine_id ON hearings(fine_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_requested_by ON hearings(requested_by);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_presided_by ON hearings(presided_by);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_status ON hearings(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hearings_scheduled_at ON hearings(scheduled_at);
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

migrate().catch((error) => {
  console.error("Fatal migration error:", error);
  process.exit(1);
});
