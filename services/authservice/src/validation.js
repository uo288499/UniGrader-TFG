// @ts-check
const { body, validationResult } = require("express-validator");
const config = require("./config");

/**
 * @type {(status: number, ...vals: import("express").RequestHandler[]) => import("express").RequestHandler[]}
 */
const setup = (status, ...vals) => {
  vals.push((req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      // Return a JSON response with a specific error key
      res.status(status).json({
        success: false,
        errorKey: status === 400 ?  "badRequest" : "invalidCredentials",
        errors: status === 400 ? errors.mapped() : undefined,
      });
    else next();
  });
  return vals;
};

module.exports = {
  fields: {
    email: body("email").isEmail().normalizeEmail(),
    password: body("password").optional({ nullable: true, checkFalsy: true }).isString().isStrongPassword(config.pass),
    token: body("token").optional().isJWT(),
    identityNumber: body("identityNumber").isString().notEmpty(),
    name: body("name").isString().notEmpty(),
    firstSurname: body("firstSurname").isString().notEmpty(),
    secondSurname: body("secondSurname").optional({ nullable: true, checkFalsy: true }).isString(),
    photoUrl: body("photoUrl").optional({ nullable: true, checkFalsy: true }).isURL(),
    userId: body("userId").optional().isMongoId(),
    accountId: body("accountId").optional().isMongoId(),
    universityId: body("universityId").optional({ nullable: true, checkFalsy: true }).isMongoId(),
    role: body("role").isIn(["student", "professor", "admin", "global-admin"]),
    id: body("_id").optional().isMongoId(),
    v: body("__v").optional().isInt({ min: 0 }),
    createdAt: body("createdAt").optional().isISO8601(),
    updatedAt: body("updatedAt").optional().isISO8601(),
    resetPasswordToken: body("resetPasswordToken").optional({ nullable: true, checkFalsy: true }).isString(),
    resetPasswordExpires: body("resetPasswordExpires").optional({ nullable: true, checkFalsy: true }).isDate(),
    language: body("language").optional({ nullable: true, checkFalsy: true }).isString(), 
    photoUrlBase64: body("photoUrlBase64")
      .optional({ nullable: true, checkFalsy: true })
      .isString(),
    user: body("user").optional(),
  },
  setup,
};

