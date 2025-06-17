const express = require('express');
const router = express.Router();
const { db, authenticateToken, authorize } = require('../index');

// Placeholder success response for non-implemented routes
const placeholderHandler = (req, res) => {
  res.status(200).json({ message: "Endpoint (not yet implemented) reached successfully", data: {} });
};

// ==== Sample Types Endpoints ====
// Base: /api/sample-types

// Create Sample Type
router.post(
  '/sample-types',
  authenticateToken,
  authorize(['manage_sample_types']),
  (req, res) => {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required for sample type.' });
    }

    const sql = `INSERT INTO sample_types (name, description) VALUES (?, ?)`;
    db.run(sql, [name, description || null], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed: sample_types.name')) {
          return res.status(409).json({ error: 'Sample type name already exists.' });
        }
        console.error('Error creating sample type:', err.message);
        return res.status(500).json({ error: 'Error creating sample type.' });
      }
      // Fetch and return the created sample type
      db.get("SELECT * FROM sample_types WHERE id = ?", [this.lastID], (getErr, row) => {
        if (getErr) {
          console.error('Error fetching created sample type:', getErr.message);
          return res.status(500).json({ error: 'Error fetching created sample type after creation.'});
        }
        res.status(201).json(row);
      });
    });
  }
);

// List Sample Types
router.get(
  '/sample-types',
  authenticateToken,
  authorize(['view_sample_details', 'manage_sample_types']),
  (req, res) => {
    const sql = "SELECT * FROM sample_types";
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('Error listing sample types:', err.message);
        return res.status(500).json({ error: 'Error listing sample types.' });
      }
      res.status(200).json(rows);
    });
  }
);

// Get Sample Type by ID
router.get(
  '/sample-types/:id',
  authenticateToken,
  authorize(['view_sample_details', 'manage_sample_types']),
  (req, res) => {
    const { id } = req.params;
    const sql = "SELECT * FROM sample_types WHERE id = ?";
    db.get(sql, [id], (err, row) => {
      if (err) {
        console.error('Error fetching sample type by ID:', err.message);
        return res.status(500).json({ error: 'Error fetching sample type.' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Sample type not found.' });
      }
      res.status(200).json(row);
    });
  }
);

// Update Sample Type
router.put(
  '/sample-types/:id',
  authenticateToken,
  authorize(['manage_sample_types']),
  (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name && description === undefined) { // Check if description is explicitly undefined to allow setting it to null
      return res.status(400).json({ error: 'Nothing to update. Provide name or description.' });
    }

    // Build query dynamically
    let fieldsToUpdate = [];
    let values = [];

    if (name) {
      fieldsToUpdate.push("name = ?");
      values.push(name);
    }
    if (description !== undefined) {
      fieldsToUpdate.push("description = ?");
      values.push(description);
    }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    values.push(id); // For the WHERE clause

    const sql = `UPDATE sample_types SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

    db.run(sql, values, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed: sample_types.name')) {
          return res.status(409).json({ error: 'Sample type name already exists.' });
        }
        console.error('Error updating sample type:', err.message);
        return res.status(500).json({ error: 'Error updating sample type.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Sample type not found or no changes made.' });
      }
      // Fetch and return the updated sample type
      db.get("SELECT * FROM sample_types WHERE id = ?", [id], (getErr, row) => {
        if (getErr) {
            console.error('Error fetching updated sample type:', getErr.message);
            return res.status(500).json({ error: 'Error fetching sample type after update.'});
        }
        res.status(200).json(row);
      });
    });
  }
);

// Delete Sample Type
router.delete(
  '/sample-types/:id',
  authenticateToken,
  authorize(['manage_sample_types']),
  (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM sample_types WHERE id = ?";
    db.run(sql, [id], function(err) {
      if (err) {
        // A more robust solution would check err.code for specific SQLite errors like SQLITE_CONSTRAINT_FOREIGNKEY
        if (err.message.includes('FOREIGN KEY constraint failed')) {
             return res.status(409).json({ error: 'Cannot delete sample type. It is currently referenced by other records (e.g., samples).' });
        }
        console.error('Error deleting sample type:', err.message);
        return res.status(500).json({ error: 'Error deleting sample type.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Sample type not found.' });
      }
      res.status(200).json({ message: 'Sample type deleted successfully.' });
    });
  }
);

// ==== Sources Endpoints ====
// Base: /api/sources

// Create Source
router.post(
  '/sources',
  authenticateToken,
  authorize(['manage_sources']),
  (req, res) => {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required for source.' });
    }

    const sql = `INSERT INTO sources (name, description) VALUES (?, ?)`;
    db.run(sql, [name, description || null], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed: sources.name')) {
          return res.status(409).json({ error: 'Source name already exists.' });
        }
        console.error('Error creating source:', err.message);
        return res.status(500).json({ error: 'Error creating source.' });
      }
      db.get("SELECT * FROM sources WHERE id = ?", [this.lastID], (getErr, row) => {
        if (getErr) {
          console.error('Error fetching created source:', getErr.message);
          return res.status(500).json({ error: 'Error fetching created source after creation.'});
        }
        res.status(201).json(row);
      });
    });
  }
);

// List Sources
router.get(
  '/sources',
  authenticateToken,
  authorize(['view_sample_details', 'manage_sources']),
  (req, res) => {
    const sql = "SELECT * FROM sources";
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('Error listing sources:', err.message);
        return res.status(500).json({ error: 'Error listing sources.' });
      }
      res.status(200).json(rows);
    });
  }
);

// Get Source by ID
router.get(
  '/sources/:id',
  authenticateToken,
  authorize(['view_sample_details', 'manage_sources']),
  (req, res) => {
    const { id } = req.params;
    const sql = "SELECT * FROM sources WHERE id = ?";
    db.get(sql, [id], (err, row) => {
      if (err) {
        console.error('Error fetching source by ID:', err.message);
        return res.status(500).json({ error: 'Error fetching source.' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Source not found.' });
      }
      res.status(200).json(row);
    });
  }
);

// Update Source
router.put(
  '/sources/:id',
  authenticateToken,
  authorize(['manage_sources']),
  (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name && description === undefined) {
      return res.status(400).json({ error: 'Nothing to update. Provide name or description.' });
    }

    let fieldsToUpdate = [];
    let values = [];

    if (name) {
      fieldsToUpdate.push("name = ?");
      values.push(name);
    }
    if (description !== undefined) {
      fieldsToUpdate.push("description = ?");
      values.push(description);
    }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    values.push(id);

    const sql = `UPDATE sources SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

    db.run(sql, values, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed: sources.name')) {
          return res.status(409).json({ error: 'Source name already exists.' });
        }
        console.error('Error updating source:', err.message);
        return res.status(500).json({ error: 'Error updating source.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Source not found or no changes made.' });
      }
      db.get("SELECT * FROM sources WHERE id = ?", [id], (getErr, row) => {
        if (getErr) {
            console.error('Error fetching updated source:', getErr.message);
            return res.status(500).json({ error: 'Error fetching source after update.'});
        }
        res.status(200).json(row);
      });
    });
  }
);

