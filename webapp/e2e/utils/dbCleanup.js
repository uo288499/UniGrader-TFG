const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

async function cleanDatabases() {
  const uriPath = path.resolve(__dirname, "../.mongo-uri");
  if (fs.existsSync(uriPath)) {
    process.env.MONGODB_URI = fs.readFileSync(uriPath, "utf-8");
  }
  if (!process.env.MONGODB_URI) {
    console.warn("No MONGODB_URI provided, skipping cleanup");
    return;
  }

  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const admin = client.db().admin();
  const { databases } = await admin.listDatabases();

  for (const dbInfo of databases) {
    const dbName = dbInfo.name;
    if (["admin", "local", "config", "unigrader_auth"].includes(dbName)) continue;

    const db = client.db(dbName);
    const collections = await db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }

  await client.close();
  console.log("Databases cleaned except authservice");
}

module.exports = cleanDatabases;