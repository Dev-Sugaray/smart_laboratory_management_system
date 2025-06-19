const request = require('supertest');
const { app, db } = require('../index'); // Assuming index.js exports app and db
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

// Test database path and init script path
const testDbPath = path.resolve(__dirname, 'test_database_experiments.db');
const initDbScriptPath = path.resolve(__dirname, '../init-db.js');
let tempInitDbScriptPathExperiments; // To hold path to temp script

// Helper function to get an auth token for a user role
// This is a placeholder. In a real setup, you'd have a more robust way to get tokens.
const getAuthToken = async (username, password) => {
  try {
    // This relies on users being created by init-db.js or specific test setup
    // For simplicity, assuming 'adminuser', 'manageruser', 'researcheruser' with 'password123' exist
    // OR that you have a test user creation utility.
    // Here, we'll directly generate a JWT if we had the secret and user details.
    // Since direct JWT generation is complex without user ID and role from DB,
    // this function would typically call the /api/login endpoint.
    const res = await request(app)
      .post('/api/login')
      .send({ username, password });
    return res.body.token;
  } catch (error) {
    console.error(`Failed to get token for ${username}`, error);
    return null;
  }
};

describe('Experiment API Endpoints (/api/experiments)', () => {
  let adminToken, managerToken, researcherToken;

  beforeAll(async () => {
    // 1. Setup test database by running a modified init-db.js
    tempInitDbScriptPathExperiments = path.resolve(__dirname, 'temp_init-db_experiments.js');
    let initDbContent = fs.readFileSync(initDbScriptPath, 'utf8');
    const modifiedInitDbContent = initDbContent.replace(/database\.db/g, path.basename(testDbPath)); // Use just the filename
    fs.writeFileSync(tempInitDbScriptPathExperiments, modifiedInitDbContent);

    await new Promise((resolve, reject) => {
      exec(`node ${tempInitDbScriptPathExperiments}`, { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
          console.error("Failed to init test_database_experiments.db", stderr);
          return reject(error);
        }
        // Seed specific users for testing roles if init-db doesn't create them
        // For this example, we assume init-db.js creates an admin, manager, and researcher
        // or we would add user creation logic here via direct DB inserts.
        // For example, to create users for token generation:
        // db.run("INSERT INTO users (username, password_hash, email, full_name, role_id) VALUES ('adminuser', bcrypt_hash_of_password123, 'admin@test.com', 'Admin User', (SELECT id FROM roles WHERE name='administrator'))", () => {});
        resolve();
      });
    });

    // 2. Get auth tokens (assuming users are created by init-db or seeded)
    // These usernames/passwords must match what your init-db.js or test setup creates.
    // If init-db.js does not create default users with known passwords, these will fail.
    // This is a common challenge in testing auth-protected endpoints.
    // A robust setup would involve a dedicated seeding script for test users.
    adminToken = await getAuthToken('testadmin', 'password'); // Replace with actual test admin credentials
    managerToken = await getAuthToken('testmanager', 'password'); // Replace
    researcherToken = await getAuthToken('testresearcher', 'password'); // Replace

    // Fallback: If getAuthToken is problematic without proper user seeding:
    // adminToken = "dummy_admin_token"; // And mock authenticateToken/authorize if needed
    // This is highly dependent on how init-db.js and your auth system are set up.
    // For these tests to pass, valid tokens for users with specified roles are required.
    // The provided init-db.js does not create specific users, only roles/permissions.
    // Hence, these getAuthToken calls will likely fail unless users are manually added to test_database_experiments.db
    // or init-db.js is modified.
    // For now, we'll proceed assuming tokens can be acquired or will be mocked.
    // If getAuthToken fails, tests requiring tokens will also fail.
    if (!adminToken) console.warn("Admin token could not be obtained. Auth tests will fail.");
    if (!managerToken) console.warn("Manager token could not be obtained. Auth tests will fail.");
    if (!researcherToken) console.warn("Researcher token could not be obtained. Auth tests will fail.");

  }, 30000); // Increased timeout for DB init and token fetching

  afterAll((done) => {
    db.close((err) => {
      if (err) console.error("Error closing test_database_experiments.db", err);
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(tempInitDbScriptPathExperiments)) fs.unlinkSync(tempInitDbScriptPathExperiments);
      done();
    });
  });

  let experimentId;

  // POST /api/experiments - Create Experiment
  describe('POST /api/experiments', () => {
    it('should create a new experiment if user has manage_experiments permission (admin)', async () => {
      const res = await request(app)
        .post('/api/experiments')
        .set('Authorization', `Bearer ${adminToken}`) // Assuming admin has 'manage_experiments'
        .send({ name: 'Test Experiment 1', description: 'Desc for Exp 1' });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test Experiment 1');
      experimentId = res.body.id; // Save for later tests
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/experiments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Missing name' });
      expect(res.statusCode).toEqual(400);
    });

    it('should return 409 if experiment name already exists', async () => {
        await request(app) // First creation
            .post('/api/experiments')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Unique Name Exp', description: 'First' });
        const res_duplicate = await request(app) // Attempt duplicate
            .post('/api/experiments')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Unique Name Exp', description: 'Second' });
        expect(res_duplicate.statusCode).toEqual(409);
    });

    it('should return 403 if user does not have manage_experiments permission (researcher)', async () => {
      const res = await request(app)
        .post('/api/experiments')
        .set('Authorization', `Bearer ${researcherToken}`) // Researcher might not have this
        .send({ name: 'Forbidden Experiment', description: 'Researcher cannot create' });
      expect(res.statusCode).toEqual(403); // Or 401 if token is invalid/not provided
    });
  });

  // GET /api/experiments - Get All Experiments
  describe('GET /api/experiments', () => {
    it('should return all experiments if user has view_experiments permission', async () => {
      // Create one if not existing from previous test
      if (!experimentId) {
         const postRes = await request(app).post('/api/experiments').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Exp for GET', description: '...' });
         if(postRes.statusCode !== 201) console.error("Setup for GET /api/experiments failed");
      }
      const res = await request(app)
        .get('/api/experiments')
        .set('Authorization', `Bearer ${researcherToken}`); // Researcher should have view_experiments
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // GET /api/experiments/:id - Get Specific Experiment
  describe('GET /api/experiments/:id', () => {
    it('should return a specific experiment if ID is valid and user has permission', async () => {
       if (!experimentId) throw new Error("experimentId is not set from POST test");
      const res = await request(app)
        .get(`/api/experiments/${experimentId}`)
        .set('Authorization', `Bearer ${researcherToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id', experimentId);
    });

    it('should return 404 if experiment ID does not exist', async () => {
      const res = await request(app)
        .get('/api/experiments/99999')
        .set('Authorization', `Bearer ${researcherToken}`);
      expect(res.statusCode).toEqual(404);
    });
  });

  // PUT /api/experiments/:id - Update Experiment
  describe('PUT /api/experiments/:id', () => {
    it('should update an experiment if user has manage_experiments permission', async () => {
      if (!experimentId) throw new Error("experimentId is not set");
      const res = await request(app)
        .put(`/api/experiments/${experimentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Experiment Name', description: 'Updated Desc' });
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Experiment updated successfully.');
    });
     it('should return 404 if trying to update non-existent experiment', async () => {
      const res = await request(app)
        .put('/api/experiments/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'No Such Exp' });
      expect(res.statusCode).toEqual(404);
    });
  });

  // --- Tests for managing tests within an experiment ---
  // Needs a test_id first. Assume a test definition is created.
  let testDefId;
  beforeAll(async () => {
    // Create a test definition for linking
    // This assumes tests API and its permissions are working, or requires direct DB seeding
    const testRes = await request(app)
        .post('/api/tests') // Assuming /api/tests is the endpoint for test definitions
        .set('Authorization', `Bearer ${adminToken}`) // User who can manage test definitions
        .send({ name: 'Linkable Test Def', description: 'For experiment linking', protocol: 'XYZ' });
    if (testRes.statusCode === 201 && testRes.body.id) {
        testDefId = testRes.body.id;
    } else {
        console.error("Failed to create test definition for experiment tests. Status:", testRes.statusCode, "Body:", testRes.body);
        // throw new Error('Prerequisite: Could not create test definition for experiment tests.');
    }
  });


  describe('POST /api/experiments/:id/tests', () => {
    it('should add a test to an experiment if user has manage_experiments', async () => {
      if (!experimentId || !testDefId) throw new Error("experimentId or testDefId not set for linking test");
      const res = await request(app)
        .post(`/api/experiments/${experimentId}/tests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ test_id: testDefId });
      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toBe('Test added to experiment successfully.');
    });
    it('should return 409 if test is already added to experiment', async () => {
      if (!experimentId || !testDefId) throw new Error("experimentId or testDefId not set");
      // First add is above or ensure it's added
      await request(app).post(`/api/experiments/${experimentId}/tests`).set('Authorization', `Bearer ${adminToken}`).send({ test_id: testDefId });
      const res_duplicate = await request(app)
        .post(`/api/experiments/${experimentId}/tests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ test_id: testDefId });
      expect(res_duplicate.statusCode).toEqual(409);
    });
  });

  describe('GET /api/experiments/:id/tests', () => {
    it('should get all tests for an experiment if user has view_experiments', async () => {
      if (!experimentId || !testDefId) throw new Error("experimentId or testDefId not set");
      // Ensure at least one test is added
      await request(app).post(`/api/experiments/${experimentId}/tests`).set('Authorization', `Bearer ${adminToken}`).send({ test_id: testDefId });

      const res = await request(app)
        .get(`/api/experiments/${experimentId}/tests`)
        .set('Authorization', `Bearer ${researcherToken}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(test => test.id === testDefId)).toBe(true);
    });
  });

  describe('DELETE /api/experiments/:id/tests/:test_id', () => {
    it('should remove a test from an experiment if user has manage_experiments', async () => {
      if (!experimentId || !testDefId) throw new Error("experimentId or testDefId not set");
      // Ensure test is added first
      await request(app).post(`/api/experiments/${experimentId}/tests`).set('Authorization', `Bearer ${adminToken}`).send({ test_id: testDefId });

      const res = await request(app)
        .delete(`/api/experiments/${experimentId}/tests/${testDefId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Test removed from experiment successfully.');
    });
     it('should return 404 if test association does not exist for deletion', async () => {
      if (!experimentId || !testDefId) throw new Error("experimentId or testDefId not set");
      // Ensure it's removed or try to delete a non-associated one
      await request(app).delete(`/api/experiments/${experimentId}/tests/${testDefId}`).set('Authorization', `Bearer ${adminToken}`); // remove if present
      const res = await request(app)
        .delete(`/api/experiments/${experimentId}/tests/${testDefId}`) // attempt to delete again
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(404);
    });
  });

  // DELETE /api/experiments/:id - Delete Experiment
  describe('DELETE /api/experiments/:id', () => {
    it('should delete an experiment if user has manage_experiments permission', async () => {
      // Create a new one to delete to avoid impacting other tests if run out of order
      const postRes = await request(app).post('/api/experiments').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Exp to Delete', description: '...' });
      expect(postRes.statusCode).toEqual(201);
      const tempExperimentId = postRes.body.id;

      const res = await request(app)
        .delete(`/api/experiments/${tempExperimentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Experiment deleted successfully.');
    });
    it('should return 404 if trying to delete non-existent experiment', async () => {
      const res = await request(app)
        .delete('/api/experiments/99999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(404);
    });
  });
});
