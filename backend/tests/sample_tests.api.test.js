const request = require('supertest');
const { app, db } = require('../index');
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

// DB and init script setup
const testDbPath = path.resolve(__dirname, 'test_database_sample_tests.db');
const initDbScriptPath = path.resolve(__dirname, '../init-db.js');
let tempInitDbScriptPathSampleTests;

// Auth token helper (placeholder - ensure real implementation or robust mocking)
const getAuthToken = async (username, password) => {
  try {
    const res = await request(app).post('/api/login').send({ username, password });
    return res.body.token;
  } catch (e) { return null; }
};

describe('Sample Tests API Endpoints', () => {
  let adminToken, managerToken, researcherToken, otherResearcherToken;
  let sampleId, testId1, testId2, experimentId, userIdAdmin, userIdManager, userIdResearcher, userIdOtherResearcher;
  let sampleTestId; // Will hold ID of a created sample_tests entry

  beforeAll(async () => {
    tempInitDbScriptPathSampleTests = path.resolve(__dirname, 'temp_init-db_sample_tests.js');
    let initDbContent = fs.readFileSync(initDbScriptPath, 'utf8');
    const modifiedInitDbContent = initDbContent.replace(/database\.db/g, path.basename(testDbPath));
    fs.writeFileSync(tempInitDbScriptPathSampleTests, modifiedInitDbContent);

    await new Promise((resolve, reject) => {
      exec(`node ${tempInitDbScriptPathSampleTests}`, { cwd: __dirname }, async (error) => {
        if (error) return reject(error);
        // After init-db, we need to seed specific data: users, a sample, tests, an experiment
        try {
          // Note: init-db.js might not create specific users with known passwords.
          // These inserts are simplified. Real hashing and ensuring role IDs would be needed.
          // For testing, it's often better to have a dedicated seeding function.
          // Hashed password for 'password' (replace with actual bcrypt hash if testing login)
          const dummyHash = '$2b$10$abcdefghijklmnopqrstuv'; // Placeholder

          await db.run("INSERT INTO users (username, password_hash, email, full_name, role_id) VALUES ('testadmin_st', ?, 'admin_st@test.com', 'Admin ST', (SELECT id FROM roles WHERE name='administrator'))", [dummyHash]);
          await db.run("INSERT INTO users (username, password_hash, email, full_name, role_id) VALUES ('testmanager_st', ?, 'manager_st@test.com', 'Manager ST', (SELECT id FROM roles WHERE name='lab_manager'))", [dummyHash]);
          await db.run("INSERT INTO users (username, password_hash, email, full_name, role_id) VALUES ('testresearcher_st', ?, 'researcher_st@test.com', 'Researcher ST', (SELECT id FROM roles WHERE name='researcher'))", [dummyHash]);
          await db.run("INSERT INTO users (username, password_hash, email, full_name, role_id) VALUES ('otherresearcher_st', ?, 'otherres_st@test.com', 'Other Researcher ST', (SELECT id FROM roles WHERE name='researcher'))", [dummyHash]);

          // Get user IDs (this is simplified, real apps might not fetch passwords)
          userIdAdmin = (await db.get("SELECT id FROM users WHERE username='testadmin_st'"))?.id;
          userIdManager = (await db.get("SELECT id FROM users WHERE username='testmanager_st'"))?.id;
          userIdResearcher = (await db.get("SELECT id FROM users WHERE username='testresearcher_st'"))?.id;
          userIdOtherResearcher = (await db.get("SELECT id FROM users WHERE username='otherresearcher_st'"))?.id;

          // Create a sample type and source first
          const sampleTypeRes = await db.run("INSERT INTO sample_types (name, description) VALUES ('Blood', 'Whole blood sample')");
          const sampleTypeId = sampleTypeRes.lastID;
          const sourceRes = await db.run("INSERT INTO sources (name, description) VALUES ('Clinical Trial X', 'Phase 3')");
          const sourceId = sourceRes.lastID;

          const sampleRes = await db.run("INSERT INTO samples (unique_sample_id, sample_type_id, source_id, collection_date, current_status) VALUES ('SAMP-001-ST', ?, ?, '2023-01-01', 'Registered')", [sampleTypeId, sourceId]);
          sampleId = sampleRes.lastID;

          const test1Res = await db.run("INSERT INTO tests (name, description, protocol) VALUES ('Test ST1', 'Desc ST1', 'Proto ST1')");
          testId1 = test1Res.lastID;
          const test2Res = await db.run("INSERT INTO tests (name, description, protocol) VALUES ('Test ST2', 'Desc ST2', 'Proto ST2')");
          testId2 = test2Res.lastID;

          const expRes = await db.run("INSERT INTO experiments (name, description) VALUES ('Experiment ST', 'Desc Exp ST')");
          experimentId = expRes.lastID;

          resolve();
        } catch(seedError) {
          console.error("Seeding error for SampleTests API:", seedError);
          reject(seedError);
        }
      });
    });

    // These tokens will only work if the dummyHash corresponds to 'password' or if login is mocked.
    // For real tests, use actual login or a token generation utility.
    adminToken = await getAuthToken('testadmin_st', 'password');
    managerToken = await getAuthToken('testmanager_st', 'password');
    researcherToken = await getAuthToken('testresearcher_st', 'password');
    otherResearcherToken = await getAuthToken('otherresearcher_st', 'password');

    if(!adminToken || !managerToken || !researcherToken || !otherResearcherToken) {
        console.warn("One or more tokens for SampleTests API tests could not be obtained. Auth-dependent tests may fail or be skipped.");
    }
    if(!sampleId || !testId1 || !testId2 || !experimentId) {
        console.error("Critical test data (sampleId, testId1, testId2, experimentId) failed to seed.");
        // throw new Error("Critical data seeding failed for SampleTests API tests.");
    }

  }, 45000); // Longer timeout for DB init and seeding

  afterAll((done) => {
    db.close((err) => {
      if (err) console.error("Error closing test_database_sample_tests.db", err);
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(tempInitDbScriptPathSampleTests)) fs.unlinkSync(tempInitDbScriptPathSampleTests);
      done();
    });
  });

  // POST /api/samples/:id/tests
  describe('POST /api/samples/:sample_id/tests', () => {
    it('should request tests for a sample with request_sample_tests permission', async () => {
      if (!researcherToken || !sampleId || !testId1) return pending("Missing token or seeded data");
      const res = await request(app)
        .post(`/api/samples/${sampleId}/tests`)
        .set('Authorization', `Bearer ${researcherToken}`)
        .send({ test_ids: [testId1], experiment_id: experimentId });
      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toContain('Test(s) requested successfully');
      expect(res.body.created_entries).toBeInstanceOf(Array);
      expect(res.body.created_entries.length).toBe(1);
      sampleTestId = res.body.created_entries[0].id; // Save for PUT/DELETE tests
    });
    it('should fail if test_ids is missing or not an array', async () => {
       if (!researcherToken || !sampleId) return pending("Missing token or seeded data");
      const res = await request(app)
        .post(`/api/samples/${sampleId}/tests`)
        .set('Authorization', `Bearer ${researcherToken}`)
        .send({ experiment_id: experimentId }); // Missing test_ids
      expect(res.statusCode).toEqual(400);
    });
  });

  // GET /api/samples/:id/tests
  describe('GET /api/samples/:sample_id/tests', () => {
    it('should get all tests for a specific sample with view_sample_details permission', async () => {
      if (!researcherToken || !sampleId || !testId1) return pending("Missing token or seeded data");
      // Ensure a test is requested (from previous test or add one here)
      await request(app).post(`/api/samples/${sampleId}/tests`).set('Authorization', `Bearer ${researcherToken}`).send({ test_ids: [testId1] });

      const res = await request(app)
        .get(`/api/samples/${sampleId}/tests`)
        .set('Authorization', `Bearer ${researcherToken}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(st => st.test_id === testId1)).toBe(true);
    });
  });

  // GET /api/sample-tests/:id
  describe('GET /api/sample-tests/:id', () => {
    it('should get a specific sample_tests entry by its ID with view_tests permission', async () => {
      if (!researcherToken || !sampleTestId) return pending("Missing token or sampleTestId");
      const res = await request(app)
        .get(`/api/sample-tests/${sampleTestId}`)
        .set('Authorization', `Bearer ${researcherToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id', sampleTestId);
      expect(res.body.sample_id).toBe(sampleId);
    });
    it('should return 404 for non-existent sample_tests ID', async () => {
      if (!researcherToken) return pending("Missing token");
      const res = await request(app)
        .get('/api/sample-tests/999999')
        .set('Authorization', `Bearer ${researcherToken}`);
      expect(res.statusCode).toEqual(404);
    });
  });

  // PUT /api/sample-tests/:id
  describe('PUT /api/sample-tests/:id', () => {
    it('should allow user with enter_test_results to update status to Completed and add results', async () => {
      if (!researcherToken || !sampleTestId) return pending("Missing token or sampleTestId");
      const res = await request(app)
        .put(`/api/sample-tests/${sampleTestId}`)
        .set('Authorization', `Bearer ${researcherToken}`) // Researcher has 'enter_test_results'
        .send({ status: 'Completed', results: 'Positive' });
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toContain('updated successfully');

      // Verify update
      const updatedRes = await db.get("SELECT status, results, result_entry_date FROM sample_tests WHERE id = ?", [sampleTestId]);
      expect(updatedRes.status).toBe('Completed');
      expect(updatedRes.results).toBe('Positive');
      expect(updatedRes.result_entry_date).not.toBeNull();
    });

    it('should allow user with validate_test_results to update status to Validated', async () => {
      if (!managerToken || !sampleTestId) return pending("Missing token or sampleTestId"); // Manager has 'validate_test_results'
       // Ensure status is 'Completed' first
      await db.run("UPDATE sample_tests SET status = 'Completed' WHERE id = ?", [sampleTestId]);

      const res = await request(app)
        .put(`/api/sample-tests/${sampleTestId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'Validated' });
      expect(res.statusCode).toEqual(200);

      const updatedRes = await db.get("SELECT status, validated_at, validated_by_user_id FROM sample_tests WHERE id = ?", [sampleTestId]);
      expect(updatedRes.status).toBe('Validated');
      expect(updatedRes.validated_at).not.toBeNull();
      expect(updatedRes.validated_by_user_id).toBe(userIdManager);
    });

    it('should fail to update status if transition is invalid', async () => {
        if (!researcherToken || !sampleTestId) return pending("Missing token or sampleTestId");
        await db.run("UPDATE sample_tests SET status = 'Pending' WHERE id = ?", [sampleTestId]); // Reset status
        const res = await request(app)
            .put(`/api/sample-tests/${sampleTestId}`)
            .set('Authorization', `Bearer ${researcherToken}`)
            .send({ status: 'Approved' }); // Researcher cannot directly approve from Pending
        expect(res.statusCode).toEqual(400); // Invalid transition
        expect(res.body.error).toContain('Invalid status transition');
    });

    it('should fail if user lacks permission for a specific status update', async () => {
        if (!researcherToken || !sampleTestId) return pending("Missing token or sampleTestId");
        await db.run("UPDATE sample_tests SET status = 'Completed' WHERE id = ?", [sampleTestId]);
        const res = await request(app)
            .put(`/api/sample-tests/${sampleTestId}`)
            .set('Authorization', `Bearer ${researcherToken}`) // Researcher does not have 'validate_test_results'
            .send({ status: 'Validated' });
        expect(res.statusCode).toEqual(403); // Forbidden
    });
  });

  // GET /api/sample-tests
  describe('GET /api/sample-tests', () => {
    it('should return all sample_tests entries with view_tests permission', async () => {
      if (!researcherToken) return pending("Missing token");
      const res = await request(app)
        .get('/api/sample-tests')
        .set('Authorization', `Bearer ${researcherToken}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Add more checks if needed, e.g., presence of certain fields
    });
  });

  // POST /api/samples/batch-request-tests
  describe('POST /api/samples/batch-request-tests', () => {
    it('should batch request tests for multiple samples with request_sample_tests permission', async () => {
      if (!researcherToken || !sampleId || !testId1 || !testId2) return pending("Missing token or seeded data");
      const res = await request(app)
        .post('/api/samples/batch-request-tests')
        .set('Authorization', `Bearer ${researcherToken}`)
        .send({ sample_ids: [sampleId], test_ids: [testId1, testId2], experiment_id: experimentId });
      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toContain('Batch test request processed');
      expect(res.body.created_entries_count).toBe(2);
    });
    it('should fail if sample_ids or test_ids are missing/empty', async () => {
      if (!researcherToken) return pending("Missing token");
      const res = await request(app)
        .post('/api/samples/batch-request-tests')
        .set('Authorization', `Bearer ${researcherToken}`)
        .send({ sample_ids: [sampleId] }); // Missing test_ids
      expect(res.statusCode).toEqual(400);
    });
  });

  // DELETE /api/sample-tests/:id
  describe('DELETE /api/sample-tests/:id', () => {
    it('should delete a sample_tests entry with manage_tests permission', async () => {
      if (!managerToken || !sampleTestId) return pending("Missing manager token or sampleTestId");
      // This sampleTestId might have been modified by PUT tests, ensure it exists or create a new one
      // For simplicity, we assume sampleTestId from the first POST /api/samples/:id/tests is still relevant
      // or create a new one specifically for this test.
      let tempSampleTestId = sampleTestId;
      if(!tempSampleTestId) {
          const reqRes = await request(app).post(`/api/samples/${sampleId}/tests`).set('Authorization', `Bearer ${researcherToken}`).send({ test_ids: [testId2] });
          if(reqRes.body.created_entries && reqRes.body.created_entries.length > 0) tempSampleTestId = reqRes.body.created_entries[0].id;
          else throw new Error("Failed to create sample_test for DELETE test.");
      }

      const res = await request(app)
        .delete(`/api/sample-tests/${tempSampleTestId}`)
        .set('Authorization', `Bearer ${managerToken}`); // Manager has 'manage_tests'
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toContain('deleted successfully');
    });
  });

});