// Delete Source
router.delete(
  '/sources/:id',
  authenticateToken,
  authorize(['manage_sources']),
  (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM sources WHERE id = ?";
    db.run(sql, [id], function(err) {
      if (err) {
        if (err.message.includes('FOREIGN KEY constraint failed')) {
             return res.status(409).json({ error: 'Cannot delete source. It is currently referenced by other records (e.g., samples).' });
        }
        console.error('Error deleting source:', err.message);
        return res.status(500).json({ error: 'Error deleting source.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Source not found.' });
      }
      res.status(200).json({ message: 'Source deleted successfully.' });
    });
  }
);

// ==== Storage Locations Endpoints ====
// Base: /api/storage-locations

// Create Storage Location
router.post(
  '/storage-locations',
  authenticateToken,
  authorize(['manage_storage_locations']),
  (req, res) => {
    const { name, temperature, capacity } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required for storage location.' });
    }
    // Optional: Add validation for data types of temperature and capacity if provided
    if (temperature !== undefined && typeof temperature !== 'number') {
      return res.status(400).json({ error: 'Temperature must be a number.' });
    }
    if (capacity !== undefined && (!Number.isInteger(capacity) || capacity < 0)) {
      return res.status(400).json({ error: 'Capacity must be a non-negative integer.' });
    }

    const sql = `INSERT INTO storage_locations (name, temperature, capacity) VALUES (?, ?, ?)`;
    // current_load defaults to 0 in DB schema
    db.run(sql, [name, temperature, capacity], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed: storage_locations.name')) {
          return res.status(409).json({ error: 'Storage location name already exists.' });
        }
        console.error('Error creating storage location:', err.message);
        return res.status(500).json({ error: 'Error creating storage location.' });
      }
      db.get("SELECT * FROM storage_locations WHERE id = ?", [this.lastID], (getErr, row) => {
        if (getErr) {
          console.error('Error fetching created storage location:', getErr.message);
          return res.status(500).json({ error: 'Error fetching created storage location after creation.'});
        }
        res.status(201).json(row);
      });
    });
  }
);

// List Storage Locations
router.get(
  '/storage-locations',
  authenticateToken,
  authorize(['manage_storage_locations', 'view_sample_details']),
  (req, res) => {
    const sql = "SELECT * FROM storage_locations";
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('Error listing storage locations:', err.message);
        return res.status(500).json({ error: 'Error listing storage locations.' });
      }
      res.status(200).json(rows);
    });
  }
);

