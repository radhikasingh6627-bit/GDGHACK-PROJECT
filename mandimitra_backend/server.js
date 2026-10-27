const app = require('./app');
const config = require('./src/config/env');

/**
 * Start the HTTP server with automatic port-in-use fallback.
 * On macOS, AirPlay Receiver frequently occupies port 5000.
 */
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`MandiMitra backend server listening on port ${port}`);
    console.log(`Health check: http://localhost:${port}/api/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = Number(port) + 1;
      console.warn(`[Warning] Port ${port} is in use (common on macOS due to AirPlay).`);
      console.log(`[Info] Falling back to port ${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  return server;
}

const portToUse = parseInt(process.env.PORT, 10) || config.port || 5001;
const server = startServer(portToUse);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

module.exports = server;
