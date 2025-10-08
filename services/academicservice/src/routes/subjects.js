// @ts-check
const { checkExact } = require("express-validator");
const { Subject } = require("../models");
const validation = require("../validation");
const axios = require("axios");

const EVAL_URL = process.env.EVAL_URL || "http://localhost:8003";

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  // Crear subject y su policy
  app.post(
    "/subjects",
    ...validation.setup(
      400,
      validation.fields.subjectName,
      validation.fields.subjectCode,
      validation.fields.universityId,
      validation.fields.studyPrograms,
      validation.fields.user,
      validation.fields.policyRules,
      checkExact()
    ),
    async (req, res) => {
      try {
        const newSubject = req.body;

        if (newSubject.studyProgramIds) {
          newSubject.studyPrograms = newSubject.studyProgramIds;
          delete newSubject.studyProgramIds; 
        }

        // Comprobar código único por universidad
        const existing = await Subject.findOne({
          code: newSubject.code,
          universityId: newSubject.universityId,
        });

        if (existing) {
          return res
            .status(400)
            .json({ success: false, errorKey: "subjectExists" });
        }

        const subject = new Subject(newSubject);
        await subject.save();

        // Si viene policy, crearla en el otro servicio
        let policy = null;
        if (newSubject.policyRules) {
          policy = await axios.post(`${EVAL_URL}/evaluation-policies`, {
            subjectId: subject._id,
            policyRules: newSubject.policyRules,
          });
        }

        if (policy) {
          subject.evaluationPolicyId = policy.data.policy._id;
        }
        await subject.save();

        res.status(201).json({ success: true, subject });
      } catch (err) {
        console.error("Error creating subject:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  // Obtener subjects por universidad
  app.get("/subjects/by-university/:id", async (req, res) => {
    try {
      const universityId = req.params.id;
      const subjects = await Subject.find({ universityId })
        .populate("universityId")
        .lean();

      res.json({ success: true, subjects });
    } catch (err) {
      console.error("Error getting subjects:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  // Obtener un subject + policy
  app.get("/subjects/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const subject = await Subject.findById(id)
        .populate("universityId")
        .lean();

      if (!subject) {
        return res
          .status(404)
          .json({ success: false, errorKey: "notFound" });
      }

      // Buscar policy en evaluation-service
      let policy = null;
      try {
        const response = await axios.get(
          `${EVAL_URL}/evaluation-policies/by-subject/${id}`
        );
        policy = response.data.policy;
      } catch (err) {
        return res.status(500).json({ success: false, errorKey: "serverError" });
      }

      res.json({ success: true, subject, policy });
    } catch (err) {
      console.error("Error getting subject:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  // Actualizar subject y policy
  app.put(
    "/subjects/:id",
    ...validation.setup(
      400,
      validation.fields.subjectName,
      validation.fields.subjectCode,
      validation.fields.studyPrograms,
      validation.fields.user,
      validation.fields.policyRules,
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

        if (updates.studyProgramIds) {
          updates.studyPrograms = updates.studyProgramIds;
          delete updates.studyProgramIds; 
        }

        if (updates.code) {
          const existing = await Subject.findOne({ code: updates.code, _id: { $ne: id } });

          if (existing) {
            return res
              .status(400)
              .json({ success: false, errorKey: "subjectExists" });
          }
        }

        const updated = await Subject.findOneAndUpdate({ _id: id }, updates, {
          new: true,
        });

        if (!updated) {
          return res
            .status(404)
            .json({ success: false, errorKey: "notFound" });
        }

        // Actualizar policy si viene en el body
        if (updates.policyRules) {
          await axios.put(`${EVAL_URL}/evaluation-policies/${updated.evaluationPolicyId}`, {
            subjectId: id,
            policyRules: updates.policyRules,
          });
        }

        res.json({ success: true, subject: updated });
      } catch (err) {
        console.error("Error updating subject:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  // Eliminar subject y su policy
  app.delete("/subjects/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const deleted = await Subject.findByIdAndDelete(id);
      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, errorKey: "notFound" });
      }

      // Eliminar también la policy asociada
      try {
        await axios.delete(`${EVAL_URL}/evaluation-policies/${deleted.evaluationPolicyId}`);
      } catch (err) {
        return res.status(500).json({ success: false, errorKey: "serverError" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting subject:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });
};
