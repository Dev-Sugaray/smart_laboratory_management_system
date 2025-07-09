const jwt = require('jsonwebtoken');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, userPayload) => {
    if (err) {
      console.error('JWT verification error:', err.message);
      return res.sendStatus(403);
    }
    req.user = userPayload;
    next();
  });
};

// Authorization Middleware (Higher-Order Function)
const authorize = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.userId || !req.user.role) {
      console.error('Authorization error: User or role not found on request object.');
      return res.sendStatus(403);
    }
    db.get("SELECT id FROM roles WHERE name = ?", [req.user.role], (err, roleRow) => {
      if (err || !roleRow) {
        console.error('Authorization error: Role not found in DB for role name:', req.user.role, err);
        return res.status(500).json({ error: "Error validating user role." });
      }
      const roleId = roleRow.id;
      const placeholders = requiredPermissions.map(() => '?').join(',');
      const sql = `
        SELECT p.name
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ? AND p.name IN (${placeholders})
      `;
      db.all(sql, [roleId, ...requiredPermissions], (err, rows) => {
        if (err) {
          console.error('Error fetching user permissions:', err.message);
          return res.status(500).json({ error: 'Error checking permissions.' });
        }
        const hasAllPermissions = requiredPermissions.every(rp => rows.some(row => row.name === rp));
        if (hasAllPermissions) {
          next();
        } else {
          console.warn(`Authorization failed for user ${req.user.username} (role ${req.user.role}): Missing one or more of permissions: ${requiredPermissions.join(', ')}`);
          res.status(403).json({ error: 'Forbidden: Insufficient permissions.' });
        }
      });
    });
  };
};

module.exports = { authenticateToken, authorize, db };
