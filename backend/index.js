const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database'); // Import the shared db instance
const { authenticateToken, authorize } = require('./auth'); // Import auth functions

const app = express();
const port = process.env.PORT || 3001; // Backend server port
const saltRounds = 10; // for bcrypt
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Replace with a strong secret in production

// Initial DB Setup (using the imported db)
// The console.log from database.js will indicate connection.
db.serialize(() => {
      // Create roles table
      db.run(`CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )`, (err) => {
        if (err) console.error('Error creating roles table', err.message);
        else {
          // Add default roles if table is empty
          db.get("SELECT COUNT(*) as count FROM roles", (err, row) => {
            if (err) console.error('Error counting roles', err.message);
            else if (row.count === 0) {
              const roles = ['administrator', 'lab_manager', 'researcher'];
              const stmt = db.prepare("INSERT INTO roles (name) VALUES (?)");
              roles.forEach(role => stmt.run(role, err => {
                if (err) console.error('Error inserting role', err.message);
              }));
              stmt.finalize(err => {
                if (err) console.error('Error finalizing roles insertion', err.message);
                else console.log('Default roles inserted.');
              });
            }
          });
        }
      });

      // Create users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        role_id INTEGER,
        FOREIGN KEY (role_id) REFERENCES roles(id)
      )`, (err) => {
        if (err) console.error('Error creating users table', err.message);
      });

      // Create permissions table
      db.run(`CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )`, (err) => {
        if (err) console.error('Error creating permissions table', err.message);
        else {
          // Add default permissions if table is empty
          db.get("SELECT COUNT(*) as count FROM permissions", (err, row) => {
            if (err) console.error('Error counting permissions', err.message);
            else if (row.count === 0) {
              const initialPermissions = [
                // General User Permissions
                'view_own_profile', 'edit_own_profile',
                // Inventory & Reports
                'manage_inventory', 'view_reports',
                // User Management (Admin)
                'create_user', 'delete_user', 'view_all_users', 'manage_roles',
                // Settings
                'edit_settings'
              ];
              const stmt = db.prepare("INSERT INTO permissions (name) VALUES (?)");
              initialPermissions.forEach(permission => stmt.run(permission, err => {
                if (err) console.error('Error inserting permission: ' + permission, err.message);
              }));
              stmt.finalize(err => {
                if (err) console.error('Error finalizing permissions insertion', err.message);
                else console.log('Default permissions inserted/updated.');
              });
            }
          });
        }
      });

      // Create role_permissions table
      db.run(`CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id),
        FOREIGN KEY (permission_id) REFERENCES permissions(id)
      )`, (err) => {
        if (err) console.error('Error creating role_permissions table', err.message);
        else {
          db.get("SELECT COUNT(*) as count FROM role_permissions", (err, row) => {
            if (err) console.error('Error counting role_permissions', err.message);
            else if (row.count === 0) { // Only seed if empty, or use a more sophisticated migration strategy for updates
              console.log('Attempting to seed role_permissions...');
              const assignments = [
                { role: 'researcher', permissions: ['view_own_profile', 'edit_own_profile', 'view_reports', 'manage_inventory'] },
                { role: 'lab_manager', permissions: ['view_own_profile', 'edit_own_profile', 'view_reports', 'manage_inventory', 'create_user'] },
                {
                  role: 'administrator',
                  permissions: [
                    'view_own_profile', 'edit_own_profile', 'view_reports', 'manage_inventory',
                    'create_user', 'delete_user', 'view_all_users', 'manage_roles', 'edit_settings'
                  ]
                },
              ];

              assignments.forEach(assignment => {
                db.get("SELECT id FROM roles WHERE name = ?", [assignment.role], (err, roleRow) => {
                  if (err || !roleRow) {
                    console.error(`Error finding role ${assignment.role} for seeding:`, err ? err.message : 'Role not found');
                    return;
                  }
                  assignment.permissions.forEach(permissionName => {
                    db.get("SELECT id FROM permissions WHERE name = ?", [permissionName], (err, permRow) => {
                      if (err || !permRow) {
                        console.error(`Error finding permission ${permissionName} for seeding:`, err ? err.message : 'Permission not found');
                        return;
                      }
                      db.run("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [roleRow.id, permRow.id], insertErr => {
                        if (insertErr) console.error(`Error assigning ${permissionName} to ${assignment.role}: ${insertErr.message}`);
                      });
                    });
                  });
                });
              });
              console.log('Default role_permissions seeding process initiated.');
            } else {
              console.log('Role_permissions table already seems populated or seeding skipped.');
            }
          });
        }
      });
    });

app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Optionally, serve index.html for all non-API routes (for SPA-like routing)
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint for user registration
app.post('/api/register', async (req, res) => {
  const { username, password, email, full_name, role } = req.body;

  if (!username || !password || !email || !full_name || !role) {
    return res.status(400).json({ error: 'All fields are required (username, password, email, full_name, role).' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Get role ID for the provided role name
    db.get("SELECT id FROM roles WHERE name = ?", [role], (err, roleRow) => {
      if (err || !roleRow) {
        console.error('Error finding role for new user:', err ? err.message : 'Role not found');
        return res.status(500).json({ error: 'Server error: Could not assign role.' });
      }
      const roleId = roleRow.id;

      const sql = `INSERT INTO users (username, password_hash, email, full_name, role_id) VALUES (?, ?, ?, ?, ?)`;
      db.run(sql, [username, hashedPassword, email, full_name, roleId], function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed: users.username')) {
            return res.status(409).json({ error: 'Username already exists.' });
          }
          if (err.message.includes('UNIQUE constraint failed: users.email')) {
            return res.status(409).json({ error: 'Email already exists.' });
          }
          console.error('Error registering user:', err.message);
          return res.status(500).json({ error: 'Error registering user.' });
        }
        res.status(201).json({ message: 'User registered successfully.', userId: this.lastID });
      });
    });
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// API endpoint for user login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const sql = `SELECT users.*, roles.name as role_name FROM users JOIN roles ON users.role_id = roles.id WHERE users.username = ?`;
  db.get(sql, [username], async (err, user) => {
    if (err) {
      console.error('Error fetching user:', err.message);
      return res.status(500).json({ error: 'Error fetching user.' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    try {
      const match = await bcrypt.compare(password, user.password_hash);
      if (match) {
        const tokenPayload = {
          userId: user.id,
          username: user.username,
          role: user.role_name
        };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour
        res.json({ message: 'Login successful.', token: token });
      } else {
        res.status(401).json({ error: 'Invalid username or password.' });
      }
    } catch (error) {
      console.error('Error comparing password:', error);
      res.status(500).json({ error: 'Server error during login.' });
    }
  });
});


// Profile Management Endpoints
app.get('/api/profile', authenticateToken, authorize(['view_own_profile']), (req, res) => {
  const userId = req.user.userId;
  const sql = `
    SELECT u.id, u.username, u.email, u.full_name, r.name as role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `;
  db.get(sql, [userId], (err, row) => {
    if (err) {
      console.error('Error fetching profile for user ID:', userId, err.message);
      return res.status(500).json({ error: 'Error fetching profile data.' });
    }
    if (!row) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    res.json(row);
  });
});

app.put('/api/profile', authenticateToken, authorize(['edit_own_profile']), (req, res) => {
  const userId = req.user.userId;
  const { email, full_name } = req.body;

  if (!email && !full_name) {
    return res.status(400).json({ error: 'Nothing to update. Provide email or full_name.' });
  }

  // Build query dynamically based on provided fields
  let fieldsToUpdate = [];
  let values = [];
  if (email) {
    fieldsToUpdate.push("email = ?");
    values.push(email);
  }
  if (full_name) {
    fieldsToUpdate.push("full_name = ?");
    values.push(full_name);
  }
  values.push(userId); // For the WHERE clause

  const sql = `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

  db.run(sql, values, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed: users.email')) {
        return res.status(409).json({ error: 'Email already in use by another account.' });
      }
      console.error('Error updating profile for user ID:', userId, err.message);
      return res.status(500).json({ error: 'Error updating profile.' });
    }
    if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found or no changes made.'});
    }
    res.json({ message: 'Profile updated successfully.' });
  });
});

