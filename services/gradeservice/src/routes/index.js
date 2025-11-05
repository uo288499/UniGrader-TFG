// @ts-check

const express = require("express");
const grades = require("./grades");
const finalGrades = require("./finalGrades");

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  const router = express.Router();
  grades(router);
  finalGrades(router);
  app.use(router);
};