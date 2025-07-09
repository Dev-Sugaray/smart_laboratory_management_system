const express = require('express');
const router = express.Router();
const { db, authenticateToken, authorize } = require('../auth');

// Helper function for ISO8601 date validation (YYYY-MM-DD)
const isValidDate = (dateString) => {
  if (!dateString) return false; // Allow null/undefined if the date itself is optional
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  const dNum = date.getTime();
  if (!dNum && dNum !== 0) return false; // NaN value, invalid date
  return date.toISOString().slice(0, 10) === dateString;
};

// POST /api/reagent_orders - Create a new purchase requisition
router.post('/', authenticateToken, authorize(['manage_inventory']), async (req, res) => {
  let { reagent_id, supplier_id, order_date, expected_delivery_date, quantity_ordered, status } = req.body;

  // Validation
  if (!reagent_id || !order_date || quantity_ordered === undefined) {
    return res.status(400).json({ error: 'Missing required fields: reagent_id, order_date, quantity_ordered.' });
  }
  if (!isValidDate(order_date)) {
    return res.status(400).json({ error: 'Invalid order_date format. Please use YYYY-MM-DD.' });
  }
  if (expected_delivery_date && !isValidDate(expected_delivery_date)) {
    return res.status(400).json({ error: 'Invalid expected_delivery_date format. Please use YYYY-MM-DD.' });
  }
  const parsedQuantity = parseInt(quantity_ordered, 10);
  if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
    return res.status(400).json({ error: 'quantity_ordered must be a positive integer.' });
  }

  status = status || 'Pending'; // Default status

  // Check foreign key existence
  try {
    const reagentExists = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM reagents WHERE id = ?", [reagent_id], (err, row) => err ? reject(err) : resolve(!!row));
    });
    if (!reagentExists) return res.status(400).json({ error: `Reagent with ID ${reagent_id} not found.` });

    if (supplier_id) {
      const supplierExists = await new Promise((resolve, reject) => {
        db.get("SELECT id FROM suppliers WHERE id = ?", [supplier_id], (err, row) => err ? reject(err) : resolve(!!row));
      });
      if (!supplierExists) return res.status(400).json({ error: `Supplier with ID ${supplier_id} not found.` });
    }
  } catch (dbErr) {
    console.error("Error checking FKs for new order:", dbErr.message);
    return res.status(500).json({ error: "Server error during validation." });
  }

  const sql = `INSERT INTO reagent_orders (reagent_id, supplier_id, order_date, expected_delivery_date, quantity_ordered, status)
               VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(sql, [reagent_id, supplier_id || null, order_date, expected_delivery_date || null, parsedQuantity, status], function(err) {
    if (err) {
      console.error('Error creating reagent order:', err.message);
      return res.status(500).json({ error: 'Failed to create reagent order.' });
    }
    db.get("SELECT * FROM reagent_orders WHERE id = ?", [this.lastID], (getErr, row) => {
      if (getErr) {
        console.error('Error fetching created reagent order:', getErr.message);
        return res.status(500).json({ error: 'Failed to retrieve reagent order after creation.' });
      }
      res.status(201).json(row);
    });
  });
});

// GET /api/reagent_orders - List all orders
router.get('/', authenticateToken, authorize(['manage_inventory', 'view_reports']), (req, res) => {
  const sql = `
    SELECT
      ro.*,
      r.name as reagent_name,
      r.lot_number as reagent_lot_number,
      s.name as supplier_name
    FROM reagent_orders ro
    JOIN reagents r ON ro.reagent_id = r.id
    LEFT JOIN suppliers s ON ro.supplier_id = s.id
    ORDER BY ro.order_date DESC, ro.id DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error listing reagent orders:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve reagent orders.' });
    }
    res.json(rows);
  });
});

