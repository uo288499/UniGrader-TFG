// @ts-check
const { Enrollment, StudyProgram } = require("../models");
const axios = require("axios");
const validation = require("../validation");
const { checkExact } = require("express-validator");

const AUTH_URL = process.env.AUTH_URL || "http://localhost:8001";

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {

  // GET all enrollments 
  app.get("/enrollments", async (_req, res) => {
    try {
      const enrollments = await Enrollment.find()
        .populate("studyProgramId")
        .populate("academicYearId")
        .lean();

      // Fetch account info for each enrollment
      const enriched = await Promise.all(
        enrollments.map(async (en) => {
            try {
            const accRes = await axios.get(`${AUTH_URL}/accounts/${en.accountId}`);
            return { ...en, account: accRes.data.account };
            } catch {
            return { ...en, account: null };
            }
        })
        );

      res.json({ success: true, enrollments: enriched });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  // GET enrollment by id
  app.get("/enrollments/:id", async (req, res) => {
    try {
      const enrollment = await Enrollment.findById(req.params.id)
        .populate("studyProgramId")
        .populate("academicYearId")
        .lean();
      if (!enrollment)
        return res.status(404).json({ success: false, errorKey: "notFound" });

      let account = null;
      try {
        const accRes = await axios.get(`${AUTH_URL}/accounts/${enrollment.accountId}`);
        account = accRes.data.account;
      } catch {
        account = null;
      }

      res.json({ success: true, enrollment: { ...enrollment, account } });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  // GET enrollments by university (t
  app.get("/enrollments/by-university/:id", async (req, res) => {
    try {
        const programs = await StudyProgram.find({ universityId: req.params.id })
        .select("_id")
        .lean();
        const programIds = programs.map(p => p._id);

        const enrollments = await Enrollment.find({ studyProgramId: { $in: programIds } })
        .populate("studyProgramId")
        .populate("academicYearId")
        .lean();

        const enrollmentsWithAccounts = await Promise.all(
        enrollments.map(async (enr) => {
            let account = null;
            try {
            const accRes = await axios.get(`${AUTH_URL}/accounts/${enr.accountId}`);
            account = accRes.data.account;
            } catch {
            account = null;
            }
            return { ...enr, account };
        })
        );

        res.json({ success: true, enrollments: enrollmentsWithAccounts });
    } catch (err) {
        res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  // POST create enrollment
  app.post(
    "/enrollments",
    ...validation.setup(
          400,
          validation.fields.accountId,
          validation.fields.studyProgramId,
          validation.fields.academicYearId,
          validation.fields.user,
          checkExact()
        ), 
    async (req, res) => {
        try {
        const { accountId, studyProgramId, academicYearId } = req.body;

        const existing = await Enrollment.findOne({ accountId, studyProgramId, academicYearId });
        if (existing) {
            return res.status(400).json({ success: false, errorKey: "enrollmentExists" });
        }

        const enrollment = new Enrollment({ accountId, studyProgramId, academicYearId });
        await enrollment.save();

        res.status(201).json({ success: true, enrollment });
        } catch (err) {
            res.status(500).json({ success: false, errorKey: "serverError" });
        }
    }
  );

  // DELETE enrollment
  app.delete("/enrollments/:id", async (req, res) => {
    try {
      const enrollment = await Enrollment.findById(req.params.id);
      if (!enrollment)
        return res.status(404).json({ success: false, errorKey: "notFound" });

      await Enrollment.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

};
