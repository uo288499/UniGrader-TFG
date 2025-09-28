// @ts-check
const {
  createProxyMiddleware,
  fixRequestBody,
} = require("http-proxy-middleware");
const config = require("./config");

/**
 * @param {import("express").Application} app
 */
module.exports = (app) =>
  app.use(
    createProxyMiddleware({
      router: (req) => config.urls[req.url?.split("/")[1]],
      pathRewrite: { "^/[^/]+/?": "" },
      pathFilter: (path) => config.urls[path.split("/")[1]] !== undefined,
      on: {
        /**
         * Error handler
         * @param {NodeJS.ErrnoException} err
         * @param {import('express').Request} req
         * @param {import('express').Response} res
         */
        // @ts-expect-error
        error: (err, req, res) => {
          switch (err.code) {
            case "ECONNRESET":
            case "ENOTFOUND":
            case "ECONNREFUSED":
            case "ETIMEDOUT":
              console.warn("Proxied service error:", err);
              res
                .status(504)
                .json({ success: false, errorKey: "serviceUnavailable" });
              break;
            default:
              console.error("Proxy error:", err);
              res
                .status(500)
                .json({ success: false, errorKey: "serverError" });
              break;
          }
        },
        proxyReq: fixRequestBody,
      },
      ...config.proxyOpts,
    })
  );
