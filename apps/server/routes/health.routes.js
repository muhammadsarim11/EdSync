import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Liveness + readiness for the hosting platform (e.g. Render's health
// check path). 200 only when the database connection is up, 503 otherwise,
// so a server that has lost MongoDB gets restarted instead of serving errors.
// Deliberately unauthenticated and free of anything sensitive.
router.get('/', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'degraded',
    database: dbUp ? 'up' : 'down',
    uptimeSeconds: Math.round(process.uptime())
  });
});

export default router;
