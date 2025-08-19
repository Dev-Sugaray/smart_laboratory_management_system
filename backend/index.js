const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3001; // Backend server port

// Initial DB Setup (using the imported db)
// The console.log from database.js will indicate connection.




// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Optionally, serve index.html for all non-API routes (for SPA-like routing)
// app.get(/^\/(?!api\/).*/, (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });



// AFTER all API routes, add the catch-all for SPA (production only)
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test_production_build') {
  const frontendDistPath = path.resolve(__dirname, '..', 'frontend', 'dist');
  // app.get('*', (req, res) => {
//   res.sendFile(path.join(frontendDistPath, 'index.html'));
// });
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

module.exports = { app };