// Admin Endpoint Example
app.get('/api/admin/users', authenticateToken, authorize(['view_all_users']), (req, res) => {
  const sql = `
    SELECT u.id, u.username, u.email, u.full_name, r.name as role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching all users for admin:', err.message);
      return res.status(500).json({ error: 'Error fetching user list.' });
    }
    res.json(rows);
  });
});


// Sample API endpoint - can be removed or adapted.
// If kept, consider if it needs authentication/authorization.
app.get('/api/test', (req, res) => {
  // This table "messages" was part of the original sample and is not created by the new schema.
  // You might want to remove or adapt this endpoint.
  // For now, let's query a table that exists, like 'users'.
  // This endpoint is currently open, consider if it should be.
  db.all("SELECT id, username, email, full_name, role_id FROM users", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ users: rows });
  });
});

// Import and use Sample Management routes
const sampleApiRoutes = require('./routes/samples');
const instrumentRoutes = require('./routes/instruments'); // Import instrument routes

app.use('/api/instruments', instrumentRoutes); // Mount instrument routes
app.use('/api', sampleApiRoutes);

// Import and use Experiment Management routes
const experimentsRouter = require('./routes/experiments');
app.use('/api', experimentsRouter);

// Import and use Test Management routes
const testsRouter = require('./routes/tests');
app.use('/api', testsRouter);

// Import and use Sample Test Management routes
const sampleTestsRouter = require('./routes/sample_tests');
app.use('/api', sampleTestsRouter);

// Import and use Reagent Management routes
const reagentsRouter = require('./routes/reagents');
app.use('/api/reagents', reagentsRouter);

// Import and use Supplier Management routes
const suppliersRouter = require('./routes/suppliers');
app.use('/api/suppliers', suppliersRouter);

// Import and use Reagent Order Management routes
const reagentOrdersRouter = require('./routes/reagent_orders');
app.use('/api/reagent_orders', reagentOrdersRouter);

// AFTER all API routes, add the catch-all for SPA (production only)
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test_production_build') {
  const frontendDistPath = path.resolve(__dirname, '..', 'frontend', 'dist');
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Basic error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

if (process.env.NODE_ENV !== 'test') { // Do not start server if in test environment
  app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
  });
}

module.exports = { app, db }; // Export for testing and for use in other route files