// Get Storage Location by ID
router.get(
  '/storage-locations/:id',
  authenticateToken,
  authorize(['manage_storage_locations', 'view_sample_details']),
  (req, res) => {
    const { id } = req.params;
    const sql = "SELECT * FROM storage_locations WHERE id = ?";
    db.get(sql, [id], (err, row) => {
      if (err) {
        console.error('Error fetching storage location by ID:', err.message);
        return res.status(500).json({ error: 'Error fetching storage location.' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Storage location not found.' });
      }
      res.status(200).json(row);
    });
  }
);

// Update Storage Location
router.put(
  '/storage-locations/:id',
  authenticateToken,
  authorize(['manage_storage_locations']),
  (req, res) => {
    const { id } = req.params;
    const { name, temperature, capacity, current_load } = req.body;

    if (name === undefined && temperature === undefined && capacity === undefined && current_load === undefined) {
      return res.status(400).json({ error: 'Nothing to update. Provide at least one field (name, temperature, capacity, current_load).' });
    }

    let fieldsToUpdate = [];
    let values = [];

    if (name !== undefined) {
      fieldsToUpdate.push("name = ?");
      values.push(name);
    }
    if (temperature !== undefined) {
      if (typeof temperature !== 'number' && temperature !== null) { // Allow null to clear temperature
        return res.status(400).json({ error: 'Temperature must be a number or null.' });
      }
      fieldsToUpdate.push("temperature = ?");
      values.push(temperature);
    }
    if (capacity !== undefined) {
      if ((!Number.isInteger(capacity) || capacity < 0) && capacity !== null) { // Allow null to clear capacity
         return res.status(400).json({ error: 'Capacity must be a non-negative integer or null.' });
      }
      fieldsToUpdate.push("capacity = ?");
      values.push(capacity);
    }
    if (current_load !== undefined) {
      if (!Number.isInteger(current_load) || current_load < 0) {
         return res.status(400).json({ error: 'Current load must be a non-negative integer.' });
      }
      // Potential future validation: check current_load against capacity
      fieldsToUpdate.push("current_load = ?");
      values.push(current_load);
    }

    if (fieldsToUpdate.length === 0) { // Should be caught by the initial check, but as a safeguard
        return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    values.push(id);

    const sql = `UPDATE storage_locations SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

    db.run(sql, values, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed: storage_locations.name')) {
          return res.status(409).json({ error: 'Storage location name already exists.' });
        }
        console.error('Error updating storage location:', err.message);
        return res.status(500).json({ error: 'Error updating storage location.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Storage location not found or no changes made.' });
      }
      db.get("SELECT * FROM storage_locations WHERE id = ?", [id], (getErr, row) => {
        if (getErr) {
            console.error('Error fetching updated storage location:', getErr.message);
            return res.status(500).json({ error: 'Error fetching storage location after update.'});
        }
        res.status(200).json(row);
      });
    });
  }
);

// Delete Storage Location
router.delete(
  '/storage-locations/:id',
  authenticateToken,
  authorize(['manage_storage_locations']),
  (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM storage_locations WHERE id = ?";
    db.run(sql, [id], function(err) {
      if (err) {
        if (err.message.includes('FOREIGN KEY constraint failed')) {
             return res.status(409).json({ error: 'Cannot delete storage location. It is currently referenced by other records (e.g., samples).' });
        }
        console.error('Error deleting storage location:', err.message);
        return res.status(500).json({ error: 'Error deleting storage location.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Storage location not found.' });
      }
      res.status(200).json({ message: 'Storage location deleted successfully.' });
    });
  }
);

// ==== Samples Endpoints ====
// Base: /api/samples

// Register New Sample
router.post(
  '/samples/register',
  authenticateToken,
  authorize(['register_sample']),
  async (req, res) => {
    const {
      sample_type_id,
      source_id,
      collection_date, // Expected ISO8601 format
      current_status,
      storage_location_id, // Optional, but required if status is 'In Storage'
      notes
    } = req.body;

    const userId = req.user.userId;

    // --- 1. Input Validation ---
    if (!sample_type_id || !source_id || !collection_date || !current_status) {
      return res.status(400).json({ error: 'Missing required fields: sample_type_id, source_id, collection_date, current_status.' });
    }

    const validStatuses = ['Registered', 'In Storage', 'In Analysis', 'Discarded', 'Archived'];
    if (!validStatuses.includes(current_status)) {
      return res.status(400).json({ error: `Invalid current_status. Must be one of: ${validStatuses.join(', ')}` });
    }

    if (current_status === 'In Storage' && !storage_location_id) {
      return res.status(400).json({ error: 'storage_location_id is required when current_status is "In Storage".' });
    }

    // Helper to check existence of foreign keys
    const checkExists = (table, id) => {
      return new Promise((resolve, reject) => {
        db.get(`SELECT id FROM ${table} WHERE id = ?`, [id], (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        });
      });
    };

    try {
      if (!(await checkExists('sample_types', sample_type_id))) {
        return res.status(400).json({ error: `Sample type with ID ${sample_type_id} not found.` });
      }
      if (!(await checkExists('sources', source_id))) {
        return res.status(400).json({ error: `Source with ID ${source_id} not found.` });
      }
      if (storage_location_id && !(await checkExists('storage_locations', storage_location_id))) {
        return res.status(400).json({ error: `Storage location with ID ${storage_location_id} not found.` });
      }
    } catch (dbErr) {
      console.error("Error checking foreign key existence:", dbErr.message);
      return res.status(500).json({ error: "Server error during validation." });
    }

    // --- 2. ID Generation ---
    const unique_sample_id = `SAMP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const barcode_qr_code = `QR-${unique_sample_id}`;

    // --- 3. Database Operations (Transaction) ---
    db.run('BEGIN TRANSACTION', async (beginErr) => {
      if (beginErr) {
        console.error('Error beginning transaction:', beginErr.message);
        return res.status(500).json({ error: 'Failed to start sample registration process.' });
      }

      const sampleSql = `
        INSERT INTO samples (
          unique_sample_id, sample_type_id, source_id, collection_date,
          storage_location_id, current_status, barcode_qr_code, notes
          // registration_date, created_at, updated_at have defaults
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const sampleParams = [
        unique_sample_id, sample_type_id, source_id, collection_date,
        (current_status === 'In Storage' && storage_location_id) ? storage_location_id : null,
        current_status, barcode_qr_code, notes || null
      ];

      db.run(sampleSql, sampleParams, function(sampleErr) {
        if (sampleErr) {
          console.error('Error inserting sample:', sampleErr.message);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to register sample.' });
        }

        const newSampleId = this.lastID;

        const cocSql = `
          INSERT INTO chain_of_custody (
            sample_id, user_id, action, new_location_id, notes
          ) VALUES (?, ?, ?, ?, ?)
        `;
        const cocParams = [
          newSampleId,
          userId,
          'Registered',
          (current_status === 'In Storage' && storage_location_id) ? storage_location_id : null,
          'Sample registered into the system.'
        ];

        db.run(cocSql, cocParams, (cocErr) => {
          if (cocErr) {
            console.error('Error creating chain of custody record:', cocErr.message);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to create chain of custody for sample.' });
          }

          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              console.error('Error committing transaction:', commitErr.message);
              db.run('ROLLBACK'); // Attempt rollback again, though might not be effective if commit started failing
              return res.status(500).json({ error: 'Failed to finalize sample registration.' });
            }

            // --- 4. Response ---
            db.get("SELECT * FROM samples WHERE id = ?", [newSampleId], (getErr, newSampleRow) => {
              if (getErr || !newSampleRow) {
                console.error('Error fetching newly created sample:', getErr ? getErr.message : 'Sample not found after creation');
                // Data is committed, but fetching failed. This is problematic.
                // Return a success with a warning or a specific error code.
                return res.status(207).json({
                    message: 'Sample registered and CoC created, but failed to fetch complete sample data.',
                    sample_id: newSampleId,
                    unique_sample_id: unique_sample_id
                });
              }
              res.status(201).json(newSampleRow);
            });
          });
        });
      });
    });
  }
);

// List Samples
router.get(
  '/samples',
  authenticateToken,
  authorize(['view_all_samples', 'view_sample_details']),
  (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Since authorize requires both perms, user effectively has view_all_samples
    // No further user-based filtering here.
    const sql = `
      SELECT
        s.*,
        st.name as sample_type_name,
        so.name as source_name,
        sl.name as storage_location_name
      FROM samples s
      JOIN sample_types st ON s.sample_type_id = st.id
      JOIN sources so ON s.source_id = so.id
      LEFT JOIN storage_locations sl ON s.storage_location_id = sl.id
      ORDER BY s.id DESC
      LIMIT ? OFFSET ?
    `;

    db.all(sql, [limit, offset], (err, rows) => {
      if (err) {
        console.error('Error listing samples:', err.message);
        return res.status(500).json({ error: 'Error listing samples.' });
      }
      // Could also add a query to get total count for pagination metadata
      db.get("SELECT COUNT(*) as total_count FROM samples", (countErr, countRow) => {
        if (countErr) {
            console.error('Error counting samples:', countErr.message);
            return res.status(500).json({ error: 'Error counting samples.' });
        }
        res.status(200).json({
            data: rows,
            pagination: {
                limit: limit,
                offset: offset,
                total_count: countRow ? countRow.total_count : 0
            }
        });
      });
    });
  }
);

// Get Sample Details by ID
router.get(
  '/samples/:id',
  authenticateToken,
  authorize(['view_sample_details', 'view_all_samples']),
  (req, res) => {
    const { id } = req.params;
    // User is authorized to see details if they pass the middleware
    const sql = `
      SELECT
        s.*,
        st.name as sample_type_name,
        so.name as source_name,
        sl.name as storage_location_name
      FROM samples s
      JOIN sample_types st ON s.sample_type_id = st.id
      JOIN sources so ON s.source_id = so.id
      LEFT JOIN storage_locations sl ON s.storage_location_id = sl.id
      WHERE s.id = ?
    `;

    db.get(sql, [id], (err, row) => {
      if (err) {
        console.error('Error fetching sample details by ID:', err.message);
        return res.status(500).json({ error: 'Error fetching sample details.' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Sample not found.' });
      }
      res.status(200).json(row);
    });
  }
);

// Update Sample Status/Location
router.put(
  '/samples/:id/status',
  authenticateToken,
  authorize(['update_sample_status']),
  async (req, res) => {
    const { id: sampleId } = req.params;
    const { current_status: newStatus, storage_location_id: newLocationId, notes } = req.body;
    const userId = req.user.userId;

    // --- 1. Input Validation ---
    if (!newStatus) {
      return res.status(400).json({ error: 'current_status is required.' });
    }

    const validStatuses = ['Registered', 'In Storage', 'In Analysis', 'Discarded', 'Archived'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: `Invalid current_status. Must be one of: ${validStatuses.join(', ')}` });
    }

    let validatedLocationId = null;
    if (newStatus === 'In Storage') {
      if (!newLocationId) {
        return res.status(400).json({ error: 'storage_location_id is required when current_status is "In Storage".' });
      }
      // Helper to check existence of foreign keys (assuming it's available in the scope)
      const checkExists = (table, id) => {
        return new Promise((resolve, reject) => {
          db.get(`SELECT id FROM ${table} WHERE id = ?`, [id], (err, row) => {
            if (err) reject(err); else resolve(!!row);
          });
        });
      };
      try {
        if (!(await checkExists('storage_locations', newLocationId))) {
          return res.status(400).json({ error: `Storage location with ID ${newLocationId} not found.` });
        }
        validatedLocationId = newLocationId;
      } catch (dbErr) {
        console.error("Error checking storage_location existence:", dbErr.message);
        return res.status(500).json({ error: "Server error during storage location validation." });
      }
    } else {
      // For other statuses, newLocationId is not applicable from input for setting the sample's location.
      // It will be set to NULL in the samples table for these statuses.
      // newLocationId for CoC will also be null unless explicitly it's a move to non-storage.
    }

    // --- 2. Fetch Current Sample ---
    let previousSample;
    try {
      previousSample = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM samples WHERE id = ?", [sampleId], (err, row) => {
          if (err) reject(err); else resolve(row);
        });
      });
      if (!previousSample) {
        return res.status(404).json({ error: 'Sample not found.' });
      }
    } catch (fetchErr) {
      console.error('Error fetching current sample state:', fetchErr.message);
      return res.status(500).json({ error: 'Error fetching current sample details.' });
    }
    const previousLocationId = previousSample.storage_location_id;

    // --- 3. Database Operations (Transaction) ---
    db.run('BEGIN TRANSACTION', (beginErr) => {
      if (beginErr) {
        console.error('Error beginning transaction:', beginErr.message);
        return res.status(500).json({ error: 'Failed to start status update process.' });
      }

      const finalStorageLocationIdForSample = (newStatus === 'In Storage') ? validatedLocationId : null;

      const sampleUpdateSql = `
        UPDATE samples
        SET current_status = ?, storage_location_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `;
      db.run(sampleUpdateSql, [newStatus, finalStorageLocationIdForSample, sampleId], function(sampleUpdateErr) {
        if (sampleUpdateErr) {
          console.error('Error updating sample status/location:', sampleUpdateErr.message);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to update sample.' });
        }
        if (this.changes === 0) { // Should have been caught by previousSample check, but good safeguard
            db.run('ROLLBACK');
            return res.status(404).json({ error: 'Sample not found (or no changes made during update).' });
        }

        const cocAction = `Status Updated to ${newStatus}`;
        const cocNotes = notes || `Sample status changed to ${newStatus}.`;
        // For CoC, new_location_id reflects the target location if status is 'In Storage' or if it's a conceptual move.
        // If status is 'Discarded', 'In Analysis' etc., the sample is no longer in a *tracked* storage location.
        const cocNewLocationId = (newStatus === 'In Storage') ? validatedLocationId : null;

        const cocSql = `
          INSERT INTO chain_of_custody
            (sample_id, user_id, action, previous_location_id, new_location_id, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        db.run(cocSql, [sampleId, userId, cocAction, previousLocationId, cocNewLocationId, cocNotes], (cocErr) => {
          if (cocErr) {
            console.error('Error creating chain of custody record:', cocErr.message);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to create chain of custody for status update.' });
          }

          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              console.error('Error committing transaction:', commitErr.message);
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to finalize sample status update.' });
            }

            // Fetch and return the updated sample with JOINs for context
            const finalSelectSql = `
              SELECT s.*, st.name as sample_type_name, so.name as source_name, sl.name as storage_location_name
              FROM samples s
              JOIN sample_types st ON s.sample_type_id = st.id
              JOIN sources so ON s.source_id = so.id
              LEFT JOIN storage_locations sl ON s.storage_location_id = sl.id
              WHERE s.id = ?
            `;
            db.get(finalSelectSql, [sampleId], (getErr, updatedSampleRow) => {
              if (getErr || !updatedSampleRow) {
                console.error('Error fetching updated sample:', getErr ? getErr.message : 'Updated sample not found.');
                return res.status(207).json({
                    message: 'Sample status updated and CoC created, but failed to fetch complete updated sample data.',
                    sample_id: sampleId
                });
              }
              res.status(200).json(updatedSampleRow);
            });
          });
        });
      });
    });
  }
);

