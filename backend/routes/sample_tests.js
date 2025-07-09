const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../auth');
const db = require('../database'); // Import shared db instance

// Placeholder for routes

// GET /api/sample-tests - Get all sample test entries
router.get('/sample-tests', authenticateToken, authorize(['view_tests']), (req, res) => {
  // TODO: Implement filtering options in the future (e.g., by status, sample_id, test_id, user_id)
  const sql = `
    SELECT
      st.id,
      st.sample_id,
      s.unique_sample_id,
      st.test_id,
      t.name as test_name,
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
    JOIN samples s ON st.sample_id = s.id
    JOIN tests t ON st.test_id = t.id
    JOIN users u_req ON st.requested_by_user_id = u_req.id
    LEFT JOIN experiments e ON st.experiment_id = e.id
    LEFT JOIN users u_assign ON st.assigned_to_user_id = u_assign.id
    LEFT JOIN users u_val ON st.validated_by_user_id = u_val.id
    LEFT JOIN users u_app ON st.approved_by_user_id = u_app.id
    ORDER BY st.requested_at DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching sample tests:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve sample tests.' });
    }
    res.json(rows);
  });
});

// DELETE /api/sample-tests/:id - Delete a sample test entry
router.delete('/sample-tests/:id', authenticateToken, authorize(['manage_tests']), (req, res) => {
  const { id } = req.params;

  // First, check if the sample test entry exists
  db.get("SELECT id, status FROM sample_tests WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error('Error checking sample test entry existence for deletion:', err.message);
      return res.status(500).json({ error: 'Failed to delete sample test entry.' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Sample test entry not found.' });
    }

    // Optional: Add workflow rule, e.g., cannot delete if status is 'Completed', 'Validated', or 'Approved'
    // For simplicity, this example allows deletion regardless of status if user has 'manage_tests'
    // if (['Completed', 'Validated', 'Approved'].includes(row.status)) {
    //   return res.status(400).json({ error: `Cannot delete sample test entry in '${row.status}' status.` });
    // }

    const sql = `DELETE FROM sample_tests WHERE id = ?`;
    db.run(sql, [id], function(err) {
      if (err) {
        console.error('Error deleting sample test entry:', err.message);
        return res.status(500).json({ error: 'Failed to delete sample test entry.' });
      }
      if (this.changes === 0) {
        // Should have been caught by the check above
        return res.status(404).json({ error: 'Sample test entry not found (concurrency issue or unexpected error).' });
      }
      res.status(200).json({ message: 'Sample test entry deleted successfully.', id: Number(id) });
    });
  });
});

// PUT /api/sample-tests/:id - Update a sample test entry
router.put('/sample-tests/:id', authenticateToken, async (req, res) => {
  const sampleTestId = req.params.id;
  const { status, results, assigned_to_user_id, notes } = req.body;
  const currentUserId = req.user.userId;

  // Define valid status transitions
  const validTransitions = {
    'Pending': ['In Progress', 'Rejected'],
    'In Progress': ['Completed', 'Pending', 'Rejected'], // Allow moving back to Pending if needed
    'Completed': ['Validated', 'Rejected'],
    'Validated': ['Approved', 'Rejected'],
    'Approved': [], // Terminal status, unless reopened
    'Rejected': []  // Terminal status, unless reopened
  };

  // Permissions required for status changes
  const permissionsForStatus = {
    'Completed': 'enter_test_results',
    'Validated': 'validate_test_results',
    'Approved': 'approve_test_results',
    // 'In Progress', 'Pending', 'Rejected' might be covered by a general 'manage_sample_tests' or contextually by other perms.
    // For assigning user or adding notes, 'enter_test_results' or a general 'manage_tests' could be used.
  };

  db.get("SELECT * FROM sample_tests WHERE id = ?", [sampleTestId], async (err, sampleTest) => {
    if (err) {
      console.error('Error fetching sample_test:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve sample test for update.' });
    }
    if (!sampleTest) {
      return res.status(404).json({ error: 'Sample test not found.' });
    }

    const currentStatus = sampleTest.status;
    let newStatus = status || currentStatus; // If status is not provided, keep current

    // --- Permission Check ---
    // This is simplified. A real implementation would involve fetching user's all permissions
    // and checking if they have the specific one needed for the requested operation.
    let requiredPermission = 'enter_test_results'; // Default for general updates like notes, assignment
    if (status && status !== currentStatus) {
        requiredPermission = permissionsForStatus[newStatus] || 'manage_tests'; // Fallback for other status changes
    }

    // Manually check permission (simulating what authorize middleware does)
    // In a real app, you'd have a helper function for this or more complex authorize setup.
    try {
        const userPermissions = await new Promise((resolve, reject) => {
            db.all(`
                SELECT p.name
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN users u ON rp.role_id = u.role_id
                WHERE u.id = ?`, [currentUserId], (permErr, perms) => {
                if (permErr) reject(permErr);
                else resolve(perms.map(p => p.name));
            });
        });

        if (!userPermissions.includes(requiredPermission)) {
            // Check specific permissions for sensitive fields if primary permission fails for general update
            if (results !== undefined && !userPermissions.includes('enter_test_results')) {
                 return res.status(403).json({ error: `Forbidden: Missing 'enter_test_results' permission for updating results.`});
            }
            if (status === 'Validated' && !userPermissions.includes('validate_test_results')) {
                 return res.status(403).json({ error: `Forbidden: Missing 'validate_test_results' permission for validating.`});
            }
             if (status === 'Approved' && !userPermissions.includes('approve_test_results')) {
                 return res.status(403).json({ error: `Forbidden: Missing 'approve_test_results' permission for approving.`});
            }
            if (! ( (results === undefined) && (status === undefined || status === currentStatus) ) ) { // if trying to update more than just notes/assignee
                 return res.status(403).json({ error: `Forbidden: Missing required permission: ${requiredPermission}` });
            } else if (!userPermissions.includes('enter_test_results') && !userPermissions.includes('manage_tests')) { // for notes/assignee
                 return res.status(403).json({ error: `Forbidden: Missing 'enter_test_results' or 'manage_tests' permission for this update.` });
            }
        }

    } catch (permErr) {
        console.error("Error checking permissions:", permErr);
        return res.status(500).json({ error: "Error checking user permissions." });
    }


    // --- Status Transition Validation ---
    if (status && status !== currentStatus) {
      if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
        return res.status(400).json({ error: `Invalid status transition from ${currentStatus} to ${status}.` });
      }
      newStatus = status;
    }

    // --- Field Updates ---
    const updates = [];
    const params = [];

    if (newStatus !== currentStatus) {
      updates.push("status = ?");
      params.push(newStatus);
      if (newStatus === 'Completed') {
        updates.push("result_entry_date = CURRENT_TIMESTAMP");
        // requested_by_user_id is set on creation, results are entered by currentUserId (implicitly)
      } else if (newStatus === 'Validated') {
        updates.push("validated_at = CURRENT_TIMESTAMP");
        updates.push("validated_by_user_id = ?");
        params.push(currentUserId);
      } else if (newStatus === 'Approved') {
        updates.push("approved_at = CURRENT_TIMESTAMP");
        updates.push("approved_by_user_id = ?");
        params.push(currentUserId);
      }
    }

    if (results !== undefined) {
      updates.push("results = ?");
      params.push(results);
      // If results are being entered and status is appropriate, also set result_entry_date
      if (newStatus === 'Completed' && !updates.includes("result_entry_date = CURRENT_TIMESTAMP")) {
         updates.push("result_entry_date = CURRENT_TIMESTAMP"); // Should be set if status becomes 'Completed'
      } else if (results && sampleTest.result_entry_date === null ) { // if results are added and date not set
         updates.push("result_entry_date = CURRENT_TIMESTAMP");
      }
    }

    if (assigned_to_user_id !== undefined) {
      // Validate assigned_to_user_id exists
      const userExists = await new Promise((resolve, reject) => {
        db.get("SELECT id FROM users WHERE id = ?", [assigned_to_user_id], (e, r) => e ? reject(e) : resolve(r));
      });
      if (!userExists && assigned_to_user_id !== null) { // allow unassigning
        return res.status(400).json({ error: 'Assigned user ID does not exist.' });
      }
      updates.push("assigned_to_user_id = ?");
      params.push(assigned_to_user_id);
    }

    if (notes !== undefined) {
      updates.push("notes = ?");
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update.' });
    }

    params.push(sampleTestId);
    const sqlUpdate = `UPDATE sample_tests SET ${updates.join(', ')} WHERE id = ?`;

    db.run(sqlUpdate, params, function(runErr) {
      if (runErr) {
        console.error('Error updating sample test entry:', runErr.message);
        return res.status(500).json({ error: 'Failed to update sample test entry.' });
      }
      if (this.changes === 0) {
        // Should be caught by initial fetch, but good for safety
        return res.status(404).json({ error: 'Sample test not found or no changes made.' });
      }
      res.json({ message: 'Sample test entry updated successfully.', id: Number(sampleTestId) });
    });
  });
});

// GET /api/sample-tests/:id - Get a specific sample test entry by ID
router.get('/sample-tests/:id', authenticateToken, authorize(['view_tests']), (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT
      st.id,
      st.sample_id,
      s.unique_sample_id,
      st.test_id,
      t.name as test_name,
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
    JOIN samples s ON st.sample_id = s.id
    JOIN tests t ON st.test_id = t.id
    JOIN users u_req ON st.requested_by_user_id = u_req.id
    LEFT JOIN experiments e ON st.experiment_id = e.id
    LEFT JOIN users u_assign ON st.assigned_to_user_id = u_assign.id
    LEFT JOIN users u_val ON st.validated_by_user_id = u_val.id
    LEFT JOIN users u_app ON st.approved_by_user_id = u_app.id
    WHERE st.id = ?
  `;

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Error fetching sample test entry:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve sample test entry.' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Sample test entry not found.' });
    }
    res.json(row);
  });
});

module.exports = router;
