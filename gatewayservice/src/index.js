// @ts-check

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const promBundle = require("express-prom-bundle");
const {
  setupDefaultHandlers,
} = require("@unigrader/common");

const config = require("./config");

/**
 * Starts the server and listens on the specified port.
 * @param {import("express").Application} app Express application
 * @param {number} port Port to listen on
 * @param {string} name Service name
 * @returns Server instance
 */
function startServer(app, port, name) {
  console.log("starting server");
  const server = app.listen(port, (err) => {
    if (err == null) console.log(`${name} started! listening at http://localhost:${port}`);
    else {
      console.error(err, "unable to start server");
      server.close();
    }
  });

  server.on("close", async () => {
    console.log("shutdown complete");
  });

  const shutdown = () => {
    console.warn("shutting down");
    server.close();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return server;
}

// Create app
const app = express();

// @ts-expect-error
app.use(helmet.default(config.helmet));
app.use(cors(config.cors));

app.use(express.json({ limit: '11mb' }));
app.use(express.urlencoded({ limit: '11mb', extended: true })); 

const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

// Health Check
app.get("/health", (_req, res) => {
  res.json({ status: "OK" });
});

// Setup Proxy
require("./auth")(app);
require("./proxy")(app);

setupDefaultHandlers(app);

module.exports = startServer(app, config.port, config.name);