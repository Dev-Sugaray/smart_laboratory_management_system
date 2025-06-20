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
        const permissions = [
          // Existing
          'create_user', 'manage_inventory', 'view_reports', 'delete_user', 'edit_settings',
          // New Sample Management Permissions
          'register_sample', 'view_sample_details', 'update_sample_status', 'generate_barcode',
          'manage_storage_locations', 'view_sample_lifecycle', 'manage_chain_of_custody',
          'manage_sample_types', 'manage_sources', 'view_all_samples', 
          // Instrument Management Permissions
          'manage_instruments', 'view_instruments', 'log_instrument_usage', 'view_instrument_usage'
          // New Experiment and Test Management Permissions
          'manage_experiments', 'view_experiments', 'manage_tests', 'view_tests',
          'request_sample_tests', 'enter_test_results', 'validate_test_results', 'approve_test_results'
        ];
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

function createInstrumentsTable() {
  db.run(`CREATE TABLE IF NOT EXISTS instruments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    make TEXT,
    model TEXT,
    serial_number TEXT UNIQUE NOT NULL,
    calibration_date TEXT,
    maintenance_schedule TEXT,
    status TEXT CHECK(status IN ('Available', 'In Use', 'Under Maintenance', 'Retired')) DEFAULT 'Available',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) return closeDbAndExit(false, `Error creating instruments table: ${err.message}`);
    console.log('Instruments table ensured.');
    createInstrumentUsageLogsTable(); // Next table
  });
}

function createInstrumentUsageLogsTable() {
  db.run(`CREATE TABLE IF NOT EXISTS instrument_usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instrument_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instrument_id) REFERENCES instruments(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`, (err) => {
    if (err) return closeDbAndExit(false, `Error creating instrument_usage_logs table: ${err.message}`);
    console.log('Instrument_usage_logs table ensured.');
    createSampleTypesTable(); // Next table
  });
}


// START: Experiment and Test Management Tables

function createExperimentsTable() {
  db.run(\`CREATE TABLE IF NOT EXISTS experiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )\`, (err) => {
    if (err) return closeDbAndExit(false, \`Error creating experiments table: \${err.message}\`);
    console.log('Experiments table ensured.');
    createTestsTable(); // Next table in this sequence
  });
}

function createTestsTable() {
  db.run(\`CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    protocol TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )\`, (err) => {
    if (err) return closeDbAndExit(false, \`Error creating tests table: \${err.message}\`);
    console.log('Tests table ensured.');
    createExperimentTestsTable(); // Next table in this sequence
  });
}

function createExperimentTestsTable() {
  db.run(\`CREATE TABLE IF NOT EXISTS experiment_tests (
    experiment_id INTEGER NOT NULL,
    test_id INTEGER NOT NULL,
    PRIMARY KEY (experiment_id, test_id),
    FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
  )\`, (err) => {
    if (err) return closeDbAndExit(false, \`Error creating experiment_tests table: \${err.message}\`);
    console.log('Experiment_tests table ensured.');
    createSampleTestsTable(); // Next table in this sequence
  });
}

function createSampleTestsTable() {
  db.run(\`CREATE TABLE IF NOT EXISTS sample_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sample_id INTEGER NOT NULL,
    test_id INTEGER NOT NULL,
    experiment_id INTEGER, -- Optional
    status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'In Progress', 'Completed', 'Validated', 'Approved', 'Rejected')),
    results TEXT,
    requested_by_user_id INTEGER NOT NULL,
    assigned_to_user_id INTEGER,
    requested_at TEXT DEFAULT CURRENT_TIMESTAMP,
    result_entry_date TEXT,
    validated_at TEXT,
    validated_by_user_id INTEGER,
    approved_at TEXT,
    approved_by_user_id INTEGER,
    notes TEXT,
    FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE SET NULL,
    FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (validated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  )\`, (err) => {
    if (err) return closeDbAndExit(false, \`Error creating sample_tests table: \${err.message}\`);
    console.log('Sample_tests table ensured.');
    // After these tables are created, proceed to create sample management specific tables.
    createSampleTypesTable();
  });
}

// END: Experiment and Test Management Tables

 
// START: Sample Management Tables

function createSampleTypesTable() {
  db.run(`CREATE TABLE IF NOT EXISTS sample_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
  )`, (err) => {
    if (err) return closeDbAndExit(false, `Error creating sample_types table: ${err.message}`);
    console.log('Sample_types table ensured.');
    createSourcesTable(); // Next table
  });
}

function createSourcesTable() {
  db.run(`CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
  )`, (err) => {
    if (err) return closeDbAndExit(false, `Error creating sources table: ${err.message}`);
    console.log('Sources table ensured.');
    createStorageLocationsTable(); // Next table
  });
}

function createStorageLocationsTable() {
  db.run(`CREATE TABLE IF NOT EXISTS storage_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    temperature REAL,
    capacity INTEGER,
    current_load INTEGER DEFAULT 0
  )`, (err) => {
    if (err) return closeDbAndExit(false, `Error creating storage_locations table: ${err.message}`);
    console.log('Storage_locations table ensured.');
    createSamplesTable(); // Next table
  });
}

function createSamplesTable() {
  db.run(`CREATE TABLE IF NOT EXISTS samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_sample_id TEXT UNIQUE NOT NULL,
    sample_type_id INTEGER,
    source_id INTEGER,
    collection_date TEXT,
    registration_date TEXT DEFAULT CURRENT_TIMESTAMP,
    storage_location_id INTEGER,
    current_status TEXT NOT NULL CHECK(current_status IN ('Registered', 'In Storage', 'In Analysis', 'Discarded', 'Archived')),
    barcode_qr_code TEXT UNIQUE,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sample_type_id) REFERENCES sample_types(id),
    FOREIGN KEY (source_id) REFERENCES sources(id),
    FOREIGN KEY (storage_location_id) REFERENCES storage_locations(id)
  )`, (err) => {
    if (err) return closeDbAndExit(false, `Error creating samples table: ${err.message}`);
    console.log('Samples table ensured.');
    createChainOfCustodyTable(); // Next table
  });
}

function createChainOfCustodyTable() {
  db.run(`CREATE TABLE IF NOT EXISTS chain_of_custody (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sample_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    previous_location_id INTEGER,
    new_location_id INTEGER,
    notes TEXT,
    FOREIGN KEY (sample_id) REFERENCES samples(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (previous_location_id) REFERENCES storage_locations(id),
    FOREIGN KEY (new_location_id) REFERENCES storage_locations(id)
  )`, (err) => {
    if (err) return closeDbAndExit(false, `Error creating chain_of_custody table: ${err.message}`);
    console.log('Chain_of_custody table ensured.');
    // This is the last table in the new sequence
    closeDbAndExit(true, 'Database setup script finished successfully with Sample Management tables.');
  });
}

// END: Sample Management Tables

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
        // Define permissions per role by name
        const rolePermissionsMap = {
          'researcher': [
            'view_reports', 'manage_inventory', // Existing
            'register_sample', 'view_sample_details', 'update_sample_status',
            'generate_barcode', 'view_sample_lifecycle', 'manage_chain_of_custody',
            // Instrument Permissions for Researcher
            'view_instruments', 'log_instrument_usage', 'view_instrument_usage'

            // New Experiment and Test Permissions for Researcher
            'view_experiments', 'view_tests', 'request_sample_tests', 'enter_test_results'

          ],
          'lab_manager': [
            'view_reports', 'manage_inventory', 'create_user', // Existing
            'register_sample', 'view_sample_details', 'update_sample_status',
            'generate_barcode', 'view_sample_lifecycle', 'manage_chain_of_custody', // Researcher's sample perms
            'manage_storage_locations', 'manage_sample_types', 'manage_sources', 'view_all_samples',
 
            // Instrument Permissions for Lab Manager
            'manage_instruments', 'view_instruments', 'log_instrument_usage', 'view_instrument_usage'

            // New Experiment and Test Permissions for Lab Manager
            'manage_experiments', 'view_experiments', 'manage_tests', 'view_tests',
            'request_sample_tests', 'enter_test_results', 'validate_test_results'

          ],
          'administrator': [] // Admin gets all, will be handled separately
        };

        // Fetch all roles and permissions to map names to IDs
        db.all("SELECT id, name FROM roles", [], (err, roles) => {
          if (err) return closeDbAndExit(false, `Error fetching roles: ${err.message}`);
          db.all("SELECT id, name FROM permissions", [], (err, permissions) => {
            if (err) return closeDbAndExit(false, `Error fetching permissions: ${err.message}`);

            const roleNameToId = roles.reduce((acc, role) => { acc[role.name] = role.id; return acc; }, {});
            const permNameToId = permissions.reduce((acc, perm) => { acc[perm.name] = perm.id; return acc; }, {});

            const assignments = [];
            for (const roleName in rolePermissionsMap) {
              const roleId = roleNameToId[roleName];
              if (!roleId) {
                console.warn(`Role ${roleName} not found, skipping assignments.`);
                continue;
              }

              if (roleName === 'administrator') {
                // Administrator gets all permissions
                for (const perm of permissions) {
                  assignments.push({ role_id: roleId, permission_id: perm.id });
                }
              } else {
                rolePermissionsMap[roleName].forEach(permName => {
                  const permId = permNameToId[permName];
                  if (permId) {
                    assignments.push({ role_id: roleId, permission_id: permId });
                  } else {
                    console.warn(`Permission ${permName} for role ${roleName} not found, skipping.`);
                  }
                });
              }
            }

            if (assignments.length === 0) {
              console.log('No role-permission assignments to make.');
              createInstrumentsTable(); // Proceed to next step
              return;
            }

            const stmt = db.prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
            let assignmentsDone = 0;
            let assignmentsAttempted = 0;

            assignments.forEach(assign => {
              stmt.run([assign.role_id, assign.permission_id], function(runErr) {
                assignmentsAttempted++;
                if (runErr) {
                  // It's possible an assignment already exists if script is re-run, log as warning
                  if (runErr.message.includes('UNIQUE constraint failed')) {
                     console.warn(`Warning: Role-permission assignment already exists: role_id ${assign.role_id}, permission_id ${assign.permission_id}.`);
                     assignmentsDone++; // Count it as "done" for completion logic
                  } else {
                    console.error(`Error assigning permission ID ${assign.permission_id} to role ID ${assign.role_id}: ${runErr.message}`);
                  }
                } else {
                  assignmentsDone++;
                }

                if (assignmentsAttempted === assignments.length) {
                  stmt.finalize(finalizeErr => {
                    if (finalizeErr) return closeDbAndExit(false, `Error finalizing role_permissions insertion: ${finalizeErr.message}`);
                    console.log(`${assignmentsDone} role-permission assignments processed.`);
 
                    createInstrumentsTable(); // Next step

                    createExperimentsTable(); // Next step is to create experiment tables
 
                  });
                }
              });
            });
          });
        });
      } else {
        console.log('Role_permissions table already populated or seeding logic skipped.');
 
        createInstrumentsTable(); // Proceed to next step

        createExperimentsTable(); // Proceed to create experiment tables
 
      }
    });
  });
}
