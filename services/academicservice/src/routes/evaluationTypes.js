// @ts-check
const { checkExact } = require("express-validator");
const { EvaluationType } = require("../models");
const validation = require("../validation");

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {

  app.post(
    "/evaluation-types",
    ...validation.setup(
      400,
      validation.fields.evaluationTypeName,
      validation.fields.universityId,
      validation.fields.user,
      checkExact()
    ),
    async (req, res) => {
      try {
        const newTypeData = req.body;

        const existingType = await EvaluationType.findOne({
          name: newTypeData.name,
          universityId: newTypeData.user.universityId,
        });

        if (existingType) {
          return res.status(400).json({ success: false, errorKey: "evaluationTypeExists" });
        }

        const evaluationType = new EvaluationType(newTypeData);
        await evaluationType.save();
        res.status(201).json({ success: true, evaluationType });
      } catch (err) {
        console.error("Error creating evaluation type:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.get("/evaluation-types/by-university/:id", async (req, res) => {
    try {
      const universityId = req.params.id;
      const types = await EvaluationType.find({ universityId })
        .populate("universityId")
        .lean();
      res.json({ success: true, evaluationTypes: types });
    } catch (err) {
      console.error("Error fetching evaluation types:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.get("/evaluation-types/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const evaluationType = await EvaluationType.findOne({ _id: id })
        .populate("universityId")
        .lean();

      if (!evaluationType) {
        return res.status(404).json({ success: false, errorKey: "notFound" });
      }
      res.json({ success: true, evaluationType });
    } catch (err) {
      console.error("Error fetching evaluation type:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.put(
    "/evaluation-types/:id",
    ...validation.setup(
      400,
      validation.fields.evaluationTypeName,
      validation.fields.user,
      checkExact()
    ),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        if (updates.name) {
          const existingType = await EvaluationType.findOne({
            name: updates.name,
            universityId: updates.user.universityId,
            _id: { $ne: id },
          });

          if (existingType) {
            return res.status(400).json({ success: false, errorKey: "evaluationTypeExists" });
          }
        }

        const updatedType = await EvaluationType.findOneAndUpdate(
          { _id: id },
          updates,
          { new: true }
        );

        if (!updatedType) {
          return res.status(404).json({ success: false, errorKey: "notFound" });
        }

        res.json({ success: true, evaluationType: updatedType });
      } catch (err) {
        console.error("Error updating evaluation type:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.delete("/evaluation-types/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await EvaluationType.findOneAndDelete({ _id: id });

      if (!result) {
        return res.status(404).json({ success: false, errorKey: "notFound" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting evaluation type:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });
};
