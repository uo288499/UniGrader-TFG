// @ts-check

const express = require("express");
const login = require("./login");
const password = require("./password")

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  const router = express.Router();
  login(router);
  password(router);
  app.use("/public", router);
};
