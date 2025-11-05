// @ts-check
const FinalGrade = require("../models/finalGrade");
const validation = require("../validation");
const { checkExact } = require("express-validator");

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  app.put(
  "/final-grades/sync",
  ...validation.setup(
    400,
    validation.fields.finalGradeStudentId,
    validation.fields.finalGradeCourseId,
    validation.fields.finalGradeAcademicYearId,
    validation.fields.finalGradeEvaluationPeriod,
    validation.fields.finalGradeValue,
    validation.fields.finalGradeIsPassed,
    validation.fields.user,
    checkExact()
  ),
  async (req, res) => {
    try {
      const { studentId, courseId, evaluationPeriod } = req.body;

      // Buscar si ya existe una nota final para ese alumno, curso y periodo
      const existing = await FinalGrade.findOne({ studentId, courseId, evaluationPeriod });

      if (existing) {
        // Actualizar la existente
        const updated = await FinalGrade.findOneAndUpdate(
          { studentId, courseId, evaluationPeriod },
          req.body,
          { new: true, runValidators: true }
        );
        return res.status(200).json({ success: true, data: updated });
      } else {
        // Crear una nueva
        const created = await FinalGrade.create(req.body);
        return res.status(201).json({ success: true, data: created });
      }
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  }
);

  app.get("/final-grades/by-student/:studentId/course/:courseId/:period", async (req, res) => {
    try {
      const { studentId, courseId, period } = req.params;
      const grade = await FinalGrade.findOne({ studentId, courseId, evaluationPeriod: period });
      res.json({ success: true, grade: grade || null });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.delete("/final-grades/by-student/:studentId/course/:courseId/:period", async (req, res) => {
    try {
      const { studentId, courseId, period } = req.params;
      const grade = await FinalGrade.findOne({ studentId, courseId, evaluationPeriod: period });

      if (!grade) return res.status(404).json({ success: false, errorKey: "notFound" });
        
      await FinalGrade.findOneAndDelete({ studentId, courseId, evaluationPeriod: period });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.get("/final-grades/by-student/:studentId", async (req, res) => {
    try {
      const { studentId } = req.params;
      const grades = await FinalGrade.find({ studentId });
      res.json({ success: true, grades: grades || [] });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });
};
