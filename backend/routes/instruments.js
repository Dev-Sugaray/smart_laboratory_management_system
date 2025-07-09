const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../auth');
const db = require('../database'); // Import shared db instance

// POST /api/instruments - Create Instrument
router.post('/', authenticateToken, authorize(['manage_instruments']), (req, res) => {
  const { name, make, model, serial_number, calibration_date, maintenance_schedule, status } = req.body;

  if (!name || !serial_number) {
    return res.status(400).json({ message: 'Name and serial number are required.' });
  }

  const sql = `INSERT INTO instruments (name, make, model, serial_number, calibration_date, maintenance_schedule, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
  db.run(sql, [name, make, model, serial_number, calibration_date, maintenance_schedule, status || 'Available'], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed: instruments.serial_number')) {
        return res.status(409).json({ message: 'Serial number already exists.' });
      }
      console.error('Error creating instrument:', err.message);
      return res.status(500).json({ message: 'Error creating instrument.' });
    }
    db.get("SELECT * FROM instruments WHERE id = ?", [this.lastID], (err, row) => {
      if (err) {
        console.error('Error fetching created instrument:', err.message);
        return res.status(500).json({ message: 'Error fetching created instrument.' });
      }
      res.status(201).json(row);
    });
  });
});

// GET /api/instruments - List Instruments
router.get('/', authenticateToken, authorize(['view_instruments']), (req, res) => {
  const sql = "SELECT * FROM instruments ORDER BY name ASC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error listing instruments:', err.message);
      return res.status(500).json({ message: 'Error listing instruments.' });
    }
    res.status(200).json(rows);
  });
});

// GET /api/instruments/:id - Get Instrument by ID
router.get('/:id', authenticateToken, authorize(['view_instruments']), (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM instruments WHERE id = ?";
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Error fetching instrument:', err.message);
      return res.status(500).json({ message: 'Error fetching instrument.' });
    }
    if (!row) {
      return res.status(404).json({ message: 'Instrument not found.' });
    }
    res.status(200).json(row);
  });
});

// PUT /api/instruments/:id - Update Instrument
router.put('/:id', authenticateToken, authorize(['manage_instruments']), (req, res) => {
  const { id } = req.params;
  const { name, make, model, serial_number, calibration_date, maintenance_schedule, status } = req.body;

  db.get("SELECT * FROM instruments WHERE id = ?", [id], (err, instrument) => {
    if (err) {
      console.error('Error finding instrument:', err.message);
      return res.status(500).json({ message: 'Error finding instrument.' });
    }
    if (!instrument) {
      return res.status(404).json({ message: 'Instrument not found.' });
    }

    let sql = "UPDATE instruments SET ";
    const params = [];
    const fieldsToUpdate = [];

    if (name !== undefined) { fieldsToUpdate.push("name = ?"); params.push(name); }
    if (make !== undefined) { fieldsToUpdate.push("make = ?"); params.push(make); }
    if (model !== undefined) { fieldsToUpdate.push("model = ?"); params.push(model); }
    if (serial_number !== undefined) { fieldsToUpdate.push("serial_number = ?"); params.push(serial_number); }
    if (calibration_date !== undefined) { fieldsToUpdate.push("calibration_date = ?"); params.push(calibration_date); }
    if (maintenance_schedule !== undefined) { fieldsToUpdate.push("maintenance_schedule = ?"); params.push(maintenance_schedule); }
    if (status !== undefined) { fieldsToUpdate.push("status = ?"); params.push(status); }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: 'No fields to update provided.' });
    }

    fieldsToUpdate.push("updated_at = CURRENT_TIMESTAMP");

    sql += fieldsToUpdate.join(", ") + " WHERE id = ?";
    params.push(id);

    db.run(sql, params, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed: instruments.serial_number')) {
          return res.status(409).json({ message: 'Serial number already exists for another instrument.' });
        }
        console.error('Error updating instrument:', err.message);
        return res.status(500).json({ message: 'Error updating instrument.' });
      }
      db.get("SELECT * FROM instruments WHERE id = ?", [id], (err, updatedInstrument) => {
        if (err) {
          console.error('Error fetching updated instrument:', err.message);
          return res.status(500).json({ message: 'Error fetching updated instrument.' });
        }
        res.status(200).json(updatedInstrument);
      });
    });
  });
});

// DELETE /api/instruments/:id - Delete Instrument
router.delete('/:id', authenticateToken, authorize(['manage_instruments']), (req, res) => {
  const { id } = req.params;

  // Check for associated usage logs first
  const checkLogsSql = "SELECT COUNT(*) AS count FROM instrument_usage_logs WHERE instrument_id = ?";
  db.get(checkLogsSql, [id], (err, row) => {
    if (err) {
      console.error('Error checking usage logs:', err.message);
      return res.status(500).json({ message: 'Error checking usage logs.' });
    }
    if (row.count > 0) {
      return res.status(409).json({ message: 'Instrument cannot be deleted as it has usage history. Consider retiring it instead.' });
    }

    // No usage logs, proceed with deletion
    const deleteSql = "DELETE FROM instruments WHERE id = ?";
    db.run(deleteSql, [id], function(err) {
      if (err) {
        console.error('Error deleting instrument:', err.message);
        return res.status(500).json({ message: 'Error deleting instrument.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Instrument not found.' });
      }
      res.status(200).json({ message: 'Instrument deleted successfully.' });
    });
  });
});

// --- Instrument Usage Logs ---

// POST /api/instruments/:instrumentId/usage-logs - Log Instrument Usage
router.post('/:instrumentId/usage-logs', authenticateToken, authorize(['log_instrument_usage']), (req, res) => {
  const { instrumentId } = req.params;
  const { start_time, end_time, notes } = req.body;
  // user_id should be taken from the authenticated user token
  const userId = req.user.userId; // Corrected to use userId from JWT payload

  if (!start_time) {
    return res.status(400).json({ message: 'Start time is required.' });
  }
  if (!userId) {
    return res.status(400).json({ message: 'User ID is missing. Ensure user is authenticated.'})
  }


  // Check if instrument exists
  db.get("SELECT id FROM instruments WHERE id = ?", [instrumentId], (err, instrument) => {
    if (err) {
      console.error('Error checking instrument existence:', err.message);
      return res.status(500).json({ message: 'Error checking instrument existence for logging.' });
    }
    if (!instrument) {
      return res.status(404).json({ message: 'Instrument not found for logging.' });
    }

    const sql = `INSERT INTO instrument_usage_logs (instrument_id, user_id, start_time, end_time, notes, created_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
    db.run(sql, [instrumentId, userId, start_time, end_time, notes], function(err) {
      if (err) {
        console.error('Error logging instrument usage:', err.message);
        return res.status(500).json({ message: 'Error logging instrument usage.' });
      }
      db.get("SELECT * FROM instrument_usage_logs WHERE id = ?", [this.lastID], (err, row) => {
        if (err) {
          console.error('Error fetching created usage log:', err.message);
          return res.status(500).json({ message: 'Error fetching created usage log.' });
        }
        res.status(201).json(row);
      });
    });
  });
});

