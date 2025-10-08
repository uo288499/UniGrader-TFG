// @ts-check
const { checkExact } = require("express-validator");
const { Group, Course } = require("../models");
const validation = require("../validation");

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  // Crear un group
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

        // Validar course existe
        const course = await Course.findOne({
          _id: newGroupData.courseId,
          universityId: newGroupData.user.universityId,
        });
        if (!course) {
          return res.status(404).json({ success: false, errorKey: "courseNotFound" });
        }

        // Validar que no exista un grupo con mismo nombre en el mismo course
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

  // Obtener groups por university
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

  // Obtener un group
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

  // Actualizar un group
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

        // Evitar duplicados
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

  // Eliminar un group
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
};