// GET /api/reagent_orders/:id - Get details of a specific order
router.get('/:id', authenticateToken, authorize(['manage_inventory', 'view_reports']), (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT
      ro.*,
      r.name as reagent_name,
      r.lot_number as reagent_lot_number,
      s.name as supplier_name
    FROM reagent_orders ro
    JOIN reagents r ON ro.reagent_id = r.id
    LEFT JOIN suppliers s ON ro.supplier_id = s.id
    WHERE ro.id = ?
  `;
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Error fetching reagent order by ID:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve reagent order.' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Reagent order not found.' });
    }
    res.json(row);
  });
});

// PUT /api/reagent_orders/:id - Update an order's status or details
router.put('/:id', authenticateToken, authorize(['manage_inventory']), async (req, res) => {
  const { id } = req.params;
  const { supplier_id, order_date, expected_delivery_date, quantity_ordered, status } = req.body;

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'No fields provided for update.' });
  }

  // Fetch current order details first to get reagent_id and old quantity if status changes to Delivered
  let currentOrder;
  try {
    currentOrder = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM reagent_orders WHERE id = ?", [id], (err, row) => err ? reject(err) : resolve(row));
    });
    if (!currentOrder) {
      return res.status(404).json({ error: 'Order not found to update.' });
    }
  } catch (fetchErr) {
    console.error('Error fetching order for update:', fetchErr.message);
    return res.status(500).json({ error: 'Failed to retrieve order before update.'});
  }

  // Validations
  if (order_date && !isValidDate(order_date)) {
    return res.status(400).json({ error: 'Invalid order_date format. Please use YYYY-MM-DD.' });
  }
  if (expected_delivery_date && !isValidDate(expected_delivery_date)) {
    return res.status(400).json({ error: 'Invalid expected_delivery_date format. Please use YYYY-MM-DD.' });
  }
  let parsedQuantity;
  if (quantity_ordered !== undefined) {
    parsedQuantity = parseInt(quantity_ordered, 10);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ error: 'quantity_ordered must be a positive integer.' });
    }
  }

  if (supplier_id !== undefined) {
    if (supplier_id === null) { // Explicitly setting to null is allowed
        // No FK check needed for null
    } else {
        try {
            const supplierExists = await new Promise((resolve, reject) => {
              db.get("SELECT id FROM suppliers WHERE id = ?", [supplier_id], (err, row) => err ? reject(err) : resolve(!!row));
            });
            if (!supplierExists) return res.status(400).json({ error: `Supplier with ID ${supplier_id} not found.` });
        } catch (dbErr) {
            console.error("Error checking supplier FK for order update:", dbErr.message);
            return res.status(500).json({ error: "Server error during supplier validation." });
        }
    }
  }


  // Transaction for status 'Delivered'
  if (status === 'Delivered' && currentOrder.status !== 'Delivered') {
    const quantityForStockUpdate = parsedQuantity !== undefined ? parsedQuantity : currentOrder.quantity_ordered;
    const reagentIdForStockUpdate = currentOrder.reagent_id;

    db.serialize(() => {
      db.run("BEGIN TRANSACTION;", async (beginErr) => {
        if (beginErr) {
          console.error("Failed to begin transaction for delivery:", beginErr.message);
          return res.status(500).json({ error: "Database transaction could not be started." });
        }

        // 1. Update reagent stock
        const stockUpdateSql = `UPDATE reagents SET current_stock = current_stock + ? WHERE id = ?`;
        db.run(stockUpdateSql, [quantityForStockUpdate, reagentIdForStockUpdate], function(stockErr) {
          if (stockErr) {
            db.run("ROLLBACK;");
            console.error('Error updating reagent stock on delivery:', stockErr.message);
            return res.status(500).json({ error: 'Failed to update reagent stock.' });
          }

          // 2. Update order details
          const updateFields = [];
          const updateParams = [];
          if (supplier_id !== undefined) { updateFields.push("supplier_id = ?"); updateParams.push(supplier_id === null ? null : supplier_id); }
          if (order_date) { updateFields.push("order_date = ?"); updateParams.push(order_date); }
          if (expected_delivery_date) { updateFields.push("expected_delivery_date = ?"); updateParams.push(expected_delivery_date); }
          if (parsedQuantity !== undefined) { updateFields.push("quantity_ordered = ?"); updateParams.push(parsedQuantity); }
          if (status) { updateFields.push("status = ?"); updateParams.push(status); }

          if (updateFields.length === 0 && status !== 'Delivered') { // if only status changed to delivered, still proceed
             db.run("ROLLBACK;"); // Nothing to update beyond what's handled by delivery logic
             return res.status(400).json({ error: 'No fields to update or only status changed without other modifications.' });
          }

          updateFields.push("updated_at = CURRENT_TIMESTAMP");
          updateParams.push(id);

          const orderUpdateSql = `UPDATE reagent_orders SET ${updateFields.join(', ')} WHERE id = ?`;
          db.run(orderUpdateSql, updateParams, function(orderErr) {
            if (orderErr) {
              db.run("ROLLBACK;");
              console.error('Error updating order status to Delivered:', orderErr.message);
              return res.status(500).json({ error: 'Failed to update order status.' });
            }
            if (this.changes === 0) {
                db.run("ROLLBACK;");
                return res.status(404).json({ error: 'Order not found during update process.' });
            }

            db.run("COMMIT;", (commitErr) => {
              if (commitErr) {
                db.run("ROLLBACK;"); // Should not happen if commit fails, but good practice
                console.error("Failed to commit transaction for delivery:", commitErr.message);
                return res.status(500).json({ error: "Failed to commit delivery transaction." });
              }
              db.get("SELECT ro.*, r.name as reagent_name, r.lot_number as reagent_lot_number, s.name as supplier_name FROM reagent_orders ro JOIN reagents r ON ro.reagent_id = r.id LEFT JOIN suppliers s ON ro.supplier_id = s.id WHERE ro.id = ?", [id], (getErr, row) => {
                if (getErr) res.status(500).json({ error: 'Failed to retrieve order after update.' });
                else res.json(row);
              });
            });
          });
        });
      });
    });
  } else { // Normal update without 'Delivered' status change involving stock
    const fields = [];
    const params = [];
    if (supplier_id !== undefined) { fields.push("supplier_id = ?"); params.push(supplier_id === null ? null : supplier_id); }
    if (order_date) { fields.push("order_date = ?"); params.push(order_date); }
    if (expected_delivery_date !== undefined) { fields.push("expected_delivery_date = ?"); params.push(expected_delivery_date === null ? null : expected_delivery_date); }
    if (parsedQuantity !== undefined) { fields.push("quantity_ordered = ?"); params.push(parsedQuantity); }
    if (status) { fields.push("status = ?"); params.push(status); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.'});
    }
    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    const sql = `UPDATE reagent_orders SET ${fields.join(', ')} WHERE id = ?`;
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Error updating reagent order:', err.message);
        return res.status(500).json({ error: 'Failed to update reagent order.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Reagent order not found or no changes made.' });
      }
      db.get("SELECT ro.*, r.name as reagent_name, r.lot_number as reagent_lot_number, s.name as supplier_name FROM reagent_orders ro JOIN reagents r ON ro.reagent_id = r.id LEFT JOIN suppliers s ON ro.supplier_id = s.id WHERE ro.id = ?", [id], (getErr, row) => {
        if (getErr) res.status(500).json({ error: 'Failed to retrieve order after update.' });
        else res.json(row);
      });
    });
  }
});

module.exports = router;
