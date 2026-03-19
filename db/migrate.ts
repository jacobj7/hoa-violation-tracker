import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function runMigrations(): Promise<void> {
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('manager', 'inspector', 'board', 'owner');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role user_role NOT NULL DEFAULT 'owner',
        phone VARCHAR(30),
        is_active BOOLEAN DEFAULT TRUE,
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
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE violation_status AS ENUM (
          'open',
          'pending_review',
          'notice_sent',
          'hearing_scheduled',
          'resolved',
          'appealed',
          'closed'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS violations (
        id SERIAL PRIMARY KEY,
        community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        violation_code VARCHAR(100),
        status violation_status NOT NULL DEFAULT 'open',
        severity VARCHAR(50) DEFAULT 'medium',
        occurred_at TIMESTAMP WITH TIME ZONE,
        due_date TIMESTAMP WITH TIME ZONE,
        resolved_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS evidence (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(100),
        file_size INTEGER,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE notice_type AS ENUM (
          'courtesy',
          'first_warning',
          'second_warning',
          'final_warning',
          'hearing_notice',
          'fine_notice',
          'resolution_notice'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notice_type notice_type NOT NULL DEFAULT 'courtesy',
        subject VARCHAR(255),
        body TEXT NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE,
        delivered_at TIMESTAMP WITH TIME ZONE,
        method VARCHAR(50) DEFAULT 'email',
        recipient_email VARCHAR(255),
        recipient_address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE fine_status AS ENUM (
          'pending',
          'issued',
          'paid',
          'waived',
          'appealed',
          'overdue'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS fines (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        issued_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        amount NUMERIC(10, 2) NOT NULL,
        status fine_status NOT NULL DEFAULT 'pending',
        description TEXT,
        due_date TIMESTAMP WITH TIME ZONE,
        paid_at TIMESTAMP WITH TIME ZONE,
        payment_method VARCHAR(100),
        payment_reference VARCHAR(255),
        waived_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE hearing_status AS ENUM (
          'scheduled',
          'in_progress',
          'completed',
          'cancelled',
          'postponed'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS hearings (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        scheduled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status hearing_status NOT NULL DEFAULT 'scheduled',
        scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
        location TEXT,
        notes TEXT,
        outcome TEXT,
        outcome_notes TEXT,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE appeal_status AS ENUM (
          'submitted',
          'under_review',
          'approved',
          'denied',
          'withdrawn'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS appeals (
        id SERIAL PRIMARY KEY,
        violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        fine_id INTEGER REFERENCES fines(id) ON DELETE SET NULL,
        submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status appeal_status NOT NULL DEFAULT 'submitted',
        reason TEXT NOT NULL,
        supporting_documents TEXT,
        decision TEXT,
        decision_notes TEXT,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query("COMMIT");

    console.log("Migrations completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed, rolling back:", error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("Migration script finished.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration script error:", err);
      process.exit(1);
    });
}
