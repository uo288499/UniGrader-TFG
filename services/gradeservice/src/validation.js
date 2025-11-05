// @ts-check
const { body, validationResult } = require("express-validator");

/**
 * @type {(status: number, ...vals: import("express").RequestHandler[]) => import("express").RequestHandler[]}
 */
const setup = (status, ...vals) => {
  vals.push((req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(status).json({
        success: false,
        errorKey: "badRequest",
        errors: errors.mapped(),
      });
    } else next();
  });
  return vals;
};

module.exports = {
  fields: {
    user: body("user").optional(),

    // --- Grade Fields ---
    gradeArray: body("grades").isArray(), 
    gradeStudentId: body("grades.*.studentId").isMongoId(),
    gradeItemId: body("grades.*.itemId").isMongoId(),
    gradeCourseId: body("grades.*.courseId").isMongoId(),
    gradeValue: body("grades.*.value")
      .optional({ nullable: true, checkFalsy: true })
      .isNumeric()
      .custom((/** @type {number} */ v) => v >= 0 && v <= 10),

    // --- Final Grade Fields ---
    finalGradeStudentId: body("studentId").isMongoId(),
    finalGradeCourseId: body("courseId").isMongoId(),
    finalGradeAcademicYearId: body("academicYearId").isMongoId(),
    finalGradeEvaluationPeriod: body("evaluationPeriod")
    .isString()
    .isIn(["Ordinary", "Extraordinary"]),
    finalGradeValue: body("value").optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .custom((/** @type {number} */ v) => v >= 0 && v <= 10),
    finalGradeIsPassed: body("isPassed").isBoolean(),
  },
  setup,
};