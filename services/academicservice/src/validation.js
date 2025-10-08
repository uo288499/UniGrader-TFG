// @ts-check
const { body, validationResult } = require("express-validator");
const config = require("./config");

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
    // --- University Fields ---
    name: body("name")
      .isString()
      .isLength({ min: 3, max: config.universities.maxNameLength }),
    smallLogoUrl: body("smallLogoUrl").optional({ nullable: true, checkFalsy: true }).isURL(),
    largeLogoUrl: body("largeLogoUrl").optional({ nullable: true, checkFalsy: true }).isURL(),
    address: body("address")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: config.universities.maxAddressLength }),
    contactEmail: body("contactEmail")
      .optional({ nullable: true, checkFalsy: true })
      .isEmail()
      .isLength({ max: config.universities.maxContactEmailLength }),
    contactPhone: body("contactPhone")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: config.universities.maxContactPhoneLength }),
    user: body("user").optional(),
    createdAt: body("createdAt").optional().isISO8601(),
    updatedAt: body("updatedAt").optional().isISO8601(),
    id: body("_id").optional().isMongoId(),
    v: body("__v").optional().isInt({ min: 0 }),
    smallLogoBase64: body("smallLogoBase64")
      .optional({ nullable: true, checkFalsy: true })
      .isString(),
    largeLogoBase64: body("largeLogoBase64")
      .optional({ nullable: true, checkFalsy: true })
      .isString(),
    // --- Study Program Fields ---
    programName: body("name")
      .isString()
      .isLength({ min: 3, max: config.studyPrograms.maxNameLength }),
    programType: body("type")
      .isString()
      .isIn(config.studyPrograms.allowedTypes),
    universityId: body("universityId")
      .isMongoId(),
    // --- Academic Year Fields ---
      yearLabel: body("yearLabel")
        .isString()
        .isLength({ min: 3, max: 50 }),
      startDate: body("startDate")
        .isISO8601()
        .toDate(),
      endDate: body("endDate")
        .isISO8601()
        .toDate(),
    // --- Evaluation Type Fields ---
      evaluationTypeName: body("name")
        .isString()
        .isLength({ min: 3, max: 50 }),

    // --- Subject Fields ---
    subjectName: body("name")
      .isString()
      .isLength({ min: 3, max: 100 }),
    subjectCode: body("code")
      .isString()
      .isLength({ min: 2, max: 20 }),
    studyPrograms: body("studyProgramIds")
      .isArray({ min: 1 }),
    "subjectStudyPrograms.*": body("studyProgramIds.*").isMongoId(),
    policyRules: body("policyRules")
      .isArray({ min: 1 }),

    // --- Course Fields ---
    courseName: body("name")
      .isString()
      .isLength({ min: 3, max: 100 }),
    courseCode: body("code")
      .isString()
      .isLength({ min: 2, max: 20 }),
    subjectId: body("subjectId")
      .isMongoId(),
    academicYearId: body("academicYearId").isMongoId(),
    evaluationGroups: body("evaluationGroups").isArray({ min: 1 }),
    studyProgramId: body("studyProgramId").isMongoId(),
    // --- Enrollment Fields ---
    accountId: body("accountId").isMongoId(),
    // --- Group Fields ---
    groupName: body("name")
      .isString().isLength({ min: 1, max: 50 }),
    professors: body("professors").isArray({ min: 1 }),
    students: body("students").isArray({ min: 1 }),
    "professors.*": body("professors.*").isMongoId(),
    "students.*": body("students.*").isMongoId(),
    courseId: body("courseId").isMongoId(),
  },
  setup,
};
