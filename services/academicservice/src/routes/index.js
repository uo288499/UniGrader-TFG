// @ts-check

const express = require("express");
const universities = require("./universities");
const studyPrograms = require("./studyPrograms");
const academicYears = require("./academicYears");
const evaluationTypes = require("./evaluationTypes");
const subjects = require("./subjects");
const courses = require("./courses");
const enrollments = require("./enrollments");
const groups = require("./groups");

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  const router = express.Router();
  universities(router);
  studyPrograms(router);
  academicYears(router);
  evaluationTypes(router);
  subjects(router);
  courses(router);
  enrollments(router);
  groups(router);
  app.use(router);
};
