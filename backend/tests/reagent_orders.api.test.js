const request = require('supertest');
const path =path.resolve(__dirname, 'test-reagent-orders-api-database.db');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const { app } = require('../index');

const testDbPath = path;
let db;

// Tokens
let adminToken, invManagerToken, reporterToken, basicUserToken;
// User IDs
let adminUserId, invManagerUserId, reporterUserId, basicUserId;
// Test Data IDs
let testReagentId, testSupplierId;

const initializeTestDatabase = (done) => {
  db = new sqlite3.Database(testDbPath, (err) => {
    if (err) return done(err);
    db.serialize(() => {
      const tables = ['reagent_orders', 'reagents', 'suppliers', 'role_permissions', 'users', 'permissions', 'roles'];
      tables.forEach(table => db.run(`DROP TABLE IF EXISTS ${table}`, (e) => { if (e) console.warn(`Could not drop ${table}: ${e.message}`); }));

      db.run(`CREATE TABLE roles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`, handleError(done, 'roles'));
      db.run(`CREATE TABLE permissions (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`, handleError(done, 'permissions'));
      db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, email TEXT UNIQUE NOT NULL, full_name TEXT, role_id INTEGER, FOREIGN KEY (role_id) REFERENCES roles(id))`, handleError(done, 'users'));
      db.run(`CREATE TABLE role_permissions (role_id INTEGER NOT NULL, permission_id INTEGER NOT NULL, PRIMARY KEY (role_id, permission_id), FOREIGN KEY (role_id) REFERENCES roles(id), FOREIGN KEY (permission_id) REFERENCES permissions(id))`, handleError(done, 'role_permissions'));

      db.run(`CREATE TABLE reagents (
          id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, lot_number TEXT UNIQUE NOT NULL, expiry_date TEXT NOT NULL,
          manufacturer TEXT, sds_link TEXT, current_stock INTEGER DEFAULT 0, min_stock_level INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`, handleError(done, 'reagents'));

      db.run(`CREATE TABLE suppliers (
          id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, contact_info TEXT, address TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`, handleError(done, 'suppliers'));

      db.run(`CREATE TABLE reagent_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT, reagent_id INTEGER NOT NULL, supplier_id INTEGER, order_date TEXT NOT NULL,
          expected_delivery_date TEXT, quantity_ordered INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'Pending',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (reagent_id) REFERENCES reagents(id), FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      )`, handleError(done, 'reagent_orders', done));
    });
  });
};

const handleError = (done, tableName, finalCb) => (err) => {
  if (err) { console.error(`Error for ${tableName}:`, err.message); return done(err); }
  if (finalCb) finalCb();
};

const seedData = async () => {
  const saltRounds = 10;

  // Roles
  await Promise.all([
    db.run("INSERT INTO roles (name) VALUES ('test_admin_ro')"),
    db.run("INSERT INTO roles (name) VALUES ('inv_manager_ro')"),
    db.run("INSERT INTO roles (name) VALUES ('reporter_ro')"),
    db.run("INSERT INTO roles (name) VALUES ('basic_user_ro')")
  ]);
  const adminR = await new Promise((res, rej) => db.get("SELECT id FROM roles WHERE name = 'test_admin_ro'", (e,r) => e?rej(e):res(r)));
  const invManagerR = await new Promise((res, rej) => db.get("SELECT id FROM roles WHERE name = 'inv_manager_ro'", (e,r) => e?rej(e):res(r)));
  const reporterR = await new Promise((res, rej) => db.get("SELECT id FROM roles WHERE name = 'reporter_ro'", (e,r) => e?rej(e):res(r)));
  const basicUserR = await new Promise((res, rej) => db.get("SELECT id FROM roles WHERE name = 'basic_user_ro'", (e,r) => e?rej(e):res(r)));

  // Permissions
  const permissions = ['manage_inventory', 'view_reports'];
  const permStmt = db.prepare("INSERT INTO permissions (name) VALUES (?)");
  for (const p of permissions) await new Promise((res, rej) => permStmt.run(p, e => e ? rej(e) : res()));
  permStmt.finalize();
  const permMap = {};
  const allPerms = await new Promise((res, rej) => db.all("SELECT id, name FROM permissions", (e,r) => e?rej(e):res(r)));
  allPerms.forEach(p => permMap[p.name] = p.id);

  // Role-Permissions
  const rpStmt = db.prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
  // Admin: all
  if (permMap['manage_inventory']) await new Promise((res, rej) => rpStmt.run(adminR.id, permMap['manage_inventory'], e => e ? rej(e) : res()));
  if (permMap['view_reports']) await new Promise((res, rej) => rpStmt.run(adminR.id, permMap['view_reports'], e => e ? rej(e) : res()));
  // Inv Manager: manage_inventory, view_reports
  if (permMap['manage_inventory']) await new Promise((res, rej) => rpStmt.run(invManagerR.id, permMap['manage_inventory'], e => e ? rej(e) : res()));
  if (permMap['view_reports']) await new Promise((res, rej) => rpStmt.run(invManagerR.id, permMap['view_reports'], e => e ? rej(e) : res()));
  // Reporter: view_reports
  if (permMap['view_reports']) await new Promise((res, rej) => rpStmt.run(reporterR.id, permMap['view_reports'], e => e ? rej(e) : res()));
  rpStmt.finalize();

  // Users
  const usersToCreate = [
    { username: 'test_admin_ro', pass: 'adminpass', roleId: adminR.id, varName: 'adminUserId' },
    { username: 'inv_manager_ro', pass: 'invpass', roleId: invManagerR.id, varName: 'invManagerUserId' },
    { username: 'reporter_ro', pass: 'reportpass', roleId: reporterR.id, varName: 'reporterUserId' },
    { username: 'basic_user_ro', pass: 'basicpass', roleId: basicUserR.id, varName: 'basicUserId' },
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

  // Base data: one reagent, one supplier
  await new Promise((res, rej) => db.run("INSERT INTO reagents (name, lot_number, expiry_date, current_stock, min_stock_level) VALUES ('Test Reagent A', 'TRA-001', '2025-01-01', 50, 10)", function(e){ e ? rej(e) : (testReagentId = this.lastID, res())}));
  await new Promise((res, rej) => db.run("INSERT INTO suppliers (name) VALUES ('Test Supplier X')", function(e){ e ? rej(e) : (testSupplierId = this.lastID, res())}));
};

const loginUsers = async () => {
  const login = async (username, password) => (await request(app).post('/api/login').send({ username, password })).body.token;
  adminToken = await login('test_admin_ro', 'adminpass');
  invManagerToken = await login('inv_manager_ro', 'invpass');
  reporterToken = await login('reporter_ro', 'reportpass');
  basicUserToken = await login('basic_user_ro', 'basicpass');
  if (!adminToken || !invManagerToken || !reporterToken || !basicUserToken) throw new Error('One or more test user logins failed for reagent orders');
};

beforeAll(async () => {
  await new Promise((resolve, reject) => initializeTestDatabase(err => err ? reject(err) : resolve()));
  await seedData();
  await loginUsers();
});

afterEach(async () => {
  await new Promise((resolve, reject) => db.run(`DELETE FROM reagent_orders`, err => err ? reject(err) : resolve()));
  await new Promise((resolve, reject) => db.run(`DELETE FROM sqlite_sequence WHERE name='reagent_orders'`, e => (e && !e.message.includes("no such table")) ? reject(e) : resolve() ));
  // Reset reagent stock for consistency in stock update tests
  await new Promise((res, rej) => db.run("UPDATE reagents SET current_stock = 50 WHERE id = ?", [testReagentId], e => e ? rej(e) : res()));
});

afterAll((done) => {
  db.close((err) => {
    if (err) console.error('Error closing test reagent orders database', err.message);
    fs.unlink(testDbPath, (unlinkErr) => {
      if (unlinkErr) console.error("Error deleting test reagent orders database file:", unlinkErr.message);
      done();
    });
  });
});

// --- Test Suites ---
describe('Reagent Orders API (/api/reagent_orders)', () => {
  const validOrderData = () => ({
    reagent_id: testReagentId,
    supplier_id: testSupplierId,
    order_date: '2024-07-01',
    expected_delivery_date: '2024-07-15',
    quantity_ordered: 10,
    status: 'Pending'
  });

  describe('POST /api/reagent_orders', () => {
    it('should create an order by admin', async () => {
      const response = await request(app).post('/api/reagent_orders').set('Authorization', `Bearer ${adminToken}`).send(validOrderData());
      expect(response.statusCode).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.reagent_id).toBe(testReagentId);
      expect(response.body.quantity_ordered).toBe(10);
    });

    it('should fail if reagent_id is missing', async () => {
      const { reagent_id, ...data } = validOrderData();
      const response = await request(app).post('/api/reagent_orders').set('Authorization', `Bearer ${adminToken}`).send(data);
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should fail for invalid quantity (zero or negative)', async () => {
      let response = await request(app).post('/api/reagent_orders').set('Authorization', `Bearer ${adminToken}`).send({...validOrderData(), quantity_ordered: 0});
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('quantity_ordered must be a positive integer');
      response = await request(app).post('/api/reagent_orders').set('Authorization', `Bearer ${adminToken}`).send({...validOrderData(), quantity_ordered: -5});
      expect(response.statusCode).toBe(400);
    });

    it('should fail for non-existent reagent_id', async () => {
        const response = await request(app).post('/api/reagent_orders').set('Authorization', `Bearer ${adminToken}`).send({...validOrderData(), reagent_id: 9999});
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain('Reagent with ID 9999 not found');
    });

    it('should be forbidden for basic user', async () => {
      const response = await request(app).post('/api/reagent_orders').set('Authorization', `Bearer ${basicUserToken}`).send(validOrderData());
      expect(response.statusCode).toBe(403);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app).post('/api/reagent_orders').send(validOrderData());
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/reagent_orders', () => {
    beforeEach(async () => {
      await request(app).post('/api/reagent_orders').set('Authorization', `Bearer ${adminToken}`).send(validOrderData());
    });

    it('should list orders for admin', async () => {
      const response = await request(app).get('/api/reagent_orders').set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].reagent_name).toBe('Test Reagent A');
      expect(response.body[0].supplier_name).toBe('Test Supplier X');
    });

    it('should list orders for reporter (view_reports perm)', async () => {
      const response = await request(app).get('/api/reagent_orders').set('Authorization', `Bearer ${reporterToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(1);
    });

    it('should be forbidden for basic user', async () => {
      const response = await request(app).get('/api/reagent_orders').set('Authorization', `Bearer ${basicUserToken}`);
      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/reagent_orders/:id', () => {
    let orderId;
    beforeEach(async () => {
      const res = await request(app).post('/api/reagent_orders').set('Authorization', `Bearer ${adminToken}`).send(validOrderData());
      orderId = res.body.id;
    });

    it('should get specific order for admin', async () => {
      const response = await request(app).get(`/api/reagent_orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(orderId);
      expect(response.body.reagent_name).toBe('Test Reagent A');
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app).get('/api/reagent_orders/999').set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/reagent_orders/:id', () => {
    let orderId;
    const initialOrderQuantity = 10;
    const initialReagentStock = 50;

    beforeEach(async () => {
      // Ensure reagent stock is at a known value
      await new Promise((res, rej) => db.run("UPDATE reagents SET current_stock = ? WHERE id = ?", [initialReagentStock, testReagentId], e => e ? rej(e) : res()));
      const order = {...validOrderData(), quantity_ordered: initialOrderQuantity, status: 'Pending'};
      const res = await request(app).post('/api/reagent_orders').set('Authorization', `Bearer ${adminToken}`).send(order);
      orderId = res.body.id;
    });

    it('should update order details by admin', async () => {
      const updates = { status: 'Ordered', expected_delivery_date: '2024-07-20' };
      const response = await request(app).put(`/api/reagent_orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`).send(updates);
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('Ordered');
      expect(response.body.expected_delivery_date).toBe('2024-07-20');
    });

    it('should update reagent stock when status changes to Delivered', async () => {
      const response = await request(app).put(`/api/reagent_orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'Delivered' });
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('Delivered');

      const reagentRes = await request(app).get(`/api/reagents/${testReagentId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(reagentRes.body.current_stock).toBe(initialReagentStock + initialOrderQuantity);
    });

    it('should NOT update stock again if already Delivered and other fields change', async () => {
        // First, set to Delivered
        await request(app).put(`/api/reagent_orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'Delivered' });
        let reagentRes = await request(app).get(`/api/reagents/${testReagentId}`).set('Authorization', `Bearer ${adminToken}`);
        const stockAfterFirstDelivery = reagentRes.body.current_stock;
        expect(stockAfterFirstDelivery).toBe(initialReagentStock + initialOrderQuantity);

        // Then, update something else while status is still Delivered
        const response = await request(app).put(`/api/reagent_orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`).send({ expected_delivery_date: '2024-07-25', status: 'Delivered' });
        expect(response.statusCode).toBe(200);

        reagentRes = await request(app).get(`/api/reagents/${testReagentId}`).set('Authorization', `Bearer ${adminToken}`);
        expect(reagentRes.body.current_stock).toBe(stockAfterFirstDelivery); // Stock should not change again
    });

    it('should NOT change stock if status changes from Delivered to something else', async () => {
        await request(app).put(`/api/reagent_orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'Delivered' });
        const stockAfterDelivery = (await request(app).get(`/api/reagents/${testReagentId}`).set('Authorization', `Bearer ${adminToken}`)).body.current_stock;

        const response = await request(app).put(`/api/reagent_orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'Pending' }); // Change back
        expect(response.statusCode).toBe(200);
        const stockAfterRevert = (await request(app).get(`/api/reagents/${testReagentId}`).set('Authorization', `Bearer ${adminToken}`)).body.current_stock;
        expect(stockAfterRevert).toBe(stockAfterDelivery); // Stock should remain as is
    });

    it('should be forbidden for basic user', async () => {
      const response = await request(app).put(`/api/reagent_orders/${orderId}`).set('Authorization', `Bearer ${basicUserToken}`).send({ status: 'Cancelled' });
      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for non-existent order ID', async () => {
        const response = await request(app).put('/api/reagent_orders/8888').set('Authorization', `Bearer ${adminToken}`).send({ status: 'Pending' });
        expect(response.statusCode).toBe(404);
    });
  });
});
