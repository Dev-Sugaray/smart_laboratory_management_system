const request = require('supertest');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt'); // For creating user password hashes

// Import app from your server file.
const { app } = require('../index'); // Assuming index.js exports app

const testDbPath = path.resolve(__dirname, 'test-instruments-api-database.db');
let db; // Test database instance

// Tokens for different users
let adminToken;
let labManagerToken;
let researcherToken;

// User IDs
let adminUserId;
let labManagerUserId;
let researcherUserId;

// Helper function to initialize the database schema
const initializeTestDatabase = (done) => {
  db = new sqlite3.Database(testDbPath, (err) => {
    if (err) return done(err);
    // console.log('Connected to the test instruments SQLite database.');

    db.serialize(() => {
      // Drop tables if they exist to ensure a clean state
      const tables = [
        'instrument_usage_logs', 'instruments',
        'role_permissions', 'users', 'permissions', 'roles'
        // Add other tables if they become direct dependencies for instrument tests in future
      ];
      tables.forEach(table => db.run(`DROP TABLE IF EXISTS ${table}`, (err) => {
        if (err) console.warn(`Could not drop table ${table}: ${err.message}`); // Warn instead of fail for DROP
      }));

      // Create Tables (copied and adapted from init-db.js and main app structure)
      // Core tables
      db.run(`CREATE TABLE roles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`, handleError(done, 'roles table'));
      db.run(`CREATE TABLE permissions (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`, handleError(done, 'permissions table'));
      db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, email TEXT UNIQUE NOT NULL, full_name TEXT, role_id INTEGER, FOREIGN KEY (role_id) REFERENCES roles(id))`, handleError(done, 'users table'));
      db.run(`CREATE TABLE role_permissions (role_id INTEGER NOT NULL, permission_id INTEGER NOT NULL, PRIMARY KEY (role_id, permission_id), FOREIGN KEY (role_id) REFERENCES roles(id), FOREIGN KEY (permission_id) REFERENCES permissions(id))`, handleError(done, 'role_permissions table'));

      // Instrument specific tables
      db.run(`CREATE TABLE instruments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        make TEXT,
        model TEXT,
        serial_number TEXT UNIQUE NOT NULL,
        calibration_date TEXT,
        maintenance_schedule TEXT,
        status TEXT CHECK(status IN ('Available', 'In Use', 'Under Maintenance', 'Retired')) DEFAULT 'Available',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`, handleError(done, 'instruments table'));

      db.run(`CREATE TABLE instrument_usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instrument_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instrument_id) REFERENCES instruments(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`, handleError(done, 'instrument_usage_logs table', done)); // Last table creation calls done
    });
  });
};

// Helper to simplify error handling in callbacks for table creation
const handleError = (done, tableName, finalCb) => (err) => {
  if (err) {
    console.error(`Error creating/accessing ${tableName}:`, err.message);
    return done(err);
  }
  if (finalCb) finalCb();
};

// Seed database with roles, permissions, users, and assign permissions to roles
const seedData = async () => {
  const saltRounds = 10;

  // Roles
  await db.run("INSERT INTO roles (name) VALUES ('administrator'), ('lab_manager'), ('researcher')");
  const adminRole = await new Promise((res, rej) => db.get("SELECT id FROM roles WHERE name = 'administrator'", (e,r) => e?rej(e):res(r)));
  const labManagerRole = await new Promise((res, rej) => db.get("SELECT id FROM roles WHERE name = 'lab_manager'", (e,r) => e?rej(e):res(r)));
  const researcherRole = await new Promise((res, rej) => db.get("SELECT id FROM roles WHERE name = 'researcher'", (e,r) => e?rej(e):res(r)));

  // Permissions (core from app + instrument specific)
  const permissions = [
    // Instrument permissions
    'manage_instruments', 'view_instruments', 'log_instrument_usage', 'view_instrument_usage',
    // Other potentially useful permissions for testing setup if needed
    'create_user', 'view_all_users'
  ];
  const permStmt = db.prepare("INSERT INTO permissions (name) VALUES (?)");
  for (const p of permissions) {
    await new Promise((res, rej) => permStmt.run(p, e => e ? rej(e) : res()));
  }
  permStmt.finalize();

  const permMap = {};
  const allPermsFromDb = await new Promise((res, rej) => db.all("SELECT id, name FROM permissions", (e,r) => e?rej(e):res(r)));
  allPermsFromDb.forEach(p => permMap[p.name] = p.id);

  // Assign permissions to roles
  const rpStmt = db.prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
  // Admin: all listed permissions
  for (const pName of permissions) {
    if (permMap[pName]) {
      await new Promise((res, rej) => rpStmt.run(adminRole.id, permMap[pName], e => e ? rej(e) : res()));
    }
  }
  // Lab Manager: manage_instruments, view_instruments, log_instrument_usage, view_instrument_usage
  if (permMap['manage_instruments']) await new Promise((res, rej) => rpStmt.run(labManagerRole.id, permMap['manage_instruments'], e => e ? rej(e) : res()));
  if (permMap['view_instruments']) await new Promise((res, rej) => rpStmt.run(labManagerRole.id, permMap['view_instruments'], e => e ? rej(e) : res()));
  if (permMap['log_instrument_usage']) await new Promise((res, rej) => rpStmt.run(labManagerRole.id, permMap['log_instrument_usage'], e => e ? rej(e) : res()));
  if (permMap['view_instrument_usage']) await new Promise((res, rej) => rpStmt.run(labManagerRole.id, permMap['view_instrument_usage'], e => e ? rej(e) : res()));
  // Researcher: view_instruments, log_instrument_usage, view_instrument_usage
  if (permMap['view_instruments']) await new Promise((res, rej) => rpStmt.run(researcherRole.id, permMap['view_instruments'], e => e ? rej(e) : res()));
  if (permMap['log_instrument_usage']) await new Promise((res, rej) => rpStmt.run(researcherRole.id, permMap['log_instrument_usage'], e => e ? rej(e) : res()));
  if (permMap['view_instrument_usage']) await new Promise((res, rej) => rpStmt.run(researcherRole.id, permMap['view_instrument_usage'], e => e ? rej(e) : res()));
  rpStmt.finalize();

  // Create Users
  const adminPass = await bcrypt.hash('adminpass', saltRounds);
  const lmPass = await bcrypt.hash('lmpass', saltRounds);
  const researchPass = await bcrypt.hash('researchpass', saltRounds);

  await db.run("INSERT INTO users (username, password_hash, email, full_name, role_id) VALUES ('admin_instr_test', ?, 'admin_instr@test.com', 'Instr Admin', ?)", [adminPass, adminRole.id]);
  await db.run("INSERT INTO users (username, password_hash, email, full_name, role_id) VALUES ('lm_instr_test', ?, 'lm_instr@test.com', 'Instr LM', ?)", [lmPass, labManagerRole.id]);
  await db.run("INSERT INTO users (username, password_hash, email, full_name, role_id) VALUES ('res_instr_test', ?, 'res_instr@test.com', 'Instr Researcher', ?)", [researchPass, researcherRole.id]);

  const adminUser = await new Promise((res,rej) => db.get("SELECT id FROM users WHERE username='admin_instr_test'", (e,r)=>e?rej(e):res(r)));
  adminUserId = adminUser.id;
  const lmUser = await new Promise((res,rej) => db.get("SELECT id FROM users WHERE username='lm_instr_test'", (e,r)=>e?rej(e):res(r)));
  labManagerUserId = lmUser.id;
  const resUser = await new Promise((res,rej) => db.get("SELECT id FROM users WHERE username='res_instr_test'", (e,r)=>e?rej(e):res(r)));
  researcherUserId = resUser.id;
};

// Login users to get tokens
const loginUsers = async () => {
  const adminRes = await request(app).post('/api/login').send({ username: 'admin_instr_test', password: 'adminpass' });
  if (adminRes.body.token) adminToken = adminRes.body.token; else console.error("Admin login failed for instruments test:", adminRes.body);

  const lmRes = await request(app).post('/api/login').send({ username: 'lm_instr_test', password: 'lmpass' });
  if (lmRes.body.token) labManagerToken = lmRes.body.token; else console.error("Lab Manager login failed for instruments test:", lmRes.body);

  const researcherRes = await request(app).post('/api/login').send({ username: 'res_instr_test', password: 'researchpass' });
  if (researcherRes.body.token) researcherToken = researcherRes.body.token; else console.error("Researcher login failed for instruments test:", researcherRes.body);
};

beforeAll(async () => {
  // Initialize DB schema
  await new Promise((resolve, reject) => initializeTestDatabase(err => err ? reject(err) : resolve()));
  // Seed data (roles, permissions, users, role_permissions)
  await seedData();
  // Login users to get tokens
  await loginUsers();

  // console.log("Tokens for instrument tests:", { admin: !!adminToken, lm: !!labManagerToken, res: !!researcherToken });
});

afterEach(async () => {
  // Clean up data from mutable tables after each test
  const tablesToClean = ['instrument_usage_logs', 'instruments'];
  for (const table of tablesToClean) {
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM ${table}`, err => err ? reject(err) : resolve());
    });
     await new Promise((resolve, reject) => { // Reset autoincrement sequence
      db.run(`DELETE FROM sqlite_sequence WHERE name='${table}'`, err => {
        if (err && !err.message.includes("no such table")) reject(err); // ignore error if table was not in sequence table
        else resolve();
      });
    });
  }
});

