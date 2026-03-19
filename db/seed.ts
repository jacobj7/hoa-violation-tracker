import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('inspector', 'property_manager', 'board_member')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        address VARCHAR(500) NOT NULL,
        unit_number VARCHAR(50),
        city VARCHAR(255) NOT NULL,
        state VARCHAR(100) NOT NULL,
        zip_code VARCHAR(20) NOT NULL,
        property_type VARCHAR(100) NOT NULL,
        owner_name VARCHAR(255),
        owner_email VARCHAR(255),
        owner_phone VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_review')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS violation_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        fine_amount DECIMAL(10, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS violations (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES violation_categories(id) ON DELETE SET NULL,
        inspector_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
        severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        fine_amount DECIMAL(10, 2) DEFAULT 0.00,
        due_date DATE,
        resolved_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inspection_reports (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        inspector_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(500) NOT NULL,
        summary TEXT,
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
        inspection_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Clear existing data
    await client.query("DELETE FROM inspection_reports");
    await client.query("DELETE FROM violations");
    await client.query("DELETE FROM violation_categories");
    await client.query("DELETE FROM properties");
    await client.query("DELETE FROM users");

    // Reset sequences
    await client.query("ALTER SEQUENCE users_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE properties_id_seq RESTART WITH 1");
    await client.query(
      "ALTER SEQUENCE violation_categories_id_seq RESTART WITH 1",
    );
    await client.query("ALTER SEQUENCE violations_id_seq RESTART WITH 1");
    await client.query(
      "ALTER SEQUENCE inspection_reports_id_seq RESTART WITH 1",
    );

    // Hash passwords
    const saltRounds = 12;
    const inspectorPassword = await bcrypt.hash("Inspector@123", saltRounds);
    const managerPassword = await bcrypt.hash("Manager@123", saltRounds);
    const boardPassword = await bcrypt.hash("Board@123", saltRounds);

    // Insert users
    const usersResult = await client.query(
      `INSERT INTO users (name, email, password, role) VALUES
        ('Alice Johnson', 'alice.inspector@example.com', $1, 'inspector'),
        ('Bob Martinez', 'bob.inspector@example.com', $1, 'inspector'),
        ('Carol Williams', 'carol.manager@example.com', $2, 'property_manager'),
        ('David Chen', 'david.manager@example.com', $2, 'property_manager'),
        ('Eve Thompson', 'eve.board@example.com', $3, 'board_member'),
        ('Frank Davis', 'frank.board@example.com', $3, 'board_member'),
        ('Grace Lee', 'grace.board@example.com', $3, 'board_member')
      RETURNING id, name, email, role`,
      [inspectorPassword, managerPassword, boardPassword],
    );

    console.log("✅ Users seeded:");
    usersResult.rows.forEach((user) => {
      console.log(`   - [${user.role}] ${user.name} (${user.email})`);
    });

    // Insert properties
    const propertiesResult = await client.query(
      `INSERT INTO properties (address, unit_number, city, state, zip_code, property_type, owner_name, owner_email, owner_phone, status) VALUES
        ('123 Oak Street', NULL, 'Springfield', 'IL', '62701', 'Single Family Home', 'John Smith', 'john.smith@email.com', '555-0101', 'active'),
        ('456 Maple Avenue', 'Apt 2B', 'Springfield', 'IL', '62702', 'Apartment', 'Sarah Johnson', 'sarah.j@email.com', '555-0102', 'active'),
        ('789 Pine Road', NULL, 'Shelbyville', 'IL', '62565', 'Single Family Home', 'Mike Brown', 'mike.b@email.com', '555-0103', 'active'),
        ('321 Elm Drive', 'Unit 5', 'Springfield', 'IL', '62703', 'Condominium', 'Lisa Davis', 'lisa.d@email.com', '555-0104', 'active'),
        ('654 Cedar Lane', NULL, 'Capital City', 'IL', '62704', 'Townhouse', 'Robert Wilson', 'robert.w@email.com', '555-0105', 'active'),
        ('987 Birch Boulevard', NULL, 'Shelbyville', 'IL', '62566', 'Single Family Home', 'Jennifer Taylor', 'jen.t@email.com', '555-0106', 'under_review'),
        ('147 Walnut Court', 'Suite 1A', 'Springfield', 'IL', '62705', 'Commercial', 'Thomas Anderson', 'tom.a@email.com', '555-0107', 'active'),
        ('258 Spruce Way', NULL, 'Capital City', 'IL', '62706', 'Single Family Home', 'Patricia Moore', 'pat.m@email.com', '555-0108', 'inactive'),
        ('369 Willow Path', 'Apt 3C', 'Springfield', 'IL', '62707', 'Apartment', 'Charles Jackson', 'charles.j@email.com', '555-0109', 'active'),
        ('741 Ash Street', NULL, 'Shelbyville', 'IL', '62567', 'Single Family Home', 'Barbara White', 'barb.w@email.com', '555-0110', 'active')
      RETURNING id, address, city`,
      [],
    );

    console.log("\n✅ Properties seeded:");
    propertiesResult.rows.forEach((prop) => {
      console.log(`   - ${prop.address}, ${prop.city} (ID: ${prop.id})`);
    });

    // Insert violation categories
    const categoriesResult = await client.query(
      `INSERT INTO violation_categories (name, description, severity, fine_amount) VALUES
        ('Lawn & Landscaping', 'Overgrown grass, weeds, or unkempt landscaping that violates community standards', 'low', 50.00),
        ('Exterior Maintenance', 'Peeling paint, damaged siding, broken windows, or deteriorating exterior surfaces', 'medium', 150.00),
        ('Parking Violations', 'Unauthorized parking, vehicles on grass, inoperable vehicles, or exceeding parking limits', 'low', 75.00),
        ('Noise Complaints', 'Excessive noise levels that disturb neighbors beyond permitted hours', 'medium', 100.00),
        ('Trash & Debris', 'Improper trash disposal, accumulation of debris, or failure to maintain clean premises', 'medium', 125.00),
        ('Structural Damage', 'Significant structural issues including foundation problems, roof damage, or unsafe conditions', 'critical', 500.00),
        ('Fence & Boundary', 'Damaged, unauthorized, or improperly maintained fences and boundary structures', 'low', 100.00),
        ('Pool & Water Features', 'Unmaintained pools, improper fencing around water features, or water safety violations', 'high', 300.00),
        ('Signage Violations', 'Unauthorized signs, excessive signage, or signs that violate community guidelines', 'low', 50.00),
        ('Pet Violations', 'Unleashed pets, excessive pet waste, or unauthorized pet ownership', 'medium', 100.00),
        ('Unauthorized Construction', 'Building or renovation work performed without proper permits or HOA approval', 'high', 400.00),
        ('Fire Safety', 'Blocked fire exits, improper storage of flammable materials, or missing safety equipment', 'critical', 600.00),
        ('Utility Violations', 'Improper utility connections, exposed wiring, or plumbing issues visible from exterior', 'high', 250.00),
        ('Rental Violations', 'Unauthorized short-term rentals or failure to register tenants with the association', 'high', 350.00),
        ('Common Area Misuse', 'Improper use or damage to shared community spaces and amenities', 'medium', 200.00)
      RETURNING id, name, severity`,
      [],
    );

    console.log("\n✅ Violation categories seeded:");
    categoriesResult.rows.forEach((cat) => {
      console.log(`   - [${cat.severity}] ${cat.name} (ID: ${cat.id})`);
    });

    // Insert sample violations
    const inspectorId1 = usersResult.rows[0].id;
    const inspectorId2 = usersResult.rows[1].id;

    const violationsData = [
      {
        property_id: 1,
        category_id: 1,
        inspector_id: inspectorId1,
        title: "Overgrown lawn exceeding 6 inches",
        description:
          "The front lawn has not been mowed and grass exceeds the maximum allowed height of 6 inches. Weeds are also present throughout the yard.",
        status: "open",
        severity: "low",
        fine_amount: 50.0,
        due_date: "2024-02-15",
      },
      {
        property_id: 2,
        category_id: 2,
        inspector_id: inspectorId1,
        title: "Peeling exterior paint on south wall",
        description:
          "Significant paint peeling observed on the south-facing exterior wall. Approximately 30% of the surface area is affected.",
        status: "in_progress",
        severity: "medium",
        fine_amount: 150.0,
        due_date: "2024-03-01",
      },
      {
        property_id: 3,
        category_id: 6,
        inspector_id: inspectorId2,
        title: "Roof damage - missing shingles",
        description:
          "Multiple missing shingles observed on the north section of the roof. Potential for water damage and structural compromise.",
        status: "open",
        severity: "critical",
        fine_amount: 500.0,
        due_date: "2024-01-30",
      },
      {
        property_id: 4,
        category_id: 3,
        inspector_id: inspectorId1,
        title: "Inoperable vehicle parked in driveway",
        description:
          "An inoperable vehicle with expired registration has been parked in the driveway for over 30 days.",
        status: "resolved",
        severity: "low",
        fine_amount: 75.0,
        due_date: "2024-01-20",
      },
      {
        property_id: 5,
        category_id: 11,
        inspector_id: inspectorId2,
        title: "Unauthorized deck construction",
        description:
          "A new deck structure is being built without HOA approval or proper building permits.",
        status: "open",
        severity: "high",
        fine_amount: 400.0,
        due_date: "2024-02-10",
      },
      {
        property_id: 6,
        category_id: 5,
        inspector_id: inspectorId1,
        title: "Excessive debris accumulation in backyard",
        description:
          "Large amounts of construction debris, old furniture, and general waste have accumulated in the backyard, visible from the street.",
        status: "in_progress",
        severity: "medium",
        fine_amount: 125.0,
        due_date: "2024-02-20",
      },
      {
        property_id: 7,
        category_id: 9,
        inspector_id: inspectorId2,
        title: "Unauthorized commercial signage",
        description:
          "Multiple large commercial signs have been installed on the property exterior without HOA approval.",
        status: "open",
        severity: "low",
        fine_amount: 50.0,
        due_date: "2024-02-28",
      },
      {
        property_id: 9,
        category_id: 10,
        inspector_id: inspectorId1,
        title: "Dog waste not being cleaned up",
        description:
          "Multiple complaints received about dog waste not being cleaned up in common areas adjacent to the property.",
        status: "open",
        severity: "medium",
        fine_amount: 100.0,
        due_date: "2024-02-05",
      },
      {
        property_id: 10,
        category_id: 7,
        inspector_id: inspectorId2,
        title: "Damaged fence along property boundary",
        description:
          "The wooden fence along the eastern property boundary has multiple broken and missing boards.",
        status: "open",
        severity: "low",
        fine_amount: 100.0,
        due_date: "2024-03-15",
      },
      {
        property_id: 1,
        category_id: 12,
        inspector_id: inspectorId1,
        title: "Blocked fire exit pathway",
        description:
          "Storage items are blocking the designated fire exit pathway on the side of the property.",
        status: "open",
        severity: "critical",
        fine_amount: 600.0,
        due_date: "2024-01-25",
      },
    ];

    for (const violation of violationsData) {
      await client.query(
        `INSERT INTO violations (property_id, category_id, inspector_id, title, description, status, severity, fine_amount, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          violation.property_id,
          violation.category_id,
          violation.inspector_id,
          violation.title,
          violation.description,
          violation.status,
          violation.severity,
          violation.fine_amount,
          violation.due_date,
        ],
      );
    }

    console.log(`\n✅ ${violationsData.length} violations seeded`);

    // Insert sample inspection reports
    const reportsData = [
      {
        property_id: 1,
        inspector_id: inspectorId1,
        title: "Annual Property Inspection - 123 Oak Street",
        summary:
          "Comprehensive annual inspection completed. Two violations identified: overgrown lawn and blocked fire exit. Property owner has been notified and given deadlines for remediation.",
        status: "submitted",
        inspection_date: "2024-01-15",
      },
      {
        property_id: 2,
        inspector_id: inspectorId1,
        title: "Routine Inspection - 456 Maple Avenue",
        summary:
          "Routine quarterly inspection. Exterior paint peeling issue noted on south wall. Property is otherwise well-maintained. Tenant cooperation was excellent.",
        status: "approved",
        inspection_date: "2024-01-10",
      },
      {
        property_id: 3,
        inspector_id: inspectorId2,
        title: "Emergency Inspection - 789 Pine Road",
        summary:
          "Emergency inspection triggered by neighbor complaint. Critical roof damage discovered with multiple missing shingles. Immediate action required to prevent further structural damage.",
        status: "submitted",
        inspection_date: "2024-01-18",
      },
      {
        property_id: 5,
        inspector_id: inspectorId2,
        title: "Complaint-Based Inspection - 654 Cedar Lane",
        summary:
          "Inspection conducted following report of unauthorized construction. Deck being built without permits or HOA approval. Stop work order recommended.",
        status: "approved",
        inspection_date: "2024-01-12",
      },
      {
        property_id: 9,
        inspector_id: inspectorId1,
        title: "Follow-up Inspection - 369 Willow Path",
        summary:
          "Follow-up inspection for ongoing pet violation complaints. Issue persists despite previous warnings. Formal violation notice issued.",
        status: "draft",
        inspection_date: "2024-01-20",
      },
    ];

    for (const report of reportsData) {
      await client.query(
        `INSERT INTO inspection_reports (property_id, inspector_id, title, summary, status, inspection_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          report.property_id,
          report.inspector_id,
          report.title,
          report.summary,
          report.status,
          report.inspection_date,
        ],
      );
    }

    console.log(`✅ ${reportsData.length} inspection reports seeded`);

    await client.query("COMMIT");

    console.log("\n🎉 Database seeded successfully!");
    console.log("\n📋 Login credentials:");
    console.log("   Inspectors:");
    console.log("     - alice.inspector@example.com / Inspector@123");
    console.log("     - bob.inspector@example.com / Inspector@123");
    console.log("   Property Managers:");
    console.log("     - carol.manager@example.com / Manager@123");
    console.log("     - david.manager@example.com / Manager@123");
    console.log("   Board Members:");
    console.log("     - eve.board@example.com / Board@123");
    console.log("     - frank.board@example.com / Board@123");
    console.log("     - grace.board@example.com / Board@123");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
