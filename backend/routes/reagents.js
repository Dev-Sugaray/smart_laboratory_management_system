const express = require('express');
const router = express.Router();
const { db, authenticateToken, authorize } = require('../auth'); // Updated import for authenticateToken and authorize

// Helper function for ISO8601 date validation (YYYY-MM-DD)
const isValidDate = (dateString) => {
  if (!dateString) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  const dNum = date.getTime();
  if (!dNum && dNum !== 0) return false; // NaN value, invalid date
  return date.toISOString().slice(0, 10) === dateString;
};

// POST /api/reagents - Register a new reagent
router.post('/', authenticateToken, authorize(['manage_inventory']), (req, res) => {
  const { name, lot_number, expiry_date, manufacturer, sds_link, current_stock, min_stock_level } = req.body;

  if (!name || !lot_number || !expiry_date) {
    return res.status(400).json({ error: 'Missing required fields: name, lot_number, expiry_date.' });
  }

  if (!isValidDate(expiry_date)) {
    return res.status(400).json({ error: 'Invalid expiry_date format. Please use YYYY-MM-DD.' });
  }

  const parsedCurrentStock = current_stock !== undefined ? parseInt(current_stock, 10) : 0;
  const parsedMinStockLevel = min_stock_level !== undefined ? parseInt(min_stock_level, 10) : 0;

  if (isNaN(parsedCurrentStock) || parsedCurrentStock < 0) {
    return res.status(400).json({ error: 'Invalid current_stock. Must be a non-negative integer.' });
  }
  if (isNaN(parsedMinStockLevel) || parsedMinStockLevel < 0) {
    return res.status(400).json({ error: 'Invalid min_stock_level. Must be a non-negative integer.' });
  }

  const sql = `INSERT INTO reagents (name, lot_number, expiry_date, manufacturer, sds_link, current_stock, min_stock_level)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.run(sql, [name, lot_number, expiry_date, manufacturer, sds_link, parsedCurrentStock, parsedMinStockLevel], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed: reagents.lot_number')) {
        return res.status(409).json({ error: 'Lot number already exists.' });
      }
      console.error('Error registering reagent:', err.message);
      return res.status(500).json({ error: 'Failed to register reagent.' });
    }
    db.get("SELECT * FROM reagents WHERE id = ?", [this.lastID], (getErr, row) => {
      if (getErr) {
        console.error('Error fetching created reagent:', getErr.message);
        return res.status(500).json({ error: 'Failed to retrieve reagent after creation.' });
      }
      res.status(201).json(row);
    });
  });
});

// GET /api/reagents - List all reagents
router.get('/', authenticateToken, (req, res) => { // No specific permission, accessible to authenticated users
  const sql = "SELECT * FROM reagents ORDER BY name ASC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error listing reagents:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve reagents.' });
    }
    res.json(rows);
  });
});

// GET /api/reagents/:id - Get details of a specific reagent
router.get('/:id', authenticateToken, (req, res) => { // No specific permission
  const { id } = req.params;
  const sql = "SELECT * FROM reagents WHERE id = ?";
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Error fetching reagent by ID:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve reagent.' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Reagent not found.' });
    }
    res.json(row);
  });
});

// PUT /api/reagents/:id - Update a reagent's details
router.put('/:id', authenticateToken, authorize(['manage_inventory']), (req, res) => {
  const { id } = req.params;
  const { name, lot_number, expiry_date, manufacturer, sds_link, current_stock, min_stock_level } = req.body;

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'No fields provided for update.' });
  }

  if (expiry_date && !isValidDate(expiry_date)) {
    return res.status(400).json({ error: 'Invalid expiry_date format. Please use YYYY-MM-DD.' });
  }

  let parsedCurrentStock, parsedMinStockLevel;
  if (current_stock !== undefined) {
    parsedCurrentStock = parseInt(current_stock, 10);
    if (isNaN(parsedCurrentStock) || parsedCurrentStock < 0) {
      return res.status(400).json({ error: 'Invalid current_stock. Must be a non-negative integer.' });
    }
  }
  if (min_stock_level !== undefined) {
    parsedMinStockLevel = parseInt(min_stock_level, 10);
    if (isNaN(parsedMinStockLevel) || parsedMinStockLevel < 0) {
      return res.status(400).json({ error: 'Invalid min_stock_level. Must be a non-negative integer.' });
    }
  }


  // Dynamically build query
  let fields = [];
  let params = [];

  if (name !== undefined) { fields.push("name = ?"); params.push(name); }
  if (lot_number !== undefined) { fields.push("lot_number = ?"); params.push(lot_number); }
  if (expiry_date !== undefined) { fields.push("expiry_date = ?"); params.push(expiry_date); }
  if (manufacturer !== undefined) { fields.push("manufacturer = ?"); params.push(manufacturer); }
  if (sds_link !== undefined) { fields.push("sds_link = ?"); params.push(sds_link); }
  if (parsedCurrentStock !== undefined) { fields.push("current_stock = ?"); params.push(parsedCurrentStock); }
  if (parsedMinStockLevel !== undefined) { fields.push("min_stock_level = ?"); params.push(parsedMinStockLevel); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for update.'});
  }

  params.push(id);

  const sql = `UPDATE reagents SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  db.run(sql, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed: reagents.lot_number')) {
        return res.status(409).json({ error: 'Lot number already exists.' });
      }
      console.error('Error updating reagent:', err.message);
      return res.status(500).json({ error: 'Failed to update reagent.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Reagent not found or no changes made.' });
    }
    db.get("SELECT * FROM reagents WHERE id = ?", [id], (getErr, row) => {
      if (getErr) {
        console.error('Error fetching updated reagent:', getErr.message);
        return res.status(500).json({ error: 'Failed to retrieve reagent after update.' });
      }
      res.json(row);
    });
  });
});

