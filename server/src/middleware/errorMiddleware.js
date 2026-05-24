const errorMiddleware = (err, req, res, next) => {
  console.error("Server Error:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  return res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = errorMiddleware;