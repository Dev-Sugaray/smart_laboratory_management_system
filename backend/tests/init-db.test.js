const sqlite3 = require('sqlite3').verbose();
const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');

// Path to the init-db.js script and a test database
const initDbScriptPath = path.resolve(__dirname, '../init-db.js');
const testDbPath = path.resolve(__dirname, 'test_database_init.db');

describe('Database Initialization (init-db.js)', () => {
  // Cleanup test database file before and after tests
  beforeEach((done) => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    done();
  });

  afterAll((done) => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    done();
  });

  test('should run init-db.js script successfully and create all tables', (done) => {
    // Execute the init-db.js script against the test database
    // Node: This requires init-db.js to be configurable for DB path or to use a relative path that can be controlled.
    // For this test, we'll assume init-db.js uses a DB named 'database.db' in its own directory.
    // We will temporarily copy init-db.js to the test directory and run it there so it creates test_database_init.db
    // This is a workaround. A better solution is for init-db.js to accept a DB path argument.

    const tempInitDbScriptPath = path.resolve(__dirname, 'temp_init-db.js');

    // Modify the script to use testDbPath
    let initDbContent = fs.readFileSync(initDbScriptPath, 'utf8');
    const dbNameRegex = /database\.db/g;
    const modifiedInitDbContent = initDbContent.replace(dbNameRegex, 'test_database_init.db');

    fs.writeFileSync(tempInitDbScriptPath, modifiedInitDbContent);

    exec(`node ${tempInitDbScriptPath}`, { cwd: __dirname }, (error, stdout, stderr) => {
      if (fs.existsSync(tempInitDbScriptPath)) {
        fs.unlinkSync(tempInitDbScriptPath); // Clean up temporary script
      }

      expect(error).toBeNull(); // Script should exit cleanly
      expect(stderr).toBe(''); // No errors in stderr

      // Now, verify the database structure
      const db = new sqlite3.Database(testDbPath, sqlite3.OPEN_READONLY, (err) => {
        expect(err).toBeNull(); // Should be able to open the DB

        const tablesToVerify = ['roles', 'permissions', 'users', 'sample_types', 'sources', 'storage_locations', 'samples', 'chain_of_custody', 'experiments', 'tests', 'experiment_tests', 'sample_tests'];
        let tablesChecked = 0;

        tablesToVerify.forEach(tableName => {
          db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?;`, tableName, (err, row) => {
            expect(err).toBeNull();
            expect(row).toBeDefined();
            expect(row.name).toBe(tableName);
            tablesChecked++;
            if (tablesChecked === tablesToVerify.length) {
              db.close(done); // Close DB and signal test completion
            }
          });
        });
      });
    });
  }, 25000); // Increased timeout for script execution and DB checks

  test('should insert new permissions correctly', (done) => {
    const tempInitDbScriptPath = path.resolve(__dirname, 'temp_init-db_perms.js');
    let initDbContent = fs.readFileSync(initDbScriptPath, 'utf8');
    const modifiedInitDbContent = initDbContent.replace(/database\.db/g, 'test_database_init.db');
    fs.writeFileSync(tempInitDbScriptPath, modifiedInitDbContent);

    exec(`node ${tempInitDbScriptPath}`, { cwd: __dirname }, (error) => {
      if (fs.existsSync(tempInitDbScriptPath)) {
        fs.unlinkSync(tempInitDbScriptPath);
      }
      expect(error).toBeNull();

      const db = new sqlite3.Database(testDbPath, sqlite3.OPEN_READONLY, (err) => {
        expect(err).toBeNull();
        const newPermissions = [
          'manage_experiments', 'view_experiments', 'manage_tests', 'view_tests',
          'request_sample_tests', 'enter_test_results', 'validate_test_results', 'approve_test_results'
        ];
        let permsChecked = 0;
        newPermissions.forEach(permName => {
          db.get("SELECT name FROM permissions WHERE name = ?", [permName], (pErr, pRow) => {
            expect(pErr).toBeNull();
            expect(pRow).toBeDefined();
            expect(pRow.name).toBe(permName);
            permsChecked++;
            if (permsChecked === newPermissions.length) {
              db.close(done);
            }
          });
        });
      });
    });
  }, 25000);

  test('should assign new permissions to roles correctly', (done) => {
    const tempInitDbScriptPath = path.resolve(__dirname, 'temp_init-db_roleperms.js');
    let initDbContent = fs.readFileSync(initDbScriptPath, 'utf8');
    const modifiedInitDbContent = initDbContent.replace(/database\.db/g, 'test_database_init.db');
    fs.writeFileSync(tempInitDbScriptPath, modifiedInitDbContent);

    exec(`node ${tempInitDbScriptPath}`, { cwd: __dirname }, (error) => {
      if (fs.existsSync(tempInitDbScriptPath)) {
        fs.unlinkSync(tempInitDbScriptPath);
      }
      expect(error).toBeNull();

      const db = new sqlite3.Database(testDbPath, sqlite3.OPEN_READONLY, (err) => {
        expect(err).toBeNull();

        const expectedRolePermissions = {
          'administrator': ['manage_experiments', 'view_experiments', 'manage_tests', 'view_tests', 'request_sample_tests', 'enter_test_results', 'validate_test_results', 'approve_test_results'],
          'lab_manager': ['manage_experiments', 'view_experiments', 'manage_tests', 'view_tests', 'request_sample_tests', 'enter_test_results', 'validate_test_results'],
          'researcher': ['view_experiments', 'view_tests', 'request_sample_tests', 'enter_test_results']
        };

        let checks = 0;
        const totalChecks = Object.values(expectedRolePermissions).reduce((sum, perms) => sum + perms.length, 0);

        for (const roleName in expectedRolePermissions) {
          expectedRolePermissions[roleName].forEach(permName => {
            const query = `
              SELECT COUNT(*) as count
              FROM role_permissions rp
              JOIN roles r ON rp.role_id = r.id
              JOIN permissions p ON rp.permission_id = p.id
              WHERE r.name = ? AND p.name = ?
            `;
            db.get(query, [roleName, permName], (rpErr, rpRow) => {
              expect(rpErr).toBeNull();
              expect(rpRow.count).toBe(1); // Ensure the permission is assigned
              checks++;
              if (checks === totalChecks) {
                db.close(done);
              }
            });
          });
        }
      });
    });
  }, 25000);
});