// DELETE /api/reagents/:id - Delete a reagent
router.delete('/:id', authenticateToken, authorize(['manage_inventory']), (req, res) => {
  const { id } = req.params;
  // Future: Check if reagent is part of an order. For now, direct delete.
  const sql = "DELETE FROM reagents WHERE id = ?";
  db.run(sql, [id], function(err) {
    if (err) {
      // Check for foreign key constraint error if reagents can be linked elsewhere
      // e.g. if (err.message.includes('FOREIGN KEY constraint failed')) { ... }
      console.error('Error deleting reagent:', err.message);
      return res.status(500).json({ error: 'Failed to delete reagent.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Reagent not found.' });
    }
    res.status(204).send();
  });
});

// POST /api/reagents/:id/update_stock - Update stock level
router.post('/:id/update_stock', authenticateToken, authorize(['manage_inventory']), (req, res) => {
  const { id } = req.params;
  const { change } = req.body;

  if (change === undefined || typeof change !== 'number' || !Number.isInteger(change)) {
    return res.status(400).json({ error: 'Invalid stock change amount. Must be an integer.' });
  }

  db.get("SELECT current_stock FROM reagents WHERE id = ?", [id], (err, reagent) => {
    if (err) {
      console.error('Error fetching reagent for stock update:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve reagent.' });
    }
    if (!reagent) {
      return res.status(404).json({ error: 'Reagent not found.' });
    }

    const newStock = reagent.current_stock + change;
    if (newStock < 0) {
      return res.status(400).json({ error: 'Stock level cannot go below zero.' });
    }

    const sql = "UPDATE reagents SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
    db.run(sql, [newStock, id], function(updateErr) {
      if (updateErr) {
        console.error('Error updating reagent stock:', updateErr.message);
        return res.status(500).json({ error: 'Failed to update stock.' });
      }
      db.get("SELECT * FROM reagents WHERE id = ?", [id], (getErr, updatedReagent) => {
        if (getErr) {
          console.error('Error fetching updated reagent after stock change:', getErr.message);
          return res.status(500).json({ error: 'Failed to retrieve reagent after stock update.' });
        }
        res.json(updatedReagent);
      });
    });
  });
});

// GET /api/reagents/alerts/low_stock - Get reagents below minimum stock levels
router.get('/alerts/low_stock', authenticateToken, authorize(['manage_inventory', 'view_reports']), (req, res) => {
  // Assuming 'manage_inventory' or 'view_reports' implies permission to see stock alerts
  const sql = "SELECT * FROM reagents WHERE current_stock < min_stock_level ORDER BY name ASC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching low stock reagents:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve low stock reagents.' });
    }
    res.json(rows);
  });
});

module.exports = router;
