// @ts-check

const { default: axios } = require("axios");
const config = require("./config");
const express = require("express");

/**
 * @param {import("express").Application} app
 */
module.exports = (app) =>
  app.use(config.auth.paths, express.json(), async (req, res, next) => {
    const [type, token] = req.headers.authorization?.split(/\s+/) ?? [];

    // Perform verification
    try {
      // Verify token exists and is 'Bearer'
      if (type?.toLowerCase() !== "bearer" || token == null || token === "")
        throw new Error("Invalid token");

      const verification = await axios.post(config.auth.url, {
        token,
      });

      // Attach logged-in user data
      req.headers["content-type"] = "application/json";
      req.body ??= {};
      
      const { userId, universityId, role, email } = verification.data;
      
      req.body.user = { userId, universityId, role, email };

      next();
    } catch (err) {
      if (
        err instanceof Error && err.message === "Invalid token" ||
        axios.isAxiosError(err) && err.response?.status?.toString().startsWith("4")
      ) {
        res.status(401).json({ success: false, errorKey: "invalidToken" });
      } else {
        next(err);
      }
    }
  });
