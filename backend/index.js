const express = require('express');
const path = require('path');
const app = express();

// Serve all static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// For any other request, serve the main index.html file.
// This is useful for single-page applications.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

module.exports = { app };