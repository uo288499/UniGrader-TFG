// @ts-check

const express = require("express");
const evaluationPolicies = require("./evaluationPolicies");
const evaluationSystems = require("./evaluationSystems");

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  const router = express.Router();
  evaluationPolicies(router);
  evaluationSystems(router);
  app.use(router);
};