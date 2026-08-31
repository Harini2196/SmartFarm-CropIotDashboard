// server.js
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

async function start() {
  // sql.js loads its WASM binary asynchronously, so the database must be
  // ready before any route touches it. Routes are only required/mounted
  // after this resolves.
  await initDb();

  const cropsRouter = require('./routes/crops');
  const readingsRouter = require('./routes/readings');
  app.use('/api/crops', cropsRouter);
  app.use('/api/readings', readingsRouter);

  // Fallback 404 for unknown API routes (keeps the API from ever hanging silently)
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // Last-resort handler so an unexpected failure always returns the required JSON error shape
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`SmartFarm backend running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
