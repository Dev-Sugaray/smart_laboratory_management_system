const request = require('supertest');
const { app, db } = require('../index'); // Import app and db from your server file

describe('API Endpoints', () => {
  beforeAll((done) => {
    // Ensure the database and table are set up before tests run
    // This is a simplified setup; more complex scenarios might need migrations/seeders
    db.serialize(() => {
      db.run("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT)", (err) => {
        if (err) return done(err);
        // Clear old test messages before inserting new one to ensure idempotency for this simple test
        db.run("DELETE FROM messages WHERE text = 'Test message from test setup' OR text = 'Hello from backend!'", () => {
          db.run("INSERT INTO messages (text) VALUES (?)", ["Test message from test setup"], (err) => {
            if (err) return done(err);
            done();
          });
        });
      });
    });
  });

  afterAll((done) => {
    // Clean up the database and close connection
    db.serialize(() => {
      db.run("DELETE FROM messages WHERE text = 'Test message from test setup'", (err) => {
         // Optional: db.run("DROP TABLE IF EXISTS messages");
        if (err) return done(err);
        db.close((err) => {
          if (err) return done(err);
          console.log('Database connection closed for tests.');
          done();
        });
      });
    });
  });

  it('should fetch messages from /api/test', async () => {
    const response = await request(app).get('/api/test');
    expect(response.statusCode).toBe(200);
    expect(response.body.messages).toBeDefined();
    expect(Array.isArray(response.body.messages)).toBe(true);
    // Check if the seeded message is present
    const texts = response.body.messages.map(m => m.text); // Extract text from message objects
    expect(texts).toContain('Test message from test setup');
  });
});
