// @ts-check
const { Grade, FinalGrade } = require("../models");
const validation = require("../validation");
const { checkExact } = require("express-validator");
const axios = require("axios");

const ACADEMIC_URL = process.env.ACADEMIC_URL || "http://localhost:8002";
const EVAL_URL = process.env.EVAL_URL || "http://localhost:8003";
const AUTH_URL = process.env.AUTH_URL || "http://localhost:8001";
const GRADE_URL = process.env.GRADE_URL || "http://localhost:8004";

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  app.get("/grades/by-student/:studentId/course/:courseId", async (req, res) => {
    try {
      const { studentId, courseId } = req.params;
      const grades = await Grade.find({ studentId, courseId });
      res.json({ success: true, grades: grades || [] });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  // Sincronizar notas (crear o actualizar en bloque)
  app.put("/grades/sync", 
    ...validation.setup(
      400,
      validation.fields.gradeArray,
      validation.fields.gradeStudentId,
      validation.fields.gradeItemId,
      validation.fields.gradeCourseId,
      validation.fields.gradeValue,
      validation.fields.user,
      checkExact()
    ),async (req, res) => {
    try {
      const gradesArray = req.body.grades;

      const results = [];
      for (const g of gradesArray) {
        const existing = await Grade.findOne({
          studentId: g.studentId,
          itemId: g.itemId,
        });

        if (existing) {
          existing.value = g.value === undefined ? existing.value : g.value;
          await existing.save();
          results.push(existing);
        } else {
          const created = await Grade.create(g);
          results.push(created);
        }
      }

      res.json({ success: true, grades: results });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.get("/grades/by-student/:studentId", async (req, res) => {
    try {
      const { studentId } = req.params;
      const grades = await Grade.find({ studentId });
      res.json({ success: true, grades: grades || [] });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.post("/grades/import/:groupId", async (req, res) => {
    const { groupId } = req.params;
    const { rows } = req.body;

    try {
      if (!rows?.length) {
        return res.status(400).json({
          success: false,
          errorKey: "emptyCSV",
        });
      }

      const errors = [];
      const added = [];

      const { data: groupData } = await axios.get(`${ACADEMIC_URL}/groups/${groupId}`);
      const group = groupData.group;

      if (!group) {
        return res.status(404).json({
          success: false,
          errorKey: "groupNotFound",
        });
      }

      const { data: courseData } = await axios.get(`${ACADEMIC_URL}/courses/${group.courseId._id}`);
      const course = courseData.course;
      const evaluationSystem = courseData.system;

      const { data: evalTypesData } = await axios.get(`${ACADEMIC_URL}/evaluation-types/by-university/${course.universityId._id}`);
      const evaluationTypes = evalTypesData.evaluationTypes || [];

      const { data: itemsData } = await axios.get(`${EVAL_URL}/evaluation-items/by-group/${groupId}`);
      const evaluationItems = itemsData.items || [];

      const { data: accountsData } = await axios.get(`${AUTH_URL}/accounts/by-university/${course.universityId._id}`);
      const accounts = accountsData.accounts || [];
      const students = accounts.filter((/** @type {{ _id: any; }} */ a) => group.students.includes(a._id));

      const maxGradeLimit = course?.maxGrade ?? 4;

      for (const [index, row] of rows.entries()) {
        const rowErrors = [];
        const email = row.email?.trim()?.toLowerCase();

        if (!email) {
          errors.push({ line: index + 1, data: "", errorKey: "studentNotFoundOrNotInGroup" });
          continue;
        }

        const student = students.find((/** @type {{ email: string; }} */ s) => s.email.toLowerCase() === email);
        if (!student) {
          errors.push({ line: index + 1, data: email, errorKey: "studentNotFoundOrNotInGroup" });
          continue;
        }

        // Validar duplicado de estudiante en el CSV
        const duplicateStudent = rows.filter((/** @type {{ email: string; }} */ r) => r.email?.trim()?.toLowerCase() === email);
        if (duplicateStudent.length > 1) {
          errors.push({ line: index + 1, data: email, errorKey: "studentDuplicatedInFile" });
          continue;
        }

        // --- Procesar columnas dinámicas ---
        const itemEntries = Object.entries(row).filter(
          ([key]) => key !== "email" && key !== "extraordinary"
        );

        const seenItems = new Set();
        /**
         * @type {{ studentId: any; itemId: any; courseId: any; value: number | null; }[]}
         */
        const gradesToSync = [];

        for (let i = 0; i < itemEntries.length; i += 3) {
          const [itemNameKey, evalTypeKey, gradeKey] = [
            itemEntries[i],
            itemEntries[i + 1],
            itemEntries[i + 2],
          ];

          const itemName = itemNameKey?.[1]?.trim?.();
          const evalTypeName = evalTypeKey?.[1]?.trim?.();
          const gradeValueRaw = gradeKey?.[1]?.trim?.();

          if (!evalTypeName) {
            rowErrors.push({
              line: index + 1,
              data: "",
              errorKey: "evaluationTypeNotFound",
            });
            continue;
          }

          if (!itemName) {
            rowErrors.push({
              line: index + 1,
              data: "",
              errorKey: "evaluationItemNotFound",
            });
            continue;
          }

          const evalType = evaluationTypes.find(
            (/** @type {{ name: string; }} */ t) => t.name.toLowerCase() === evalTypeName.toLowerCase()
          );

          if (!evalType) {
            rowErrors.push({
              line: index + 1,
              data: evalTypeName,
              errorKey: "evaluationTypeNotFound",
            });
            continue;
          }

          const item = evaluationItems.find(
            (/** @type {{ name: string; evaluationTypeId: any; }} */ i) =>
              i.name.toLowerCase() === itemName.toLowerCase() &&
              String(i.evaluationTypeId) === String(evalType._id)
          );

          if (!item) {
            rowErrors.push({
              line: index + 1,
              data: `${itemName} (${evalTypeName})`,
              errorKey: "evaluationItemNotFound",
            });
            continue;
          }

          const itemKey = `${item._id}`;
          if (seenItems.has(itemKey)) {
            rowErrors.push({
              line: index + 1,
              data: `${itemName} (${evalTypeName})`,
              errorKey: "duplicateItemInRow",
            });
            continue;
          }
          seenItems.add(itemKey);

          // Validar nota
          let gradeValue = null;
          if (gradeValueRaw !== "") {
            const parsed = Number.parseFloat(gradeValueRaw);
            if (Number.isNaN(parsed) || parsed < 0 || parsed > 10) {
              rowErrors.push({
                line: index + 1,
                data: gradeValueRaw,
                errorKey: "invalidGradeValue",
              });
              continue;
            }
            gradeValue = parsed;
          }

          gradesToSync.push({
            studentId: student._id,
            itemId: item._id,
            courseId: course._id,
            value: gradeValue,
          });
        }

        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
          continue;
        }

        if (gradesToSync.length > 0) {
          await axios.put(`${GRADE_URL}/grades/sync`, { grades: gradesToSync });
        }

        // --- Calcular nota ordinaria ---
        let totalWeighted = 0;
        let allPassed = true;

        evaluationSystem?.evaluationGroups.forEach((/** @type {{ evaluationTypeId: any; totalWeight: number; }} */ grp) => {
          const typeItems = evaluationItems.filter(
            (/** @type {{ evaluationTypeId: any; }} */ i) => String(i.evaluationTypeId) === String(grp.evaluationTypeId)
          );
          if (!typeItems.length) return;

          let groupWeighted = 0;
          typeItems.forEach((/** @type {{ _id: any; weight: number; minGrade: number | null; }} */ i) => {
            const found = gradesToSync.find((g) => String(g.itemId) === String(i._id));
            const val = found?.value || 0;
            groupWeighted += val * (i.weight / 100);
            if (i.minGrade != null && val < i.minGrade) allPassed = false;
          });

          totalWeighted += groupWeighted * (grp.totalWeight / 100);
        });

        const finalOrdinary = allPassed ? totalWeighted : Math.min(totalWeighted, maxGradeLimit);

        await axios.put(`${GRADE_URL}/final-grades/sync`, {
          studentId: student._id,
          courseId: course._id,
          academicYearId: course.academicYearId._id,
          value: Number.parseFloat(finalOrdinary.toFixed(2)),
          evaluationPeriod: "Ordinary",
          isPassed: finalOrdinary >= 5,
        });

        // --- Nota extraordinaria ---
        const extraordinaryValueRaw = row.extraordinary?.trim?.();
        if (extraordinaryValueRaw !== "") {
          const extraordinaryValue = Number.parseFloat(extraordinaryValueRaw);
          if (Number.isNaN(extraordinaryValue) || extraordinaryValue < 0 || extraordinaryValue > 10) {
            errors.push({
              line: index + 1,
              data: extraordinaryValueRaw,
              errorKey: "invalidExtraordinaryGrade",
            });
            continue;
          }

          await axios.put(`${GRADE_URL}/final-grades/sync`, {
            studentId: student._id,
            courseId: course._id,
            academicYearId: course.academicYearId._id,
            value: extraordinaryValue,
            evaluationPeriod: "Extraordinary",
            isPassed: extraordinaryValue >= 5,
          });
        }

        added.push(email);
      }

      return res.json({ success: true, added, errors });
    } catch (err) {
      console.error("Error importing grades:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });
};