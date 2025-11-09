import React, { useEffect, useState, useContext, useRef } from "react";
import {
  Container,
  Box,
  Grid,
  Typography,
  Autocomplete,
  TextField,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Alert,
  Avatar,
  Tooltip,
  IconButton,
} from "@mui/material";
import { Search as SearchIcon, AddCircleOutline as AddCircleOutlineIcon, Delete as DeleteIcon, Person as PersonIcon, HelpOutline as HelpOutlineIcon, } from "@mui/icons-material";
import axios from "axios";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { SessionContext } from "../../SessionContext";
import Papa from "papaparse";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const GradesManagement = () => {
  const { t } = useTranslation();
  const { id: universityID } = useParams();
  const { accountID } = useContext(SessionContext);

  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState("");
  const [successKey, setSuccessKey] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const [courses, setCourses] = useState([]);
  const [evaluationSystem, setEvaluationSystem] = useState(null);

  const [extraordinaryExists, setExtraordinaryExists] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [allGroups, setAllGroups] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [items, setItems] = useState([]);
  const [grades, setGrades] = useState({});
  const [evaluationTypes, setEvaluationTypes] = useState([]);

  const [accounts, setAccounts] = useState([]);
  const [finalDialogOpen, setFinalDialogOpen] = useState(false);
  const [finalGrade, setFinalGrade] = useState({ value: "", evaluationPeriod: "Extraordinary" });

  const [csvErrors, setCsvErrors] = useState([]);
  const csvInputRef = useRef(null);

  // --- Fetch courses and accounts ---
  useEffect(() => {
    if (!universityID) return;
    const fetchInitialData = async () => {
      setLoading(true);
      setErrorKey("");
      try {
        const [coursesRes, accountsRes, groupsProf] = await Promise.all([
          axios.get(`${GATEWAY_URL}/academic/courses/by-university/${universityID}`),
          axios.get(`${GATEWAY_URL}/authVerify/accounts/by-university/${universityID}`),
          axios.get(`${GATEWAY_URL}/academic/groups/by-professor/${accountID}`),
        ]);
        setCourses(coursesRes.data.courses || []);
        setAccounts(accountsRes.data.accounts || []);
        setAllGroups(groupsProf.data.groups || [] );
      } catch (err) {
        const key = "error." + (err.response?.data?.errorKey || "genericError");
        setErrorKey(key);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [universityID]);

  // --- Fetch groups & eval system for selected course ---
  useEffect(() => {
    if (!selectedCourse) {
      setGroups([]);
      setEvaluationSystem(null);
      setSelectedGroup(null);
      setStudents([]);
      setSelectedStudent(null);
      setItems([]);
      setGrades({});
      return;
    }

    const fetchCourseData = async () => {
      setLoading(true);
      setErrorKey("");
      try {
        const filtered = (allGroups || []).filter(
          (g) => g.courseId?._id === selectedCourse._id
        );
        setGroups(filtered);

        const [evalSystemRes, evalTypesRes] = await Promise.all([
          axios.get(`${GATEWAY_URL}/eval/evaluation-systems/by-course/${selectedCourse._id}`),
          axios.get(`${GATEWAY_URL}/academic/evaluation-types/by-university/${universityID}`),
        ]);

        setEvaluationSystem(evalSystemRes.data.system || null);
        setEvaluationTypes(evalTypesRes.data.evaluationTypes || []);
      } catch (err) {
        const key = "error." + (err.response?.data?.errorKey || "genericError");
        setErrorKey(key);
      } finally {
        setLoading(false);
      }
    };
    fetchCourseData();
  }, [selectedCourse, universityID]);

  // --- Load students for selected group ---
  useEffect(() => {
    if (!selectedGroup) {
      setStudents([]);
      setSelectedStudent(null);
      setItems([]);
      setGrades({});
      return;
    }

    const groupStudents = (selectedGroup.students || [])
      .map((sid) => accounts.find((a) => a._id === sid))
      .filter(Boolean);
    setStudents(groupStudents);
    setSelectedStudent(null);
    setItems([]);
    setGrades({});
  }, [selectedGroup, accounts]);

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedGroup) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";",
      delimitersToGuess: [",", "\t", ";", "|"],
      complete: async (results) => {
        try {
          const rows = results.data;
          if (!rows.length) {
            setErrorKey("error.emptyCSV");
            if (csvInputRef.current) csvInputRef.current.value = "";
            return;
          }

          setLoading(true);
          const { data } = await axios.post(
            `${GATEWAY_URL}/grade/grades/import/${selectedGroup._id}`,
            { rows }
          );

          if (data.errors?.length) {
            setCsvErrors(
              data.errors.map((e) => ({
                line: e.line,
                data: e.data,
                key: e.errorKey,
              }))
            );
          } else {
            setCsvErrors([]);
          }

          setErrorKey("");
          await fetchStudentData();
        } catch (err) {
          console.error("Import CSV error:", err);
          const key = "error." + (err.response?.data?.errorKey || "genericError");
          setErrorKey(key);
        } finally {
          setLoading(false);
          if (csvInputRef.current) csvInputRef.current.value = "";
        }
      },
    });
  };

  // --- Fetch items & grades for selected student ---
  useEffect(() => {
    fetchStudentData();
  }, [selectedStudent, selectedGroup, evaluationSystem, selectedCourse]);

  const fetchStudentData = async () => {
    if (!selectedStudent || !selectedGroup || !evaluationSystem) {
      setItems([]);
      setGrades({});
      return;
    }
    setLoading(true);
    setErrorKey("");
    try {
      const itemsRes = await axios.get(`${GATEWAY_URL}/eval/evaluation-items/by-group/${selectedGroup._id}`);
      setItems(itemsRes.data.items || []);

      const gradesRes = await axios.get(
        `${GATEWAY_URL}/grade/grades/by-student/${selectedStudent._id}/course/${selectedCourse._id}`
      );
      const map = {};
      gradesRes.data.grades?.forEach((g) => {
        map[g.itemId] = g.value;
      });
      setGrades(map);

      const finalRes = await axios.get(
        `${GATEWAY_URL}/grade/final-grades/by-student/${selectedStudent._id}/course/${selectedCourse._id}/Extraordinary`
      );
      if (finalRes.data && finalRes.data.grade) {
        setFinalGrade({
          value: finalRes.data.grade.value,
          evaluationPeriod: "Extraordinary",
        });
        setExtraordinaryExists(true);
      } else {
        setFinalGrade({ value: "", evaluationPeriod: "Extraordinary" });
        setExtraordinaryExists(false);
      }
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSubmitError(errorKey ? t(errorKey) : "");
    setSubmitSuccess(successKey ? t(successKey) : "");
  }, [errorKey, successKey, t]);

  const handleGradeChange = (itemId, value) => {
    const val = value === "" ? "" : Math.max(0, Math.min(10, Number.parseFloat(value)));
    setGrades((prev) => ({ ...prev, [itemId]: val }));
  };

  const handleFinalGradeChange = (value) => {
    const val = value === "" ? "" : Math.max(0, Math.min(10, Number.parseFloat(value)));
    setFinalGrade((prev) => ({ ...prev, value: val }));
  };

  const handleSaveGrades = async () => {
    setErrorKey("");
    setSuccessKey("");
    try {
      for (const val of Object.values(grades)) {
        if (val !== "" && (val < 0 || val > 10)) {
          setErrorKey("gradesManagement.error.invalidGradesRange");
          return;
        }
      }

      const payload = { 
        grades: items.map((i) => ({
          studentId: selectedStudent._id,
          itemId: i._id,
          courseId: selectedCourse._id,
          value: grades[i._id] === "" ? null : grades[i._id],
        })), 
      };
      await axios.put(`${GATEWAY_URL}/grade/grades/sync`, payload);

      let totalWeighted = 0;
      let allPassed = true;

      evaluationSystem?.evaluationGroups.forEach((grp) => {
        const typeItems = items.filter(
          (i) => String(i.evaluationTypeId) === String(grp.evaluationTypeId)
        );
        if (!typeItems.length) return;

        let groupWeighted = 0;
        typeItems.forEach((i) => {
          const val = Number.parseFloat(grades[i._id]) || 0;
          groupWeighted += val * (i.weight / 100);
          if (i.minGrade != null && val < i.minGrade) allPassed = false;
        });

        totalWeighted += groupWeighted * (grp.totalWeight / 100);
      });

      const maxGradeLimit = selectedCourse?.maxGrade ?? 4;
      const weighted = allPassed ? totalWeighted : Math.min(totalWeighted, maxGradeLimit);

      await axios.put(`${GATEWAY_URL}/grade/final-grades/sync`, {
        studentId: selectedStudent._id,
        courseId: selectedCourse._id,
        academicYearId: (selectedCourse.academicYearId || selectedCourse.academicYear)?._id || null,
        value: Number.parseFloat(weighted.toFixed(2)),
        evaluationPeriod: "Ordinary",
        isPassed: weighted >= 5,
      });

      setSuccessKey("gradesManagement.success.gradesSaved");
      setTimeout(() => setSuccessKey(""), 2000);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
    }
  };

  const handleSaveExtraordinaryGrade = async () => {
    if (!selectedStudent || !selectedCourse) return;
    setLoading(true);
    setErrorKey("");
    setSuccessKey("");
    try {
      await axios.put(`${GATEWAY_URL}/grade/final-grades/sync`, {
        studentId: selectedStudent._id,
        courseId: selectedCourse._id,
        academicYearId: (selectedCourse.academicYearId || selectedCourse.academicYear)?._id || null,
        value: Number.parseFloat(finalGrade.value),
        evaluationPeriod: "Extraordinary",
        isPassed: finalGrade.value >= 5,
      });
      setExtraordinaryExists(true);
      setSuccessKey("gradesManagement.success.extraordinarySaved");
      setFinalDialogOpen(false);
      setTimeout(() => setSuccessKey(""), 2000);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExtraordinaryGrade = async () => {
    if (!selectedStudent || !selectedCourse) return;

    if (!window.confirm(t("gradesManagement.confirmDeleteExtraordinary"))) return;

    setLoading(true);
    setErrorKey("");
    setSuccessKey("");
    try {
      await axios.delete(
        `${GATEWAY_URL}/grade/final-grades/by-student/${selectedStudent._id}/course/${selectedCourse._id}/Extraordinary`
      );
      setExtraordinaryExists(false);
      setSuccessKey("gradesManagement.success.extraordinaryDeleted");
      setFinalGrade({ value: "", evaluationPeriod: "Extraordinary" });
      setFinalDialogOpen(false);
      setTimeout(() => setSuccessKey(""), 2000);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !courses.length) {
    return (
      <Container data-testid="gradesmanagement-page" maxWidth="md" sx={{ mt: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {t("common.loadingData")}
        </Typography>
      </Container>
    );
  }

  return (
    <Container data-testid="gradesmanagement-page" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          {t("gradesManagement.title")}
        </Typography>

        <Box display="flex" gap={1} alignItems="center">
          <Button
            variant="outlined"
            component="label"
            color="primary"
            disabled={!selectedGroup}
          >
            {t("gradesManagement.importCSV")}
            <input
              key={Date.now()}
              type="file"
              accept=".csv"
              hidden
              ref={csvInputRef}
              onChange={handleImportCSV}
            />
          </Button>

          <Tooltip
            title={t("gradesManagement.csvHelp")}
            arrow
            placement="right"
          >
            <IconButton color="info" size="small">
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {successKey && <Alert severity="success" sx={{ mb: 3 }}>{submitSuccess}</Alert>}
      {errorKey && <Alert severity="error" sx={{ mb: 3 }}>{submitError}</Alert>}

      {csvErrors.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {csvErrors.map((e, idx) => (
            <Alert
              key={idx}
              severity="warning"
              onClose={() => setCsvErrors((prev) => prev.filter((_, i) => i !== idx))}
              sx={{
                borderRadius: 2,
                alignItems: "center",
                "& .MuiAlert-message": { width: "100%" },
              }}
            >
              {e.line ? (
                <>
                  {t("error." + e.key)} → <strong>{e.data}</strong> ({t("line")} {e.line})
                </>
              ) : (
                <>
                  {t("error." + e.key)} → <strong>{e.data}</strong>
                </>
              )}
            </Alert>
          ))}
        </Box>
      )}

      <Card>
        <CardContent>
          {/* Selects */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={courses}
                getOptionLabel={(o) => (o.name || "") + " - " + (o.academicYearId.yearLabel || "")}
                value={selectedCourse}
                onChange={(e, v) => { setSelectedCourse(v);
                  setSelectedGroup(null);
                  setSelectedStudent(null);
                  setEvaluationSystem(null);
                  setItems([]);
                  setGrades({});
                }}
                renderInput={(params) => <TextField {...params} label={t("gradesManagement.selectCourse")} />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={groups}
                getOptionLabel={(g) => g.name || t("gradesManagement.unnamedGroup")}
                value={selectedGroup}
                onChange={(e, v) => { setSelectedGroup(v);
                  setSelectedStudent(null);
                  setItems([]);
                  setGrades({});
                }}
                renderInput={(params) => <TextField {...params} label={t("gradesManagement.selectGroup")} />}
                disabled={!selectedCourse}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={students}
                getOptionLabel={(s) =>
                  s?.userId
                    ? `${s.userId.identityNumber} - ${s.userId.name} ${s.userId.firstSurname} ${s.userId.secondSurname || ""} - ${s.email}`
                    : ""
                }
                value={selectedStudent}
                onChange={(e, v) => setSelectedStudent(v)}
                renderOption={(props, option) => (
                  <Box component="li" {...props} display="flex" alignItems="center" gap={1}>
                    {option.userId?.photoUrl ? (
                      <Avatar src={option.userId.photoUrl} sx={{ width: 24, height: 24 }} />
                    ) : (
                      <PersonIcon sx={{ width: 24, height: 24 }} />
                    )}
                    <Box>
                      <Typography variant="body2">
                        {option.userId?.name} {option.userId?.firstSurname}{" "}
                        {option.userId?.secondSurname || ""}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.userId?.identityNumber} {option.email}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("gradesManagement.selectStudent")}
                    placeholder={t("gradesManagement.searchStudent")}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
                    }}
                  />
                )}
                disabled={!selectedGroup || !students.length}
              />
            </Grid>
          </Grid>

          {/* Items grouped by evaluation type */}
          {!loading && selectedStudent && items.length > 0 && (
            <Box sx={{ mt: 2 }}>
              {evaluationSystem?.evaluationGroups.map((grp) => {
                const typeItems = items.filter(
                  (i) => String(i.evaluationTypeId) === String(grp.evaluationTypeId)
                );
                if (!typeItems.length) return null;

                return (
                  <Box key={grp.evaluationTypeId} sx={{ mb: 3 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                      {
                        evaluationTypes.find(
                          (t) => String(t._id) === String(grp.evaluationTypeId)
                        )?.name || t("gradesManagement.unknownType")
                      }{" "}
                      ({grp.totalWeight}%)
                    </Typography>

                    <Box display="flex" flexDirection="column" gap={1}>
                      {typeItems.map((item) => (
                        <Box
                          key={item._id}
                          display="flex"
                          alignItems="center"
                          gap={1}
                          sx={{
                            padding: "4px 8px",
                          }}
                        >
                          <Typography sx={{ minWidth: 120 }}>{item.name}</Typography>

                          <Typography color="text.secondary" sx={{ textAlign: "right", minWidth: 150 }}>
                            {t("gradesManagement.weight")}: {item.weight}%
                          </Typography>

                          <TextField
                            type="number"
                            data-testid={`grade-input-${item._id}`}
                            label={t("grade")}
                            inputProps={{ min: 0, max: 10, step: 0.1 }}
                            size="small"
                            value={grades[item._id] ?? ""}
                            onChange={(e) => handleGradeChange(item._id, e.target.value)}
                            sx={{ width: 80 }}
                          />

                          {item.minGrade != null && (
                            <Typography color="text.secondary" sx={{ textAlign: "right" }}>
                              {t("gradesManagement.minGrade")}: {item.minGrade}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                );
              })}

              {/* Ordinary Grade */}
              {(() => {
                let totalWeighted = 0;
                let allPassed = true;

                evaluationSystem?.evaluationGroups.forEach((grp) => {
                  const typeItems = items.filter(
                    (i) => String(i.evaluationTypeId) === String(grp.evaluationTypeId)
                  );
                  if (!typeItems.length) return;

                  let groupWeighted = 0;
                  typeItems.forEach((i) => {
                    const val = Number.parseFloat(grades[i._id]) || 0;
                    groupWeighted += val * (i.weight / 100);
                    if (i.minGrade != null && val < i.minGrade) allPassed = false;
                  });

                  totalWeighted += groupWeighted * (grp.totalWeight / 100);
                });

                const maxGradeLimit = selectedCourse?.maxGrade ?? 4;
                const finalOrdinary = allPassed ? totalWeighted : Math.min(totalWeighted, maxGradeLimit);

                return (
                  <Box sx={{ mt: 3, p: 2, borderTop: "1px solid #ddd" }}>
                    <Typography variant="h6">
                      {t("gradesManagement.finalOrdinaryGrade")}:{" "}
                      <strong>{finalOrdinary.toFixed(2)}</strong>
                    </Typography>
                    {!allPassed && (
                      <Typography color="error" variant="body2">
                        {t("gradesManagement.failedMinGradeWarning", {
                          max: selectedCourse?.maxGrade ?? 4,
                        })}
                      </Typography>
                    )}
                  </Box>
                );
              })()}

              {/* Buttons */}
              <Box
                sx={{
                  mt: 3,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={() => setFinalDialogOpen(true)}
                >
                  {t("gradesManagement.extraordinaryGrade")}
                </Button>

                <Button variant="contained" color="primary" onClick={handleSaveGrades}>
                  {t("gradesManagement.saveGrades")}
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Extraordinary Final Grade Dialog */}
      <Dialog open={finalDialogOpen} onClose={() => setFinalDialogOpen(false)} fullWidth>
        <DialogTitle>{t("gradesManagement.extraordinaryFinalGrade")}</DialogTitle>
        <DialogContent>
          <TextField
            label={t("gradesManagement.finalGrade")}
            type="number"
            inputProps={{ min: 0, max: 10, step: 0.1 }}
            fullWidth
            autoComplete="off"
            value={finalGrade.value}
            onChange={(e) => handleFinalGradeChange(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setFinalDialogOpen(false)}>
            {t("common.cancel")}
          </Button>
          {extraordinaryExists && (
            <Button
              color="error"
              variant="outlined"
              onClick={handleDeleteExtraordinaryGrade}
            >
              {t("delete")}
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveExtraordinaryGrade}
            disabled={finalGrade.value === ""}
          >
            {t("gradesManagement.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GradesManagement;