// GET /api/instruments/:instrumentId/usage-logs - List Usage Logs for an Instrument
router.get('/:instrumentId/usage-logs', authenticateToken, authorize(['view_instrument_usage', 'view_instruments']), (req, res) => {
  const { instrumentId } = req.params;

  // Check if instrument exists to give a 404 if the instrument itself doesn't exist
  db.get("SELECT id FROM instruments WHERE id = ?", [instrumentId], (err, instrument) => {
    if (err) {
      console.error('Error checking instrument existence:', err.message);
      return res.status(500).json({ message: 'Error checking instrument existence for listing logs.' });
    }
    if (!instrument) {
      return res.status(404).json({ message: 'Instrument not found for listing logs.' });
    }

    const sql = `
      SELECT iul.id, iul.instrument_id, iul.user_id, u.username as user_username, u.full_name as user_full_name,
             iul.start_time, iul.end_time, iul.notes, iul.created_at
      FROM instrument_usage_logs iul
      JOIN users u ON iul.user_id = u.id
      WHERE iul.instrument_id = ?
      ORDER BY iul.start_time DESC
    `;
    db.all(sql, [instrumentId], (err, rows) => {
      if (err) {
        console.error('Error listing instrument usage logs:', err.message);
        return res.status(500).json({ message: 'Error listing instrument usage logs.' });
      }
      res.status(200).json(rows);
    });
  });
});

module.exports = router;
