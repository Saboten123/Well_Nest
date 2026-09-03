export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  return res.status(status).json({
    success: false,
    message: err.message || "Server error",
  });
}
