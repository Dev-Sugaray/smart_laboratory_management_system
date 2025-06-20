const request = require('supertest');
const path =path.resolve(__dirname, 'test-reagents-api-database.db');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const { app } = require('../index'); // Main app

const testDbPath = path; // Use the resolved path
let db; // Test database instance

// Tokens
let adminToken, invManagerToken, reporterToken, basicUserToken;
// User IDs
let adminUserId, invManagerUserId, reporterUserId, basicUserId;

// Helper to initialize the database schema
const initializeTestDatabase = (done) => {
  db = new sqlite3.Database(testDbPath, (err) => {
    if (err) return done(err);

    db.serialize(() => {
      const tables = [
        'reagent_supplier_junction', 'reagent_orders', 'suppliers', 'reagents',
        'role_permissions', 'users', 'permissions', 'roles'
        // Add other tables if they become direct dependencies
      ];
      tables.forEach(table => db.run(`DROP TABLE IF EXISTS ${table}`, (err) => {
        if (err) console.warn(`Could not drop table ${table}: ${err.message}`);
      }));

      // Core tables
      db.run(`CREATE TABLE roles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`, handleError(done, 'roles'));
      db.run(`CREATE TABLE permissions (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`, handleError(done, 'permissions'));
      db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, email TEXT UNIQUE NOT NULL, full_name TEXT, role_id INTEGER, FOREIGN KEY (role_id) REFERENCES roles(id))`, handleError(done, 'users'));
      db.run(`CREATE TABLE role_permissions (role_id INTEGER NOT NULL, permission_id INTEGER NOT NULL, PRIMARY KEY (role_id, permission_id), FOREIGN KEY (role_id) REFERENCES roles(id), FOREIGN KEY (permission_id) REFERENCES permissions(id))`, handleError(done, 'role_permissions'));

      // Reagents related tables (as per main init-db.js)
      db.run(`CREATE TABLE reagents (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, lot_number TEXT UNIQUE NOT NULL,
        expiry_date TEXT NOT NULL, manufacturer TEXT, sds_link TEXT,
        current_stock INTEGER DEFAULT 0, min_stock_level INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`, handleError(done, 'reagents'));

      // Supplier table (dependency for reagent_orders, though not directly tested here)
      db.run(`CREATE TABLE suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, contact_info TEXT, address TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`, handleError(done, 'suppliers'));

      // Reagent Orders table (dependency for testing reagent deletion if linked, though not directly tested here)
      db.run(`CREATE TABLE reagent_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT, reagent_id INTEGER NOT NULL, supplier_id INTEGER,
        order_date TEXT NOT NULL, expected_delivery_date TEXT, quantity_ordered INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reagent_id) REFERENCES reagents(id), FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      )`, handleError(done, 'reagent_orders', done)); // Last table creation calls done
    });
  });
};

const handleError = (done, tableName, finalCb) => (err) => {
  if (err) {
    console.error(`Error creating/accessing ${tableName}:`, err.message);
    return done(err);
  }
  if (finalCb) finalCb();
};

const seedData = async () => {
  const saltRounds = 10;

  await db.run("INSERT INTO roles (name) VALUES ('test_admin'), ('inventory_manager'), ('reporter'), ('basic_user')");
  const adminR = await new Promise((res, rej) => db.get("SELECT id FROM roles WHERE name = 'test_admin'", (e,r) => e?rej(e):res(r)));
  const invManagerR = await new Promise((res, rej) => db.get("SELECT id FROM roles WHERE name = 'inventory_manager'", (e,r) => e?rej(e):res(r)));
  const reporterR = await new Promise((res, rej) => db.get("SELECT id FROM roles WHERE name = 'reporter'", (e,r) => e?rej(e):res(r)));
  const basicUserR = await new Promise((res, rej) => db.get("SELECT id FROM roles WHERE name = 'basic_user'", (e,r) => e?rej(e):res(r)));

  const permissions = ['manage_inventory', 'view_reports', 'some_other_permission'];
  const permStmt = db.prepare("INSERT INTO permissions (name) VALUES (?)");
  for (const p of permissions) await new Promise((res, rej) => permStmt.run(p, e => e ? rej(e) : res()));
  permStmt.finalize();

  const permMap = {};
  const allPerms = await new Promise((res, rej) => db.all("SELECT id, name FROM permissions", (e,r) => e?rej(e):res(r)));
  allPerms.forEach(p => permMap[p.name] = p.id);

  const rpStmt = db.prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
  // Admin: all
  if (permMap['manage_inventory']) await new Promise((res, rej) => rpStmt.run(adminR.id, permMap['manage_inventory'], e => e ? rej(e) : res()));
  if (permMap['view_reports']) await new Promise((res, rej) => rpStmt.run(adminR.id, permMap['view_reports'], e => e ? rej(e) : res()));
  if (permMap['some_other_permission']) await new Promise((res, rej) => rpStmt.run(adminR.id, permMap['some_other_permission'], e => e ? rej(e) : res()));
  // Inv Manager: manage_inventory, view_reports
  if (permMap['manage_inventory']) await new Promise((res, rej) => rpStmt.run(invManagerR.id, permMap['manage_inventory'], e => e ? rej(e) : res()));
  if (permMap['view_reports']) await new Promise((res, rej) => rpStmt.run(invManagerR.id, permMap['view_reports'], e => e ? rej(e) : res()));
  // Reporter: view_reports
  if (permMap['view_reports']) await new Promise((res, rej) => rpStmt.run(reporterR.id, permMap['view_reports'], e => e ? rej(e) : res()));
  // Basic User: some_other_permission (to ensure they are authenticated but lack specific perms)
  if (permMap['some_other_permission']) await new Promise((res, rej) => rpStmt.run(basicUserR.id, permMap['some_other_permission'], e => e ? rej(e) : res()));
  rpStmt.finalize();

  const usersToCreate = [
    { username: 'test_admin_reagents', pass: 'adminpass', roleId: adminR.id, varName: 'adminUserId' },
    { username: 'inv_manager_reagents', pass: 'invpass', roleId: invManagerR.id, varName: 'invManagerUserId' },
    { username: 'reporter_reagents', pass: 'reportpass', roleId: reporterR.id, varName: 'reporterUserId' },
    { username: 'basic_user_reagents', pass: 'basicpass', roleId: basicUserR.id, varName: 'basicUserId' },
  ];

  for (const u of usersToCreate) {
    const hash = await bcrypt.hash(u.pass, saltRounds);
    await new Promise((res, rej) => db.run("INSERT INTO users (username, password_hash, email, full_name, role_id) VALUES (?, ?, ?, ?, ?)", [u.username, hash, `${u.username}@test.com`, u.username, u.roleId], function(e) { e ? rej(e) : res(this.lastID); }));
    const userRow = await new Promise((res,rej) => db.get("SELECT id FROM users WHERE username=?", [u.username], (e,r)=>e?rej(e):res(r)));
    if (u.varName === 'adminUserId') adminUserId = userRow.id;
    if (u.varName === 'invManagerUserId') invManagerUserId = userRow.id;
    if (u.varName === 'reporterUserId') reporterUserId = userRow.id;
    if (u.varName === 'basicUserId') basicUserId = userRow.id;
  }
};

const loginUsers = async () => {
  const loginAndSetToken = async (username, password, tokenVarSetter) => {
    const response = await request(app).post('/api/login').send({ username, password });
    if (response.body.token) {
      tokenVarSetter(response.body.token);
    } else {
      console.error(`Login failed for ${username}:`, response.body);
      throw new Error(`Login failed for ${username}`);
    }
  };
  await loginAndSetToken('test_admin_reagents', 'adminpass', (token) => adminToken = token);
  await loginAndSetToken('inv_manager_reagents', 'invpass', (token) => invManagerToken = token);
  await loginAndSetToken('reporter_reagents', 'reportpass', (token) => reporterToken = token);
  await loginAndSetToken('basic_user_reagents', 'basicpass', (token) => basicUserToken = token);
};

beforeAll(async () => {
  await new Promise((resolve, reject) => initializeTestDatabase(err => err ? reject(err) : resolve()));
  await seedData();
  await loginUsers();
});

afterEach(async () => {
  const tablesToClean = ['reagents']; // Add suppliers, reagent_orders if they get populated by these tests
  for (const table of tablesToClean) {
    await new Promise((resolve, reject) => db.run(`DELETE FROM ${table}`, err => err ? reject(err) : resolve()));
    await new Promise((resolve, reject) => db.run(`DELETE FROM sqlite_sequence WHERE name='${table}'`, e => (e && !e.message.includes("no such table")) ? reject(e) : resolve() ));
  }
});

afterAll((done) => {
  db.close((err) => {
    if (err) console.error('Error closing test reagents database', err.message);
    fs.unlink(testDbPath, (unlinkErr) => {
      if (unlinkErr) console.error("Error deleting test reagents database file:", unlinkErr.message);
      done();
    });
  });
});

// --- Test Suites ---
describe('Reagents API (/api/reagents)', () => {
  const validReagent = {
    name: 'Hydrochloric Acid', lot_number: 'HCl-001', expiry_date: '2025-12-31',
    manufacturer: 'TestChem', sds_link: 'http://example.com/sds/hcl',
    current_stock: 1000, min_stock_level: 100
  };

  describe('POST /api/reagents', () => {
    it('should create a reagent with valid data by admin', async () => {
      const response = await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`).send(validReagent);
      expect(response.statusCode).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(validReagent.name);
      expect(response.body.lot_number).toBe(validReagent.lot_number);
    });

    it('should create a reagent with valid data by inventory manager', async () => {
      const res = {...validReagent, lot_number: 'HCl-001-IM'};
      const response = await request(app).post('/api/reagents').set('Authorization', `Bearer ${invManagerToken}`).send(res);
      expect(response.statusCode).toBe(201);
      expect(response.body.lot_number).toBe(res.lot_number);
    });

    it('should fail if name is missing', async () => {
      const { name, ...invalid } = validReagent;
      const response = await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`).send({...invalid, lot_number: 'HCl-Invalid-1'});
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should fail if lot_number is missing', async () => {
      const { lot_number, ...invalid } = validReagent;
      const response = await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`).send(invalid);
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should fail if expiry_date is missing or invalid', async () => {
      const { expiry_date, ...invalid } = validReagent;
      let response = await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`).send({...invalid, lot_number: 'HCl-Invalid-2'});
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Missing required fields');

      response = await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`).send({...validReagent, lot_number: 'HCl-Invalid-3', expiry_date: 'invalid-date'});
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Invalid expiry_date format');
    });

    it('should fail for invalid stock levels (negative)', async () => {
        let response = await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`)
            .send({...validReagent, lot_number: 'HCl-StockFail-1', current_stock: -5});
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain('Invalid current_stock');

        response = await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`)
            .send({...validReagent, lot_number: 'HCl-StockFail-2', min_stock_level: -1});
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain('Invalid min_stock_level');
    });

    it('should be forbidden for basic user', async () => {
      const response = await request(app).post('/api/reagents').set('Authorization', `Bearer ${basicUserToken}`).send({...validReagent, lot_number: 'HCl-Forbidden-1'});
      expect(response.statusCode).toBe(403);
    });

    it('should be forbidden for reporter user', async () => {
      const response = await request(app).post('/api/reagents').set('Authorization', `Bearer ${reporterToken}`).send({...validReagent, lot_number: 'HCl-Forbidden-2'});
      expect(response.statusCode).toBe(403);
    });

    it('should fail for duplicate lot_number', async () => {
      await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`).send({...validReagent, lot_number: 'HCl-DUPE-001'});
      const response = await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`).send({...validReagent, name: 'Another Acid', lot_number: 'HCl-DUPE-001'});
      expect(response.statusCode).toBe(409);
      expect(response.body.error).toContain('Lot number already exists');
    });
     it('should reject if not authenticated', async () => {
      const response = await request(app).post('/api/reagents').send(validReagent);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/reagents', () => {
    beforeEach(async () => {
      await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`).send({...validReagent, lot_number: 'RGT-001'});
      await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`).send({...validReagent, lot_number: 'RGT-002', name: 'Ethanol'});
    });

    it('should retrieve all reagents for admin', async () => {
      const response = await request(app).get('/api/reagents').set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it('should retrieve all reagents for basic user (any authenticated)', async () => {
      const response = await request(app).get('/api/reagents').set('Authorization', `Bearer ${basicUserToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app).get('/api/reagents');
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/reagents/:id', () => {
    let reagentId;
    beforeEach(async () => {
      const res = await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`).send({...validReagent, lot_number: 'RGT-ID-001'});
      reagentId = res.body.id;
    });

    it('should retrieve a specific reagent by admin', async () => {
      const response = await request(app).get(`/api/reagents/${reagentId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(reagentId);
      expect(response.body.lot_number).toBe('RGT-ID-001');
    });

    it('should retrieve a specific reagent by basic user', async () => {
      const response = await request(app).get(`/api/reagents/${reagentId}`).set('Authorization', `Bearer ${basicUserToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(reagentId);
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app).get('/api/reagents/99999').set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app).get(`/api/reagents/${reagentId}`);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('PUT /api/reagents/:id', () => {
    let reagentId;
    const initialData = {...validReagent, lot_number: 'RGT-PUT-001'};
    const updateData = { name: 'Updated Acid Name', current_stock: 1200 };

    beforeEach(async () => {
      const res = await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`).send(initialData);
      reagentId = res.body.id;
    });

    it('should update a reagent with valid data by admin', async () => {
      const response = await request(app).put(`/api/reagents/${reagentId}`).set('Authorization', `Bearer ${adminToken}`).send(updateData);
      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.current_stock).toBe(updateData.current_stock);
      expect(response.body.lot_number).toBe(initialData.lot_number); // Should not change
    });

    it('should fail for invalid data (e.g., negative stock)', async () => {
      const response = await request(app).put(`/api/reagents/${reagentId}`).set('Authorization', `Bearer ${adminToken}`).send({ current_stock: -10 });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Invalid current_stock');
    });

    it('should be forbidden for basic user', async () => {
      const response = await request(app).put(`/api/reagents/${reagentId}`).set('Authorization', `Bearer ${basicUserToken}`).send(updateData);
      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app).put('/api/reagents/99999').set('Authorization', `Bearer ${adminToken}`).send(updateData);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app).put(`/api/reagents/${reagentId}`).send(updateData);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/reagents/:id', () => {
    let reagentId;
    beforeEach(async () => {
      const res = await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`).send({...validReagent, lot_number: 'RGT-DEL-001'});
      reagentId = res.body.id;
    });

    it('should delete a reagent by admin', async () => {
      const response = await request(app).delete(`/api/reagents/${reagentId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(204);
      // Verify
      const getRes = await request(app).get(`/api/reagents/${reagentId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.statusCode).toBe(404);
    });

    it('should be forbidden for basic user', async () => {
      const response = await request(app).delete(`/api/reagents/${reagentId}`).set('Authorization', `Bearer ${basicUserToken}`);
      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app).delete('/api/reagents/99999').set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app).delete(`/api/reagents/${reagentId}`);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/reagents/:id/update_stock', () => {
    let reagentId;
    beforeEach(async () => {
      const res = await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`).send({...validReagent, lot_number: 'RGT-STOCK-001', current_stock: 50});
      reagentId = res.body.id;
    });

    it('should increase stock successfully by admin', async () => {
      const response = await request(app).post(`/api/reagents/${reagentId}/update_stock`).set('Authorization', `Bearer ${adminToken}`).send({ change: 10 });
      expect(response.statusCode).toBe(200);
      expect(response.body.current_stock).toBe(60);
    });

    it('should decrease stock successfully by inventory manager', async () => {
      const response = await request(app).post(`/api/reagents/${reagentId}/update_stock`).set('Authorization', `Bearer ${invManagerToken}`).send({ change: -20 });
      expect(response.statusCode).toBe(200);
      expect(response.body.current_stock).toBe(30); // 50 - 20
    });

    it('should fail if stock goes below zero', async () => {
      const response = await request(app).post(`/api/reagents/${reagentId}/update_stock`).set('Authorization', `Bearer ${adminToken}`).send({ change: -60 }); // Initial 50
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Stock level cannot go below zero');
    });

    it('should be forbidden for basic user', async () => {
      const response = await request(app).post(`/api/reagents/${reagentId}/update_stock`).set('Authorization', `Bearer ${basicUserToken}`).send({ change: 5 });
      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for non-existent reagent ID', async () => {
      const response = await request(app).post('/api/reagents/99999/update_stock').set('Authorization', `Bearer ${adminToken}`).send({ change: 5 });
      expect(response.statusCode).toBe(404);
    });

     it('should reject if not authenticated', async () => {
      const response = await request(app).post(`/api/reagents/${reagentId}/update_stock`).send({ change: 5 });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/reagents/alerts/low_stock', () => {
    beforeEach(async () => {
      await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`)
        .send({...validReagent, lot_number: 'LOW-001', name: 'Low Reagent', current_stock: 5, min_stock_level: 10});
      await request(app).post('/api/reagents').set('Authorization', `Bearer ${adminToken}`)
        .send({...validReagent, lot_number: 'OK-001', name: 'OK Reagent', current_stock: 15, min_stock_level: 10});
    });

    it('should retrieve low stock reagents for admin', async () => {
      const response = await request(app).get('/api/reagents/alerts/low_stock').set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('Low Reagent');
    });

    it('should retrieve low stock reagents for inventory manager', async () => {
      const response = await request(app).get('/api/reagents/alerts/low_stock').set('Authorization', `Bearer ${invManagerToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(1);
    });

    it('should retrieve low stock reagents for reporter', async () => {
      const response = await request(app).get('/api/reagents/alerts/low_stock').set('Authorization', `Bearer ${reporterToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(1);
    });

    it('should be forbidden for basic user', async () => {
      const response = await request(app).get('/api/reagents/alerts/low_stock').set('Authorization', `Bearer ${basicUserToken}`);
      expect(response.statusCode).toBe(403);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app).get('/api/reagents/alerts/low_stock');
      expect(response.statusCode).toBe(401);
    });
  });
});
