function errorHandler (err, req, res, next) {
  console.error('Error:', err);
  
  // Handle specific error types
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ 
      success: false, 
      error: 'Duplicate entry - resource already exists' 
    });
  }
  
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ 
      success: false, 
      error: 'Referenced resource not found' 
    });
  }

  // Default error response
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

module.exports = { errorHandler };
