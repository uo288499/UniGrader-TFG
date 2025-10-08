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
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import axios from "axios";
import { SessionContext } from "../../SessionContext";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const EvaluationTypeForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const { universityID } = useContext(SessionContext);

  const [formData, setFormData] = useState({
    name: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [submitError, setSubmitError] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [successKey, setSuccessKey] = useState("");

  // Fetch data
  useEffect(() => {
    const fetchType = async () => {
      if (!id || !universityID) return;

      setLoading(true);
      setErrorKey("");
      try {
        const { data } = await axios.get(`${GATEWAY_URL}/academic/evaluation-types/${id}`);

        if (universityID !== data.evaluationType.universityId?._id) {
          navigate("/not-found");
          return;
        }

        setFormData({
          name: data.evaluationType.name || "",
        });
      } catch (err) {
        const key = "error." + (err.response?.data?.errorKey || "genericError");
        setErrorKey(key);
      } finally {
        setLoading(false);
      }
    };

    if (isEditing) fetchType();
  }, [id, isEditing, universityID, navigate]);

  // Manage global success/error messages
  useEffect(() => {
    setSubmitError(errorKey ? t(errorKey) : "");
    setSubmitSuccess(successKey ? t(successKey) : "");
  }, [errorKey, successKey, t]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "evaluationTypes.error.nameRequired";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "evaluationTypes.error.nameLength";
    } else if (formData.name.trim().length > 200) {
      newErrors.name = "evaluationTypes.error.nameMax";
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
      const payload = { name: formData.name };
      let response;

      if (isEditing) {
        response = await axios.put(`${GATEWAY_URL}/academic/evaluation-types/${id}`, payload);
      } else {
        payload.universityId =  universityID;
        response = await axios.post(`${GATEWAY_URL}/academic/evaluation-types`, payload);
      }

      if (!isEditing && response.data?.evaluationType._id) {
        const newId = response.data.evaluationType._id;
        window.history.pushState({}, "", `/evaluation-types/${newId}`);
        setTimeout(() => navigate(`/evaluation-types/${newId}`, { replace: true }), 0);
      }

      setSuccessKey(isEditing ? "evaluationTypes.success.updated" : "evaluationTypes.success.created");
      setTimeout(() => setSuccessKey(""), 2000);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("evaluationTypes.confirmDelete"))) return;

    setDeleting(true);
    try {
      await axios.delete(`${GATEWAY_URL}/academic/evaluation-types/${id}`);
      setSuccessKey("evaluationTypes.success.deleted");
      setTimeout(() => navigate("/evaluation-types"), 1500);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
      setDeleting(false);
    }
  };

  if (loading && isEditing && !submitSuccess) {
    return (
      <Container
        data-testid="evaluationtype-form-page"
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
    <Container data-testid="evaluationtype-form-page" maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate("/evaluation-types")} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditing
            ? t("evaluationTypes.updateTitle")
            : t("evaluationTypes.createTitle")}
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
                  {t("evaluationTypes.basicInfo")}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t("evaluationTypes.name")}
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange("name")}
                  error={Boolean(errors.name)}
                  helperText={errors.name && t(errors.name)}
                  required
                  autoComplete="off"
                  inputProps={{ maxLength: 200 }}
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/evaluation-types")}
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
                    {loading
                      ? t("saving")
                      : isEditing
                      ? t("update")
                      : t("create")}
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

export default EvaluationTypeForm;
