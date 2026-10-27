/**
 * 404 Handler for undefined routes
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
}

/**
 * Centralized Express error handler
 * Catches errors passed via next(err) or uncaught in middleware/controllers
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message
    }
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
