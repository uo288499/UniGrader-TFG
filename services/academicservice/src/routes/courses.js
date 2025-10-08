// @ts-check
const { checkExact } = require("express-validator");
const { Course, Group } = require("../models");
const validation = require("../validation");
const axios = require("axios");

const EVAL_URL = process.env.EVAL_URL || "http://localhost:8003";

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  app.post(
    "/courses",
    ...validation.setup(
      400,
      validation.fields.courseName,
      validation.fields.courseCode,
      validation.fields.universityId,
      validation.fields.user,
      validation.fields.academicYearId,
      validation.fields.subjectId,
      validation.fields.studyProgramId,
      validation.fields.evaluationGroups,
      checkExact()
    ),
    async (req, res) => {
      try {
        const newCourse = req.body;

        const existing = await Course.findOne({
          code: newCourse.code,
          universityId: newCourse.universityId,
          academicYearId: newCourse.academicYearId,
        });

        if (existing) {
          return res.status(400).json({ success: false, errorKey: "courseExists" });
        }

        const course = new Course(newCourse);
        await course.save();

        // Crear evaluation system si viene en payload
        if (newCourse.evaluationGroups) {
          const system = await axios.post(`${EVAL_URL}/evaluation-systems`, {
            courseId: course._id,
            evaluationGroups: newCourse.evaluationGroups,
          });
          course.evaluationSystemId = system.data.system._id;
          await course.save();
        }

        res.status(201).json({ success: true, course });
      } catch (err) {
        console.error("Error creating course:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.get("/courses/by-university/:id", async (req, res) => {
    try {
      const universityId = req.params.id;
      const courses = await Course.find({ universityId })
        .populate("universityId")
        .populate("academicYearId")
        .populate("studyProgramId")
        .populate("subjectId")
        .lean();

      res.json({ success: true, courses });
    } catch (err) {
      console.error("Error getting courses:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.get("/courses/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const course = await Course.findById(id)
        .populate("universityId")
        .populate("academicYearId")
        .populate("studyProgramId")
        .populate("subjectId")
        .lean();

      if (!course) {
        return res.status(404).json({ success: false, errorKey: "notFound" });
      }

      let system = null;
      try {
        const response = await axios.get(`${EVAL_URL}/evaluation-systems/by-course/${id}`);
        system = response.data.system;
      } catch (err) {
        return res.status(500).json({ success: false, errorKey: "serverError" });
      }

      res.json({ success: true, course, system });
    } catch (err) {
      console.error("Error getting course:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.put(
    "/courses/:id",
    ...validation.setup(
      400,
      validation.fields.courseName,
      validation.fields.courseCode,
      validation.fields.user,
      validation.fields.createdAt,
      validation.fields.updatedAt,
      validation.fields.academicYearId,
      validation.fields.subjectId,
      validation.fields.studyProgramId,
      validation.fields.evaluationGroups,
      validation.fields.id,
      validation.fields.v,
      checkExact()
    ),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        if (updates.code) {
          const existing = await Course.findOne({ 
            code: updates.code, 
            academicYearId: updates.academicYearId, 
            universityId: updates.universityId,
            _id: { $ne: id } 
          });

          if (existing) {
            return res.status(400).json({ success: false, errorKey: "courseExists" });
          }
        }

        const updated = await Course.findOneAndUpdate({ _id: id }, updates, {
          new: true,
        });

        if (!updated) {
          return res.status(404).json({ success: false, errorKey: "notFound" });
        }

        // Actualizar evaluation system si viene en el body
        if (updates.evaluationGroups) {
          await axios.put(`${EVAL_URL}/evaluation-systems/${updated.evaluationSystemId}`, {
            courseId: id,
            evaluationGroups: updates.evaluationGroups,
          });
        }

        res.json({ success: true, course: updated });
      } catch (err) {
        console.error("Error updating course:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.delete("/courses/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const groups = await Group.find({ courseId: id });
      if (groups.length > 0) {
        return res.status(400).json({ success: false, errorKey: "courseHasGroups" });
      }

      const deleted = await Course.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, errorKey: "notFound" });
      }

      try {
        // Borrar evaluation system
        if (deleted.evaluationSystemId) {
          await axios.delete(`${EVAL_URL}/evaluation-systems/${deleted.evaluationSystemId}`);
        }
      } catch (err) {
        return res.status(500).json({ success: false, errorKey: "serverError" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting course:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });
};
