// @ts-check
const { checkExact } = require("express-validator");
const { AcademicYear } = require("../models"); 
const validation = require("../validation");

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {

  app.post(
    "/academicyears",
    ...validation.setup(
      400,
      validation.fields.yearLabel,
      validation.fields.startDate,
      validation.fields.endDate,
      validation.fields.user,
      validation.fields.universityId,
      checkExact()
    ),
    async (req, res) => {
      try {
        const newYearData = req.body;

        const existingYear = await AcademicYear.findOne({
          yearLabel: newYearData.yearLabel,
          universityId: newYearData.user.universityId,
        });

        if (existingYear) {
          return res.status(400).json({ success: false, errorKey: "yearExists" });
        }

        const academicYear = new AcademicYear(newYearData);
        await academicYear.save();
        res.status(201).json({ success: true, academicYear });
      } catch (err) {
        console.error("Error creating academic year:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.get("/academicyears/by-university/:id", async (req, res) => {
    try {
      const universityId = req.params.id;
      const years = await AcademicYear.find({ universityId })
        .populate('universityId')
        .lean();
      res.json({ success: true, years });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.get("/academicyears/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const academicYear = await AcademicYear.findOne({ _id: id })
        .populate('universityId')
        .lean();

      if (!academicYear) {
        return res.status(404).json({ success: false, errorKey: "notFound" });
      }
      res.json({ success: true, academicYear });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.put(
    "/academicyears/:id",
    ...validation.setup(
      400,
      validation.fields.yearLabel,
      validation.fields.startDate,
      validation.fields.endDate,
      validation.fields.user,
      checkExact()
    ),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        if (updates.yearLabel) {
          const existingYear = await AcademicYear.findOne({
            yearLabel: updates.yearLabel,
            universityId: updates.user.universityId,
            _id: { $ne: id },
          });

          if (existingYear) {
            return res.status(400).json({ success: false, errorKey: "yearExists" });
          }
        }

        const updatedYear = await AcademicYear.findOneAndUpdate(
          { _id: id },
          updates,
          { new: true }
        );

        if (!updatedYear) {
          return res.status(404).json({ success: false, errorKey: "notFound" });
        }

        res.json({ success: true, academicYear: updatedYear });
      } catch (err) {
        console.error("Error updating academic year:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.delete("/academicyears/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await AcademicYear.findOneAndDelete({ _id: id });

      if (!result) {
        return res.status(404).json({ success: false, errorKey: "notFound" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting academic year:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });
};