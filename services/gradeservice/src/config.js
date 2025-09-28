// @ts-check
const pkg = require("../package.json");

module.exports = {
  name: `${pkg.name}@${pkg.version}`,
  port: Number(process.env.PORT ?? 8004),
  mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/unigrader_grade",
};