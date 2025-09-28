// @ts-check
const express = require("express");
const { setupDefaultHandlers } = require("@unigrader/common");
const config = require("./config");
const { User, EmailAccount } = require("./models");
const argon2 = require("argon2");
const cloudinary = require("cloudinary").v2; 

// Inicializar Cloudinary con las credenciales del archivo config
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret
});

/** @type {import("mongoose")} */
let mongoose;

/**
 * Connects to the MongoDB database.
 * @param {string} uri MongoDB URI
 */
async function connectDB(uri) {
  console.log("connecting to db");
  try {
    // Dynamic import
    mongoose = require("mongoose");

    await mongoose.connect(uri);
    console.log("connected to db");

    await createGlobalAdminIfMissing();
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

// Function to create the global admin if it doesn't exist
const createGlobalAdminIfMissing = async () => {
  try {
    const adminAccount = await EmailAccount.findOne({ role: "global-admin" });
    if (!adminAccount) {
      console.log("No global admin found. Creating one...");

      // Hash the default password
      const hashedPassword = await argon2.hash(
        config.defaultAdmin.password,
        config.crypt
      );

      // Create a random user profile for the admin
      const newUser = await User.create({
        identityNumber: "11111111A",
        name: "Global",
        firstSurname: "Admin",
        secondSurname: "",
        photoUrl: "",
      });

      // Create the email account for the admin
      await EmailAccount.create({
        email: config.defaultAdmin.email,
        password: hashedPassword,
        userId: newUser._id,
        universityId: null,
        role: "global-admin",
      });

      console.log("Global admin account created successfully!");
    } else {
      console.log("Global admin account already exists. Skipping creation.");
    }
  } catch (err) {
    console.error("Error creating global admin account:", err);
    throw err; 
  }
};

// Configure Express
const app = express();
app.set("trust proxy", true);

app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ limit: '6mb', extended: true }));

// Routes
require("./routes/pub")(app);
require("./routes/verify")(app);
require("./routes/passwordChange")(app);

setupDefaultHandlers(app);

connectDB(config.mongoUri);
module.exports = {server: startServer(app, config.port, config.name), createGlobalAdminIfMissing};