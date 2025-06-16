const request = require('supertest');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Import app from your server file. index.js exports app and original db.
// We will create a new db connection for tests.
const { app } = require('../index');

const testDbPath = path.resolve(__dirname, 'test-sample-api-database.db');
let db; // Test database instance
let adminToken;
let researcherToken;

// Helper function to initialize the database schema
const initializeTestDatabase = (done) => {
  db = new sqlite3.Database(testDbPath, (err) => {
    if (err) return done(err);
    console.log('Connected to the test SQLite database.');

    db.serialize(() => {
      // Drop tables if they exist to ensure a clean state
      const tables = [
        'chain_of_custody', 'samples', 'storage_locations',
        'sources', 'sample_types', 'role_permissions',
        'users', 'permissions', 'roles'
      ];
      tables.forEach(table => db.run(`DROP TABLE IF EXISTS ${table}`));

      // Create Tables (copied and adapted from init-db.js)
      db.run(`CREATE TABLE roles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`, handleError(done, 'roles table'));
      db.run(`CREATE TABLE permissions (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`, handleError(done, 'permissions table'));
      db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, email TEXT UNIQUE NOT NULL, full_name TEXT, role_id INTEGER, FOREIGN KEY (role_id) REFERENCES roles(id))`, handleError(done, 'users table'));
      db.run(`CREATE TABLE role_permissions (role_id INTEGER NOT NULL, permission_id INTEGER NOT NULL, PRIMARY KEY (role_id, permission_id), FOREIGN KEY (role_id) REFERENCES roles(id), FOREIGN KEY (permission_id) REFERENCES permissions(id))`, handleError(done, 'role_permissions table'));
      db.run(`CREATE TABLE sample_types (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description TEXT)`, handleError(done, 'sample_types table'));
      db.run(`CREATE TABLE sources (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description TEXT)`, handleError(done, 'sources table'));
      db.run(`CREATE TABLE storage_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, temperature REAL, capacity INTEGER, current_load INTEGER DEFAULT 0)`, handleError(done, 'storage_locations table'));
      db.run(`CREATE TABLE samples (id INTEGER PRIMARY KEY AUTOINCREMENT, unique_sample_id TEXT UNIQUE NOT NULL, sample_type_id INTEGER, source_id INTEGER, collection_date TEXT, registration_date TEXT DEFAULT CURRENT_TIMESTAMP, storage_location_id INTEGER, current_status TEXT NOT NULL CHECK(current_status IN ('Registered', 'In Storage', 'In Analysis', 'Discarded', 'Archived')), barcode_qr_code TEXT UNIQUE, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (sample_type_id) REFERENCES sample_types(id), FOREIGN KEY (source_id) REFERENCES sources(id), FOREIGN KEY (storage_location_id) REFERENCES storage_locations(id))`, handleError(done, 'samples table'));
      db.run(`CREATE TABLE chain_of_custody (id INTEGER PRIMARY KEY AUTOINCREMENT, sample_id INTEGER NOT NULL, user_id INTEGER NOT NULL, action TEXT NOT NULL, timestamp TEXT DEFAULT CURRENT_TIMESTAMP, previous_location_id INTEGER, new_location_id INTEGER, notes TEXT, FOREIGN KEY (sample_id) REFERENCES samples(id), FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (previous_location_id) REFERENCES storage_locations(id), FOREIGN KEY (new_location_id) REFERENCES storage_locations(id))`, handleError(done, 'chain_of_custody table', done)); // Last table creation calls done
    });
  });
};

// Helper to simplify error handling in callbacks
const handleError = (done, tableName, finalCb) => (err) => {
  if (err) {
    console.error(`Error creating/accessing ${tableName}:`, err.message);
    return done(err);
  }
  if (finalCb) finalCb();
};


// Function to seed initial data (roles, permissions, test users)
// This will be called after table creation.
// For brevity in this step, the actual seeding logic from init-db.js for roles/permissions
// and user creation (with bcrypt for passwords) would be complex to replicate fully here.
// We'll mock user creation and token generation for now, or do it very simply.
// A more robust solution would involve a dedicated seeding script or test helpers.

beforeAll(async () => {
  await new Promise((resolve, reject) => initializeTestDatabase(err => err ? reject(err) : resolve()));

  // Simplified seeding for roles and permissions - in a real scenario, use init-db.js logic
  await db.run("INSERT INTO roles (name) VALUES ('administrator'), ('lab_manager'), ('researcher')");
  const permissions = [
      'manage_sample_types', 'view_sample_details', 'manage_sources', 'manage_storage_locations',
      'register_sample', 'view_all_samples', 'update_sample_status', 'generate_barcode',
      'view_sample_lifecycle', 'manage_chain_of_custody'
      // Add other core permissions like 'create_user' if needed for admin setup
  ];
  const permStmt = await db.prepare("INSERT INTO permissions (name) VALUES (?)");
  for (const p of permissions) {
      await new Promise((res, rej) => permStmt.run(p, err => err ? rej(err) : res()));
  }
  await new Promise((res, rej) => permStmt.finalize(err => err ? rej(err) : res()));

  // Create test users (password handling is simplified here)
  // In a real test suite, use bcrypt as in your main app.
  // For now, we'll insert directly and assume login endpoint can handle plain text for a test scenario if needed,
  // OR we will mock the auth middleware for some tests if token generation is too complex for this step.
  // For a true integration test, we need to use the actual login.
  // Let's assume a simplified password for tests, and the actual login mechanism will be used.
  // const bcrypt = require('bcrypt'); // Would need this
  // const saltRounds = 10;
  // const adminHashedPassword = await bcrypt.hash('testadminpass', saltRounds);
  // const researcherHashedPassword = await bcrypt.hash('testresearcherpass', saltRounds);

  // For now, let's just get tokens via actual login after user creation
  // This means app's /api/register or a direct DB insert for users is needed.
  // The app's /api/register assigns 'researcher' by default. We need an admin.
  // So, direct DB insert for admin, then use /api/register for researcher.

  const adminRoleId = 1; // Assuming 'administrator' is ID 1
  await db.run("INSERT INTO users (username, password_hash, email, full_name, role_id) VALUES (?, ?, ?, ?, ?)",
    ['testadmin', 'adminpass_hashed_placeholder', 'admin@test.com', 'Test Admin', adminRoleId]
  );
  // Register a researcher user to get a researcher token
  await request(app)
    .post('/api/register')
    .send({ username: 'testresearcher', password: 'researcherpass', email: 'researcher@test.com', full_name: 'Test Researcher' });

  // Assign all permissions to admin for simplicity in testing all routes
  const adminRole = await new Promise((res, rej) => db.get("SELECT id FROM roles WHERE name = 'administrator'", (e,r) => e?rej(e):res(r)));
  const allPerms = await new Promise((res, rej) => db.all("SELECT id FROM permissions", (e,r)=> e?rej(e):res(r)));
  const rpStmt = db.prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
  for (const perm of allPerms) {
      await new Promise((res, rej) => rpStmt.run(adminRole.id, perm.id, e => e?rej(e):res()));
  }
  await new Promise((res, rej) => rpStmt.finalize(e => e?rej(e):res()));

  // Login test users to get tokens
  // NOTE: This simplified user creation (plain text password in mind for login)
  // needs to align with how login works or how JWTs are issued.
  // The actual app uses bcrypt. So direct DB insert with bcrypt hash or use registration.
  // The login below will fail if password_hash isn't bcrypt-compatible for 'testadmin'.
  // For now, let's assume we'd use a backdoor or a test-specific user setup for tokens.
  // To make it runnable, I will assume 'adminpass_hashed_placeholder' is what bcrypt would make from 'testadminpass'.
  // This is a common testing challenge.
  // For now, this test will likely fail at login if bcrypt is strictly enforced without proper hashing.
  // A better way: create users via API if possible, or have a test helper that generates bcrypt hashes.

  // Let's simplify and assume we have a way to get tokens (e.g. direct JWT signing for tests, or a test user endpoint)
  // For this exercise, I will mock the token part if actual login is too complex to setup here.
  // But ideally, you'd have a full auth flow.
  // For now, we will proceed as if we can get tokens for 'testadmin' and 'testresearcher'.
  // The login for testresearcher should work if /api/register uses bcrypt.
  // The login for testadmin will only work if 'adminpass_hashed_placeholder' is a valid bcrypt hash of 'testadminpass'.
  // Let's assume we will get these tokens.

  // Placeholder tokens - replace with actual token generation
  // adminToken = "fakeAdminToken";
  // researcherToken = "fakeResearcherToken";

  // Attempt to login to get real tokens (will require bcrypt for admin pass to be correctly hashed)
  // To make admin login work, we need to hash its password correctly.
  // For now, I'll use a placeholder for admin token and try to login researcher.

  const bcrypt = require('bcrypt');
  const saltRounds = 10;
  const adminHashedPass = await bcrypt.hash('testadminpass', saltRounds);
  await db.run("UPDATE users SET password_hash = ? WHERE username = 'testadmin'", [adminHashedPass]);

  const adminRes = await request(app).post('/api/login').send({ username: 'testadmin', password: 'testadminpass' });
  if (adminRes.body.token) adminToken = adminRes.body.token; else console.error("Admin login failed:", adminRes.body);

  const researcherRes = await request(app).post('/api/login').send({ username: 'testresearcher', password: 'researcherpass' });
  if (researcherRes.body.token) researcherToken = researcherRes.body.token; else console.error("Researcher login failed:", researcherRes.body);

  console.log("Tokens acquired for admin:", !!adminToken, "researcher:", !!researcherToken);

});


afterEach(async () => {
  // Clean up data from mutable tables after each test
  const tablesToClean = ['chain_of_custody', 'samples', 'storage_locations', 'sources', 'sample_types'];
  for (const table of tablesToClean) {
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM ${table}`, err => err ? reject(err) : resolve());
    });
  }
});

