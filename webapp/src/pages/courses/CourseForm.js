import { useState, useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Box,
  Alert,
  Autocomplete,
  CircularProgress,
  Grid,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import axios from "axios";
import { SessionContext } from "../../SessionContext";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const CourseForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const { universityID } = useContext(SessionContext);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    subjectId: "",
    academicYearId: "",
    studyProgramId: "",
    maxGradeIfMinNotReached: "",
  });

  const [evaluationSystem, setEvaluationSystem] = useState({
    evaluationGroups: [],
  });

  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [evaluationTypes, setEvaluationTypes] = useState([]);
  const [studyPrograms, setStudyPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [submitError, setSubmitError] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [successKey, setSuccessKey] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorKey("");
      try {
        const [subjectsRes, yearsRes, evalTypesRes, programsRes] =
          await Promise.all([
            axios.get(`${GATEWAY_URL}/academic/subjects/by-university/${universityID}`),
            axios.get(`${GATEWAY_URL}/academic/academicYears/by-university/${universityID}`),
            axios.get(`${GATEWAY_URL}/academic/evaluation-types/by-university/${universityID}`),
            axios.get(`${GATEWAY_URL}/academic/studyPrograms/by-university/${universityID}`),
          ]);

        setSubjects(subjectsRes.data.subjects || []);
        setAcademicYears(yearsRes.data.years || []);
        setEvaluationTypes(evalTypesRes.data.evaluationTypes || []);
        setStudyPrograms(programsRes.data.programs || []);

        if (isEditing) {
          const { data } = await axios.get(`${GATEWAY_URL}/academic/courses/${id}`);
          const c = data.course;
          const system = data.system;

          setFormData({
            name: c.name || "",
            code: c.code || "",
            subjectId: c.subjectId._id || "",
            academicYearId: c.academicYearId._id || "",
            studyProgramId: c.studyProgramId._id || "",
            maxGradeIfMinNotReached: c.maxGrade ?? "",
          });

          if (c.subjectId) {
            if (c.subjectId.evaluationPolicyId) {
              try {
                const { data: policyData } = await axios.get(
                  `${GATEWAY_URL}/eval/evaluation-policies/${c.subjectId.evaluationPolicyId}`
                );
                const policy = policyData.policy;

                if (policy && policy.policyRules?.length) {
                  const groupsFromPolicy = policy.policyRules.map((rule) => {
                    const existingGroup =
                      system?.evaluationGroups?.find(
                        (eg) => eg.evaluationTypeId === rule.evaluationTypeId
                      );
                    return {
                      evaluationTypeId: rule.evaluationTypeId,
                      minPercentage: rule.minPercentage,
                      maxPercentage: rule.maxPercentage,
                      totalWeight: existingGroup?.totalWeight ?? 0,
                    };
                  });
                  setEvaluationSystem({ evaluationGroups: groupsFromPolicy });
                } else {
                  setEvaluationSystem({ evaluationGroups: [] });
                }
              } catch (err) {
                console.error("Error fetching evaluation policy:", err);
                setEvaluationSystem({ evaluationGroups: [] });
              }
            } else {
              setEvaluationSystem({ evaluationGroups: [] });
            }
          } else {
            setEvaluationSystem({ evaluationGroups: [] });
          }
        }
      } catch (err) {
        const key = "error." + (err.response?.data?.errorKey || "genericError");
        setErrorKey(key);
      } finally {
        setLoading(false);
      }
    };

    if (universityID) fetchData();
  }, [id, isEditing, universityID]);

  useEffect(() => {
    setSubmitError(errorKey ? t(errorKey) : "");
    setSubmitSuccess(successKey ? t(successKey) : "");
  }, [errorKey, successKey, t]);

  const handleSubjectChange = (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, subjectId: value, studyProgramId: "" }));
    if (errors.subjectId) setErrors((prev) => ({ ...prev, subjectId: "" }));
  };

  useEffect(() => {
    if (!formData.subjectId) {
      setFilteredPrograms([]);
      return;
    }
    const subj = subjects.find((s) => s._id === formData.subjectId);
    if (subj?.studyPrograms) {
      const filtered = studyPrograms.filter((sp) =>
        subj.studyPrograms.includes(sp._id)
      );
      setFilteredPrograms(filtered);
    } else {
      setFilteredPrograms([]);
    }
  }, [formData.subjectId, subjects, studyPrograms]);

  useEffect(() => {
    const fetchPolicyForSubject = async () => {
      if (!formData.subjectId || isEditing) return;

      const subj = subjects.find((s) => s._id === formData.subjectId);
      if (!subj || !subj.evaluationPolicyId) {
        setEvaluationSystem({ evaluationGroups: [] });
        return;
      }

      try {
        setLoading(true);
        const { data } = await axios.get(
          `${GATEWAY_URL}/eval/evaluation-policies/${subj.evaluationPolicyId}`
        );
        const policy = data.policy;
        if (policy && policy.policyRules?.length) {
          const groupsFromPolicy = policy.policyRules.map((rule) => ({
            evaluationTypeId: rule.evaluationTypeId,
            minPercentage: rule.minPercentage,
            maxPercentage: rule.maxPercentage,
            totalWeight: 0,
          }));
          setEvaluationSystem({ evaluationGroups: groupsFromPolicy });
        } else {
          setEvaluationSystem({ evaluationGroups: [] });
        }
      } catch (err) {
        console.error("Error fetching evaluation policy:", err);
        setEvaluationSystem({ evaluationGroups: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchPolicyForSubject();
  }, [formData.subjectId, subjects]);

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleEvaluationGroupChange = (idx, field, value) => {
    const newGroups = [...evaluationSystem.evaluationGroups];
    newGroups[idx][field] = value;
    setEvaluationSystem({ evaluationGroups: newGroups });
    if (errors[`${field}_${idx}`]) {
      setErrors((prev) => ({ ...prev, [`${field}_${idx}`]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validations
    if (!formData.name.trim()) {
      newErrors.name = "course.error.nameRequired";
    } else if (formData.name.trim().length < 3 || formData.name.trim().length > 100) {
      newErrors.name = "course.error.nameLength";
    }

    // Code validations
    if (!formData.code.trim()) {
      newErrors.code = "course.error.codeRequired";
    } else if (formData.code.trim().length < 2 || formData.code.trim().length > 20) {
      newErrors.code = "course.error.codeLength";
    }

    if (
      formData.maxGradeIfMinNotReached === "" ||
      formData.maxGradeIfMinNotReached === null ||
      formData.maxGradeIfMinNotReached === undefined
    ) {
      newErrors.maxGradeIfMinNotReached = "course.error.maxGradeIfMinNotReachedRequired";
    } else if (
      Number.isNaN(formData.maxGradeIfMinNotReached) ||
      formData.maxGradeIfMinNotReached < 0 ||
      formData.maxGradeIfMinNotReached > 10
    ) {
      newErrors.maxGradeIfMinNotReached = "course.error.maxGradeIfMinNotReachedRange";
    }

    if (!formData.subjectId) newErrors.subjectId = "course.error.subjectRequired";
    
    if (!formData.academicYearId)
      newErrors.academicYearId = "course.error.academicYearRequired";
    if (!formData.studyProgramId)
      newErrors.studyProgramId = "course.error.studyProgramRequired";

    let totalWeight = 0;
    if (!evaluationSystem.evaluationGroups.length) {
      newErrors.evaluationGroups = "course.error.noEvaluationGroups";
    } else {
      evaluationSystem.evaluationGroups.forEach((eg, idx) => {
        if (!eg.totalWeight || eg.totalWeight < 0 || eg.totalWeight > 100)
          newErrors[`totalWeight_${idx}`] = "course.error.invalidWeight";
        if (eg.minPercentage && eg.totalWeight < eg.minPercentage)
          newErrors[`totalWeight_${idx}`] = "course.error.belowMin";
        if (eg.maxPercentage && eg.totalWeight > eg.maxPercentage)
          newErrors[`totalWeight_${idx}`] = "course.error.aboveMax";
        totalWeight += eg.totalWeight || 0;
      });
      if (totalWeight !== 100) newErrors.totalWeight = "course.error.totalWeightNot100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorKey("");
    setSuccessKey("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        subjectId: formData.subjectId,
        academicYearId: formData.academicYearId,
        studyProgramId: formData.studyProgramId,
        maxGrade: formData.maxGradeIfMinNotReached,
        evaluationGroups: evaluationSystem.evaluationGroups,
      };

      let response;
      if (isEditing) {
        response = await axios.put(`${GATEWAY_URL}/academic/courses/${id}`, payload);
      } else {
        payload.universityId = universityID;
        response = await axios.post(`${GATEWAY_URL}/academic/courses`, payload);
      }

      if (!isEditing && response.data?.course._id) {
        const newId = response.data.course._id;
        window.history.pushState({}, "", `/courses/${newId}`);
        setTimeout(() => navigate(`/courses/${newId}`, { replace: true }), 0);
      }

      setSuccessKey(isEditing ? "course.success.updated" : "course.success.created");
      setTimeout(() => setSuccessKey(""), 2000);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("course.confirmDelete"))) return;

    setDeleting(true);
    try {
      await axios.delete(`${GATEWAY_URL}/academic/courses/${id}`);
      setSuccessKey("course.success.deleted");
      setTimeout(() => navigate("/courses"), 1500);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
      setDeleting(false);
    }
  };

  if (loading && isEditing && !submitSuccess) {
    return (
      <Container data-testid="course-form-page" maxWidth="md" sx={{ mt: 4, mb: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {t("common.loadingData")}
        </Typography>
      </Container>
    );
  }

  return (
    <Container data-testid="course-form-page" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate("/courses")} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">
          {isEditing ? t("course.updateTitle") : t("course.createTitle")}
        </Typography>
      </Box>

      {successKey && <Alert severity="success">{submitSuccess}</Alert>}
      {errorKey && <Alert severity="error">{submitError}</Alert>}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Basic Info */}
              <Grid item xs={12}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {t("course.basicInfo")}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t("course.name")}
                  value={formData.name}
                  onChange={handleInputChange("name")}
                  error={Boolean(errors.name)}
                  helperText={errors.name && t(errors.name)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t("course.code")}
                  value={formData.code}
                  onChange={handleInputChange("code")}
                  error={Boolean(errors.code)}
                  helperText={errors.code && t(errors.code)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t("course.maxGradeIfMinNotReached")}
                  type="number"
                  value={formData.maxGradeIfMinNotReached}
                  inputProps={{ min: 0, max: 10, step: 0.1 }}
                  onChange={handleInputChange("maxGradeIfMinNotReached")}
                  error={Boolean(errors.maxGradeIfMinNotReached)}
                  helperText={errors.maxGradeIfMinNotReached && t(errors.maxGradeIfMinNotReached)}
                  required
                />
              </Grid>

              {/* Subject */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={subjects}
                  getOptionLabel={(s) => s.name || ""}
                  value={subjects.find((s) => s._id === formData.subjectId) || null}
                  onChange={(_, v) => {
                    setFormData((prev) => ({ ...prev, subjectId: v._id, studyProgramId: "" }));
                    if (errors.subjectId) setErrors((prev) => ({ ...prev, subjectId: "" }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("course.subject")}
                      error={Boolean(errors.subjectId)}
                      helperText={errors.subjectId ? t(errors.subjectId) : ""}
                      fullWidth
                    />
                  )}
                  disabled={isEditing}
                  disableClearable
                />
              </Grid>

              {/* Academic Year */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={academicYears}
                  getOptionLabel={(y) => y.yearLabel || ""}
                  value={academicYears.find((y) => y._id === formData.academicYearId) || null}
                  onChange={(_, v) => {
                    setFormData((prev) => ({ ...prev, academicYearId: v?._id || "" }));
                    if (errors.academicYearId) setErrors((prev) => ({ ...prev, academicYearId: "" }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("course.academicYear")}
                      error={Boolean(errors.academicYearId)}
                      helperText={errors.academicYearId ? t(errors.academicYearId) : ""}
                      fullWidth
                    />
                  )}
                  disabled={isEditing}
                  clearOnEscape
                />
              </Grid>

              {/* Study Program */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={filteredPrograms}
                  getOptionLabel={(sp) => sp.name || ""}
                  value={filteredPrograms.find((sp) => sp._id === formData.studyProgramId) || null}
                  onChange={(_, v) => {
                    setFormData((prev) => ({ ...prev, studyProgramId: v?._id || "" }));
                    if (errors.studyProgramId) setErrors((prev) => ({ ...prev, studyProgramId: "" }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("course.studyProgram")}
                      error={Boolean(errors.studyProgramId)}
                      helperText={errors.studyProgramId ? t(errors.studyProgramId) : ""}
                      fullWidth
                    />
                  )}
                  disabled={!formData.subjectId || isEditing}
                  clearOnEscape
                />
              </Grid>

              {/* Evaluation System */}
              <Grid item xs={12}>
                <Typography variant="h5" fontWeight="bold">
                  {t("course.evaluationSystem")}
                </Typography>
                {!evaluationSystem.evaluationGroups.length && (
                  <Typography variant="h6">
                    {t("course.selectSubjectToLoadPolicy")}
                  </Typography>
                )}
                {errors.evaluationGroups && (
                  <Alert severity="error">{t(errors.evaluationGroups)}</Alert>
                )}
                {evaluationSystem.evaluationGroups.map((eg, idx) => {
                  const et = evaluationTypes.find((et) => et._id === eg.evaluationTypeId);
                  return (
                    <Box key={idx} display="flex" gap={2} flexWrap="wrap" mt={1}>
                      {/* Evaluation Type */}
                      <FormControl sx={{ width: 220 }}>
                        <InputLabel>{t("subject.evaluationType")}</InputLabel>
                        <Select value={eg.evaluationTypeId} label={t("subject.evaluationType")} disabled>
                          <MenuItem value={eg.evaluationTypeId}>
                            {et ? et.name : ""}
                          </MenuItem>
                        </Select>
                      </FormControl>
                      {/* Total Weight */}
                      <TextField
                        label={`${t("course.totalWeight")} (${eg.minPercentage}–${eg.maxPercentage}%)`}
                        type="number"
                        value={eg.totalWeight}
                        inputProps={{ min: 0, max: 100 }}
                        onChange={(e) =>
                          handleEvaluationGroupChange(idx, "totalWeight", Number(e.target.value))
                        }
                        error={Boolean(errors[`totalWeight_${idx}`])}
                        helperText={
                          errors[`totalWeight_${idx}`] &&
                          t(errors[`totalWeight_${idx}`])
                        }
                        sx={{ width: 180 }}
                      />
                    </Box>
                  );
                })}
                {errors.totalWeight && (
                  <Alert severity="error">{t(errors.totalWeight)}</Alert>
                )}
              </Grid>

              {/* Actions */}
              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/courses")}
                    disabled={loading || deleting}
                  >
                    {t("common.cancel")}
                  </Button>
                  {isEditing && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleDelete}
                      disabled={loading || deleting}
                      startIcon={deleting ? <CircularProgress size={20} /> : null}
                    >
                      {deleting ? t("deleting") : t("delete")}
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || deleting}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                  >
                    {loading ? t("saving") : isEditing ? t("update") : t("create")}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CourseForm;
