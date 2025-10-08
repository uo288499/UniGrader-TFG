// @ts-check
const { checkExact } = require("express-validator");
const { EvaluationSystem } = require("../models");
const validation = require("../validation");

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  // Crear un evaluation system para un curso
  app.post(
    "/evaluation-systems",
    ...validation.setup(
      400,
      validation.fields.courseId,
      validation.fields.evaluationGroups,
      validation.fields["evaluationGroups.*.evaluationTypeId"],
      validation.fields["evaluationGroups.*.totalWeight"],
      checkExact()
    ),
    async (req, res) => {
      try {
        const newSystem = req.body;

        const existing = await EvaluationSystem.findOne({
          courseId: newSystem.courseId,
        });

        if (existing) {
          return res
            .status(400)
            .json({ success: false, errorKey: "systemExists" });
        }

        const system = new EvaluationSystem(newSystem);
        await system.save();

        res.status(201).json({ success: true, system });
      } catch (err) {
        console.error("Error creating evaluation system:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  // Obtener system por curso
  app.get("/evaluation-systems/by-course/:id", async (req, res) => {
    try {
      const courseId = req.params.id;
      const system = await EvaluationSystem.findOne({ courseId }).lean();

      if (!system) {
        return res
          .status(404)
          .json({ success: false, errorKey: "notFound" });
      }

      res.json({ success: true, system });
    } catch (err) {
      console.error("Error getting evaluation system by course:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  // Obtener system por ID
  app.get("/evaluation-systems/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const system = await EvaluationSystem.findById(id).lean();

      if (!system) {
        return res
          .status(404)
          .json({ success: false, errorKey: "notFound" });
      }

      res.json({ success: true, system });
    } catch (err) {
      console.error("Error getting evaluation system by id:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  // Actualizar un system
  app.put(
    "/evaluation-systems/:id",
    ...validation.setup(
      400,
      validation.fields.courseId,
      validation.fields.evaluationGroups,
      validation.fields["evaluationGroups.*.evaluationTypeId"],
      validation.fields["evaluationGroups.*.totalWeight"],
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

        const updated = await EvaluationSystem.findOneAndUpdate(
          { _id: id },
          updates,
          { new: true }
        );

        if (!updated) {
          return res
            .status(404)
            .json({ success: false, errorKey: "notFound" });
        }

        res.json({ success: true, system: updated });
      } catch (err) {
        console.error("Error updating evaluation system:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  // Eliminar un system
  app.delete("/evaluation-systems/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const deleted = await EvaluationSystem.findByIdAndDelete(id);
      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, errorKey: "notFound" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting evaluation system:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });
};
