const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../auth');
const db = require('../database'); // Import shared db instance

// POST /api/tests - Create a new test
router.post('/tests', authenticateToken, authorize(['manage_tests']), (req, res) => {
  const { name, description, protocol } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Test name is required.' });
  }

  const sql = `INSERT INTO tests (name, description, protocol, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
  db.run(sql, [name, description, protocol], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Test name already exists.' });
      }
      console.error('Error creating test:', err.message);
      return res.status(500).json({ error: 'Failed to create test.' });
    }
    res.status(201).json({ id: this.lastID, name, description, protocol });
  });
});

// GET /api/tests/:test_id/samples - Get all samples that have a specific test requested
router.get('/tests/:test_id/samples', authenticateToken, authorize(['view_tests']), async (req, res) => {
  const { test_id } = req.params;

  // 1. Check if test exists
  const testExists = await new Promise((resolve, reject) => {
    db.get("SELECT id FROM tests WHERE id = ?", [test_id], (err, row) => {
      if (err) reject(new Error('Failed to verify test.'));
      else resolve(!!row);
    });
  });
  if (!testExists) {
    return res.status(404).json({ error: 'Test not found.' });
  }

  // 2. Fetch associated samples and their test details
  const sql = `
    SELECT
      s.id as sample_id,
      s.unique_sample_id,
      s.collection_date,
      s.registration_date,
      s.current_status as sample_status,
      st_entry.id as sample_test_id,
      st_entry.status as test_status_for_sample,
      st_entry.results as test_results_for_sample,
      st_entry.requested_at as test_requested_at,
      u_req.username as requested_by_username,
      st_entry.assigned_to_user_id,
      u_assign.username as assigned_to_username,
      st_entry.experiment_id,
      e.name as experiment_name
      -- Add other fields from samples or sample_tests as needed
    FROM samples s
    JOIN sample_tests st_entry ON s.id = st_entry.sample_id
    JOIN users u_req ON st_entry.requested_by_user_id = u_req.id
    LEFT JOIN users u_assign ON st_entry.assigned_to_user_id = u_assign.id
    LEFT JOIN experiments e ON st_entry.experiment_id = e.id
    WHERE st_entry.test_id = ?
    ORDER BY s.registration_date DESC, st_entry.requested_at DESC
  `;

  db.all(sql, [test_id], (err, rows) => {
    if (err) {
      console.error('Error fetching samples for test:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve samples for the test.' });
    }
    res.json(rows);
  });
});

// DELETE /api/tests/:id - Delete a test
router.delete('/tests/:id', authenticateToken, authorize(['manage_tests']), (req, res) => {
  const { id } = req.params;

  // First, check if the test exists
  db.get("SELECT id FROM tests WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error('Error checking test existence for deletion:', err.message);
      return res.status(500).json({ error: 'Failed to delete test.' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Test not found.' });
    }

    // Test exists, proceed with deletion
    const sql = `DELETE FROM tests WHERE id = ?`;
    db.run(sql, [id], function(err) {
      if (err) {
        // Check for foreign key constraint violation if ON DELETE CASCADE is not working or not set for a related table
        // SQLite error code for foreign key constraint is SQLITE_CONSTRAINT_FOREIGNKEY
        if (err.errno === 19 && err.message.includes('FOREIGN KEY constraint failed')) {
             console.error('Error deleting test due to existing references (foreign key constraint):', err.message);
             return res.status(409).json({
                error: 'Failed to delete test because it is still referenced by other records (e.g., sample tests or experiment tests). Ensure ON DELETE CASCADE is effective or remove references manually.'
            });
        }
        console.error('Error deleting test:', err.message);
        return res.status(500).json({ error: 'Failed to delete test.' });
      }
      if (this.changes === 0) {
          // Should have been caught by the check above
          return res.status(404).json({ error: 'Test not found (concurrency issue or unexpected error).' });
      }
      res.status(200).json({ message: 'Test deleted successfully.', id: Number(id) });
      // Cascade delete for experiment_tests and sample_tests is handled by SQLite due to `ON DELETE CASCADE`
    });
  });
});

// PUT /api/tests/:id - Update a test
router.put('/tests/:id', authenticateToken, authorize(['manage_tests']), (req, res) => {
  const { id } = req.params;
  const { name, description, protocol } = req.body;

  if (!name && description === undefined && protocol === undefined) {
    return res.status(400).json({ error: 'No fields to update. Provide name, description, or protocol.' });
  }

  // Check if test exists first
  db.get("SELECT id FROM tests WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error('Error checking test existence:', err.message);
      return res.status(500).json({ error: 'Failed to update test.' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Test not found.' });
    }

    let sql = 'UPDATE tests SET ';
    const params = [];
    if (name) {
      sql += 'name = ?, ';
      params.push(name);
    }
    if (description !== undefined) {
      sql += 'description = ?, ';
      params.push(description);
    }
    if (protocol !== undefined) {
      sql += 'protocol = ?, ';
      params.push(protocol);
    }
    sql += 'updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    params.push(id);

    // Clean up trailing comma if only one field is updated or some fields are not updated
    sql = sql.replace(/, WHERE/g, " WHERE").replace(/, updated_at/g, " updated_at");


    db.run(sql, params, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Test name already exists.' });
        }
        console.error('Error updating test:', err.message);
        return res.status(500).json({ error: 'Failed to update test.' });
      }
      if (this.changes === 0) {
         // This case should ideally be caught by the existence check, but as a fallback
        return res.status(404).json({ error: 'Test not found or no changes made.' });
      }
      res.json({ message: 'Test updated successfully.', id: Number(id), changes: this.changes });
    });
  });
});

// GET /api/tests/:id - Get a specific test by ID
router.get('/tests/:id', authenticateToken, authorize(['view_tests']), (req, res) => {
  const { id } = req.params;
  const sql = `SELECT id, name, description, protocol, created_at, updated_at FROM tests WHERE id = ?`;
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Error fetching test:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve test.' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Test not found.' });
    }
    res.json(row);
  });
});

// GET /api/tests - Get all tests
router.get('/tests', authenticateToken, authorize(['view_tests']), (req, res) => {
  const sql = `SELECT id, name, description, protocol, created_at, updated_at FROM tests ORDER BY name ASC`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching tests:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve tests.' });
    }
    res.json(rows);
  });
});

module.exports = router;
