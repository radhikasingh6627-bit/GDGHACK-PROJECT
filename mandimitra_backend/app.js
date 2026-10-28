const express = require('express');
const cors = require('cors');
const healthRoutes = require('./src/routes/health.routes');
const priceRoutes = require('./src/routes/priceRoutes');
const mandiRoutes = require('./src/routes/mandiRoutes');
const queryRoutes = require('./src/routes/queryRoutes');
const alertRoutes = require('./src/routes/alertRoutes');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');

const app = express();

// Enable Cross-Origin Resource Sharing (explicitly allowing frontend at http://localhost:3000)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Parse incoming JSON request bodies
app.use(express.json());

// API Routes
app.use('/api', healthRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/mandis', mandiRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api', queryRoutes);

// Catch-all 404 handler for undefined routes
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
