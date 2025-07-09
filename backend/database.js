// backend/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database from database.js', err.message);
    // It's crucial to handle this error properly. Exiting or throwing might be appropriate
    // depending on how critical the DB is at startup. For now, just logging.
  } else {
    console.log('Connected to the SQLite database via database.js.');
  }
});

module.exports = db;
