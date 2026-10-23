const express = require('express');
const cors = require('cors');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());

// Basic health check endpoint to verify backend is responding
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'NeoStats Project Management API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
