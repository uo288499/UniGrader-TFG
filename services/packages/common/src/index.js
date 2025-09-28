/**
 * Default handlers for 404 and unhandled errors.
 *
 * ⚠️ IMPORTANT: This function must be called after all other routes.
 *
 * @param {import("express").Application} app Express application
 */
function setupDefaultHandlers(app) {
  // Default Handler for 404
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      errorKey: "notFound",
    });
  });

  // Global Error Handler
  app.use((err, req, res, _next) => {
    console.error(err, "unhandled error");
    if (!res.writableEnded) {
      const status = (err.expose ? err.status : undefined) ?? 500;
      res.status(status).json({
        success: false,
        errorKey: status === 404 ? "notFound" : "serverError",
      });
    }
  });
}

module.exports = {
  setupDefaultHandlers,
};
