import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate, useParams } from "react-router";
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
  InputLabel,
  FormHelperText,
  IconButton,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  AccountBalance as UniIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { SessionContext } from "../../SessionContext";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const UniversityForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contactEmail: "",
    contactPhone: "",
    smallLogoUrl: "",
    largeLogoUrl: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [successKey, setSuccessKey] = useState("");

  const [imageFiles, setImageFiles] = useState({
    smallLogo: null,
    largeLogo: null,
  });

  const [imagePreviews, setImagePreviews] = useState({
    smallLogo: "",
    largeLogo: "",
  });

  const theme = useTheme();
  const terciary = theme.palette.error.main;

  const smallLogoInputRef = useRef(null);
  const largeLogoInputRef = useRef(null);

  const [initialLargeLogo, setInitialLargeLogo] = useState("");

  const { role, universityID, toggleUniversityImageUpdated  } = useContext(SessionContext);

  useEffect(() => {
    if (role !== "global-admin" && universityID !== id) {
      navigate("/not-found");
      return;
    }

    const fetchUniversity = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `${GATEWAY_URL}/academic/universities/${id}`
        );
        const universityData = data.university;

        setFormData(universityData);

        setImagePreviews({
          smallLogo: universityData.smallLogoUrl || "",
          largeLogo: universityData.largeLogoUrl || "",
        });

        setInitialLargeLogo(universityData.largeLogoUrl || "");
      } catch (err) {
        const key = "error." + (err.response?.data?.errorKey || err.response?.errorKey || "genericError");
        setErrorKey(key);
      } finally {
        setLoading(false);
      }
    };

    if (isEditing) fetchUniversity();

    if (!isEditing) {
      setInitialLargeLogo("");
      setImagePreviews({ smallLogo: "", largeLogo: "" });
      setImageFiles({ smallLogo: null, largeLogo: null });
    }
  }, [id, isEditing, navigate, role, universityID]);

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

    if (!formData.name.trim()) {
      newErrors.name = "universities.errorNameRequired";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "universities.errorNameLength";
    } else if (formData.name.trim().length > 200) {
      newErrors.name = "universities.errorNameMax";
    }

    if (formData.address && formData.address.length > 500) {
      newErrors.address = "universities.errorAddressMax";
    }

    if (formData.contactEmail) {
      if (formData.contactEmail.length > 100) {
        newErrors.contactEmail = "universities.errorEmailMax";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
        newErrors.contactEmail = "universities.errorInvalidEmail";
      }
    }

    if (formData.contactPhone && formData.contactPhone.length > 30) {
      newErrors.contactPhone = "universities.errorPhoneMax";
    } else if (
      formData.contactPhone &&
      !/^[+]?[0-9\s\-]{9,}$/.test(formData.contactPhone)
    ) {
      newErrors.contactPhone = "universities.errorInvalidPhone";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field) => (event) => {
    let value = event.target.value;
    if (field === "contactEmail") {
      value = value.replace(/\s/g, "").toLowerCase();
    }
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleImageUpload = (logoType) => (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        [logoType]: "universities.errorMaxSize",
      }));
      return;
    }

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        [logoType]: "universities.errorInvalidFormat",
      }));
      return;
    }

    setErrors((prev) => ({ ...prev, [logoType]: "" }));

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageFiles((prev) => ({ ...prev, [logoType]: e.target.result }));
      setImagePreviews((prev) => ({ ...prev, [logoType]: e.target.result }));
    };
    reader.readAsDataURL(file);

    setFormData((prev) => ({ ...prev, [`${logoType}Url`]: "" }));
  };

  const handleRemoveImage = (logoType) => {
    setImageFiles((prev) => ({ ...prev, [logoType]: null }));
    setImagePreviews((prev) => ({ ...prev, [logoType]: "" }));
    setFormData((prev) => ({ ...prev, [`${logoType}Url`]: "" }));

    if (logoType === "smallLogo" && smallLogoInputRef.current) {
      smallLogoInputRef.current.value = "";
    }
    if (logoType === "largeLogo" && largeLogoInputRef.current) {
      largeLogoInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorKey("");
    setSuccessKey("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const dataToSend = {
        ...formData,
        smallLogoBase64: imageFiles.smallLogo,
        largeLogoBase64: imageFiles.largeLogo,
      };

      let response;
      if (isEditing) {
        response = await axios.put(
          `${GATEWAY_URL}/academic/universities/${id}`,
          dataToSend
        );
      } else {
        response = await axios.post(
          `${GATEWAY_URL}/academic/universities`,
          dataToSend
        );
      }

      const updatedUniversity = response.data.university;
      setFormData(updatedUniversity);
      setImageFiles({ smallLogo: null, largeLogo: null });

      const currentLargeLogo = updatedUniversity.largeLogoUrl || "";
      const hasChangedLargeLogo =
        currentLargeLogo !== initialLargeLogo;

      if (hasChangedLargeLogo) {
        toggleUniversityImageUpdated();
        setInitialLargeLogo(currentLargeLogo);
      }

      if (!isEditing) {
        const newId = updatedUniversity._id || updatedUniversity.id;
        if (newId) {
          window.history.pushState({}, "", `/universities/${newId}`);
          setTimeout(() => {
            navigate(`/universities/${newId}`, { replace: true });
          }, 0);
        }
      }

      setSuccessKey(isEditing ? "universities.updated" : "universities.created");

      setTimeout(() => setSuccessKey(""), 2000);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || err.response?.errorKey || "genericError");
      setErrorKey(key);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("universities.confirmDelete"))) return;

    setDeleting(true);
    try {
      await axios.delete(`${GATEWAY_URL}/academic/universities/${id}`);
      setSuccessKey("universities.deleted");
      if (role !== "global-admin") 
        setTimeout(() => navigate("/"), 1500); 
      else
        setTimeout(() => navigate("/universities"), 1500);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || err.response?.errorKey || "genericError");
      setErrorKey(key);
      setDeleting(false);
    }
  };

  if (loading && isEditing && !submitSuccess) {
    return (
      <Container
        data-testid="university-form-page"
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
    <Container data-testid="university-form-page" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => role === "global-admin" ? navigate("/universities") : navigate("/")} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditing ? t("universities.update") : t("universities.create")}
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
                  {t("universities.basicInfo")}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t("universities.name")}
                  value={formData.name}
                  onChange={handleInputChange("name")}
                  error={Boolean(errors.name)}
                  helperText={errors.name && <span>{t(errors.name)}</span>}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t("universities.address")}
                  value={formData.address}
                  onChange={handleInputChange("address")}
                  error={Boolean(errors.address)}
                  helperText={errors.address && <span>{t(errors.address)}</span>}
                  multiline
                  rows={2}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {t("universities.contactInfo")}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t("universities.email")}
                  value={formData.contactEmail}
                  onChange={handleInputChange("contactEmail")}
                  error={Boolean(errors.contactEmail)}
                  helperText={
                    errors.contactEmail && <span>{t(errors.contactEmail)}</span>
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t("universities.phone")}
                  value={formData.contactPhone}
                  onChange={handleInputChange("contactPhone")}
                  error={Boolean(errors.contactPhone)}
                  helperText={
                    errors.contactPhone && <span>{t(errors.contactPhone)}</span>
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {t("universities.logos")}
                </Typography>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {t("universities.maxSize")}
                </Typography>
              </Grid>

              {/* Small Logo */}
              <Grid item xs={12} sm={6}>
                <Box>
                  <InputLabel sx={{ mb: 1 }}>
                    {t("universities.smallLogo")}
                  </InputLabel>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {imagePreviews.smallLogo ? (
                      <Box
                        component="img"
                        src={imagePreviews.smallLogo}
                        alt="Logo pequeño preview"
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: "50%",
                          border: "1px solid #ccc",
                        }}
                      />
                    ) : (
                      <UniIcon
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: "50%",
                          border: "1px solid #ccc",
                          p: 2,
                          color: "text.disabled",
                        }}
                      />
                    )}

                    <Box>
                      <Button variant="outlined" component="label">
                        {t("common.upload")}
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.svg"
                          hidden
                          ref={smallLogoInputRef}
                          onChange={handleImageUpload("smallLogo")}
                        />
                      </Button>
                      {(imagePreviews.smallLogo || imageFiles.smallLogo) && (
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveImage("smallLogo")}
                          sx={{ ml: 1, color: terciary }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                      {errors.smallLogo && (
                        <FormHelperText sx={{ color: terciary }}>
                          {t(errors.smallLogo)}
                        </FormHelperText>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Grid>

              {/* Large Logo */}
              <Grid item xs={12} sm={6}>
                <Box>
                  <InputLabel sx={{ mb: 1 }}>
                    {t("universities.largeLogo")}
                  </InputLabel>
                  <Box
                    sx={{
                      border: "2px dashed",
                      borderColor: errors.largeLogo ? terciary : "grey.300",
                      borderRadius: 1,
                      p: 2,
                      textAlign: "center",
                      backgroundColor: "grey.50",
                      minHeight: 120,
                      position: "relative",
                    }}
                  >
                    {imagePreviews.largeLogo ? (
                      <Box>
                        <img
                          src={imagePreviews.largeLogo}
                          alt="Logo grande preview"
                          style={{
                            maxWidth: "100%",
                            maxHeight: 80,
                            objectFit: "contain",
                          }}
                        />
                        <Box mt={1} textAlign="center">
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveImage("largeLogo")}
                            sx={{ color: terciary }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    ) : (
                      <Box>
                        <ImageIcon
                          sx={{ fontSize: 40, color: "grey.400", mb: 1 }}
                        />
                        <Typography variant="h6" color="text.secondary">
                          {t("universities.dragDrop")}
                        </Typography>
                      </Box>
                    )}
                    {!imagePreviews.largeLogo && (
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.svg"
                        ref={largeLogoInputRef}
                        onChange={handleImageUpload("largeLogo")}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          opacity: 0,
                          cursor: "pointer",
                        }}
                      />
                    )}
                  </Box>
                  {errors.largeLogo && (
                    <FormHelperText sx={{ color: terciary }}>
                      {t(errors.largeLogo)}
                    </FormHelperText>
                  )}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
                  <Button
                    variant="outlined"
                    onClick={() => role === "global-admin" ? navigate("/universities") : navigate("/")}
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
                    >
                      {deleting ? t("deleting") : t("delete")}
                    </Button>
                  )}

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || deleting}
                    startIcon={
                      loading ? <CircularProgress size={20} /> : null
                    }
                  >
                    {loading
                      ? t("universities.saving")
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

export default UniversityForm;