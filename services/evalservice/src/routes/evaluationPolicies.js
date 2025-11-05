// @ts-check
const { checkExact } = require("express-validator");
const { EvaluationPolicy } = require("../models");
const validation = require("../validation");

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  app.post(
    "/evaluation-policies",
    ...validation.setup(
      400,
      validation.fields.subjectId,
      validation.fields.policyRules,
      validation.fields["policyRules.*.evaluationTypeId"],
      validation.fields["policyRules.*.minPercentage"],
      validation.fields["policyRules.*.maxPercentage"],
      checkExact()
    ),
    async (req, res) => {
      try {
        const newPolicy = req.body;

        const existing = await EvaluationPolicy.findOne({
          subjectId: newPolicy.subjectId,
        });

        if (existing) {
          return res
            .status(400)
            .json({ success: false, errorKey: "policyExists" });
        }

        const policy = new EvaluationPolicy(newPolicy);
        await policy.save();

        res.status(201).json({ success: true, policy });
      } catch (err) {
        console.error("Error creating policy:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.get("/evaluation-policies/by-subject/:id", async (req, res) => {
    try {
      const subjectId = req.params.id;
      const policy = await EvaluationPolicy.findOne({ subjectId }).lean();

      if (!policy) {
        return res
          .status(404)
          .json({ success: false, errorKey: "notFound" });
      }

      res.json({ success: true, policy });
    } catch (err) {
      console.error("Error getting policy:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.get("/evaluation-policies/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const policy = await EvaluationPolicy.findById(id).lean();

      if (!policy) {
        return res
          .status(404)
          .json({ success: false, errorKey: "notFound" });
      }

      res.json({ success: true, policy });
    } catch (err) {
      console.error("Error getting policy by id:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.put(
    "/evaluation-policies/:id",
    ...validation.setup(
      400,
      validation.fields.subjectId,
      validation.fields.policyRules,
      validation.fields["policyRules.*.evaluationTypeId"],
      validation.fields["policyRules.*.minPercentage"],
      validation.fields["policyRules.*.maxPercentage"],
      validation.fields.user,
      validation.fields.createdAt,
      validation.fields.updatedAt,
      validation.fields.id,
      validation.fields.v,
      checkExact()
    ),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        const updated = await EvaluationPolicy.findOneAndUpdate(
          { _id: id },
          updates,
          { new: true }
        );

        if (!updated) {
          return res
            .status(404)
            .json({ success: false, errorKey: "notFound" });
        }

        res.json({ success: true, policy: updated });
      } catch (err) {
        console.error("Error updating policy:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.delete("/evaluation-policies/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const deleted = await EvaluationPolicy.findByIdAndDelete(id);
      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, errorKey: "notFound" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting policy:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });
};
