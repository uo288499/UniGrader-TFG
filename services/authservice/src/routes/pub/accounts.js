// @ts-check
const { EmailAccount } = require("../../models");
const axios = require("axios")
const validation = require("../../validation");
const { checkExact, body } = require("express-validator");

const ACADEMIC_URL = process.env.ACADEMIC_URL || "http://localhost:8002";

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  app.delete("/accounts/:id", async (req, res) => {
        try {
            const account = await EmailAccount.findById(req.params.id);
            if (!account) {
                return res.status(404).json({ success: false, errorKey: "notFound" });
            }

            await EmailAccount.findByIdAndDelete(req.params.id);

            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, errorKey: "serverError" });
        }
    });

  app.get("/accounts", async (_req, res) => {
    try {
      const accounts = await EmailAccount.find().populate("userId").lean();

      // Fetch university info for each account that has one
      const enriched = await Promise.all(
        accounts.map(async (acc) => {
          if (!acc.universityId) return { ...acc, university: null };

          try {
            const uniRes = await axios.get(
              `${ACADEMIC_URL}/universities/${acc.universityId}`
            );
            return { ...acc, university: uniRes.data};
          } catch (err) {
            return { ...acc, university: null };
          }
        })
      );

      res.json({ success: true, accounts: enriched });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.get("/accounts/:id", async (req, res) => {
    try {
      const account = await EmailAccount.findById(req.params.id)
        .populate("userId")
        .lean();
      if (!account)
        return res.status(404).json({ success: false, errorKey: "notFound" });

      let university = null;
      if (account.universityId) {
        try {
          const uniRes = await axios.get(
            `${ACADEMIC_URL}/universities/${account.universityId}`
          );
          university = uniRes.data;
        } catch (err) {
          university = null;
        }
      }

      res.json({ success: true, account: { ...account, university } }); 
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.post(
    "/accounts",
    ...validation.setup(
      400,
      validation.fields.email,
      validation.fields.role,
      validation.fields.universityId,
      validation.fields.userId,
      checkExact()
    ),
    async (req, res) => {
      try {
        const {
          email,
          password,
          role,
          universityId,
          userId,
        } = req.body;

        const existingAccount = await EmailAccount.findOne({ email });
        if (existingAccount) {
          return res.status(400).json({ success: false, errorKey: "emailExists" });
        }

        // Create EmailAccount
        const account = new EmailAccount({
          email,
          password: password || undefined,
          role,
          universityId: universityId || undefined,
          userId,
        });
        await account.save();

        res.status(201).json({ success: true, account });
      } catch (err) {
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );
};