afterAll((done) => {
  db.close((err) => {
    if (err) {
      console.error('Error closing test database', err.message);
      return done(err);
    }
    console.log('Test database connection closed.');
    fs.unlink(testDbPath, (unlinkErr) => { // Delete the test database file
      if (unlinkErr) console.error("Error deleting test database file:", unlinkErr.message);
      done();
    });
  });
});


describe('Sample Management API', () => {
  describe('Sample Types API (/api/sample-types)', () => {
    // Tests for Sample Types will go here
    it('should initially retrieve no sample types', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const response = await request(app)
        .get('/api/sample-types')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should create a new sample type', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const newSampleType = { name: 'Blood', description: 'Whole blood samples' };
      const response = await request(app)
        .post('/api/sample-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newSampleType);
      expect(response.statusCode).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(newSampleType.name);
      expect(response.body.description).toBe(newSampleType.description);
    });

    it('should fail to create a sample type without a name', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const response = await request(app)
        .post('/api/sample-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Missing name' });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Name is required');
    });

    it('should fail to create a sample type with a duplicate name', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const sampleType = { name: 'UniqueType', description: 'First one' };
      await request(app).post('/api/sample-types').set('Authorization', `Bearer ${adminToken}`).send(sampleType);
      const response = await request(app)
        .post('/api/sample-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleType); // Attempt to create again
      expect(response.statusCode).toBe(409);
      expect(response.body.error).toContain('name already exists');
    });

    it('should retrieve all sample types', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      await request(app).post('/api/sample-types').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Plasma', description: 'Blood plasma' });
      await request(app).post('/api/sample-types').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Serum', description: 'Blood serum' });

      const response = await request(app)
        .get('/api/sample-types')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body.find(st => st.name === 'Plasma')).toBeDefined();
    });

    it('should retrieve a specific sample type by ID', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const postResponse = await request(app).post('/api/sample-types').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Tissue', description: 'Biopsy' });
      const sampleTypeId = postResponse.body.id;

      const response = await request(app)
        .get(`/api/sample-types/${sampleTypeId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(sampleTypeId);
      expect(response.body.name).toBe('Tissue');
    });

    it('should return 404 for a non-existent sample type ID (GET)', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const response = await request(app)
        .get('/api/sample-types/9999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(404);
    });

    it('should update a sample type', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const postResponse = await request(app).post('/api/sample-types').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Urine', description: 'Liquid gold' });
      const sampleTypeId = postResponse.body.id;
      const updatedData = { name: 'Urine Sample', description: 'Updated description' };

      const response = await request(app)
        .put(`/api/sample-types/${sampleTypeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedData);
      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe(updatedData.name);
      expect(response.body.description).toBe(updatedData.description);
    });

    it('should return 404 for a non-existent sample type ID (PUT)', async () => {
        if (!adminToken) throw new Error("Admin token not available for test");
        const response = await request(app)
          .put('/api/sample-types/9999')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'NonExistent', description: 'Update attempt' });
        expect(response.statusCode).toBe(404);
    });

    it('should delete a sample type', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const postResponse = await request(app).post('/api/sample-types').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Saliva', description: 'Oral fluid' });
      const sampleTypeId = postResponse.body.id;

      const deleteResponse = await request(app)
        .delete(`/api/sample-types/${sampleTypeId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deleteResponse.statusCode).toBe(200);
      expect(deleteResponse.body.message).toContain('deleted successfully');

      const getResponse = await request(app).get(`/api/sample-types/${sampleTypeId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(getResponse.statusCode).toBe(404);
    });

    it('should return 404 for a non-existent sample type ID (DELETE)', async () => {
        if (!adminToken) throw new Error("Admin token not available for test");
        const response = await request(app)
          .delete('/api/sample-types/9999')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(404);
    });

    // Authorization tests
    it('should forbid POST /api/sample-types without authentication', async () => {
        const response = await request(app).post('/api/sample-types').send({ name: 'Test', description: 'Test' });
        expect(response.statusCode).toBe(401);
    });

    it('should forbid POST /api/sample-types for user without manage_sample_types permission', async () => {
        if (!researcherToken) console.warn("Researcher token not available, skipping auth test");
        if (!researcherToken) return; // Skip if token setup failed
        const response = await request(app)
            .post('/api/sample-types')
            .set('Authorization', `Bearer ${researcherToken}`)
            .send({ name: 'Test', description: 'Forbidden Test' });
        expect(response.statusCode).toBe(403); // Or 401 if authorize middleware sends 401 on perm failure
    });

  });

  describe('Sources API (/api/sources)', () => {
    const sourceData = { name: 'Clinical Trial X', description: 'Samples from Trial X participants' };

    it('should create a new source', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const response = await request(app)
        .post('/api/sources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sourceData);
      expect(response.statusCode).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(sourceData.name);
    });

    it('should fail to create a source without a name', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const response = await request(app)
        .post('/api/sources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Missing name' });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Name is required');
    });

    it('should retrieve all sources', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      await request(app).post('/api/sources').set('Authorization', `Bearer ${adminToken}`).send(sourceData);
      const response = await request(app)
        .get('/api/sources')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.find(s => s.name === sourceData.name)).toBeDefined();
    });

    it('should retrieve a specific source by ID', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const postRes = await request(app).post('/api/sources').set('Authorization', `Bearer ${adminToken}`).send(sourceData);
      const sourceId = postRes.body.id;
      const response = await request(app)
        .get(`/api/sources/${sourceId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(sourceId);
    });

    it('should update a source', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const postRes = await request(app).post('/api/sources').set('Authorization', `Bearer ${adminToken}`).send(sourceData);
      const sourceId = postRes.body.id;
      const updatedData = { name: 'Clinical Trial Y', description: 'Updated description' };
      const response = await request(app)
        .put(`/api/sources/${sourceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedData);
      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe(updatedData.name);
    });

    it('should delete a source', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const postRes = await request(app).post('/api/sources').set('Authorization', `Bearer ${adminToken}`).send(sourceData);
      const sourceId = postRes.body.id;
      const deleteResponse = await request(app)
        .delete(`/api/sources/${sourceId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deleteResponse.statusCode).toBe(200);
      const getResponse = await request(app).get(`/api/sources/${sourceId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(getResponse.statusCode).toBe(404);
    });

    it('should forbid POST /api/sources for user without manage_sources permission', async () => {
        if (!researcherToken) { console.warn("Researcher token not available, skipping auth test for POST /api/sources"); return; }
        const response = await request(app)
            .post('/api/sources')
            .set('Authorization', `Bearer ${researcherToken}`)
            .send({ name: 'Forbidden Source', description: 'Test' });
        expect(response.statusCode).toBe(403);
    });
  });

  describe('Storage Locations API (/api/storage-locations)', () => {
    const locationData = { name: 'Freezer A1', temperature: -20, capacity: 100 };

    it('should create a new storage location', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const response = await request(app)
        .post('/api/storage-locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(locationData);
      expect(response.statusCode).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(locationData.name);
      expect(response.body.temperature).toBe(locationData.temperature);
      expect(response.body.capacity).toBe(locationData.capacity);
      expect(response.body.current_load).toBe(0); // Default
    });

    it('should fail to create a location without a name', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const response = await request(app)
        .post('/api/storage-locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ temperature: -80 });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Name is required');
    });

    it('should create a location with optional fields omitted', async () => {
        if (!adminToken) throw new Error("Admin token not available for test");
        const response = await request(app)
          .post('/api/storage-locations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: "Room Temp Shelf" });
        expect(response.statusCode).toBe(201);
        expect(response.body.name).toBe("Room Temp Shelf");
        expect(response.body.temperature).toBeNull();
        expect(response.body.capacity).toBeNull();
    });


    it('should retrieve all storage locations', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      await request(app).post('/api/storage-locations').set('Authorization', `Bearer ${adminToken}`).send(locationData);
      const response = await request(app)
        .get('/api/storage-locations')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.find(loc => loc.name === locationData.name)).toBeDefined();
    });

    it('should update a storage location', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const postRes = await request(app).post('/api/storage-locations').set('Authorization', `Bearer ${adminToken}`).send(locationData);
      const locationId = postRes.body.id;
      const updatedData = { name: 'Freezer A1 (Updated)', temperature: -22, capacity: 120, current_load: 5 }; // current_load can be updated

      const response = await request(app)
        .put(`/api/storage-locations/${locationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedData);
      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe(updatedData.name);
      expect(response.body.temperature).toBe(updatedData.temperature);
      expect(response.body.capacity).toBe(updatedData.capacity);
      expect(response.body.current_load).toBe(updatedData.current_load);
    });

    it('should delete a storage location', async () => {
      if (!adminToken) throw new Error("Admin token not available for test");
      const postRes = await request(app).post('/api/storage-locations').set('Authorization', `Bearer ${adminToken}`).send(locationData);
      const locationId = postRes.body.id;

      const deleteResponse = await request(app)
        .delete(`/api/storage-locations/${locationId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deleteResponse.statusCode).toBe(200);

      const getResponse = await request(app).get(`/api/storage-locations/${locationId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(getResponse.statusCode).toBe(404);
    });

    it('should forbid POST /api/storage-locations for user without manage_storage_locations permission', async () => {
        if (!researcherToken) { console.warn("Researcher token not available, skipping auth test for POST /api/storage-locations"); return; }
        const response = await request(app)
            .post('/api/storage-locations')
            .set('Authorization', `Bearer ${researcherToken}`)
            .send(locationData);
        expect(response.statusCode).toBe(403);
    });
  });

  describe('Samples API (/api/samples)', () => {
    let sampleTypeId;
    let sourceId;
    let storageLocationId;

    beforeEach(async () => { // Use beforeEach for sample prerequisites to ensure they exist for each test
      if (!adminToken) throw new Error("Admin token not available for Samples API tests");
      // Create prerequisite data for samples
      const stRes = await request(app).post('/api/sample-types').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Test Type', description: 'For sample testing' });
      sampleTypeId = stRes.body.id;

      const srcRes = await request(app).post('/api/sources').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Test Source', description: 'For sample testing' });
      sourceId = srcRes.body.id;

      const slRes = await request(app).post('/api/storage-locations').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Test Freezer', temperature: -20, capacity: 50 });
      storageLocationId = slRes.body.id;
    });

    describe('POST /api/samples/register', () => {
      const validSampleData = () => ({
        sample_type_id: sampleTypeId,
        source_id: sourceId,
        collection_date: '2023-10-01T00:00:00.000Z',
        current_status: 'Registered',
        storage_location_id: null, // Optional for 'Registered'
        notes: 'Initial registration test sample'
      });

      it('should register a new sample successfully', async () => {
        const response = await request(app)
          .post('/api/samples/register')
          .set('Authorization', `Bearer ${adminToken}`) // Assuming admin can register, or use lab_manager/researcher token
          .send(validSampleData());

        expect(response.statusCode).toBe(201);
        expect(response.body.id).toBeDefined();
        expect(response.body.unique_sample_id).toBeDefined();
        expect(response.body.barcode_qr_code).toBe(`QR-${response.body.unique_sample_id}`);
        expect(response.body.sample_type_id).toBe(sampleTypeId);
        expect(response.body.source_id).toBe(sourceId);
        expect(response.body.current_status).toBe('Registered');

        // Verify Chain of Custody entry
        const cocResponse = await request(app)
          .get(`/api/samples/${response.body.id}/chainofcustody`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(cocResponse.statusCode).toBe(200);
        expect(cocResponse.body.length).toBe(1);
        expect(cocResponse.body[0].action).toBe('Registered');
        expect(cocResponse.body[0].sample_id).toBe(response.body.id);
      });

      it('should register a sample with status "In Storage" and a valid storage_location_id', async () => {
        const sampleDataInStorage = {
          ...validSampleData(),
          current_status: 'In Storage',
          storage_location_id: storageLocationId
        };
        const response = await request(app)
          .post('/api/samples/register')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(sampleDataInStorage);
        expect(response.statusCode).toBe(201);
        expect(response.body.storage_location_id).toBe(storageLocationId);
        expect(response.body.current_status).toBe('In Storage');

        const cocResponse = await request(app)
            .get(`/api/samples/${response.body.id}/chainofcustody`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(cocResponse.body[0].new_location_id).toBe(storageLocationId);
      });

      it('should fail if required fields are missing', async () => {
        const incompleteData = { ...validSampleData() };
        delete incompleteData.sample_type_id;
        const response = await request(app)
            .post('/api/samples/register')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(incompleteData);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain('Missing required fields');
      });

      it('should fail if sample_type_id is invalid', async () => {
        const response = await request(app)
            .post('/api/samples/register')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ ...validSampleData(), sample_type_id: 9999 });
        expect(response.statusCode).toBe(400); // Or 404 depending on API implementation for FK checks
        expect(response.body.error).toContain('Sample type with ID 9999 not found');
      });

      it('should fail if status is "In Storage" but storage_location_id is missing', async () => {
        const response = await request(app)
            .post('/api/samples/register')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ ...validSampleData(), current_status: 'In Storage', storage_location_id: null });
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain('storage_location_id is required when current_status is "In Storage"');
      });
    });

    describe('GET /api/samples and GET /api/samples/:id', () => {
      let createdSampleId;
      let createdSampleUniqueId;

      beforeEach(async () => { // Create a sample to be fetched
        const sampleData = {
          sample_type_id: sampleTypeId,
          source_id: sourceId,
          collection_date: '2023-11-01T00:00:00.000Z',
          current_status: 'In Storage',
          storage_location_id: storageLocationId,
          notes: 'Sample for GET tests'
        };
        const response = await request(app)
          .post('/api/samples/register')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(sampleData);
        expect(response.statusCode).toBe(201); // Ensure sample creation was successful
        createdSampleId = response.body.id;
        createdSampleUniqueId = response.body.unique_sample_id;
      });

      it('should retrieve a list of samples', async () => {
        const response = await request(app)
          .get('/api/samples')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
        const foundSample = response.body.data.find(s => s.id === createdSampleId);
        expect(foundSample).toBeDefined();
        expect(foundSample.unique_sample_id).toBe(createdSampleUniqueId);
        expect(foundSample.sample_type_name).toBe('Test Type'); // From beforeEach of parent describe
      });

      it('should retrieve a specific sample by ID with all joined details', async () => {
        const response = await request(app)
          .get(`/api/samples/${createdSampleId}`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(createdSampleId);
        expect(response.body.unique_sample_id).toBe(createdSampleUniqueId);
        expect(response.body.sample_type_name).toBe('Test Type');
        expect(response.body.source_name).toBe('Test Source');
        expect(response.body.storage_location_name).toBe('Test Freezer');
      });

      it('should return 404 for a non-existent sample ID (GET /:id)', async () => {
        const response = await request(app)
          .get('/api/samples/99999')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(404);
      });
    });

    describe('PUT /api/samples/:id/status', () => {
      let sampleToUpdateId;

      beforeEach(async () => {
        // Create a sample to update its status
        const sampleData = {
          sample_type_id: sampleTypeId, source_id: sourceId,
          collection_date: '2023-12-01T00:00:00.000Z', current_status: 'Registered',
        };
        const res = await request(app).post('/api/samples/register').set('Authorization', `Bearer ${adminToken}`).send(sampleData);
        sampleToUpdateId = res.body.id;
      });

      it('should update a sample status and create a CoC entry', async () => {
        const statusUpdateData = {
          current_status: 'In Storage',
          storage_location_id: storageLocationId, // Ensure this is a valid ID from parent beforeEach
          notes: 'Moved to freezer A1'
        };
        const response = await request(app)
          .put(`/api/samples/${sampleToUpdateId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(statusUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.current_status).toBe(statusUpdateData.current_status);
        expect(response.body.storage_location_id).toBe(statusUpdateData.storage_location_id);
        expect(response.body.storage_location_name).toBe('Test Freezer'); // Check joined name

        // Verify CoC
        const cocResponse = await request(app)
          .get(`/api/samples/${sampleToUpdateId}/chainofcustody`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(cocResponse.body.length).toBe(2); // Initial 'Registered' + 'Status Updated'
        const latestCoc = cocResponse.body.find(c => c.action.includes(statusUpdateData.current_status));
        expect(latestCoc).toBeDefined();
        expect(latestCoc.notes).toBe(statusUpdateData.notes);
        expect(latestCoc.new_location_id).toBe(statusUpdateData.storage_location_id);
      });

      it('should fail to update status if status is "In Storage" but storage_location_id is missing', async () => {
        const statusUpdateData = { current_status: 'In Storage', notes: 'Trying to move without location' };
        const response = await request(app)
          .put(`/api/samples/${sampleToUpdateId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(statusUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain('storage_location_id is required');
      });

      it('should fail to update status with an invalid storage_location_id', async () => {
        const statusUpdateData = { current_status: 'In Storage', storage_location_id: 9999, notes: 'Invalid location' };
        const response = await request(app)
            .put(`/api/samples/${sampleToUpdateId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(statusUpdateData);
        expect(response.statusCode).toBe(400); // API returns 400 for non-existent FKs during status update
        expect(response.body.error).toContain('Storage location with ID 9999 not found');
      });

      it('should return 404 if sample ID for status update is not found', async () => {
        const response = await request(app)
            .put('/api/samples/88888/status')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ current_status: 'Discarded' });
        expect(response.statusCode).toBe(404);
      });
    });

    describe('GET /api/samples/:id/barcode and CoC endpoints', () => {
      let sampleIdForSubTests;
      let uniqueSampleIdForSubTests;

      beforeAll(async () => { // Create one sample for all these sub-tests
        const sampleData = {
          sample_type_id: sampleTypeId, source_id: sourceId,
          collection_date: '2023-12-05T00:00:00.000Z', current_status: 'Registered',
        };
        const res = await request(app).post('/api/samples/register').set('Authorization', `Bearer ${adminToken}`).send(sampleData);
        sampleIdForSubTests = res.body.id;
        uniqueSampleIdForSubTests = res.body.unique_sample_id;
      });

      it('should retrieve barcode data for a sample', async () => {
        const response = await request(app)
          .get(`/api/samples/${sampleIdForSubTests}/barcode`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.sample_id).toBe(sampleIdForSubTests);
        expect(response.body.unique_sample_id).toBe(uniqueSampleIdForSubTests);
        expect(response.body.barcode_qr_code).toBe(`QR-${uniqueSampleIdForSubTests}`);
      });

      it('should return 404 for barcode if sample ID is not found', async () => {
        const response = await request(app)
          .get('/api/samples/77777/barcode')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(404);
      });

      it('should retrieve chain of custody for a sample', async () => {
        // This sample already has one CoC entry from registration
        const response = await request(app)
          .get(`/api/samples/${sampleIdForSubTests}/chainofcustody`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toBeGreaterThanOrEqual(1); // At least the registration event
        expect(response.body[0].sample_id).toBe(sampleIdForSubTests);
        expect(response.body[0].action).toBe('Registered');
      });
    });

    describe('POST /api/samples/:id/chainofcustody (manual entry)', () => {
        let sampleIdForManualCoC;
        let anotherStorageLocationId;

        beforeAll(async () => {
            // Create a sample for these CoC tests
            const sampleRes = await request(app).post('/api/samples/register').set('Authorization', `Bearer ${adminToken}`).send({
                sample_type_id: sampleTypeId, source_id: sourceId,
                collection_date: '2023-12-10T00:00:00.000Z', current_status: 'In Analysis',
            });
            sampleIdForManualCoC = sampleRes.body.id;

            // Create another storage location for testing previous/new location fields
            const slRes = await request(app).post('/api/storage-locations').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Temp Bench', temperature: 20 });
            anotherStorageLocationId = slRes.body.id;
        });

        it('should add a manual chain of custody entry', async () => {
            const cocData = {
                action: 'Manual Check',
                notes: 'Sample visually inspected, looks okay.',
                previous_location_id: null, // Could be current location if known
                new_location_id: null // Or current location if not moved
            };
            const response = await request(app)
                .post(`/api/samples/${sampleIdForManualCoC}/chainofcustody`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(cocData);
            expect(response.statusCode).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.action).toBe(cocData.action);
            expect(response.body.notes).toBe(cocData.notes);
            expect(response.body.sample_id).toBe(sampleIdForManualCoC);

            // Verify it's added
            const cocList = await request(app).get(`/api/samples/${sampleIdForManualCoC}/chainofcustody`).set('Authorization', `Bearer ${adminToken}`);
            expect(cocList.body.find(c => c.id === response.body.id)).toBeDefined();
        });

        it('should add a manual CoC entry with location changes', async () => {
            const cocData = {
                action: 'Moved to Bench',
                notes: 'Temporarily moved for analysis prep.',
                previous_location_id: storageLocationId, // Main freezer
                new_location_id: anotherStorageLocationId // Temp Bench
            };
             const response = await request(app)
                .post(`/api/samples/${sampleIdForManualCoC}/chainofcustody`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(cocData);
            expect(response.statusCode).toBe(201);
            expect(response.body.previous_location_id).toBe(cocData.previous_location_id);
            expect(response.body.new_location_id).toBe(cocData.new_location_id);
        });

        it('should fail to add manual CoC if action is missing', async () => {
            const response = await request(app)
                .post(`/api/samples/${sampleIdForManualCoC}/chainofcustody`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ notes: 'Missing action' });
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toContain('Action is required');
        });

        it('should fail to add manual CoC for non-existent sample', async () => {
            const response = await request(app)
                .post('/api/samples/77441/chainofcustody')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ action: 'Test', notes: 'Test' });
            expect(response.statusCode).toBe(404); // Or 400 based on API's FK check timing
        });
    });

  });
});
