const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);

  // Set default error status and message
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Database connection failed';
  }

  // Ensure status code is valid
  if (statusCode < 400 || statusCode > 599) {
    statusCode = 500;
  }

  // Return JSON error response
  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
