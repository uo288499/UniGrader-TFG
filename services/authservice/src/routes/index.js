// @ts-check

const express = require("express");
const users = require("./users");
const accounts = require("./accounts");
const passwordChange = require("./passwordChange");
const verify = require("./verify");

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  const router = express.Router();
  users(router);
  accounts(router);
  passwordChange(router);
  verify(router);
  app.use(router);
};