afterAll((done) => {
  db.close((err) => {
    if (err) {
      console.error('Error closing test instruments database', err.message);
      // return done(err); // Comment out to allow file deletion even if close fails
    }
    // console.log('Test instruments database connection closed.');
    fs.unlink(testDbPath, (unlinkErr) => {
      if (unlinkErr) console.error("Error deleting test instruments database file:", unlinkErr.message);
      done(); // Call done regardless of unlink error
    });
  });
});

describe('Instrument Usage Logs API (/api/instruments/:instrumentId/usage-logs)', () => {
  let testInstrumentId;
  const instrumentForLogs = {
    name: 'Loggable Instrument',
    make: 'Log Inc.',
    model: 'LGMDL',
    serial_number: 'SN-LOG-001',
    status: 'Available'
  };
  const usageLogData = {
    // instrument_id will come from path param
    // user_id will come from token
    start_time: new Date().toISOString(),
    end_time: new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
    notes: 'Routine check and calibration test.'
  };

  beforeAll(async () => { // Changed from beforeEach to beforeAll as instrument can persist for all log tests
    // Create an instrument to be used for logging tests
    const res = await request(app).post('/api/instruments').set('Authorization', `Bearer ${adminToken}`).send(instrumentForLogs);
    if (res.statusCode !== 201) {
      console.error("Failed to create instrument for usage log tests:", res.body);
      throw new Error("Setup failed for usage log tests: Could not create instrument.");
    }
    testInstrumentId = res.body.id;
  });

  describe('POST /api/instruments/:instrumentId/usage-logs (Log Usage)', () => {
    it('should log instrument usage for admin (has log_instrument_usage via admin all perms)', async () => {
      const response = await request(app)
        .post(`/api/instruments/${testInstrumentId}/usage-logs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(usageLogData);
      expect(response.statusCode).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.instrument_id).toBe(testInstrumentId);
      expect(response.body.user_id).toBe(adminUserId); // Check if user_id from token is used
      expect(response.body.notes).toBe(usageLogData.notes);
    });

    it('should log instrument usage for lab_manager (has log_instrument_usage)', async () => {
      const lmUsageData = { ...usageLogData, notes: 'LM test log', start_time: new Date().toISOString() };
      const response = await request(app)
        .post(`/api/instruments/${testInstrumentId}/usage-logs`)
        .set('Authorization', `Bearer ${labManagerToken}`)
        .send(lmUsageData);
      expect(response.statusCode).toBe(201);
      expect(response.body.user_id).toBe(labManagerUserId);
    });

    it('should log instrument usage for researcher (has log_instrument_usage)', async () => {
      const researcherUsageData = { ...usageLogData, notes: 'Researcher test log', start_time: new Date().toISOString() };
      const response = await request(app)
        .post(`/api/instruments/${testInstrumentId}/usage-logs`)
        .set('Authorization', `Bearer ${researcherToken}`)
        .send(researcherUsageData);
      expect(response.statusCode).toBe(201);
      expect(response.body.user_id).toBe(researcherUserId);
    });

    it('should fail if start_time is missing', async () => {
      const { start_time, ...dataWithoutStartTime } = usageLogData;
      const response = await request(app)
        .post(`/api/instruments/${testInstrumentId}/usage-logs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dataWithoutStartTime);
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('Start time is required');
    });

    it('should fail if instrument ID is invalid (not found)', async () => {
      const response = await request(app)
        .post('/api/instruments/99999/usage-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(usageLogData);
      expect(response.statusCode).toBe(404); // Endpoint checks instrument existence first
      expect(response.body.message).toContain('Instrument not found');
    });

    // To test "lacks log_instrument_usage permission", we'd need a user/role without it.
    // Current setup gives this perm to admin, lm, and researcher.
    // For now, we'll skip this specific auth test or assume such a user would be 403.

    it('should forbid logging usage if not authenticated', async () => {
      const response = await request(app)
        .post(`/api/instruments/${testInstrumentId}/usage-logs`)
        .send(usageLogData);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/instruments/:instrumentId/usage-logs (List Usage Logs)', () => {
    beforeEach(async () => { // Use beforeEach to ensure clean logs for each list test
      // Clear existing logs for testInstrumentId if any from previous tests in this block
      await new Promise((resolve, reject) => {
        db.run(`DELETE FROM instrument_usage_logs WHERE instrument_id = ?`, [testInstrumentId], err => err ? reject(err) : resolve());
      });

      // Seed a couple of log entries for the testInstrumentId
      const log1 = { ...usageLogData, user_id: adminUserId, start_time: new Date(Date.now() - 3600000).toISOString(), notes: "Log 1 by admin" }; // 1 hour ago
      const log2 = { ...usageLogData, user_id: researcherUserId, start_time: new Date().toISOString(), notes: "Log 2 by researcher" };

      await request(app).post(`/api/instruments/${testInstrumentId}/usage-logs`).set('Authorization', `Bearer ${adminToken}`).send(log1);
      await request(app).post(`/api/instruments/${testInstrumentId}/usage-logs`).set('Authorization', `Bearer ${researcherToken}`).send(log2);
    });

    it('should retrieve usage logs for an instrument by admin', async () => {
      const response = await request(app)
        .get(`/api/instruments/${testInstrumentId}/usage-logs`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
      // Check if user details are populated (as per route implementation)
      expect(response.body[0].user_full_name).toBeDefined();
      expect(response.body.find(log => log.notes === "Log 1 by admin")).toBeDefined();
      expect(response.body.find(log => log.notes === "Log 2 by researcher")).toBeDefined();
    });

    it('should retrieve usage logs for lab_manager (has view_instrument_usage)', async () => {
      const response = await request(app)
        .get(`/api/instruments/${testInstrumentId}/usage-logs`)
        .set('Authorization', `Bearer ${labManagerToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it('should retrieve usage logs for researcher (has view_instrument_usage)', async () => {
      const response = await request(app)
        .get(`/api/instruments/${testInstrumentId}/usage-logs`)
        .set('Authorization', `Bearer ${researcherToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it('should return an empty array if instrument ID is valid but has no logs', async () => {
      // Create a new instrument with no logs
      const newInstr = await request(app).post('/api/instruments').set('Authorization', `Bearer ${adminToken}`).send({ ...instrumentForLogs, serial_number: 'SN-LOG-EMPTY-001' });
      const newInstrId = newInstr.body.id;

      const response = await request(app)
        .get(`/api/instruments/${newInstrId}/usage-logs`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0);
    });

    it('should return 404 if instrument ID for logs is invalid (not found)', async () => {
      const response = await request(app)
        .get('/api/instruments/88888/usage-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(404);
      expect(response.body.message).toContain('Instrument not found');
    });

    it('should forbid listing usage logs if not authenticated', async () => {
      const response = await request(app).get(`/api/instruments/${testInstrumentId}/usage-logs`);
      expect(response.statusCode).toBe(401);
    });

    // Again, testing lack of 'view_instrument_usage' would require a specific user setup.
  });
});

// Placeholder for actual tests
describe('Instruments API Placeholder', () => {
  it('should have tokens available for tests', () => {
    expect(adminToken).toBeDefined();
    expect(labManagerToken).toBeDefined();
    expect(researcherToken).toBeDefined();
  });
});

describe('Instruments API (/api/instruments)', () => {
  const newInstrumentData = {
    name: 'Spectrometer X1000',
    make: 'Thermo Fisher',
    model: 'X1000',
    serial_number: 'SNX1000-001',
    calibration_date: '2024-01-15',
    maintenance_schedule: 'Annual',
    status: 'Available'
  };

  describe('POST /api/instruments (Create Instrument)', () => {
    it('should create a new instrument with valid data by admin', async () => {
      const response = await request(app)
        .post('/api/instruments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newInstrumentData);
      expect(response.statusCode).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(newInstrumentData.name);
      expect(response.body.serial_number).toBe(newInstrumentData.serial_number);
      expect(response.body.status).toBe('Available'); // Default or provided
    });

    it('should create a new instrument with valid data by lab_manager', async () => {
      const instrumentDataLM = { ...newInstrumentData, serial_number: 'SNX1000-LM-001' };
      const response = await request(app)
        .post('/api/instruments')
        .set('Authorization', `Bearer ${labManagerToken}`)
        .send(instrumentDataLM);
      expect(response.statusCode).toBe(201);
      expect(response.body.name).toBe(instrumentDataLM.name);
    });

    it('should fail to create if name is missing', async () => {
      const { name, ...dataWithoutName } = newInstrumentData;
      const response = await request(app)
        .post('/api/instruments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...dataWithoutName, serial_number: 'SNX1000-FAIL-002' });
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('Name and serial number are required');
    });

    it('should fail to create if serial_number is missing', async () => {
      const { serial_number, ...dataWithoutSN } = newInstrumentData;
      const response = await request(app)
        .post('/api/instruments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dataWithoutSN);
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('Name and serial number are required');
    });

    it('should fail to create with a duplicate serial_number', async () => {
      await request(app) // First instrument
        .post('/api/instruments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...newInstrumentData, serial_number: 'SN-DUPLICATE-001' });

      const response = await request(app) // Second attempt with same serial
        .post('/api/instruments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...newInstrumentData, name: 'Another Spectrometer', serial_number: 'SN-DUPLICATE-001' });
      expect(response.statusCode).toBe(409); // Conflict
      expect(response.body.message).toContain('Serial number already exists');
    });

    it('should forbid creating an instrument if user is researcher (lacks manage_instruments permission)', async () => {
      const response = await request(app)
        .post('/api/instruments')
        .set('Authorization', `Bearer ${researcherToken}`)
        .send({ ...newInstrumentData, serial_number: 'SNX1000-FORBID-003' });
      expect(response.statusCode).toBe(403); // Forbidden
    });

    it('should forbid creating an instrument if not authenticated', async () => {
      const response = await request(app)
        .post('/api/instruments')
        .send({ ...newInstrumentData, serial_number: 'SNX1000-NOAUTH-004' });
      expect(response.statusCode).toBe(401); // Unauthorized
    });
  });

  describe('GET /api/instruments (List Instruments)', () => {
    beforeEach(async () => {
      // Seed some instruments
      await request(app).post('/api/instruments').set('Authorization', `Bearer ${adminToken}`).send({ ...newInstrumentData, serial_number: 'SN-GETLIST-001', name: 'AlphaSpec' });
      await request(app).post('/api/instruments').set('Authorization', `Bearer ${adminToken}`).send({ ...newInstrumentData, serial_number: 'SN-GETLIST-002', name: 'BetaSpec' });
    });

    it('should retrieve a list of instruments for admin', async () => {
      const response = await request(app)
        .get('/api/instruments')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body.find(instr => instr.name === 'AlphaSpec')).toBeDefined();
    });

    it('should retrieve a list of instruments for lab_manager', async () => {
      const response = await request(app)
        .get('/api/instruments')
        .set('Authorization', `Bearer ${labManagerToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should retrieve a list of instruments for researcher', async () => {
      const response = await request(app)
        .get('/api/instruments')
        .set('Authorization', `Bearer ${researcherToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should forbid listing instruments if not authenticated', async () => {
      const response = await request(app).get('/api/instruments');
      expect(response.statusCode).toBe(401);
    });

    // Note: The current setup gives 'view_instruments' to admin, lab_manager, and researcher.
    // If we wanted to test a role *without* view_instruments, we'd need to set up such a role/user.
  });

  describe('GET /api/instruments/:id (Get Instrument by ID)', () => {
    let instrumentId;
    beforeEach(async () => {
      const res = await request(app).post('/api/instruments').set('Authorization', `Bearer ${adminToken}`).send({ ...newInstrumentData, serial_number: 'SN-GETID-001', name: 'GammaSpec' });
      instrumentId = res.body.id;
    });

    it('should retrieve an existing instrument by ID for admin', async () => {
      const response = await request(app)
        .get(`/api/instruments/${instrumentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(instrumentId);
      expect(response.body.name).toBe('GammaSpec');
    });

    it('should retrieve an existing instrument by ID for researcher (has view_instruments)', async () => {
      const response = await request(app)
        .get(`/api/instruments/${instrumentId}`)
        .set('Authorization', `Bearer ${researcherToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(instrumentId);
    });

    it('should return 404 if instrument not found', async () => {
      const response = await request(app)
        .get('/api/instruments/99999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(404);
    });

    it('should forbid retrieving an instrument by ID if not authenticated', async () => {
      const response = await request(app).get(`/api/instruments/${instrumentId}`);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('PUT /api/instruments/:id (Update Instrument)', () => {
    let instrumentToUpdateId;
    const initialInstrument = { ...newInstrumentData, serial_number: 'SN-PUT-001', name: 'PreUpdateSpec' };
    const updatePayload = {
      name: 'UpdatedSpec Name',
      make: 'Updated Make',
      status: 'Under Maintenance'
    };

    beforeEach(async () => {
      const res = await request(app).post('/api/instruments').set('Authorization', `Bearer ${adminToken}`).send(initialInstrument);
      instrumentToUpdateId = res.body.id;
    });

    it('should update an existing instrument for admin', async () => {
      const response = await request(app)
        .put(`/api/instruments/${instrumentToUpdateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatePayload);
      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(instrumentToUpdateId);
      expect(response.body.name).toBe(updatePayload.name);
      expect(response.body.make).toBe(updatePayload.make);
      expect(response.body.status).toBe(updatePayload.status);
      expect(response.body.serial_number).toBe(initialInstrument.serial_number); // Should not change if not provided
      expect(response.body.updated_at).not.toBe(initialInstrument.updated_at); // Assuming created_at != updated_at initially
    });

    it('should update an existing instrument for lab_manager', async () => {
      const response = await request(app)
        .put(`/api/instruments/${instrumentToUpdateId}`)
        .set('Authorization', `Bearer ${labManagerToken}`)
        .send({ name: 'LM Updated Name', serial_number: 'SN-PUT-LM-001' }); // Also test SN update
      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe('LM Updated Name');
      expect(response.body.serial_number).toBe('SN-PUT-LM-001');
    });

    it('should return 404 if instrument to update is not found', async () => {
      const response = await request(app)
        .put('/api/instruments/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatePayload);
      expect(response.statusCode).toBe(404);
    });

    it('should fail to update if serial_number is duplicated', async () => {
      // Create another instrument whose serial number we will try to duplicate
      await request(app).post('/api/instruments').set('Authorization', `Bearer ${adminToken}`).send({ ...newInstrumentData, serial_number: 'SN-PUT-EXISTING-002', name: 'ExistingSN' });

      const response = await request(app)
        .put(`/api/instruments/${instrumentToUpdateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ serial_number: 'SN-PUT-EXISTING-002' });
      expect(response.statusCode).toBe(409);
      expect(response.body.message).toContain('Serial number already exists');
    });

    it('should forbid updating an instrument if user is researcher (lacks manage_instruments)', async () => {
      const response = await request(app)
        .put(`/api/instruments/${instrumentToUpdateId}`)
        .set('Authorization', `Bearer ${researcherToken}`)
        .send(updatePayload);
      expect(response.statusCode).toBe(403);
    });

    it('should forbid updating an instrument if not authenticated', async () => {
      const response = await request(app)
        .put(`/api/instruments/${instrumentToUpdateId}`)
        .send(updatePayload);
      expect(response.statusCode).toBe(401);
    });

     it('should allow partial updates (only provided fields)', async () => {
      const partialUpdate = { status: 'Retired' };
      const response = await request(app)
        .put(`/api/instruments/${instrumentToUpdateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(partialUpdate);
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('Retired');
      expect(response.body.name).toBe(initialInstrument.name); // Should remain unchanged
    });
  });

  describe('DELETE /api/instruments/:id (Delete Instrument)', () => {
    let instrumentToDeleteId;
    const deletableInstrument = { ...newInstrumentData, serial_number: 'SN-DEL-001', name: 'DeletableSpec' };

    beforeEach(async () => {
      const res = await request(app).post('/api/instruments').set('Authorization', `Bearer ${adminToken}`).send(deletableInstrument);
      instrumentToDeleteId = res.body.id;
    });

    it('should delete an instrument without usage logs for admin', async () => {
      const response = await request(app)
        .delete(`/api/instruments/${instrumentToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toContain('Instrument deleted successfully');

      // Verify it's gone
      const getResponse = await request(app).get(`/api/instruments/${instrumentToDeleteId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(getResponse.statusCode).toBe(404);
    });

    it('should delete an instrument without usage logs for lab_manager', async () => {
      const response = await request(app)
        .delete(`/api/instruments/${instrumentToDeleteId}`)
        .set('Authorization', `Bearer ${labManagerToken}`);
      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if instrument to delete is not found', async () => {
      const response = await request(app)
        .delete('/api/instruments/99999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(404);
    });

    it('should return 409 Conflict if instrument has usage logs', async () => {
      // First, create a usage log for the instrument
      await db.run(
        "INSERT INTO instrument_usage_logs (instrument_id, user_id, start_time, notes) VALUES (?, ?, ?, ?)",
        [instrumentToDeleteId, adminUserId, new Date().toISOString(), 'Test log entry']
      );

      const response = await request(app)
        .delete(`/api/instruments/${instrumentToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(409);
      expect(response.body.message).toContain('Instrument cannot be deleted as it has usage history');
    });

    it('should forbid deleting an instrument if user is researcher', async () => {
      const response = await request(app)
        .delete(`/api/instruments/${instrumentToDeleteId}`)
        .set('Authorization', `Bearer ${researcherToken}`);
      expect(response.statusCode).toBe(403);
    });

    it('should forbid deleting an instrument if not authenticated', async () => {
      const response = await request(app).delete(`/api/instruments/${instrumentToDeleteId}`);
      expect(response.statusCode).toBe(401);
    });
  });
});


// NOTE: Actual test cases for CRUD operations will be added in subsequent steps.
// This setup ensures the database is ready and users with different roles/permissions are available.
// The permissions assigned are:
// Admin: all instrument permissions
// Lab Manager: manage_instruments, view_instruments, log_instrument_usage, view_instrument_usage
// Researcher: view_instruments, log_instrument_usage, view_instrument_usage
// These will be used to test the authorization rules.
module.exports = { app, db }; // Export for potential use in other test files if needed, though not typical for API tests.
