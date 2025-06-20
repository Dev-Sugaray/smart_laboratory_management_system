const request = require('supertest');
const path =path.resolve(__dirname, 'test-suppliers-api-database.db');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const { app } = require('../index'); // Main app

const testDbPath = path;
let db;

// Tokens
let adminToken, invManagerToken, basicUserToken;
// User IDs
let adminUserId, invManagerUserId, basicUserId; // We might not need all for suppliers

// Helper to initialize the database schema
const initializeTestDatabase = (done) => {
  db = new sqlite3.Database(testDbPath, (err) => {
    if (err) return done(err);

    db.serialize(() => {
      const tables = [
        // In case of FKs from reagent_orders or reagent_supplier_junction to suppliers
        'reagent_supplier_junction', 'reagent_orders', 'suppliers',
        'reagents', // reagents needed if reagent_orders has FK to it and we test supplier deletion with linked orders
        'role_permissions', 'users', 'permissions', 'roles'
      ];
      tables.forEach(table => db.run(`DROP TABLE IF EXISTS ${table}`, (err) => {
        if (err) console.warn(`Could not drop table ${table}: ${err.message}`);
      }));

      db.run(`CREATE TABLE roles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`, handleError(done, 'roles'));
      db.run(`CREATE TABLE permissions (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`, handleError(done, 'permissions'));
      db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, email TEXT UNIQUE NOT NULL, full_name TEXT, role_id INTEGER, FOREIGN KEY (role_id) REFERENCES roles(id))`, handleError(done, 'users'));
      db.run(`CREATE TABLE role_permissions (role_id INTEGER NOT NULL, permission_id INTEGER NOT NULL, PRIMARY KEY (role_id, permission_id), FOREIGN KEY (role_id) REFERENCES roles(id), FOREIGN KEY (permission_id) REFERENCES permissions(id))`, handleError(done, 'role_permissions'));

      db.run(`CREATE TABLE reagents (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, lot_number TEXT UNIQUE NOT NULL,
        expiry_date TEXT NOT NULL, manufacturer TEXT, sds_link TEXT,
        current_stock INTEGER DEFAULT 0, min_stock_level INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`, handleError(done, 'reagents'));

      db.run(`CREATE TABLE suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, contact_info TEXT, address TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`, handleError(done, 'suppliers'));

      db.run(`CREATE TABLE reagent_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT, reagent_id INTEGER NOT NULL, supplier_id INTEGER,
        order_date TEXT NOT NULL, expected_delivery_date TEXT, quantity_ordered INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reagent_id) REFERENCES reagents(id), FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      )`, handleError(done, 'reagent_orders'));

      db.run(`CREATE TABLE reagent_supplier_junction (
        reagent_id INTEGER NOT NULL, supplier_id INTEGER NOT NULL,
        PRIMARY KEY (reagent_id, supplier_id),
        FOREIGN KEY (reagent_id) REFERENCES reagents(id), FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      )`, handleError(done, 'reagent_supplier_junction', done));
    });
  });
};

const handleError = (done, tableName, finalCb) => (err) => {
  if (err) { console.error(`Error for ${tableName}:`, err.message); return done(err); }
  if (finalCb) finalCb();
};

const seedData = async () => {
  const saltRounds = 10;

  await db.run("INSERT INTO roles (name) VALUES ('test_admin_sup'), ('inv_manager_sup'), ('basic_user_sup')");
  const adminR = await new Promise((res, rej) => db.get("SELECT id FROM roles WHERE name = 'test_admin_sup'", (e,r) => e?rej(e):res(r)));
  const invManagerR = await new Promise((res, rej) => db.get("SELECT id FROM roles WHERE name = 'inv_manager_sup'", (e,r) => e?rej(e):res(r)));
  const basicUserR = await new Promise((res, rej) => db.get("SELECT id FROM roles WHERE name = 'basic_user_sup'", (e,r) => e?rej(e):res(r)));

  const permissions = ['manage_inventory', 'view_reports']; // view_reports not used by suppliers but good to have
  const permStmt = db.prepare("INSERT INTO permissions (name) VALUES (?)");
  for (const p of permissions) await new Promise((res, rej) => permStmt.run(p, e => e ? rej(e) : res()));
  permStmt.finalize();

  const permMap = {};
  const allPerms = await new Promise((res, rej) => db.all("SELECT id, name FROM permissions", (e,r) => e?rej(e):res(r)));
  allPerms.forEach(p => permMap[p.name] = p.id);

  const rpStmt = db.prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
  if (permMap['manage_inventory']) {
    await new Promise((res, rej) => rpStmt.run(adminR.id, permMap['manage_inventory'], e => e ? rej(e) : res()));
    await new Promise((res, rej) => rpStmt.run(invManagerR.id, permMap['manage_inventory'], e => e ? rej(e) : res()));
  }
  // Basic user gets no specific permissions for these tests beyond being authenticated
  rpStmt.finalize();

  const usersToCreate = [
    { username: 'test_admin_suppliers', pass: 'adminpass', roleId: adminR.id, varName: 'adminUserId' },
    { username: 'inv_manager_suppliers', pass: 'invpass', roleId: invManagerR.id, varName: 'invManagerUserId' },
    { username: 'basic_user_suppliers', pass: 'basicpass', roleId: basicUserR.id, varName: 'basicUserId' },
  ];

  for (const u of usersToCreate) {
    const hash = await bcrypt.hash(u.pass, saltRounds);
    await new Promise((res, rej) => db.run("INSERT INTO users (username, password_hash, email, full_name, role_id) VALUES (?, ?, ?, ?, ?)", [u.username, hash, `${u.username}@test.com`, u.username, u.roleId], function(e) { e ? rej(e) : res(this.lastID); }));
    const userRow = await new Promise((res,rej) => db.get("SELECT id FROM users WHERE username=?", [u.username], (e,r)=>e?rej(e):res(r)));
    if (u.varName === 'adminUserId') adminUserId = userRow.id;
    if (u.varName === 'invManagerUserId') invManagerUserId = userRow.id;
    if (u.varName === 'basicUserId') basicUserId = userRow.id;
  }
};

const loginUsers = async () => {
  const login = async (username, password) => (await request(app).post('/api/login').send({ username, password })).body.token;
  adminToken = await login('test_admin_suppliers', 'adminpass');
  invManagerToken = await login('inv_manager_suppliers', 'invpass');
  basicUserToken = await login('basic_user_suppliers', 'basicpass');
  if (!adminToken || !invManagerToken || !basicUserToken) throw new Error('One or more test user logins failed');
};

beforeAll(async () => {
  await new Promise((resolve, reject) => initializeTestDatabase(err => err ? reject(err) : resolve()));
  await seedData();
  await loginUsers();
});

afterEach(async () => {
  // Clean suppliers and any related tables that might be affected by supplier tests
  const tablesToClean = ['reagent_supplier_junction', 'reagent_orders', 'suppliers'];
  for (const table of tablesToClean) {
    await new Promise((resolve, reject) => db.run(`DELETE FROM ${table}`, err => err ? reject(err) : resolve()));
    await new Promise((resolve, reject) => db.run(`DELETE FROM sqlite_sequence WHERE name='${table}'`, e => (e && !e.message.includes("no such table")) ? reject(e) : resolve() ));
  }
});

afterAll((done) => {
  db.close((err) => {
    if (err) console.error('Error closing test suppliers database', err.message);
    fs.unlink(testDbPath, (unlinkErr) => {
      if (unlinkErr) console.error("Error deleting test suppliers database file:", unlinkErr.message);
      done();
    });
  });
});

// --- Test Suites ---
describe('Suppliers API (/api/suppliers)', () => {
  const validSupplier = { name: 'ChemSupply Co.', contact_info: 'sales@chemsupply.com', address: '123 Chemical Lane' };

  describe('POST /api/suppliers', () => {
    it('should create a supplier with valid data by admin', async () => {
      const response = await request(app).post('/api/suppliers').set('Authorization', `Bearer ${adminToken}`).send(validSupplier);
      expect(response.statusCode).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(validSupplier.name);
    });

    it('should create a supplier by inventory manager', async () => {
      const supData = {...validSupplier, name: 'BioSource Ltd.'};
      const response = await request(app).post('/api/suppliers').set('Authorization', `Bearer ${invManagerToken}`).send(supData);
      expect(response.statusCode).toBe(201);
      expect(response.body.name).toBe(supData.name);
    });

    it('should fail if name is missing', async () => {
      const { name, ...invalid } = validSupplier;
      const response = await request(app).post('/api/suppliers').set('Authorization', `Bearer ${adminToken}`).send(invalid);
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Missing required field: name');
    });

    it('should be forbidden for basic user', async () => {
      const response = await request(app).post('/api/suppliers').set('Authorization', `Bearer ${basicUserToken}`).send({...validSupplier, name: 'ForbiddenSupp'});
      expect(response.statusCode).toBe(403);
    });

    it('should fail for duplicate name', async () => {
      await request(app).post('/api/suppliers').set('Authorization', `Bearer ${adminToken}`).send(validSupplier);
      const response = await request(app).post('/api/suppliers').set('Authorization', `Bearer ${adminToken}`).send({...validSupplier, contact_info: 'newcontact@chemsupply.com'});
      expect(response.statusCode).toBe(409);
      expect(response.body.error).toContain('Supplier name already exists');
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app).post('/api/suppliers').send(validSupplier);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/suppliers', () => {
    beforeEach(async () => {
      await request(app).post('/api/suppliers').set('Authorization', `Bearer ${adminToken}`).send(validSupplier);
      await request(app).post('/api/suppliers').set('Authorization', `Bearer ${adminToken}`).send({...validSupplier, name: 'Global Chemicals'});
    });

    it('should retrieve all suppliers for admin', async () => {
      const response = await request(app).get('/api/suppliers').set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it('should retrieve all suppliers for basic user (any authenticated)', async () => {
      const response = await request(app).get('/api/suppliers').set('Authorization', `Bearer ${basicUserToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app).get('/api/suppliers');
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/suppliers/:id', () => {
    let supplierId;
    beforeEach(async () => {
      const res = await request(app).post('/api/suppliers').set('Authorization', `Bearer ${adminToken}`).send(validSupplier);
      supplierId = res.body.id;
    });

    it('should retrieve a specific supplier by admin', async () => {
      const response = await request(app).get(`/api/suppliers/${supplierId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(supplierId);
      expect(response.body.name).toBe(validSupplier.name);
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app).get('/api/suppliers/99999').set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app).get(`/api/suppliers/${supplierId}`);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('PUT /api/suppliers/:id', () => {
    let supplierId;
    const updateData = { name: 'ChemSupply Co. Updated', contact_info: 'updated@chemsupply.com' };

    beforeEach(async () => {
      const res = await request(app).post('/api/suppliers').set('Authorization', `Bearer ${adminToken}`).send(validSupplier);
      supplierId = res.body.id;
    });

    it('should update a supplier by admin', async () => {
      const response = await request(app).put(`/api/suppliers/${supplierId}`).set('Authorization', `Bearer ${adminToken}`).send(updateData);
      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.contact_info).toBe(updateData.contact_info);
    });

    it('should be forbidden for basic user', async () => {
      const response = await request(app).put(`/api/suppliers/${supplierId}`).set('Authorization', `Bearer ${basicUserToken}`).send(updateData);
      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app).put('/api/suppliers/99999').set('Authorization', `Bearer ${adminToken}`).send(updateData);
      expect(response.statusCode).toBe(404);
    });

    it('should fail for duplicate name on update', async () => {
      const otherSupplier = await request(app).post('/api/suppliers').set('Authorization', `Bearer ${adminToken}`).send({...validSupplier, name: 'Another Supplier'});
      const response = await request(app).put(`/api/suppliers/${supplierId}`).set('Authorization', `Bearer ${adminToken}`).send({name: 'Another Supplier'});
      expect(response.statusCode).toBe(409);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app).put(`/api/suppliers/${supplierId}`).send(updateData);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/suppliers/:id', () => {
    let supplierId;
    let reagentForOrder;

    beforeEach(async () => {
      const supRes = await request(app).post('/api/suppliers').set('Authorization', `Bearer ${adminToken}`).send(validSupplier);
      supplierId = supRes.body.id;

      const reagentRes = await request(app).post('/api/reagents') // Use admin from reagents test setup, assuming it exists
        .set('Authorization', `${adminToken}`) // This adminToken is for suppliers test. This line is conceptually what we need
        .send({ name: 'Test Reagent for Order', lot_number: 'TRO-001', expiry_date: '2029-01-01', current_stock:10, min_stock_level:1 });
      reagentForOrder = reagentRes.body; // If reagent creation fails, tests might break. For robust test, ensure reagent creation.
                                        // For this specific test, the token for reagent creation should be from its own context.
                                        // However, for simplicity, we use current adminToken. A better setup would be a global test helper.
      // A better approach: db.run(...) to insert reagent directly if tokens are tricky across test suites.
      await new Promise((resolve, reject) => {
        db.run("INSERT INTO reagents (name, lot_number, expiry_date, current_stock, min_stock_level) VALUES (?, ?, ?, ?, ?)",
         ['Order Reagent', 'ORDER-RGT-001', '2030-01-01', 10, 1], function(err) {
           if(err) reject(err);
           reagentForOrder = { id: this.lastID }; // Store the ID
           resolve();
         });
      });
    });

    it('should delete a supplier by admin', async () => {
      const response = await request(app).delete(`/api/suppliers/${supplierId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(204);
      const getRes = await request(app).get(`/api/suppliers/${supplierId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.statusCode).toBe(404);
    });

    it('should be forbidden for basic user', async () => {
      const response = await request(app).delete(`/api/suppliers/${supplierId}`).set('Authorization', `Bearer ${basicUserToken}`);
      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app).delete('/api/suppliers/99999').set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(404);
    });

    it('should fail with 409 if supplier is linked to a reagent_order', async () => {
      // Create a reagent order linked to this supplier
      await new Promise((resolve, reject) => {
         db.run("INSERT INTO reagent_orders (reagent_id, supplier_id, order_date, quantity_ordered, status) VALUES (?, ?, ?, ?, ?)",
         [reagentForOrder.id, supplierId, '2024-01-01', 10, 'Pending'], err => err ? reject(err): resolve());
      });

      const response = await request(app).delete(`/api/suppliers/${supplierId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(409);
      expect(response.body.error).toContain('Cannot delete supplier. It is currently referenced');
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app).delete(`/api/suppliers/${supplierId}`);
      expect(response.statusCode).toBe(401);
    });
  });
});
