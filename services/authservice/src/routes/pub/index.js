// @ts-check

const express = require("express");
const login = require("./login");
const users = require("./users");
const accounts = require("./accounts");
const password = require("./password")

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  const router = express.Router();
  login(router);
  users(router);
  accounts(router);
  password(router);
  app.use("/public", router);
};