// Get Barcode/QR Code for Sample
router.get(
  '/samples/:id/barcode',
  authenticateToken,
  authorize(['generate_barcode', 'view_sample_details']),
  async (req, res) => {
    const { id: sampleId } = req.params;
    try {
      const sample = await new Promise((resolve, reject) => {
        db.get("SELECT id, unique_sample_id, barcode_qr_code FROM samples WHERE id = ?", [sampleId], (err, row) => {
          if (err) reject(err); else resolve(row);
        });
      });

      if (!sample) {
        return res.status(404).json({ error: 'Sample not found.' });
      }
      res.status(200).json({
        sample_id: sample.id,
        unique_sample_id: sample.unique_sample_id,
        barcode_qr_code: sample.barcode_qr_code
      });
    } catch (dbErr) {
      console.error('Error fetching sample barcode data:', dbErr.message);
      return res.status(500).json({ error: 'Error fetching sample barcode data.' });
    }
  }
);

// Shared function for fetching Chain of Custody / Lifecycle
const getChainOfCustodyForSample = async (req, res) => {
  const { id: sampleId } = req.params;

  // Helper to check existence (if not already available in wider scope)
  const checkExists = (table, id) => {
      return new Promise((resolve, reject) => {
        db.get(`SELECT id FROM ${table} WHERE id = ?`, [id], (err, row) => {
          if (err) reject(err); else resolve(!!row);
        });
      });
    };

  try {
    if (!(await checkExists('samples', sampleId))) {
      return res.status(404).json({ error: 'Sample not found.' });
    }

    const cocSql = `
      SELECT
        coc.id, coc.sample_id, coc.user_id, coc.action, coc.timestamp,
        coc.previous_location_id, coc.new_location_id, coc.notes,
        u.username as user_username,
        u.full_name as user_full_name,
        prev_sl.name as previous_location_name,
        new_sl.name as new_location_name
      FROM chain_of_custody coc
      JOIN users u ON coc.user_id = u.id
      LEFT JOIN storage_locations prev_sl ON coc.previous_location_id = prev_sl.id
      LEFT JOIN storage_locations new_sl ON coc.new_location_id = new_sl.id
      WHERE coc.sample_id = ?
      ORDER BY coc.timestamp DESC
    `;
    const rows = await new Promise((resolve, reject) => {
      db.all(cocSql, [sampleId], (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    res.status(200).json(rows);
  } catch (dbErr) {
    console.error('Error fetching chain of custody:', dbErr.message);
    return res.status(500).json({ error: 'Error fetching chain of custody.' });
  }
};

// Get Sample Lifecycle History
router.get(
  '/samples/:id/lifecycle',
  authenticateToken,
  authorize(['view_sample_lifecycle']),
  getChainOfCustodyForSample // Use shared function
);

// Get Chain of Custody
router.get(
  '/samples/:id/chainofcustody',
  authenticateToken,
  authorize(['view_sample_lifecycle', 'manage_chain_of_custody']),
  getChainOfCustodyForSample // Use shared function
);

// Add Generic Chain of Custody Entry
router.post(
  '/samples/:id/chainofcustody',
  authenticateToken,
  authorize(['manage_chain_of_custody']),
  async (req, res) => {
    const { id: sampleId } = req.params;
    const { action, notes, previous_location_id, new_location_id } = req.body;
    const userId = req.user.userId;

    if (!action) {
      return res.status(400).json({ error: 'Action is required for chain of custody entry.' });
    }

    // Helper to check existence (if not already available in wider scope)
    const checkExists = (table, id) => {
        return new Promise((resolve, reject) => {
          db.get(`SELECT id FROM ${table} WHERE id = ?`, [id], (err, row) => {
            if (err) reject(err); else resolve(!!row);
          });
        });
      };

    try {
      if (!(await checkExists('samples', sampleId))) {
        return res.status(404).json({ error: `Sample with ID ${sampleId} not found.` });
      }
      if (previous_location_id && !(await checkExists('storage_locations', previous_location_id))) {
        return res.status(400).json({ error: `Previous storage location with ID ${previous_location_id} not found.` });
      }
      if (new_location_id && !(await checkExists('storage_locations', new_location_id))) {
        return res.status(400).json({ error: `New storage location with ID ${new_location_id} not found.` });
      }
    } catch (dbErr) {
      console.error("Error checking foreign key existence for CoC entry:", dbErr.message);
      return res.status(500).json({ error: "Server error during validation for CoC entry." });
    }

    db.run('BEGIN TRANSACTION', (beginErr) => {
        if (beginErr) {
            console.error('Error beginning transaction for CoC:', beginErr.message);
            return res.status(500).json({ error: 'Failed to start CoC entry process.' });
        }

        const cocSql = `
            INSERT INTO chain_of_custody
            (sample_id, user_id, action, previous_location_id, new_location_id, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const params = [
            sampleId, userId, action,
            previous_location_id || null,
            new_location_id || null,
            notes || null
        ];

        db.run(cocSql, params, function(cocErr) {
            if (cocErr) {
                console.error('Error inserting generic CoC entry:', cocErr.message);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to create CoC entry.' });
            }
            const newCocId = this.lastID;
            db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                    console.error('Error committing transaction for CoC:', commitErr.message);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to finalize CoC entry.' });
                }
                // Fetch and return the created CoC entry for confirmation
                db.get("SELECT * FROM chain_of_custody WHERE id = ?", [newCocId], (getErr, row) => {
                    if (getErr || !row) {
                        console.error('Error fetching created CoC entry:', getErr ? getErr.message : "CoC entry not found post-creation");
                        return res.status(207).json({ message: 'CoC entry created, but failed to fetch details.', cocId: newCocId });
                    }
                    res.status(201).json(row);
                });
            });
        });
    });
  }
);

// ==== Sample Testing related Endpoints (within samples context) ====

// POST /api/samples/:id/tests - Request one or more tests for a specific sample
router.post('/samples/:sample_id/tests', authenticateToken, authorize(['request_sample_tests']), async (req, res) => {
  const { sample_id } = req.params;
  const { test_ids, experiment_id } = req.body; // experiment_id is optional
  const requested_by_user_id = req.user.userId;

  if (!test_ids || !Array.isArray(test_ids) || test_ids.length === 0) {
    return res.status(400).json({ error: 'test_ids must be a non-empty array.' });
  }

  // --- Validation ---
  // 1. Check if sample exists
  const sampleExists = await new Promise((resolve, reject) => {
    db.get("SELECT id FROM samples WHERE id = ?", [sample_id], (err, row) => {
      if (err) reject(new Error('Failed to verify sample.'));
      else resolve(!!row);
    });
  });
  if (!sampleExists) {
    return res.status(404).json({ error: 'Sample not found.' });
  }

  // 2. Check if experiment exists (if provided)
  if (experiment_id) {
    const experimentExists = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM experiments WHERE id = ?", [experiment_id], (err, row) => {
        if (err) reject(new Error('Failed to verify experiment.'));
        else resolve(!!row);
      });
    });
    if (!experimentExists) {
      return res.status(404).json({ error: `Experiment with ID ${experiment_id} not found.` });
    }
  }

  // 3. Check if all test_ids exist and are valid
  const validTestIds = [];
  for (const test_id of test_ids) {
    const testExists = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM tests WHERE id = ?", [test_id], (err, row) => {
        if (err) reject(new Error(`Failed to verify test ID ${test_id}.`));
        else resolve(row);
      });
    });
    if (!testExists) {
      return res.status(400).json({ error: `Test with ID ${test_id} not found.` });
    }
    validTestIds.push(testExists.id); // Store the actual ID from DB
  }

  // --- Database Operations ---
  // Insert each test request into sample_tests
  // Using a transaction to ensure all or nothing
  db.serialize(() => {
    db.run("BEGIN TRANSACTION", (beginErr) => {
        if (beginErr) {
            console.error('Failed to begin transaction for sample test requests:', beginErr.message);
            return res.status(500).json({ error: 'Server error starting test request process.' });
        }

        const stmt = db.prepare(`
          INSERT INTO sample_tests
            (sample_id, test_id, experiment_id, requested_by_user_id, status, requested_at)
          VALUES (?, ?, ?, ?, 'Pending', CURRENT_TIMESTAMP)
        `);

        let operationsCompleted = 0;
        let encounteredError = null;
        const createdEntries = [];

        validTestIds.forEach(test_id => {
          stmt.run([sample_id, test_id, experiment_id || null, requested_by_user_id], function(runErr) {
            operationsCompleted++;
            if (runErr) {
              if (runErr.message.includes('UNIQUE constraint failed')) { // sample_id, test_id, experiment_id might need to be unique together for a certain status
                // This is a simplified check. A proper unique constraint on (sample_id, test_id, experiment_id) for 'Pending' status might be needed.
                // Or (sample_id, test_id) if a test can only be requested once for a sample regardless of experiment or if experiment is null.
                // For now, we assume a test can be requested multiple times if for different experiments or if one is null.
                // If a strict "once per sample-test" is needed, the DB schema needs a unique constraint.
                console.warn(`Potential duplicate test request for sample ${sample_id}, test ${test_id}, experiment ${experiment_id}.`);
                // Depending on desired behavior, this might be an error or just a warning.
                // For now, let it proceed, but log it. The primary key of sample_tests (id) will ensure row uniqueness.
              } else {
                encounteredError = runErr;
                console.error('Error inserting sample_test entry:', runErr.message);
              }
            } else {
                createdEntries.push({ id: this.lastID, sample_id, test_id, experiment_id, requested_by_user_id, status: 'Pending' });
            }

            if (operationsCompleted === validTestIds.length) {
              stmt.finalize(async (finalizeErr) => {
                if (finalizeErr) {
                    encounteredError = encounteredError || finalizeErr; // Keep first error
                    console.error('Error finalizing statement for sample_tests insertion:', finalizeErr.message);
                }

                if (encounteredError) {
                  db.run("ROLLBACK", () => {
                    res.status(500).json({ error: 'Failed to request one or more tests for the sample.', details: encounteredError.message });
                  });
                } else {
                  db.run("COMMIT", (commitErr) => {
                    if (commitErr) {
                      console.error('Failed to commit transaction for sample test requests:', commitErr.message);
                      db.run("ROLLBACK"); // Attempt rollback
                      return res.status(500).json({ error: 'Server error completing test request process.' });
                    }
                    res.status(201).json({ message: 'Test(s) requested successfully for the sample.', created_entries: createdEntries });
                  });
                }
              });
            }
          });
        });
         if (validTestIds.length === 0) { // Should be caught earlier, but as a safe guard
            db.run("ROLLBACK"); // Nothing to do, rollback
            return res.status(400).json({ error: 'No valid tests to request.' });
        }
    });
  });
});

// GET /api/samples/:sample_id/tests - Get all tests requested for a specific sample
router.get('/samples/:sample_id/tests', authenticateToken, authorize(['view_sample_details']), async (req, res) => {
  const { sample_id } = req.params;

  // 1. Check if sample exists
  const sampleExists = await new Promise((resolve, reject) => {
    db.get("SELECT id FROM samples WHERE id = ?", [sample_id], (err, row) => {
      if (err) reject(new Error('Failed to verify sample.'));
      else resolve(!!row);
    });
  });
  if (!sampleExists) {
    return res.status(404).json({ error: 'Sample not found.' });
  }

  // 2. Fetch associated tests
  const sql = `
    SELECT
      st.id as sample_test_id,
      st.test_id,
      t.name as test_name,
      t.description as test_description,
      t.protocol as test_protocol,
      st.experiment_id,
      e.name as experiment_name,
      st.status,
      st.results,
      st.requested_by_user_id,
      u_req.username as requested_by_username,
      st.assigned_to_user_id,
      u_assign.username as assigned_to_username,
      st.requested_at,
      st.result_entry_date,
      st.validated_at,
      st.validated_by_user_id,
      u_val.username as validated_by_username,
      st.approved_at,
      st.approved_by_user_id,
      u_app.username as approved_by_username,
      st.notes
    FROM sample_tests st
    JOIN tests t ON st.test_id = t.id
    JOIN users u_req ON st.requested_by_user_id = u_req.id
    LEFT JOIN experiments e ON st.experiment_id = e.id
    LEFT JOIN users u_assign ON st.assigned_to_user_id = u_assign.id
    LEFT JOIN users u_val ON st.validated_by_user_id = u_val.id
    LEFT JOIN users u_app ON st.approved_by_user_id = u_app.id
    WHERE st.sample_id = ?
    ORDER BY st.requested_at DESC
  `;

  db.all(sql, [sample_id], (err, rows) => {
    if (err) {
      console.error('Error fetching tests for sample:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve tests for the sample.' });
    }
    res.json(rows);
  });
});

// POST /api/samples/batch-request-tests - Batch request tests for multiple samples
router.post('/samples/batch-request-tests', authenticateToken, authorize(['request_sample_tests']), async (req, res) => {
  const { sample_ids, test_ids, experiment_id } = req.body;
  const requested_by_user_id = req.user.userId;

  if (!sample_ids || !Array.isArray(sample_ids) || sample_ids.length === 0) {
    return res.status(400).json({ error: 'sample_ids must be a non-empty array.' });
  }
  if (!test_ids || !Array.isArray(test_ids) || test_ids.length === 0) {
    return res.status(400).json({ error: 'test_ids must be a non-empty array.' });
  }

  // --- Validation ---
  // Helper to check existence of multiple IDs in a table
  const checkAllExist = async (table, ids) => {
    if (!ids || ids.length === 0) return true; // Nothing to check
    const placeholders = ids.map(() => '?').join(',');
    const sql = `SELECT COUNT(id) as count FROM ${table} WHERE id IN (${placeholders})`;
    return new Promise((resolve, reject) => {
      db.get(sql, ids, (err, row) => {
        if (err) reject(new Error(`Failed to verify IDs in ${table}.`));
        else resolve(row.count === ids.length);
      });
    });
  };

  try {
    if (!(await checkAllExist('samples', sample_ids))) {
      return res.status(400).json({ error: 'One or more sample IDs are invalid or not found.' });
    }
    if (!(await checkAllExist('tests', test_ids))) {
      return res.status(400).json({ error: 'One or more test IDs are invalid or not found.' });
    }
    if (experiment_id) {
      const experimentExists = await new Promise((resolve, reject) => {
        db.get("SELECT id FROM experiments WHERE id = ?", [experiment_id], (err, row) => {
          if (err) reject(new Error('Failed to verify experiment.'));
          else resolve(!!row);
        });
      });
      if (!experimentExists) {
        return res.status(404).json({ error: `Experiment with ID ${experiment_id} not found.` });
      }
    }
  } catch (validationError) {
    console.error("Validation error in batch request:", validationError.message);
    return res.status(500).json({ error: validationError.message });
  }

  // --- Database Operations ---
  db.serialize(() => {
    db.run("BEGIN TRANSACTION", (beginErr) => {
      if (beginErr) {
        console.error('Failed to begin transaction for batch test requests:', beginErr.message);
        return res.status(500).json({ error: 'Server error starting batch test request process.' });
      }

      const stmt = db.prepare(`
        INSERT INTO sample_tests
          (sample_id, test_id, experiment_id, requested_by_user_id, status, requested_at)
        VALUES (?, ?, ?, ?, 'Pending', CURRENT_TIMESTAMP)
      `);

      let operationsAttempted = 0;
      const totalOperations = sample_ids.length * test_ids.length;
      let errors = [];
      const createdEntriesInfo = [];

      sample_ids.forEach(sample_id => {
        test_ids.forEach(test_id => {
          operationsAttempted++;
          stmt.run([sample_id, test_id, experiment_id || null, requested_by_user_id], function(runErr) {
            if (runErr) {
              // Log individual errors but continue transaction; decide on rollback strategy later
              console.error(`Error inserting batch sample_test for sample ${sample_id}, test ${test_id}: ${runErr.message}`);
              errors.push({ sample_id, test_id, error: runErr.message });
            } else {
              createdEntriesInfo.push({ id: this.lastID, sample_id, test_id, experiment_id });
            }

            if (operationsAttempted === totalOperations) {
              stmt.finalize(async (finalizeErr) => {
                if (finalizeErr) {
                  console.error('Error finalizing statement for batch sample_tests insertion:', finalizeErr.message);
                  errors.push({ general_error: finalizeErr.message });
                }

                if (errors.length > 0) {
                  // Rollback if any error occurred for atomicity.
                  // Alternative: commit successful ones and report failures. For now, all or nothing.
                  db.run("ROLLBACK", () => {
                    res.status(500).json({
                      error: 'Failed to request some tests in batch.',
                      details: errors,
                      message: `${createdEntriesInfo.length} tests were successfully requested before an error occurred. All changes have been rolled back.`
                    });
                  });
                } else {
                  db.run("COMMIT", (commitErr) => {
                    if (commitErr) {
                      console.error('Failed to commit transaction for batch test requests:', commitErr.message);
                      db.run("ROLLBACK"); // Attempt rollback
                      return res.status(500).json({ error: 'Server error completing batch test request process.' });
                    }
                    res.status(201).json({
                      message: `Batch test request processed. ${createdEntriesInfo.length} test(s) requested successfully.`,
                      created_entries_count: createdEntriesInfo.length,
                      // created_entries: createdEntriesInfo // Could be too verbose
                    });
                  });
                }
              });
            }
          });
        });
      });
       if (totalOperations === 0) { // Should be caught by initial validation, but as a safeguard
          db.run("ROLLBACK");
          return res.status(400).json({ error: 'No sample-test combinations to request.' });
      }
    });
  });
});


module.exports = router;
