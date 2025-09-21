function errorHandler (err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const msg = err.message || 'Internal Server Error';
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(status).json({
    success: false,
    error: msg,
    details: isProduction ? null : err.details || null
  });
}

module.exports = { errorHandler };
