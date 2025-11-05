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
    id: body("_id").optional().isMongoId(),
    v: body("__v").optional().isInt({ min: 0 }),
    createdAt: body("createdAt").optional().isISO8601(),
    updatedAt: body("updatedAt").optional().isISO8601(),
    // --- Evaluation Policy Fields ---
    subjectId: body("subjectId")
      .isMongoId(),
    policyRules: body("policyRules")
      .isArray({ min: 1 }),
    "policyRules.*.evaluationTypeId": body("policyRules.*.evaluationTypeId")
      .isMongoId(),
    "policyRules.*.minPercentage": body("policyRules.*.minPercentage")
      .isNumeric()
      .custom((v) => v >= 0 && v <= 100),
    "policyRules.*.maxPercentage": body("policyRules.*.maxPercentage")
      .isNumeric()
      .custom((v) => v >= 0 && v <= 100),
    // --- Evaluation System Fields ---
    evaluationGroups: body("evaluationGroups").isArray({ min: 1 }),
    "evaluationGroups.*.evaluationTypeId": body("evaluationGroups.*.evaluationTypeId").isMongoId(),
    "evaluationGroups.*.totalWeight": body("evaluationGroups.*.totalWeight").isNumeric().custom((v) => v > 0 && v <= 100),
    courseId: body("courseId").isMongoId(),
    // --- Evaluation Item Fields ---
    evaluationItem: body("items").isArray(),
    evaluationItemId: body("items.*._id").optional().isMongoId(),
    evaluationItemName: body("items.*.name")
      .isString()
      .isLength({ min: 1, max: 100 }),
    evaluationItemType: body("items.*.evaluationTypeId").isMongoId(),
    evaluationItemWeight: body("items.*.weight")
      .isNumeric()
      .custom((v) => v > 0 && v <= 100),
    evaluationItemMinGrade: body("items.*.minGrade")
      .optional({ nullable: true })
      .isNumeric()
      .custom((v) => v >= 0 && v <= 10),
    evaluationItemSystem: body("items.*.evaluationSystemId").isMongoId(),
  },
  setup,
};