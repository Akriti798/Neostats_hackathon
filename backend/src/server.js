require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Attempt DB connection if MONGODB_URI is provided
if (process.env.MONGODB_URI) {
  connectDB();
}

app.listen(PORT, () => {
  console.log(`[Server] API server running on http://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});
