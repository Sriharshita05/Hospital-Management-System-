export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

// Catches anything thrown outside a controller's own try/catch
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON in request body" });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body too large" });
  }

  console.error("Unhandled error:", err.message);

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
};
