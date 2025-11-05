// @ts-check
const { checkExact } = require("express-validator");
const { Group, Course, Enrollment } = require("../models");
const validation = require("../validation");
const axios = require("axios");

const AUTH_URL = process.env.AUTH_URL || "http://localhost:8001";

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  app.post(
    "/groups",
    ...validation.setup(
      400,
      validation.fields.groupName,
      validation.fields.universityId,
      validation.fields.courseId,
      validation.fields.professors,
      validation.fields.students,
      validation.fields.user,
      checkExact()
    ),
    async (req, res) => {
      try {
        const newGroupData = req.body;

        const course = await Course.findOne({
          _id: newGroupData.courseId,
          universityId: newGroupData.user.universityId,
        });
        if (!course) {
          return res.status(404).json({ success: false, errorKey: "courseNotFound" });
        }

        const existingGroup = await Group.findOne({
          name: newGroupData.name,
          courseId: newGroupData.courseId,
        });
        if (existingGroup) {
          return res.status(400).json({ success: false, errorKey: "groupExists" });
        }

        const group = new Group(newGroupData);
        await group.save();

        res.status(201).json({ success: true, group });
      } catch (err) {
        console.error("Error creating group:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.get("/groups/by-university/:id", async (req, res) => {
    try {
      const universityId = req.params.id;

      const groups = await Group.find()
        .populate({
          path: "courseId",
          match: { universityId },
        })
        .lean();

      // Filtrar groups sin course 
      const filtered = groups.filter((g) => g.courseId);

      res.json({ success: true, groups: filtered });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.get("/groups/by-professor/:id", async (req, res) => {
    try {
      const professorId = req.params.id;

      const groups = await Group.find({
          professors: professorId 
      })
        .populate('courseId') 
        .lean(); 

      // Filtrar groups sin course 
      const filtered = groups.filter((g) => g.courseId);

      res.json({ success: true, groups: filtered });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.get("/groups/by-student/:id", async (req, res) => {
    try {
      const studentId = req.params.id;

      const groups = await Group.find({
          students: studentId 
      })
        .populate('courseId') 
        .lean(); 

      // Filtrar groups sin course 
      const filtered = groups.filter((g) => g.courseId);

      res.json({ success: true, groups: filtered });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.get("/groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const group = await Group.findById(id).populate("courseId").lean();
      if (!group) {
        return res.status(404).json({ success: false, errorKey: "notFound" });
      }
      res.json({ success: true, group });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.put(
    "/groups/:id",
    ...validation.setup(
      400,
      validation.fields.groupName,
      validation.fields.professors,
      validation.fields.students,
      validation.fields.courseId,
      validation.fields.user,
      validation.fields.id,
      validation.fields.v,
      validation.fields.createdAt,
      validation.fields.updatedAt,
      checkExact()
    ),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        if (updates.name && updates.courseId) {
          const existingGroup = await Group.findOne({
            name: updates.name,
            courseId: updates.courseId,
            _id: { $ne: id },
          });
          if (existingGroup) {
            return res.status(400).json({ success: false, errorKey: "groupExists" });
          }
        }

        const updatedGroup = await Group.findOneAndUpdate(
          { _id: id },
          updates,
          { new: true }
        );

        if (!updatedGroup) {
          return res.status(404).json({ success: false, errorKey: "notFound" });
        }

        res.json({ success: true, group: updatedGroup });
      } catch (err) {
        console.error("Error updating group:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.delete("/groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await Group.findOneAndDelete({ _id: id });
      if (!result) {
        return res.status(404).json({ success: false, errorKey: "notFound" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting group:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.get("/groups/students-in-course/:courseId", async (req, res) => {
    try {
      const { courseId } = req.params;

      const groups = await Group.find({ courseId }).lean();

      const assignedStudentIds = [
        ...new Set(groups.flatMap(g => g.students.map(s => s.toString())))
      ];

      res.json({ success: true, students: assignedStudentIds });
    } catch (err) {
      console.error("Error fetching students in course:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.post("/groups/import-professors/:universityId", async (req, res) => {
    const { universityId } = req.params;
    const { emails } = req.body;

    try {
      if (!emails?.length) {
        return res.status(400).json({
          success: false,
          errorKey: "emptyCSV",
        });
      }

      const { data } = await axios.get(`${AUTH_URL}/accounts/by-university/${universityId}`);
      const accounts = data.accounts || [];

      const professors = accounts.filter((/** @type {{ role: string; }} */ a) => a.role === "professor");

      const added = [];
      const errors = [];

      for (const [index, email] of emails.entries()) {
        const found = professors.find((/** @type {{ email: any; }} */ p) => p.email === email);

        if (!found) {
          errors.push({
            line: index + 1,
            email,
            errorKey: "professorNotFound"
          });
          continue;
        }

        added.push(found._id);
      }

      return res.json({ success: true, added, errors });
    } catch (err) {
      console.error("Error importing professors:", err);
      return res.status(500).json({
        success: false,
        errorKey: "serverError",
      });
    }
  });

  app.post("/groups/import-students/:courseId", async (req, res) => {
    const { courseId } = req.params;
    const { emails, groupId } = req.body;

    try {
      if (!emails?.length) {
        return res.status(400).json({
          success: false,
          errorKey: "emptyCSV",
        });
      }

      const course = await Course.findById(courseId).lean();
      if (!course) {
        return res.status(404).json({
          success: false,
          errorKey: "notFound",
        });
      }

      const { data } = await axios.get(`${AUTH_URL}/accounts/by-university/${course.universityId}`);
      const accounts = data.accounts || [];

      const students = accounts.filter((/** @type {{ role: string; }} */ a) => a.role === "student");

      const groupFilter = groupId ? { courseId, _id: { $ne: groupId } } : { courseId };
      const groups = await Group.find(groupFilter).lean();
      const alreadyAssigned = new Set(groups.flatMap(g => g.students.map(s => s.toString())));

      const added = [];
      const errors = [];

      for (const [index, email] of emails.entries()) {
        const found = students.find((/** @type {{ email: any; }} */ s) => s.email === email);

        if (!found) {
          errors.push({
            line: index + 1,
            email,
            errorKey: "studentNotFound",
          });
          continue;
        }

        // Comprobar si está matriculado en el mismo studyProgram y academicYear del curso
        const enrollment = await Enrollment.findOne({
          accountId: found._id,
          studyProgramId: course.studyProgramId,
          academicYearId: course.academicYearId,
        }).lean();

        if (!enrollment) {
          errors.push({
            line: index + 1,
            email,
            errorKey: "studentNotEnrolled",
          });
          continue;
        }

        // Comprobar si ya está en otro grupo de esta asignatura
        if (alreadyAssigned.has(found._id.toString())) {
          errors.push({
            line: index + 1,
            email,
            errorKey: "studentAlreadyInGroup",
          });
          continue;
        }

        added.push(found._id);
      }

      return res.json({ success: true, added, errors });
    } catch (err) {
      console.error("Error importing students:", err);
      return res.status(500).json({
        success: false,
        errorKey: "serverError",
      });
    }
  });
};
