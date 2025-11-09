// @ts-check
const pkg = require("../package.json");

module.exports = {
  name: `${pkg.name}@${pkg.version}`,
  port: Number(process.env.PORT ?? 8003),
  mongoUri: process.env.MONGODB_URI ? `${process.env.MONGODB_URI}unigrader_eval` : "mongodb://localhost:27017/unigrader_eval",
};