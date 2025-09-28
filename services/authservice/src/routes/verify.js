// @ts-check
const { checkExact } = require("express-validator");
const jwt = require("jsonwebtoken");
const { STATUS_CODES } = require("http");

const validation = require("../validation");
const config = require("../config");

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  app.post(
    "/verify",
    ...validation.setup(400, validation.fields.token, checkExact()),
    async (req, res) => {
      const { token } = req.body;

      try {
        const decoded = jwt.verify(token, config.jwt.secret, config.jwt.vOpts);

        // Success: the token is valid, return the payload
        res.json({
            success: true,
            // @ts-expect-error
            userId: decoded.userId,
            // @ts-expect-error
            universityId: decoded.universityId,
            // @ts-expect-error
            role: decoded.role,
            // @ts-expect-error
            email: decoded.email,
        });
      } catch (err) {
        // Error: the token is invalid or expired
        res.status(401).json({ success: false, errorKey: "invalidToken" });
      }
    }
  );
};
