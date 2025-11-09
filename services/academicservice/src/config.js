// @ts-check
const pkg = require("../package.json");
require("dotenv").config()

module.exports = {
  name: `${pkg.name}@${pkg.version}`,
  port: Number(process.env.PORT ?? 8002),
  mongoUri: process.env.MONGODB_URI ? `${process.env.MONGODB_URI}unigrader_academic` : "mongodb://localhost:27017/unigrader_academic",
  universities: {
    maxNameLength: 200,
    maxAddressLength: 500,
    maxContactEmailLength: 100,
    maxContactPhoneLength: 30,
  },

  studyPrograms: {
    maxNameLength: 200,
    allowedTypes: ["Bachelor", "Master", "Doctorate", "Postgraduate", "Specialization", "Other"]
  },

  cloudinary: {
    cloudName: process.env.CLOUD_NAME,
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
  },
};