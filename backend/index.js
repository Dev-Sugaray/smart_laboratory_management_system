const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = process.env.PORT || 3001; // Backend server port

// Create or connect to a database file
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Create a sample table if it doesn't exist
    db.run("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT)", (err) => {
      if (err) {
        console.error('Error creating table', err.message);
      } else {
        // Insert a sample message if table is empty
        db.get("SELECT COUNT(*) as count FROM messages", (err, row) => {
          if (err) {
            console.error('Error counting messages', err.message);
            return;
          }
          if (row.count === 0) {
            db.run("INSERT INTO messages (text) VALUES (?)", ["Hello from backend!"], (err) => {
              if (err) {
                console.error('Error inserting sample message', err.message);
              } else {
                console.log('Sample message inserted.');
              }
            });
          }
        });
      }
    });
  }
});

app.use(express.json());

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test_production_build') {
  const frontendDistPath = path.resolve(__dirname, '..', 'frontend', 'dist');
  console.log(`Serving static files from: ${frontendDistPath}`); // For debugging
  app.use(express.static(frontendDistPath));
}

// Sample API endpoint
app.get('/api/test', (req, res) => {
  db.all("SELECT text FROM messages", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ messages: rows.map(row => row.text) });
  });
});

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

module.exports = { app, db }; // Export for testing
