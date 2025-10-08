import { useEffect, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  Alert,
  FormHelperText,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { SessionContext } from "../../SessionContext";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const GroupForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { universityID } = useContext(SessionContext);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [professors, setProfessors] = useState([]);

  const [form, setForm] = useState({
    name: "",
    courseId: "",
    students: [],
    professors: [],
  });

  const [errors, setErrors] = useState({});
  const [allEnrollments, setAllEnrollments] = useState([]);

  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const [successKey, setSuccessKey] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch courses
        const { data: coursesData } = await axios.get(
          `${GATEWAY_URL}/academic/courses/by-university/${universityID}`
        );
        setCourses(coursesData?.courses ?? []);

        // Fetch enrollments
        const { data: enrollmentsData } = await axios.get(
          `${GATEWAY_URL}/academic/enrollments/by-university/${universityID}`
        );
        setAllEnrollments(enrollmentsData?.enrollments ?? []);

        // Fetch accounts
        const { data: accounts } = await axios.get(
          `${GATEWAY_URL}/authVerify/accounts/by-university/${universityID}`
        );

        // Set professors list
        setProfessors(
          accounts.accounts
            .filter((a) => a.role === "professor")
            .map((p) => ({ id: p._id, label: `${p.userId?.name ?? ""} ${p.userId?.firstSurname ?? ""} ${p.userId?.secondSurname ?? ""} (${p.email})` }))
        );

        // Students list initially empty; will populate after course selection
        setStudents([]);

        if (isEditing) {
          const { data: groupData } = await axios.get(
            `${GATEWAY_URL}/academic/groups/${id}`
          );
          const g = groupData.group;

          setForm({
            name: g.name ?? "",
            courseId: g.courseId?._id ?? "",
            students: g.students ?? [],
            professors: g.professors ?? [],
          });

          // Populate students based on course of the group, igual que el useEffect final
          if (g.courseId?._id) {
            const course = coursesData.courses.find(c => c._id === g.courseId._id);
            if (course) {
              const availableStudents = enrollmentsData.enrollments
                .filter(e => e.studyProgramId._id === course.studyProgramId._id)
                .map(e => ({
                  id: e.accountId,
                  label: `${e.account?.userId?.name ?? ""} ${e.account?.userId?.firstSurname ?? ""} ${e.account?.userId?.secondSurname ?? ""} (${e.account?.email})`
                }));
              setStudents(availableStudents);
            }
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
    if (!form.courseId) return;

    const course = courses.find(c => c._id === form.courseId);
    if (!course) return;

    const filteredStudents = allEnrollments
      .filter(e => e.studyProgramId._id === course.studyProgramId._id)
      .map(e => ({
        id: e.accountId,
        label: `${e.account?.userId?.name ?? ""} ${e.account?.userId?.firstSurname ?? ""} ${e.account?.userId?.secondSurname ?? ""} (${e.account?.email})`
      }));

    setForm(prev => ({ ...prev, students: [] }));
    setStudents(filteredStudents);
  }, [form.courseId, allEnrollments, courses]);

  // Translate global error/success messages dynamically
  useEffect(() => {
    setSubmitError(errorKey ? t(errorKey) : "");
    setSubmitSuccess(successKey ? t(successKey) : "");
  }, [errorKey, successKey, t]);

  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "group.error.nameRequired";
    } else if (form.name.trim().length < 1 || form.name.trim().length > 50) {
      newErrors.name = "group.error.nameLength";
    }

    if (!form.courseId) {
      newErrors.courseId = "group.error.courseRequired";
    }

    if (!form.professors.length) {
      newErrors.professors = "group.error.atLeastOneProfessor";
    }

    if (!form.students.length) {
      newErrors.students = "group.error.atLeastOneStudent";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const addProfessor = (professorId) => {
    setForm((prev) => ({
      ...prev,
      professors: [...prev.professors, professorId],
    }));
    if (errors.professors) setErrors((prev) => ({ ...prev, professors: "" }));
  };

  const removeProfessor = (professorId) => {
    setForm((prev) => ({
      ...prev,
      professors: prev.professors.filter((id) => id !== professorId),
    }));
  };

  const addStudent = (studentId) => {
    setForm((prev) => ({
      ...prev,
      students: [...prev.students, studentId],
    }));
    if (errors.students) setErrors((prev) => ({ ...prev, students: "" }));
  };

  const removeStudent = (studentId) => {
    setForm((prev) => ({
      ...prev,
      students: prev.students.filter((id) => id !== studentId),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorKey("");
    setSuccessKey("");

    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = form;
      let response;

      if (isEditing) {
        response = await axios.put(`${GATEWAY_URL}/academic/groups/${id}`, payload);
      } else {
        payload.universityId = universityID;
        response = await axios.post(`${GATEWAY_URL}/academic/groups`, payload);
      }

      if (!isEditing && response.data?.group._id) {
        const newId = response.data.group._id;
        window.history.pushState({}, "", `/groups/${newId}`);
        setTimeout(() => navigate(`/groups/${newId}`, { replace: true }), 0);
      }

      setSuccessKey(isEditing ? "group.success.updated" : "group.success.created");
      setTimeout(() => setSuccessKey(""), 2000);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("group.confirmDelete"))) return;
    setDeleting(true);
    try {
      await axios.delete(`${GATEWAY_URL}/academic/groups/${id}`);
      setSuccessKey("group.success.deleted");
      setTimeout(() => navigate("/groups"), 1500);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
      setDeleting(false);
    }
  };

  if (loading && isEditing && !submitSuccess) {
    return (
      <Container data-testid="group-form-page"  maxWidth="md" sx={{ mt: 4, mb: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {t("common.loadingData")}
        </Typography>
      </Container>
    );
  }

  // Students linked to selected course
  const availableStudents = students.filter(
    (s) => !form.students.includes(s.id)
  );

  const selectedStudents = students.filter(
    (s) => form.students.includes(s.id)
  );

  const availableProfessors = professors.filter(
    (p) => !form.professors.includes(p.id)
  );
  const selectedProfessors = professors.filter((p) =>
    form.professors.includes(p.id)
  );

  return (
    <Container data-testid="group-form-page" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate("/groups")} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditing ? t("group.updateTitle") : t("group.createTitle")}
        </Typography>
      </Box>

      {successKey && <Alert severity="success" sx={{ mb: 3 }}>{submitSuccess}</Alert>}
      {errorKey && <Alert severity="error" sx={{ mb: 3 }}>{submitError}</Alert>}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {t("group.basicInfo")}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t("group.name")}
                  name="name"
                  value={form.name}
                  onChange={handleInputChange("name")}
                  error={Boolean(errors.name)}
                  helperText={errors.name && t(`${errors.name}`)}
                  required
                  autoComplete="off"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required error={Boolean(errors.courseId)}>
                  <InputLabel>{t("group.course")}</InputLabel>
                  <Select
                    value={form.courseId}
                    label={t("group.course")}
                    onChange={handleInputChange("courseId")}
                    disabled={isEditing}
                  >
                    {courses.map((c) => (
                      <MenuItem key={c._id} value={c._id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.courseId && (
                    <FormHelperText>{t(`${errors.courseId}`)}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Professors */}
              <Grid item xs={12}>
                <Typography variant="h5" fontWeight="bold" mb={2}>{t("group.professors")}</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="h6">{t("group.availableProfessors")}</Typography>
                    <Box border={availableProfessors.length ? 1 : 0} borderColor="grey.300" borderRadius={2} p={1}>
                      <List dense>
                        {availableProfessors.map((p) => (
                          <ListItem
                            key={p.id}
                            secondaryAction={
                              <IconButton aria-label="add professor" onClick={() => addProfessor(p.id)} color="primary">
                                <AddIcon />
                              </IconButton>
                            }
                          >
                            <ListItemText primary={p.label} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h6">{t("group.selectedProfessors")}</Typography>
                    <Box border={selectedProfessors.length ? 1 : 0} borderColor="grey.300" borderRadius={2} p={1}>
                      <List dense>
                        {selectedProfessors.map((p) => (
                          <ListItem
                            key={p.id}
                            secondaryAction={
                              <IconButton aria-label="remove professor" onClick={() => removeProfessor(p.id)} color="error">
                                <RemoveIcon />
                              </IconButton>
                            }
                          >
                            <ListItemText primary={p.label} />
                          </ListItem>
                        ))}
                      </List>
                      {errors.professors && (
                        <FormHelperText error>{t(`${errors.professors}`)}</FormHelperText>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Grid>

              {/* Students */}
              <Grid item xs={12}>
                <Typography variant="h5" fontWeight="bold" mb={2}>{t("group.students")}</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="h6">{t("group.availableStudents")}</Typography>
                    <Box border={availableStudents.length ? 1 : 0} borderColor="grey.300" borderRadius={2} p={1}>
                      <List dense>
                        {availableStudents.map((s) => (
                          <ListItem
                            key={s.id}
                            secondaryAction={
                              <IconButton aria-label="add student" onClick={() => addStudent(s.id)} color="primary">
                                <AddIcon />
                              </IconButton>
                            }
                          >
                            <ListItemText
                              primary={s.label}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h6">{t("group.selectedStudents")}</Typography>
                    <Box border={selectedStudents.length ? 1 : 0} borderColor="grey.300" borderRadius={2} p={1}>
                      <List dense>
                        {selectedStudents.map((s) => (
                          <ListItem
                            key={s.id}
                            secondaryAction={
                              <IconButton aria-label="remove student" onClick={() => removeStudent(s.id)} color="error">
                                <RemoveIcon />
                              </IconButton>
                            }
                          >
                            <ListItemText
                              primary={s.label}
                            />
                          </ListItem>
                        ))}
                      </List>
                      {errors.students && (
                        <FormHelperText error>{t(`${errors.students}`)}</FormHelperText>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Grid>

              {/* Actions */}
              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/groups")}
                    disabled={saving || deleting}
                  >
                    {t("common.cancel")}
                  </Button>

                  {isEditing && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleDelete}
                      disabled={saving || deleting}
                      startIcon={deleting ? <CircularProgress size={20} /> : null}
                    >
                      {deleting ? t("deleting") : t("delete")}
                    </Button>
                  )}

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving || deleting}
                    startIcon={saving ? <CircularProgress size={20} /> : null}
                  >
                    {saving ? t("saving") : isEditing ? t("update") : t("create")}
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

export default GroupForm;
