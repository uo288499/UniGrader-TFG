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
  CircularProgress,
  Grid,
  IconButton,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon, Delete as DeleteIcon } from "@mui/icons-material";
import axios from "axios";
import { SessionContext } from "../../SessionContext";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const AcademicYearForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { universityID } = useContext(SessionContext);

  const [formData, setFormData] = useState({
    yearLabel: "",
    startDate: "",
    endDate: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [submitError, setSubmitError] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [successKey, setSuccessKey] = useState("");

  // Fetch data for editing
  useEffect(() => {
    const fetchYear = async () => {
      if (!id || !universityID) return;

      setLoading(true);
      setErrorKey("");
      try {
        const { data } = await axios.get(`${GATEWAY_URL}/academic/academicyears/${id}`);

        if (universityID !== data.academicYear.universityId?._id) {
          navigate("/not-found");
          return;
        }

        setFormData({
          yearLabel: data.academicYear.yearLabel || "",
          startDate: data.academicYear.startDate?.slice(0, 10) || "",
          endDate: data.academicYear.endDate?.slice(0, 10) || "",
        });
      } catch (err) {
        const key = "error." + (err.response?.data?.errorKey || "genericError");
        setErrorKey(key);
      } finally {
        setLoading(false);
      }
    };

    if (isEditing) fetchYear();
  }, [id, isEditing, universityID, navigate]);

  // Manage global success/error messages
  useEffect(() => {
    setSubmitError(errorKey ? t(errorKey) : "");
    setSubmitSuccess(successKey ? t(successKey) : "");
  }, [errorKey, successKey, t]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.yearLabel.trim()) {
        newErrors.yearLabel = "academicYears.error.yearLabelRequired";
    } else if (formData.yearLabel.trim().length > 50) {
        newErrors.yearLabel = "academicYears.error.yearLabelMax";
    }

    if (!formData.startDate) newErrors.startDate = "academicYears.error.startDateRequired";
    if (!formData.endDate) newErrors.endDate = "academicYears.error.endDateRequired";

    if (formData.startDate && formData.endDate) {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        if (start > end) {
            newErrors.startDate = "academicYears.error.startAfterEnd";
            newErrors.endDate = "academicYears.error.endBeforeStart";
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
    };

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorKey("");
    setSuccessKey("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = formData;
      let response;

      if (isEditing) {
        response = await axios.put(`${GATEWAY_URL}/academic/academicyears/${id}`, payload);
      } else {
        payload.universityId = universityID;
        response = await axios.post(`${GATEWAY_URL}/academic/academicyears`, payload);
      }

      if (!isEditing && response.data?.academicYear._id) {
        const newId = response.data.academicYear._id;
        window.history.pushState({}, "", `/academic-years/${newId}`);
        setTimeout(() => navigate(`/academic-years/${newId}`, { replace: true }), 0);
      }

      setSuccessKey(isEditing ? "academicYears.success.updated" : "academicYears.success.created");
      setTimeout(() => setSuccessKey(""), 2000);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("academicYears.confirmDelete"))) return;

    setDeleting(true);
    try {
      await axios.delete(`${GATEWAY_URL}/academic/academicyears/${id}`);
      setSuccessKey("academicYears.success.deleted");
      setTimeout(() => navigate("/academic-years"), 1500);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
      setDeleting(false);
    }
  };

  if (loading && isEditing && !submitSuccess) {
    return (
      <Container
        data-testid="academicyear-form-page"
        maxWidth="md"
        sx={{ mt: 4, mb: 4, textAlign: "center" }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {t("common.loadingData")}
        </Typography>
      </Container>
    );
  }

  return (
    <Container data-testid="academicyear-form-page" maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate("/academic-years")} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditing
            ? t("academicYears.updateTitle")
            : t("academicYears.createTitle")}
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
                  {t("academicYears.basicInfo")}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t("academicYears.yearLabel")}
                  name="yearLabel"
                  value={formData.yearLabel}
                  onChange={handleInputChange("yearLabel")}
                  error={Boolean(errors.yearLabel)}
                  helperText={errors.yearLabel && t(errors.yearLabel)}
                  required
                  inputProps={{ maxLength: 50 }}
                  autoComplete="off"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label={t("academicYears.startDate")}
                  value={formData.startDate}
                  onChange={handleInputChange("startDate")}
                  error={Boolean(errors.startDate)}
                  helperText={errors.startDate && t(errors.startDate)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label={t("academicYears.endDate")}
                  value={formData.endDate}
                  onChange={handleInputChange("endDate")}
                  error={Boolean(errors.endDate)}
                  helperText={errors.endDate && t(errors.endDate)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/academic-years")}
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
                      startIcon={deleting ? <CircularProgress size={20} /> : null }
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

export default AcademicYearForm;
