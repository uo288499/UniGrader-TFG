import { useState, useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Alert,
  CircularProgress,
  Grid,
  FormControl,
  FormHelperText,
  InputLabel,
  Button,
  IconButton,
  Avatar,
  TextField,
  Autocomplete,
  MenuItem,
  Select,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import axios from "axios";
import { SessionContext } from "../../SessionContext";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const EnrollmentForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const { universityID: sessionUniversityId } = useContext(SessionContext);

  const [formData, setFormData] = useState({
    studyProgramId: "",
    academicYearId: "",
    accountId: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [submitError, setSubmitError] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [successKey, setSuccessKey] = useState("");

  const [studyPrograms, setStudyPrograms] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [programsRes, accountsRes, yearsRes] = await Promise.all([
          axios.get(`${GATEWAY_URL}/academic/studyprograms/by-university/${sessionUniversityId}`),
          axios.get(`${GATEWAY_URL}/authVerify/accounts/by-university/${sessionUniversityId}`),
          axios.get(`${GATEWAY_URL}/academic/academicYears/by-university/${sessionUniversityId}`),
        ]);

        setAcademicYears(yearsRes.data.years || []);
        setStudyPrograms(programsRes.data.programs || []);
        setStudents(
          (accountsRes.data.accounts || []).filter(
            (acc) => acc.role?.toLowerCase() === "student"
          )
        );

        if (isEditing) {
          const { data } = await axios.get(`${GATEWAY_URL}/academic/enrollments/${id}`);
          const enrollment = data.enrollment;

          if (enrollment.studyProgramId.universityId !== sessionUniversityId) {
            navigate("/not-found");
            return;
          }

          setFormData({
            studyProgramId: enrollment.studyProgramId._id,
            academicYearId: enrollment.academicYearId._id,
            accountId: enrollment.accountId,
          });
        }
      } catch (err) {
        const key = "error." + (err.response?.data?.errorKey || "genericError");
        setErrorKey(key);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditing, sessionUniversityId, navigate]);

  useEffect(() => {
    if (errorKey) {
      setSubmitError(t(errorKey));
    } else {
      setSubmitError("");
    }

    if (successKey) {
      setSubmitSuccess(t(successKey));
    } else {
      setSubmitSuccess("");
    }
  }, [errorKey, successKey, t]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.studyProgramId)
      newErrors.studyProgramId = "enrollments.error.studyProgramRequired";
    if (!formData.academicYearId)
      newErrors.academicYearId = "enrollments.error.academicYearRequired";
    if (!formData.accountId)
      newErrors.accountId = "enrollments.error.accountRequired";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorKey("");
    setSuccessKey("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        studyProgramId: formData.studyProgramId,
        academicYearId: formData.academicYearId,
        accountId: formData.accountId,
      };

      if (!isEditing) {
        const { data } = await axios.post(`${GATEWAY_URL}/academic/enrollments`, payload);

        if (data.enrollment?._id) {
          const newId = data.enrollment._id;
          window.history.pushState({}, "", `/enrollments/${newId}`);
          setTimeout(() => navigate(`/enrollments/${newId}`, { replace: true }), 0);
        }
      }

      setSuccessKey(isEditing ? "enrollments.success.updated" : "enrollments.success.created");
      setTimeout(() => setSuccessKey(""), 2000);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("enrollments.confirmDelete"))) return;

    setDeleting(true);
    try {
      await axios.delete(`${GATEWAY_URL}/academic/enrollments/${id}`);
      setSuccessKey("enrollments.success.deleted");
      setTimeout(() => navigate("/enrollments"), 1500);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
      setDeleting(false);
    }
  };

  if (loading && isEditing && !submitSuccess) {
    return (
      <Container data-testid="enrollment-form-page" maxWidth="md" sx={{ mt: 4, mb: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {t("common.loadingData")}
        </Typography>
      </Container>
    );
  }

  return (
    <Container data-testid="enrollment-form-page" maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate("/enrollments")} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditing ? t("enrollments.updateTitle") : t("enrollments.createTitle")}
        </Typography>
      </Box>

      {successKey && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {submitSuccess}
        </Alert>
      )}
      {errorKey && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {t("academicYears.basicInfo")}
                </Typography>
              </Grid>
              
              {/* Study Program */}
              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  required
                  error={!!errors.studyProgramId}
                  disabled={isEditing}
                >
                  <InputLabel>{t("studyPrograms.program")}</InputLabel>
                  <Select
                    value={formData.studyProgramId}
                    label={t("studyPrograms.program")}
                    onChange={handleChange("studyProgramId")}
                    disabled={isEditing}
                  >
                    {studyPrograms.map((program) => (
                      <MenuItem key={program._id} value={program._id}>
                        {program.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.studyProgramId && (
                    <FormHelperText>{t(errors.studyProgramId)}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Academic Year */}
              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  required
                  error={!!errors.academicYearId}
                  disabled={isEditing}
                >
                  <InputLabel>{t("academicYears.single")}</InputLabel>
                  <Select
                    value={formData.academicYearId}
                    label={t("academicYears.single")}
                    onChange={handleChange("academicYearId")}
                    disabled={isEditing}
                  >
                    {academicYears.map((year) => (
                      <MenuItem key={year._id} value={year._id}>
                        {year.yearLabel}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.academicYearId && (
                    <FormHelperText>{t(errors.academicYearId)}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Student Account Autocomplete */}
              <Grid item xs={12}>
                <Autocomplete
                  options={students}
                  label={t("enrollments.studentAccount")}
                  getOptionLabel={(option) =>
                    `${option.userId.identityNumber} - ${option.userId.name} ${option.userId.firstSurname} ${option.userId.secondSurname || ""} - ${option.email}`
                  }
                  value={students.find((s) => s._id === formData.accountId) || null}
                  onChange={(event, newValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      accountId: newValue?._id || "",
                    }));
                    if (errors.accountId) {
                      setErrors((prev) => ({ ...prev, accountId: "" }));
                    }
                  }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} display="flex" alignItems="center" gap={1}>
                      {option.userId.photoUrl ? (
                        <Avatar src={option.userId.photoUrl} sx={{ width: 24, height: 24 }} />
                      ) : (
                        <PersonIcon sx={{ width: 24, height: 24 }} />
                      )}
                      <Box>
                        <Typography variant="body2">
                          {option.userId.name} {option.userId.firstSurname}{" "}
                          {option.userId.secondSurname || ""}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.userId.identityNumber} {option.email}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("enrollments.studentAccount")}
                      placeholder={t("enrollments.searchPlaceholder")}
                      required
                      error={!!errors.accountId}
                      helperText={errors.accountId ? t(errors.accountId) : ""}
                      disabled={isEditing}
                    />
                  )}
                  disabled={isEditing}
                />
              </Grid>

              {/* Actions */}
              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/enrollments")}
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

                  {!isEditing && (
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading || deleting}
                      startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                      {loading ? t("saving") : t("create")}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default EnrollmentForm;
