const express = require('express');
const router = express.Router();
const { db, authenticateToken, authorize } = require('../auth');

// POST /api/experiments - Create a new experiment
router.post('/experiments', authenticateToken, authorize(['manage_experiments']), (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Experiment name is required.' });
  }

  const sql = `INSERT INTO experiments (name, description, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
  db.run(sql, [name, description], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Experiment name already exists.' });
      }
      console.error('Error creating experiment:', err.message);
      return res.status(500).json({ error: 'Failed to create experiment.' });
    }
    res.status(201).json({ id: this.lastID, name, description });
  });
});

// DELETE /api/experiments/:id - Delete an experiment
router.delete('/experiments/:id', authenticateToken, authorize(['manage_experiments']), (req, res) => {
  const { id } = req.params;

  // First, check if the experiment exists
  db.get("SELECT id FROM experiments WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error('Error checking experiment existence for deletion:', err.message);
      return res.status(500).json({ error: 'Failed to delete experiment.' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Experiment not found.' });
    }

    // Experiment exists, proceed with deletion
    const sql = `DELETE FROM experiments WHERE id = ?`;
    db.run(sql, [id], function(err) {
      if (err) {
        console.error('Error deleting experiment:', err.message);
        return res.status(500).json({ error: 'Failed to delete experiment.' });
      }
      // this.changes will be 0 if the ID didn't exist, but we already checked.
      // If it's 1, deletion was successful.
      if (this.changes === 0) {
          // Should have been caught by the check above, but good for safety
          return res.status(404).json({ error: 'Experiment not found (concurrency issue or unexpected error).' });
      }
      res.status(200).json({ message: 'Experiment deleted successfully.', id: Number(id) });
      // Cascade delete for experiment_tests is handled by SQLite due to `ON DELETE CASCADE`
    });
  });
});

// PUT /api/experiments/:id - Update an experiment
router.put('/experiments/:id', authenticateToken, authorize(['manage_experiments']), (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name && description === undefined) {
    return res.status(400).json({ error: 'No fields to update. Provide name or description.' });
  }

  // Check if experiment exists first
  db.get("SELECT id FROM experiments WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error('Error checking experiment existence:', err.message);
      return res.status(500).json({ error: 'Failed to update experiment.' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Experiment not found.' });
    }

    let sql = 'UPDATE experiments SET ';
    const params = [];
    if (name) {
      sql += 'name = ?, ';
      params.push(name);
    }
    if (description !== undefined) {
      sql += 'description = ?, ';
      params.push(description);
    }
    sql += 'updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    params.push(id);

    // Clean up trailing comma if only one field is updated
    sql = sql.replace(', updated_at', ' updated_at');

    db.run(sql, params, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Experiment name already exists.' });
        }
        console.error('Error updating experiment:', err.message);
        return res.status(500).json({ error: 'Failed to update experiment.' });
      }
      if (this.changes === 0) {
        // This case should ideally be caught by the existence check, but as a fallback
        return res.status(404).json({ error: 'Experiment not found or no changes made.' });
      }
      res.json({ message: 'Experiment updated successfully.', id: Number(id), changes: this.changes });
    });
  });
});

// GET /api/experiments/:id - Get a specific experiment by ID
router.get('/experiments/:id', authenticateToken, authorize(['view_experiments']), (req, res) => {
  const { id } = req.params;
  const sql = `SELECT id, name, description, created_at, updated_at FROM experiments WHERE id = ?`;
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Error fetching experiment:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve experiment.' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Experiment not found.' });
    }
    res.json(row);
  });
});

// GET /api/experiments - Get all experiments
router.get('/experiments', authenticateToken, authorize(['view_experiments']), (req, res) => {
  const sql = `SELECT id, name, description, created_at, updated_at FROM experiments ORDER BY created_at DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching experiments:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve experiments.' });
    }
    res.json(rows);
  });
});

// --- Manage tests within an experiment ---

// POST /api/experiments/:id/tests - Add a test to an experiment
router.post('/experiments/:experiment_id/tests', authenticateToken, authorize(['manage_experiments']), async (req, res) => {
  const { experiment_id } = req.params;
  const { test_id } = req.body;

  if (!test_id) {
    return res.status(400).json({ error: 'Test ID is required.' });
  }

  try {
    // Check if experiment exists
    const experiment = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM experiments WHERE id = ?", [experiment_id], (err, row) => {
        if (err) reject(new Error('Failed to verify experiment.'));
        else resolve(row);
      });
    });
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found.' });
    }

    // Check if test exists
    const test = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM tests WHERE id = ?", [test_id], (err, row) => {
        if (err) reject(new Error('Failed to verify test.'));
        else resolve(row);
      });
    });
    if (!test) {
      return res.status(404).json({ error: 'Test not found.' });
    }

    // Add the test to the experiment
    const sql = `INSERT INTO experiment_tests (experiment_id, test_id) VALUES (?, ?)`;
    db.run(sql, [experiment_id, test_id], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'This test is already associated with this experiment.' });
        }
        console.error('Error adding test to experiment:', err.message);
        return res.status(500).json({ error: 'Failed to add test to experiment.' });
      }
      res.status(201).json({ message: 'Test added to experiment successfully.', experiment_id: Number(experiment_id), test_id: Number(test_id) });
    });
  } catch (error) {
    console.error('Server error adding test to experiment:', error.message);
    return res.status(500).json({ error: error.message || 'Server error.' });
  }
});

// DELETE /api/experiments/:experiment_id/tests/:test_id - Remove a test from an experiment
router.delete('/experiments/:experiment_id/tests/:test_id', authenticateToken, authorize(['manage_experiments']), (req, res) => {
  const { experiment_id, test_id } = req.params;

  const sql = `DELETE FROM experiment_tests WHERE experiment_id = ? AND test_id = ?`;
  db.run(sql, [experiment_id, test_id], function(err) {
    if (err) {
      console.error('Error removing test from experiment:', err.message);
      return res.status(500).json({ error: 'Failed to remove test from experiment.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Test association not found for this experiment, or experiment/test does not exist.' });
    }
    res.status(200).json({ message: 'Test removed from experiment successfully.' });
  });
});

// GET /api/experiments/:id/tests - Get all tests for a specific experiment
router.get('/experiments/:experiment_id/tests', authenticateToken, authorize(['view_experiments']), async (req, res) => {
  const { experiment_id } = req.params;

  try {
    // First, check if the experiment exists
    const experiment = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM experiments WHERE id = ?", [experiment_id], (err, row) => {
        if (err) reject(new Error('Failed to verify experiment existence.'));
        else resolve(row);
      });
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found.' });
    }

    // Experiment exists, retrieve its associated tests
    const sql = `
      SELECT t.id, t.name, t.description, t.protocol, t.created_at, t.updated_at
      FROM tests t
      JOIN experiment_tests et ON t.id = et.test_id
      WHERE et.experiment_id = ?
      ORDER BY t.name ASC
    `;
    db.all(sql, [experiment_id], (err, rows) => {
      if (err) {
        console.error('Error fetching tests for experiment:', err.message);
        return res.status(500).json({ error: 'Failed to retrieve tests for the experiment.' });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error('Server error fetching tests for experiment:', error.message);
    return res.status(500).json({ error: error.message || 'Server error.' });
  }
});

module.exports = router;
