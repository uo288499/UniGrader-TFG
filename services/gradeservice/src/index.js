// @ts-check
const express = require("express");
const { setupDefaultHandlers } = require("@unigrader/common");
const config = require("./config");

/** @type {import("mongoose")} */
let mongoose;

/**
 * Connects to the MongoDB database.
 * @param {string} uri MongoDB URI
 */
async function connectDB(uri) {
  console.log("connecting to db");
  try {
    mongoose = require("mongoose");
    await mongoose.connect(uri);
    console.log("connected to db");
  } catch (err) {
    console.error(err, "unable to connect to db");
    process.exit(1);
  }
}

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
    await mongoose?.connection?.close().catch((err) =>
      console.warn("unable to disconnect from db", err)
    );
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

// Configure Express
const app = express();
app.set("trust proxy", true);
app.use(express.json());

setupDefaultHandlers(app);

connectDB(config.mongoUri);
module.exports = {server: startServer(app, config.port, config.name), connectDB, app, startServer};