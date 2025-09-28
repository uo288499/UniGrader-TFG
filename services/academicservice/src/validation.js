// @ts-check
const { body, validationResult } = require("express-validator");
const config = require("./config");
const { create } = require("./models/academicYear");

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
      .isString()
  },
  setup,
};
