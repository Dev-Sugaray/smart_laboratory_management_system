const jwt = require('jsonwebtoken');
const db = require('./database'); // Import the shared db instance

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
    // Allow all permissions for everyone
    return next();
  };
};

module.exports = { authenticateToken, authorize };
