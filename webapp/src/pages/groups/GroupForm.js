import { useEffect, useState, useContext, useRef } from "react";
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
  Avatar,
  Autocomplete,
  Stack,
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
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
   HelpOutline as HelpOutlineIcon,
} from "@mui/icons-material";
import { SessionContext } from "../../SessionContext";
import Papa from "papaparse";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const GroupForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { universityID, role, accountID } = useContext(SessionContext);

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
  const [csvErrors, setCsvErrors] = useState([]);

  const profCsvInputRef = useRef(null);
  const studentCsvInputRef = useRef(null);

  const [availableProfFilter, setAvailableProfFilter] = useState("");
  const [selectedProfFilter, setSelectedProfFilter] = useState("");
  const [availableStudentFilter, setAvailableStudentFilter] = useState("");
  const [selectedStudentFilter, setSelectedStudentFilter] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: coursesData } = await axios.get(
          `${GATEWAY_URL}/academic/courses/by-university/${universityID}`
        );
        setCourses(coursesData?.courses ?? []);

        const { data: enrollmentsData } = await axios.get(
          `${GATEWAY_URL}/academic/enrollments/by-university/${universityID}`
        );
        setAllEnrollments(enrollmentsData?.enrollments ?? []);

        const { data: accounts } = await axios.get(
          `${GATEWAY_URL}/authVerify/accounts/by-university/${universityID}`
        );

        setProfessors(
          accounts.accounts
            .filter(a => a.role === "professor")
            .map(p => ({
              id: p._id,
              userId: p.userId,  
              email: p.email,
            }))
        );

        setStudents([]);

        if (isEditing) {
          const { data: groupData } = await axios.get(
            `${GATEWAY_URL}/academic/groups/${id}`
          );
          const g = groupData.group;

          if (role === "professor") {
            const isAuthorized = g.professors?.includes(accountID);
            if (!isAuthorized) {
              navigate("/not-found");
              return;
            }
          }

          setForm({
            name: g.name ?? "",
            courseId: g.courseId?._id ?? "",
            students: g.students ?? [],
            professors: g.professors ?? [],
          });

          
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

    const fetchStudentsData = async () => {
      const course = courses.find(c => c._id === form.courseId);
      if (!course) return;

      const filteredStudents = allEnrollments
        .filter(e => e.studyProgramId._id === course.studyProgramId._id)
        .map(e => ({
          id: e.accountId,
          userId: e.account.userId,
          email: e.account.email,
        }));

      try {
        const { data } = await axios.get(`${GATEWAY_URL}/academic/groups/students-in-course/${form.courseId}`);
        const assignedIds = data.students || [];

        const allowedIds = isEditing ? form.students : [];

        const available = filteredStudents.filter(s => 
          !assignedIds.includes(s.id) || allowedIds.includes(s.id)
        );

        setForm(prev => ({ ...prev, students: [] }));
        setStudents(available);
      } catch (err) {
        console.error("Error filtering students:", err);
        setStudents(filteredStudents); 
      }
    }

    fetchStudentsData();
  }, [form.courseId, allEnrollments, courses]);

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

  const handleImportCSV = (type, id, groupId = null) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      delimiter: ";", 
      delimitersToGuess: [',', '\t', ';', '|'],
      complete: async (results) => {
        const emails = results.data.flat().map(s => s.trim()).filter(Boolean);

        if (!emails.length) {
          setErrorKey("error.emptyCSV");
            if (type === "professor")
              profCsvInputRef.current.value = "";
            if (type === "student")
              studentCsvInputRef.current.value = "";
          return;
        }

        try {
          setLoading(true);
          const url = `${GATEWAY_URL}/academic/groups/import-${type}/${id}`;
          const { data } = await axios.post(url, { emails, groupId });

          if (data.added?.length) {
            setForm(prev => ({
              ...prev,
              [type]: [
                ...new Set([...prev[type], ...data.added])
              ],
            }));
          }

          if (data.errors?.length) {
            setCsvErrors(data.errors.map(e => ({
              line: e.line,
              email: e.email,
              key: e.errorKey,
            })));
          } else {
            setCsvErrors([]);
          }

          setErrorKey(null);
        } catch (err) {
          console.error("Import CSV error:", err);
          const key = "error." + (err.response?.data?.errorKey || "genericError");
          setErrorKey(key);
        } finally {
          setLoading(false);
          if (type === "professor")
            profCsvInputRef.current.value = "";
          if (type === "student")
            studentCsvInputRef.current.value = "";
        }
      },
    });
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
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  width="100%"
                >
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {t("group.basicInfo")}
                  </Typography>

                  {isEditing && role === "professor" && (
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => navigate(`/groups/${id}/evaluation-items`)}
                      sx={{
                        textTransform: "none",
                        alignSelf: "flex-start", 
                      }}
                    >
                      {t("group.manageEvaluationItems")}
                    </Button>
                  )}
                </Box>
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
                  disabled={role === "professor"}
                />
              </Grid>

              <Grid item xs={12}>
                <Autocomplete
                  options={courses}
                  getOptionLabel={(c) => c.name + " - " + c.academicYearId.yearLabel}
                  value={courses.find(c => c._id === form.courseId) || null}
                  onChange={(_, v) => handleInputChange("courseId")({ target: { value: v?._id || "" } })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("group.course")}
                      error={Boolean(errors.courseId)}
                      helperText={errors.courseId && t(`${errors.courseId}`)}
                      required
                    />
                  )}
                  disabled={isEditing || role === "professor"}
                  isOptionEqualToValue={(option, value) => option._id === value._id}
                  disableClearable
                />
              </Grid>

              {csvErrors.length > 0 && (
                <Stack spacing={1} sx={{ mt: 2, ml: 3, width: "100%" }}>
                  {csvErrors.map((e, idx) => (
                    <Alert
                      key={idx}
                      severity="warning"
                      onClose={() => setCsvErrors(prev => prev.filter((_, i) => i !== idx))}
                      sx={{
                        width: "100%",
                        borderRadius: 2,
                        alignItems: "center",
                        "& .MuiAlert-message": {
                          width: "100%",
                        },
                      }}
                    >
                      {e.line ? (
                        <>
                          {t("error." + e.key)} → <strong>{e.email}</strong> ({t("line")} {e.line})
                        </>
                      ) : (
                        <>
                          {t("error." + e.key)} → <strong>{e.email}</strong>
                        </>
                      )}
                    </Alert>
                  ))}
                </Stack>
              )}

              {/* Professors Dual List */}
              {role !== "professor" && (
                <Grid item xs={12}>
                  <Typography variant="h5" fontWeight="bold" mb={2}>{t("group.professors")}</Typography>
                  <Box mb={2} display="flex" gap={2}>
                    <Box mb={2} display="flex" gap={1} alignItems="center">
                      <Button variant="outlined" component="label">
                        {t("group.importProfessors")}
                        <input
                          key={Date.now()}
                          type="file"
                          accept=".csv"
                          hidden
                          ref={profCsvInputRef}
                          onChange={handleImportCSV("professors", universityID)}
                        />
                      </Button>

                      <Tooltip
                        title={t("group.csvHelpProfessors")}
                        arrow
                        placement="right"
                      >
                        <IconButton color="info" size="small">
                          <HelpOutlineIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Grid container spacing={2}>
                    {/* Available Professors */}
                    <Grid item xs={6}>
                      <Typography variant="h6">{t("group.availableProfessors")}</Typography>
                      <TextField
                        size="small"
                        placeholder={t("enrollments.searchPlaceholder")}
                        fullWidth
                        onChange={(e) => setAvailableProfFilter(e.target.value)}
                        sx={{ mb: 1 }}
                      />
                      <Box border={availableProfessors.length ? 1 : 0} borderColor="grey.300" borderRadius={2} p={1} maxHeight={300} overflow="auto">
                        <List dense>
                          {availableProfessors
                            .filter(p =>
                              `${p.userId.identityNumber} ${p.userId.name} ${p.userId.firstSurname} ${p.userId.secondSurname || ""} ${p.email}`
                                .toLowerCase()
                                .includes(availableProfFilter.toLowerCase())
                            )
                            .map((p) => (
                              <ListItem
                                key={p.id}
                                secondaryAction={
                                  <IconButton data-testid={`add-professor-${p.id}`} onClick={() => addProfessor(p.id)} color="primary">
                                    <AddIcon />
                                  </IconButton>
                                }
                              >
                                {p.userId.photoUrl ? (
                                  <Avatar src={p.userId.photoUrl} sx={{ width: 24, height: 24, mr: 1 }} />
                                ) : (
                                  <Avatar sx={{ width: 24, height: 24, mr: 1 }}><PersonIcon fontSize="small" /></Avatar>
                                )}
                                <Box>
                                  <Typography variant="body2">
                                    {p.userId.name} {p.userId.firstSurname} {p.userId.secondSurname || ""}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {p.userId.identityNumber} {p.email}
                                  </Typography>
                                </Box>
                              </ListItem>
                            ))}
                        </List>
                      </Box>
                    </Grid>

                    {/* Selected Professors */}
                    <Grid item xs={6}>
                      <Typography variant="h6">{t("group.selectedProfessors")}</Typography>
                      <TextField
                        size="small"
                        placeholder={t("enrollments.searchPlaceholder")}
                        fullWidth
                        onChange={(e) => setSelectedProfFilter(e.target.value)}
                        sx={{ mb: 1 }}
                      />
                      <Box border={selectedProfessors.length ? 1 : 0} borderColor="grey.300" borderRadius={2} p={1} maxHeight={300} overflow="auto">
                        <List dense>
                          {selectedProfessors
                            .filter(p =>
                              `${p.userId.identityNumber} ${p.userId.name} ${p.userId.firstSurname} ${p.userId.secondSurname || ""} ${p.email}`
                                .toLowerCase()
                                .includes(selectedProfFilter.toLowerCase())
                            )
                            .map((p) => (
                              <ListItem
                                key={p.id}
                                secondaryAction={
                                  <IconButton data-testid={`remove-professor-${p.id}`} onClick={() => removeProfessor(p.id)} color="error">
                                    <RemoveIcon />
                                  </IconButton>
                                }
                              >
                                {p.userId.photoUrl ? (
                                  <Avatar src={p.userId.photoUrl} sx={{ width: 24, height: 24, mr: 1 }} />
                                ) : (
                                  <Avatar sx={{ width: 24, height: 24, mr: 1 }}><PersonIcon fontSize="small" /></Avatar>
                                )}
                                <Box>
                                  <Typography variant="body2">
                                    {p.userId.name} {p.userId.firstSurname} {p.userId.secondSurname || ""}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {p.userId.identityNumber} {p.email}
                                  </Typography>
                                </Box>
                              </ListItem>
                            ))}
                        </List>
                        {errors.professors && <FormHelperText error>{t(`${errors.professors}`)}</FormHelperText>}
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
              )}

              {/* Students Dual List */}
              <Grid item xs={12}>
                <Typography variant="h5" fontWeight="bold" mb={2}>{t("group.students")}</Typography>
                <Box mb={2} display="flex" gap={2}>
                  <Box mb={2} display="flex" gap={1} alignItems="center">
                    <Button variant="outlined" component="label" disabled={!form.courseId}>
                      {t("group.importStudents")}
                      <input
                        key={Date.now()}
                        type="file"
                        accept=".csv"
                        hidden
                        ref={studentCsvInputRef}
                        onChange={handleImportCSV("students", form.courseId, id ?? null)}
                      />
                    </Button>

                    <Tooltip
                      title={t("group.csvHelpStudents")}
                      arrow
                      placement="right"
                    >
                      <IconButton color="info" size="small">
                        <HelpOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Grid container spacing={2}>
                  {/* Available Students */}
                  <Grid item xs={6}>
                    <Typography variant="h6">{t("group.availableStudents")}</Typography>
                    <TextField
                      size="small"
                      placeholder={t("enrollments.searchPlaceholder")}
                      fullWidth
                      onChange={(e) => setAvailableStudentFilter(e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <Box border={availableStudents.length ? 1 : 0} borderColor="grey.300" borderRadius={2} p={1} maxHeight={300} overflow="auto">
                      <List dense>
                        {availableStudents
                          .filter(s =>
                            `${s.userId.identityNumber} ${s.userId.name} ${s.userId.firstSurname} ${s.userId.secondSurname || ""} ${s.email}`
                              .toLowerCase()
                              .includes(availableStudentFilter.toLowerCase())
                          )
                          .map((s) => (
                            <ListItem
                              key={s.id}
                              secondaryAction={
                                <IconButton data-testid={`add-student-${s.id}`} onClick={() => addStudent(s.id)} color="primary">
                                  <AddIcon />
                                </IconButton>
                              }
                            >
                              {s.userId.photoUrl ? (
                                <Avatar src={s.userId.photoUrl} sx={{ width: 24, height: 24, mr: 1 }} />
                              ) : (
                                <Avatar sx={{ width: 24, height: 24, mr: 1 }}><PersonIcon fontSize="small" /></Avatar>
                              )}
                              <Box>
                                <Typography variant="body2">
                                  {s.userId.name} {s.userId.firstSurname} {s.userId.secondSurname || ""}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {s.userId.identityNumber} {s.email}
                                </Typography>
                              </Box>
                            </ListItem>
                          ))}
                      </List>
                    </Box>
                  </Grid>

                  {/* Selected Students */}
                  <Grid item xs={6}>
                    <Typography variant="h6">{t("group.selectedStudents")}</Typography>
                    <TextField
                      size="small"
                      placeholder={t("enrollments.searchPlaceholder")}
                      fullWidth
                      onChange={(e) => setSelectedStudentFilter(e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <Box border={selectedStudents.length ? 1 : 0} borderColor="grey.300" borderRadius={2} p={1} maxHeight={300} overflow="auto">
                      <List dense>
                        {selectedStudents
                          .filter(s =>
                            `${s.userId.identityNumber} ${s.userId.name} ${s.userId.firstSurname} ${s.userId.secondSurname || ""} ${s.email}`
                              .toLowerCase()
                              .includes(selectedStudentFilter.toLowerCase())
                          )
                          .map((s) => (
                            <ListItem
                              key={s.id}
                              secondaryAction={
                                <IconButton data-testid={`remove-student-${s.id}`} onClick={() => removeStudent(s.id)} color="error">
                                  <RemoveIcon />
                                </IconButton>
                              }
                            >
                              {s.userId.photoUrl ? (
                                <Avatar src={s.userId.photoUrl} sx={{ width: 24, height: 24, mr: 1 }} />
                              ) : (
                                <Avatar sx={{ width: 24, height: 24, mr: 1 }}><PersonIcon fontSize="small" /></Avatar>
                              )}
                              <Box>
                                <Typography variant="body2">
                                  {s.userId.name} {s.userId.firstSurname} {s.userId.secondSurname || ""}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {s.userId.identityNumber} {s.email}
                                </Typography>
                              </Box>
                            </ListItem>
                          ))}
                      </List>
                      {errors.students && <FormHelperText error>{t(`${errors.students}`)}</FormHelperText>}
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
