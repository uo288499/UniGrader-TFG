const { MongoMemoryServer } = require('mongodb-memory-server');
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

process.env.NODE_ENV = 'test';

const envPath = path.resolve(__dirname, "../../.env");
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.warn(`Could not load .env file from ${envPath}`);
} else {
  console.log(`Loaded environment variables from ${envPath}`);
}

let mongoserver;
let academicservice;
let authservice;
let auditservice;
let gatewayservice;
let gradeservice;
let evalservice;

async function startServer() {
    console.log('Starting MongoDB memory server...');
    mongoserver = await MongoMemoryServer.create();
    const mongoUri = mongoserver.getUri();

    const uriPath = path.resolve(__dirname, "./.mongo-uri");
    fs.writeFileSync(uriPath, mongoUri);
    process.env.MONGODB_URI = mongoUri;

    console.log(`Mongo Memory Server started on ${mongoUri}`);

    authservice = await require("../../services/authservice/src/index");
    evalservice = await require("../../services/evalservice/src/index");
    gatewayservice = await require("../../gatewayservice/src/index");
    gradeservice = await require("../../services/gradeservice/src/index");
    auditservice = await require("../../services/auditservice/src/index");
    academicservice = await require("../../services/academicservice/src/index");
}

startServer();
