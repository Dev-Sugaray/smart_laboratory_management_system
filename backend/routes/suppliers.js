const express = require('express');
const router = express.Router();
const { db, authenticateToken, authorize } = require('../index');

// POST /api/suppliers - Add a new supplier
router.post('/', authenticateToken, authorize(['manage_inventory']), (req, res) => {
  const { name, contact_info, address } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing required field: name.' });
  }

  const sql = `INSERT INTO suppliers (name, contact_info, address)
               VALUES (?, ?, ?)`;
  db.run(sql, [name, contact_info, address], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed: suppliers.name')) {
        return res.status(409).json({ error: 'Supplier name already exists.' });
      }
      console.error('Error adding supplier:', err.message);
      return res.status(500).json({ error: 'Failed to add supplier.' });
    }
    db.get("SELECT * FROM suppliers WHERE id = ?", [this.lastID], (getErr, row) => {
      if (getErr) {
        console.error('Error fetching created supplier:', getErr.message);
        return res.status(500).json({ error: 'Failed to retrieve supplier after creation.' });
      }
      res.status(201).json(row);
    });
  });
});

// GET /api/suppliers - List all suppliers
router.get('/', authenticateToken, (req, res) => {
  const sql = "SELECT * FROM suppliers ORDER BY name ASC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error listing suppliers:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve suppliers.' });
    }
    res.json(rows);
  });
});

// GET /api/suppliers/:id - Get details of a specific supplier
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM suppliers WHERE id = ?";
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Error fetching supplier by ID:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve supplier.' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }
    res.json(row);
  });
});

// PUT /api/suppliers/:id - Update a supplier's details
router.put('/:id', authenticateToken, authorize(['manage_inventory']), (req, res) => {
  const { id } = req.params;
  const { name, contact_info, address } = req.body;

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'No fields provided for update.' });
  }

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ error: 'Name cannot be empty.' });
  }

  // Dynamically build query
  let fields = [];
  let params = [];

  if (name !== undefined) { fields.push("name = ?"); params.push(name); }
  if (contact_info !== undefined) { fields.push("contact_info = ?"); params.push(contact_info); }
  if (address !== undefined) { fields.push("address = ?"); params.push(address); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for update.'});
  }

  params.push(id);

  const sql = `UPDATE suppliers SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  db.run(sql, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed: suppliers.name')) {
        return res.status(409).json({ error: 'Supplier name already exists.' });
      }
      console.error('Error updating supplier:', err.message);
      return res.status(500).json({ error: 'Failed to update supplier.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Supplier not found or no changes made.' });
    }
    db.get("SELECT * FROM suppliers WHERE id = ?", [id], (getErr, row) => {
      if (getErr) {
        console.error('Error fetching updated supplier:', getErr.message);
        return res.status(500).json({ error: 'Failed to retrieve supplier after update.' });
      }
      res.json(row);
    });
  });
});

// DELETE /api/suppliers/:id - Delete a supplier
router.delete('/:id', authenticateToken, authorize(['manage_inventory']), (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM suppliers WHERE id = ?";
  db.run(sql, [id], function(err) {
    if (err) {
      if (err.message.includes('FOREIGN KEY constraint failed')) {
        return res.status(409).json({
          error: 'Cannot delete supplier. It is currently referenced by other records (e.g., reagent orders or reagent-supplier links).'
        });
      }
      console.error('Error deleting supplier:', err.message);
      return res.status(500).json({ error: 'Failed to delete supplier.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }
    res.status(204).send();
  });
});

module.exports = router;
