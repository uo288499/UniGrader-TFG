// @ts-check
const { checkExact, body } = require("express-validator");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const { EmailAccount } = require("../../models");
const validation = require("../../validation");
const config = require("../../config");

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  app.post(
    "/login",
    // 1st validation: Check request body schema
    ...validation.setup(
      400,
      body("email").isString(),
      body("password").isString(),
      checkExact()
    ),
    // 2nd validation: Check email and password format
    ...validation.setup(
      401,
      validation.fields.email,
      validation.fields.password
    ),
    async (req, res) => {
      const email = req.body.email.toString();
      const password = req.body.password.toString();
      const account = await EmailAccount.findOne({ email }).populate('userId');

      if (
        account != null &&
        (await argon2.verify(account.password || "", password, config.crypt))
      ) {
        // Successful login, create JWT token with relevant user data
        res.json({
          success: true,
          token: jwt.sign(
            { 
              userId: account.userId._id, 
              universityId: account.universityId?._id ?? null,
              role: account.role,
              email: account.email,
              accountId: account._id
            },
            config.jwt.secret,
            config.jwt.opts
          ),
          userId: account.userId._id,
          universityId: account.universityId?._id ?? null,
          role: account.role,
          accountId: account._id
        });
      } else {
        // Return a JSON response with an error key for the frontend
        res.status(400).json({ success: false, errorKey: "invalidCredentials" });
      }
    }
  );
};
