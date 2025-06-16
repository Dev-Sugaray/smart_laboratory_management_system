const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
console.log(`Database path: ${dbPath}`);

// Force exit after a timeout, e.g., 20 seconds
const TIMEOUT_DURATION = 20 * 1000;
const timeoutId = setTimeout(() => {
  console.error('FATAL: Script execution timed out. Forcing exit.');
  process.exit(1);
}, TIMEOUT_DURATION);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('FATAL: Error opening database', err.message);
    clearTimeout(timeoutId);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
  createTablesAndSeed();
});

function closeDbAndExit(success = true, message = '') {
  clearTimeout(timeoutId); // Clear the global timeout
  if (message) console.log(message);
  db.close((closeErr) => {
    if (closeErr) {
      console.error('Error closing the database', closeErr.message);
      process.exit(1);
    }
    console.log('Database connection closed.');
    process.exit(success ? 0 : 1);
  });
}

function createTablesAndSeed() {
  db.serialize((serializeErr) => {
    if (serializeErr) { // Error starting serialization
        console.error(`FATAL: db.serialize error: ${serializeErr.message}`);
        clearTimeout(timeoutId);
        process.exit(1);
    }

    // Create Roles Table
    db.run(`CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )`, (err) => {
      if (err) return closeDbAndExit(false, `Error creating roles table: ${err.message}`);
      console.log('Roles table ensured.');

      db.get("SELECT COUNT(*) as count FROM roles", (err, row) => {
        if (err) return closeDbAndExit(false, `Error counting roles: ${err.message}`);

        if (row.count === 0) {
          const roles = ['administrator', 'lab_manager', 'researcher'];
          const stmt = db.prepare("INSERT INTO roles (name) VALUES (?)");
          let rolesInserted = 0;
          let rolesAttempted = 0;
          roles.forEach(role => stmt.run(role, function(runErr) {
            rolesAttempted++;
            if (runErr) console.error('Error inserting role', role, runErr.message);
            else rolesInserted++;

            if (rolesAttempted === roles.length) { // All run calls have finished
                 stmt.finalize(finalizeErr => {
                    if (finalizeErr) return closeDbAndExit(false, `Error finalizing roles insertion: ${finalizeErr.message}`);
                    console.log(`${rolesInserted} default roles inserted.`);
                    createPermissionsTable();
                });
            }
          }));
          if (roles.length === 0) { // No roles to insert
            stmt.finalize(finalizeErr => {
                if (finalizeErr) return closeDbAndExit(false, `Error finalizing roles insertion (no roles): ${finalizeErr.message}`);
                createPermissionsTable();
            });
          }
        } else {
          console.log('Roles table already populated.');
          createPermissionsTable();
        }
      });
    });
  });
}

function createPermissionsTable() {
  db.run(`CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  )`, (err) => {
    if (err) return closeDbAndExit(false, `Error creating permissions table: ${err.message}`);
    console.log('Permissions table ensured.');

    db.get("SELECT COUNT(*) as count FROM permissions", (err, row) => {
      if (err) return closeDbAndExit(false, `Error counting permissions: ${err.message}`);

      if (row.count === 0) {
        const permissions = ['create_user', 'manage_inventory', 'view_reports', 'delete_user', 'edit_settings'];
        const stmt = db.prepare("INSERT INTO permissions (name) VALUES (?)");
        let permsInserted = 0;
        let permsAttempted = 0;
        permissions.forEach(permission => stmt.run(permission, function(runErr) {
          permsAttempted++;
          if (runErr) console.error('Error inserting permission', permission, runErr.message);
          else permsInserted++;

          if (permsAttempted === permissions.length) { // All run calls have finished
            stmt.finalize(finalizeErr => {
                if (finalizeErr) return closeDbAndExit(false, `Error finalizing permissions insertion: ${finalizeErr.message}`);
                console.log(`${permsInserted} default permissions inserted.`);
                createUsersTable();
            });
          }
        }));
        if (permissions.length === 0) {
            stmt.finalize(finalizeErr => {
                if (finalizeErr) return closeDbAndExit(false, `Error finalizing permissions insertion (no permissions): ${finalizeErr.message}`);
                createUsersTable();
            });
        }
      } else {
        console.log('Permissions table already populated.');
        createUsersTable();
      }
    });
  });
}

function createUsersTable() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role_id INTEGER,
    FOREIGN KEY (role_id) REFERENCES roles(id)
  )`, (err) => {
    if (err) return closeDbAndExit(false, `Error creating users table: ${err.message}`);
    console.log('Users table ensured.');
    createRolePermissionsTable();
  });
}

function createRolePermissionsTable() {
  db.run(`CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
  )`, (err) => {
    if (err) return closeDbAndExit(false, `Error creating role_permissions table: ${err.message}`);
    console.log('Role_permissions table ensured.');

    db.get("SELECT COUNT(*) as count FROM role_permissions", (err, row) => {
      if (err) return closeDbAndExit(false, `Error counting role_permissions: ${err.message}`);

      if (row.count === 0) {
        const assignments = [
          { role_id: 3, permission_id: 3 }, { role_id: 3, permission_id: 2 },
          { role_id: 2, permission_id: 3 }, { role_id: 2, permission_id: 2 }, { role_id: 2, permission_id: 1 },
          { role_id: 1, permission_id: 1 }, { role_id: 1, permission_id: 2 }, { role_id: 1, permission_id: 3 }, { role_id: 1, permission_id: 4 }, { role_id: 1, permission_id: 5 },
        ];

        const stmt = db.prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
        let assignmentsDone = 0;
        let assignmentsAttempted = 0;
        assignments.forEach(assign => stmt.run([assign.role_id, assign.permission_id], function(runErr) {
            assignmentsAttempted++;
            if (runErr) console.error(`Error assigning permission ${assign.permission_id} to role ${assign.role_id}: ${runErr.message}`);
            else assignmentsDone++;

            if (assignmentsAttempted === assignments.length) { // All run calls have finished
                stmt.finalize(finalizeErr => {
                    if (finalizeErr) return closeDbAndExit(false, `Error finalizing role_permissions insertion: ${finalizeErr.message}`);
                    console.log(`${assignmentsDone} default role_permissions inserted.`);
                    closeDbAndExit(true, 'Database setup script finished successfully.');
                });
            }
        }));
        if (assignments.length === 0) {
             stmt.finalize(finalizeErr => { // Should not happen with current assignments
                if (finalizeErr) return closeDbAndExit(false, `Error finalizing role_permissions (no assignments): ${finalizeErr.message}`);
                closeDbAndExit(true, 'No role_permission assignments to perform.');
             });
        }
      } else {
        console.log('Role_permissions table already populated.');
        closeDbAndExit(true, 'Database setup script finished (tables already populated).');
      }
    });
  });
}
