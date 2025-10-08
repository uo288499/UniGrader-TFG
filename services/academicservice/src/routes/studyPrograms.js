// @ts-check
const { checkExact } = require("express-validator");
const { StudyProgram } = require("../models"); 
const validation = require("../validation");


/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {

  app.post(
    "/studyprograms",
    ...validation.setup(
      400,
      validation.fields.programName,
      validation.fields.programType,
      validation.fields.user,
      validation.fields.universityId,
      checkExact()
    ),
    async (req, res) => {
      try {
        const newProgramData = req.body;

        const existingProgram = await StudyProgram.findOne({
          name: newProgramData.name,
          universityId: newProgramData.user.universityId,
        });

        if (existingProgram) {
          return res.status(400).json({ 
            success: false, 
            errorKey: "programExists"
          });
        }

        const studyProgram = new StudyProgram(newProgramData);
        await studyProgram.save();
        res.status(201).json({ success: true, program: studyProgram });
      } catch (err) {
        console.error("Error creating study program:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.get("/studyprograms/by-university/:id", async (req, res) => {
    try {
      const universityId = req.params.id;

      const programs = await StudyProgram.find({ universityId })
        .populate('universityId')
        .lean();
      res.json({ success: true, programs });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.get("/studyprograms/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const studyProgram = await StudyProgram.findOne({ _id: id })
          .populate('universityId') 
          .lean();

        if (!studyProgram) {
          return res.status(404).json({ success: false, errorKey: "notFound" });
        }
        res.json({ success: true, program: studyProgram });
    } catch (err) {
        res.status(500).json({ success: false, errorKey: "serverError" });
    }
 });

  app.put(
    "/studyprograms/:id",
    ...validation.setup(
      400,
      validation.fields.programName, 
      validation.fields.programType, 
      validation.fields.user, 
      checkExact()
    ),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        if (updates.name) {
          const existingProgram = await StudyProgram.findOne({
            name: updates.name,
            universityId: updates.user.universityId,
            _id: { $ne: id }
          });

          if (existingProgram) {
            return res.status(400).json({ 
              success: false, 
              errorKey: "programExists" 
            });
          }
        }

        const updatedProgram = await StudyProgram.findOneAndUpdate(
          { _id: id },
          updates,
          { new: true }
        );

        if (!updatedProgram) {
          return res.status(404).json({ success: false, errorKey: "notFound" });
        }

        res.json({ success: true, program: updatedProgram });
      } catch (err) {
        console.error("Error updating study program:", err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.delete("/studyprograms/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await StudyProgram.findOneAndDelete({ _id: id });

      if (!result) {
        return res.status(404).json({ success: false, errorKey: "notFound" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting study program:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });
};
