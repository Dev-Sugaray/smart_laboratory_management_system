const request = require('supertest');
const { app, db } = require('../index'); // Assuming index.js exports app and db
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

// Test database path and init script path
const testDbPath = path.resolve(__dirname, 'test_database_tests_definitions.db');
const initDbScriptPath = path.resolve(__dirname, '../init-db.js');
let tempInitDbScriptPathTestsDefs; // To hold path to temp script

// Placeholder for auth token - replace with actual token generation/retrieval
const getAuthToken = async (username, password) => {
  try {
    const res = await request(app)
      .post('/api/login')
      .send({ username, password });
    return res.body.token;
  } catch (error) {
    console.error(`Failed to get token for ${username}`, error);
    return null;
  }
};


describe('Test Definition API Endpoints (/api/tests)', () => {
  let adminToken, managerToken, researcherToken;

  beforeAll(async () => {
    tempInitDbScriptPathTestsDefs = path.resolve(__dirname, 'temp_init-db_tests_defs.js');
    let initDbContent = fs.readFileSync(initDbScriptPath, 'utf8');
    const modifiedInitDbContent = initDbContent.replace(/database\.db/g, path.basename(testDbPath));
    fs.writeFileSync(tempInitDbScriptPathTestsDefs, modifiedInitDbContent);

    await new Promise((resolve, reject) => {
      exec(`node ${tempInitDbScriptPathTestsDefs}`, { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
          console.error("Failed to init test_database_tests_definitions.db", stderr);
          return reject(error);
        }
        // Assume test users (testadmin, testmanager, testresearcher with 'password') need to be seeded
        // if not handled by init-db.js. This part is crucial and often complex.
        resolve();
      });
    });

    adminToken = await getAuthToken('testadmin', 'password');
    managerToken = await getAuthToken('testmanager', 'password');
    researcherToken = await getAuthToken('testresearcher', 'password');

    if (!adminToken) console.warn("Admin token for Test Definitions API tests could not be obtained.");
    if (!managerToken) console.warn("Manager token for Test Definitions API tests could not be obtained.");
    if (!researcherToken) console.warn("Researcher token for Test Definitions API tests could not be obtained.");

  }, 30000);

  afterAll((done) => {
    db.close((err) => {
      if (err) console.error("Error closing test_database_tests_definitions.db", err);
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(tempInitDbScriptPathTestsDefs)) fs.unlinkSync(tempInitDbScriptPathTestsDefs);
      done();
    });
  });

  let testDefinitionId;

  // POST /api/tests - Create Test Definition
  describe('POST /api/tests', () => {
    it('should create a new test definition if user has manage_tests permission (admin/manager)', async () => {
      const res = await request(app)
        .post('/api/tests')
        .set('Authorization', `Bearer ${managerToken}`) // Lab Manager should be able to create test defs
        .send({ name: 'Blood Panel Test', description: 'Standard blood panel', protocol: 'Collect sample, spin, analyze.' });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Blood Panel Test');
      testDefinitionId = res.body.id;
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/tests')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ description: 'Missing name for test def' });
      expect(res.statusCode).toEqual(400);
    });

    it('should return 409 if test definition name already exists', async () => {
        await request(app)
            .post('/api/tests')
            .set('Authorization', `Bearer ${managerToken}`)
            .send({ name: 'Unique Test Def Name', description: 'First' });
        const res_duplicate = await request(app)
            .post('/api/tests')
            .set('Authorization', `Bearer ${managerToken}`)
            .send({ name: 'Unique Test Def Name', description: 'Second' });
        expect(res_duplicate.statusCode).toEqual(409);
    });

    it('should return 403 if user does not have manage_tests permission (researcher)', async () => {
      const res = await request(app)
        .post('/api/tests')
        .set('Authorization', `Bearer ${researcherToken}`)
        .send({ name: 'Researcher Test Def', description: 'Researcher cannot create test def' });
      expect(res.statusCode).toEqual(403);
    });
  });

  // GET /api/tests - Get All Test Definitions
  describe('GET /api/tests', () => {
    it('should return all test definitions if user has view_tests permission', async () => {
      if (!testDefinitionId) { // Ensure at least one test exists
         await request(app).post('/api/tests').set('Authorization', `Bearer ${managerToken}`).send({ name: 'Test Def for GET All', description: '...' });
      }
      const res = await request(app)
        .get('/api/tests')
        .set('Authorization', `Bearer ${researcherToken}`); // Researcher should have view_tests
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // GET /api/tests/:id - Get Specific Test Definition
  describe('GET /api/tests/:id', () => {
    it('should return a specific test definition if ID is valid and user has permission', async () => {
      if (!testDefinitionId) throw new Error("testDefinitionId is not set from POST test");
      const res = await request(app)
        .get(`/api/tests/${testDefinitionId}`)
        .set('Authorization', `Bearer ${researcherToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id', testDefinitionId);
    });

    it('should return 404 if test definition ID does not exist', async () => {
      const res = await request(app)
        .get('/api/tests/88888')
        .set('Authorization', `Bearer ${researcherToken}`);
      expect(res.statusCode).toEqual(404);
    });
  });

  // PUT /api/tests/:id - Update Test Definition
  describe('PUT /api/tests/:id', () => {
    it('should update a test definition if user has manage_tests permission', async () => {
      if (!testDefinitionId) throw new Error("testDefinitionId is not set");
      const res = await request(app)
        .put(`/api/tests/${testDefinitionId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Updated Test Def Name', protocol: 'New Protocol 123' });
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Test updated successfully.');
    });
     it('should return 404 if trying to update non-existent test definition', async () => {
      const res = await request(app)
        .put('/api/tests/88888')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'No Such Test Def' });
      expect(res.statusCode).toEqual(404);
    });
  });

  // DELETE /api/tests/:id - Delete Test Definition
  describe('DELETE /api/tests/:id', () => {
    it('should delete a test definition if user has manage_tests permission', async () => {
      const postRes = await request(app).post('/api/tests').set('Authorization', `Bearer ${managerToken}`).send({ name: 'Test Def to Delete', description: '...' });
      expect(postRes.statusCode).toEqual(201);
      const tempTestDefId = postRes.body.id;

      const res = await request(app)
        .delete(`/api/tests/${tempTestDefId}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Test deleted successfully.');
    });
    it('should return 404 if trying to delete non-existent test definition', async () => {
      const res = await request(app)
        .delete('/api/tests/88888')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.statusCode).toEqual(404);
    });
  });
});
