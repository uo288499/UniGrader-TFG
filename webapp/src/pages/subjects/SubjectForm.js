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
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  List,
  ListItem,
  Autocomplete,
  ListItemText,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from "@mui/icons-material";
import axios from "axios";
import { SessionContext } from "../../SessionContext";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const SubjectForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const { universityID } = useContext(SessionContext);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    studyPrograms: [],
  });

  const [availableFilter, setAvailableFilter] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("");

  const [policyData, setPolicyData] = useState({
    policyRules: [{ evaluationTypeId: "", minPercentage: 0, maxPercentage: 100 }],
  });

  const [evaluationTypes, setEvaluationTypes] = useState([]);
  const [studyPrograms, setStudyPrograms] = useState([]);

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
        const [evalTypesRes, studyProgramsRes] = await Promise.all([
          axios.get(`${GATEWAY_URL}/academic/evaluation-types/by-university/${universityID}`),
          axios.get(`${GATEWAY_URL}/academic/studyPrograms/by-university/${universityID}`),
        ]);

        setEvaluationTypes(evalTypesRes.data.evaluationTypes || []);
        setStudyPrograms(studyProgramsRes.data.programs || []);

        if (isEditing) {
          const { data } = await axios.get(`${GATEWAY_URL}/academic/subjects/${id}`);
          const s = data.subject;

          setFormData({
            name: s.name || "",
            code: s.code || "",
            studyPrograms: s.studyPrograms || [],
          });

          if (s._id) {
            const policyRes = await axios.get(
              `${GATEWAY_URL}/eval/evaluation-policies/by-subject/${s._id}`
            );
            const rules = policyRes.data.policy?.policyRules || [];
            setPolicyData({
              policyRules: rules.length ? rules : [{ evaluationTypeId: "", minPercentage: 0, maxPercentage: 100 }],
            });
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

  const validateForm = () => {
    const newErrors = {};

    // Subject name validations
    if (!formData.name.trim()) {
        newErrors.name = "subject.error.nameRequired";
    } else if (formData.name.length < 3 || formData.name.length > 100) {
        newErrors.name = "subject.error.nameLength";
    }

    // Subject code validations
    if (!formData.code.trim()) {
        newErrors.code = "subject.error.codeRequired";
    } else if (formData.code.length < 2 || formData.code.length > 20) {
        newErrors.code = "subject.error.codeLength";
    }

    // StudyPrograms required
    if (!formData.studyPrograms.length) {
        newErrors.studyPrograms = "subject.error.studyProgramsRequired";
    }

    // At least one policy rule
    if (!policyData.policyRules.length) {
        newErrors.policyRules = "subject.error.atLeastOneRule";
    }

    // Policy rules validations
    let minSum = 0;
    let maxSum = 0;

    policyData.policyRules.forEach((rule, idx) => {
        // Evaluation type required
        if (!rule.evaluationTypeId) {
            newErrors[`evaluationTypeId_${idx}`] = "subject.error.evaluationTypeRequired";
        }

        // Min validation
        if (rule.minPercentage === null) {
            newErrors[`min_${idx}`] = "subject.error.minRequired";
        } else if (rule.minPercentage < 0 || rule.minPercentage > 100) {
            newErrors[`min_${idx}`] = "subject.error.minRange";
        }

        // Max validation
        if (rule.maxPercentage === null) {
            newErrors[`max_${idx}`] = "subject.error.maxRequired";
        } else if (rule.maxPercentage < 0 || rule.maxPercentage > 100) {
            newErrors[`max_${idx}`] = "subject.error.maxRange";
        }

        // Individual coherence: min ≤ max
        if (
            rule.minPercentage !== null &&
            rule.maxPercentage !== null &&
            rule.minPercentage > rule.maxPercentage
        ) {
            newErrors[`rule_${idx}`] = "subject.error.minGreaterThanMax";
        }

        minSum += Number(rule.minPercentage || 0);
        maxSum += Number(rule.maxPercentage || 0);
    });

    // Global min ≤ 100
    if (minSum > 100) {
        newErrors.policyGlobalMin = "subject.error.globalMinExceeded";
    }

    // Global max ≥ 100
    if (maxSum < 100) {
        newErrors.policyGlobalMax = "subject.error.globalMaxInsufficient";
    }

    /* Decidido eliminar esta comprobación
    // Critical validations
    policyData.policyRules.forEach((rule, idx) => {
        const otherMins = policyData.policyRules
        .filter((_, i) => i !== idx)
        .reduce((sum, r) => sum + (r.minPercentage || 0), 0);

        const otherMaxs = policyData.policyRules
        .filter((_, i) => i !== idx)
        .reduce((sum, r) => sum + (r.maxPercentage || 0), 0);

        // Avoid "blocking by mins"
        if (rule.minPercentage + otherMaxs < 100 ) {
            newErrors[`minBlock_${idx}`] = "subject.error.blockedByMins";
        }

        // Avoid "blocking by maxs"
        if (rule.maxPercentage + otherMins > 100) {
            newErrors[`maxBlock_${idx}`] = "subject.error.blockedByMaxs";
        }   
    });*/

    const usedTypes = {};
    policyData.policyRules.forEach((rule, idx) => {
        if (rule.evaluationTypeId) {
            if (rule.evaluationTypeId in usedTypes) {
                newErrors[`evaluationTypeId_${idx}`] = "subject.error.evaluationTypeDuplicate";
                newErrors[`evaluationTypeId_${usedTypes[rule.evaluationTypeId]}`] = "subject.error.evaluationTypeDuplicate";
            } else {
                usedTypes[rule.evaluationTypeId] = idx;
            }
        }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const addStudyProgram = (spId) => {
    setFormData((prev) => ({
      ...prev,
      studyPrograms: [...prev.studyPrograms, spId],
    }));
    if (errors.studyPrograms) setErrors((prev) => ({ ...prev, studyPrograms: "" }));
  };

  const removeStudyProgram = (spId) => {
    setFormData((prev) => ({
      ...prev,
      studyPrograms: prev.studyPrograms.filter((id) => id !== spId),
    }));
  };

  const handlePolicyRuleChange = (index, field, value) => {
    const newRules = [...policyData.policyRules];
    newRules[index][field] = value;
    setPolicyData({ ...policyData, policyRules: newRules });

    if (errors[`${field}_${index}`]) {
      setErrors((prev) => ({ ...prev, [`${field}_${index}`]: "" }));
    }
  };

  const addPolicyRule = () => {
    setPolicyData((prev) => ({
      ...prev,
      policyRules: [
        ...prev.policyRules,
        { evaluationTypeId: "", minPercentage: 0, maxPercentage: 100 },
      ],
    }));
  };

  const removePolicyRule = (index) => {
    const newRules = [...policyData.policyRules];
    newRules.splice(index, 1);
    setPolicyData({ ...policyData, policyRules: newRules });
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
            studyProgramIds: formData.studyPrograms,
            policyRules: policyData.policyRules, 
        };

      let response;
      if (isEditing) {
        response = await axios.put(`${GATEWAY_URL}/academic/subjects/${id}`, payload);
      } else {
        payload.universityId = universityID;
        response = await axios.post(`${GATEWAY_URL}/academic/subjects`, payload);
      }

      if (!isEditing && response.data?.subject._id) {
        const newId = response.data.subject._id;
        window.history.pushState({}, "", `/subjects/${newId}`);
        setTimeout(() => navigate(`/subjects/${newId}`, { replace: true }), 0);
      }

      setSuccessKey(isEditing ? "subject.success.updated" : "subject.success.created");
      setTimeout(() => setSuccessKey(""), 2000);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("subject.confirmDelete"))) return;

    setDeleting(true);
    try {
      await axios.delete(`${GATEWAY_URL}/academic/subjects/${id}`);
      setSuccessKey("subject.success.deleted");
      setTimeout(() => navigate("/subjects"), 1500);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
      setDeleting(false);
    }
  };

  if (loading && isEditing && !submitSuccess) {
    return (
      <Container data-testid="subject-form-page" maxWidth="md" sx={{ mt: 4, mb: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {t("common.loadingData")}
        </Typography>
      </Container>
    );
  }

  const availablePrograms = studyPrograms.filter(
    (sp) => !formData.studyPrograms.includes(sp._id)
  );
  const selectedPrograms = studyPrograms.filter((sp) =>
    formData.studyPrograms.includes(sp._id)
  );

  return (
    <Container data-testid="subject-form-page" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate("/subjects")} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditing ? t("subject.updateTitle") : t("subject.createTitle")}
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
              {/* Subject Info */}
              <Grid item xs={12}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {t("subject.basicInfo")}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t("subject.name")}
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange("name")}
                  error={Boolean(errors.name)}
                  helperText={errors.name && <span>{t(errors.name)}</span>}
                  required
                  autoComplete="off"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t("subject.code")}
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange("code")}
                  error={Boolean(errors.code)}
                  helperText={errors.code && <span>{t(errors.code)}</span>}
                  required
                  autoComplete="off"
                />
              </Grid>

              {/* StudyPrograms dual list */}
              <Grid item xs={12}>
                <Typography variant="h5" fontWeight="bold" mb={2}>
                  {t("subject.studyPrograms")}
                </Typography>
                <Grid container spacing={2}>
                  {/* Available Programs */}
                  <Grid item xs={6}>
                    <Typography variant="h6">{t("subject.availablePrograms")}</Typography>
                    
                    {/* Search Filter */}
                    <TextField
                      size="small"
                      placeholder={t("subject.search")}
                      value={availableFilter}
                      onChange={(e) => setAvailableFilter(e.target.value)}
                      fullWidth
                      sx={{ mb: 1 }}
                    />

                    <Box
                      border={availablePrograms.length ? 1 : 0}
                      borderColor="grey.300"
                      borderRadius={2}
                      p={1}
                      sx={{ maxHeight: 300, overflowY: "auto" }}
                    >
                      <List dense>
                        {availablePrograms
                          .filter((sp) =>
                            sp.name.toLowerCase().includes(availableFilter.toLowerCase())
                          )
                          .map((sp) => (
                            <ListItem
                              key={sp._id}
                              secondaryAction={
                                <IconButton
                                  aria-label="add program"
                                  onClick={() => addStudyProgram(sp._id)}
                                  color="primary"
                                >
                                  <AddIcon fontSize="large" />
                                </IconButton>
                              }
                            >
                              <ListItemText primary={sp.name} />
                            </ListItem>
                          ))}
                      </List>
                    </Box>
                  </Grid>

                  {/* Selected Programs */}
                  <Grid item xs={6}>
                    <Typography variant="h6">{t("subject.addedPrograms")}</Typography>

                    {/* Search Filter */}
                    <TextField
                      size="small"
                      placeholder={t("subject.search")}
                      value={selectedFilter}
                      onChange={(e) => setSelectedFilter(e.target.value)}
                      fullWidth
                      sx={{ mb: 1 }}
                    />

                    <Box
                      border={selectedPrograms.length ? 1 : 0}
                      borderColor="grey.300"
                      borderRadius={2}
                      p={1}
                      sx={{ maxHeight: 300, overflowY: "auto" }} 
                    >
                      <List dense>
                        {selectedPrograms
                          .filter((sp) =>
                            sp.name.toLowerCase().includes(selectedFilter.toLowerCase())
                          )
                          .map((sp) => (
                            <ListItem
                              key={sp._id}
                              secondaryAction={
                                <IconButton
                                  aria-label="remove program"
                                  onClick={() => removeStudyProgram(sp._id)}
                                  color="error"
                                >
                                  <RemoveIcon fontSize="large" />
                                </IconButton>
                              }
                            >
                              <ListItemText primary={sp.name} />
                            </ListItem>
                          ))}
                      </List>
                      {errors.studyPrograms && (
                        <FormHelperText error>{t(errors.studyPrograms)}</FormHelperText>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Grid>

              {/* Evaluation Policy */}
              <Grid item xs={12}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {t("subject.evaluationPolicy")}
                </Typography>

                {errors.policyRules && (
                    <Grid item xs={12} sx={{ mb: 2 }}>
                        <Alert severity="error">{t(errors.policyRules)}</Alert>
                    </Grid>
                )}
              </Grid>

              {policyData.policyRules.map((rule, idx) => (
                <Grid item xs={12} key={idx}>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <Autocomplete
                      options={evaluationTypes}
                      getOptionLabel={(et) => et.name || ""}
                      value={evaluationTypes.find((et) => et._id === rule.evaluationTypeId) || null}
                      onChange={(_, v) => handlePolicyRuleChange(idx, "evaluationTypeId", v?._id || "")}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t("subject.evaluationType")}
                          error={Boolean(errors[`evaluationTypeId_${idx}`])}
                          helperText={errors[`evaluationTypeId_${idx}`] && t(errors[`evaluationTypeId_${idx}`])}
                          required
                        />
                      )}
                      clearOnEscape
                      sx={{ minWidth: 200 }}
                    />
                    <TextField
                        type="number"
                        label={t("subject.minPercentage")}
                        value={rule.minPercentage}
                        inputProps={{ min: 0, max: 100 }}
                        onChange={(e) =>
                            handlePolicyRuleChange(idx, "minPercentage", Number(e.target.value))
                        }
                        error={Boolean(errors[`min_${idx}`] || errors[`rule_${idx}`] || errors[`minBlock_${idx}`])}
                        helperText={
                            (errors[`min_${idx}`] && t(errors[`min_${idx}`])) ||
                            (errors[`rule_${idx}`] && t(errors[`rule_${idx}`])) ||
                            (errors[`minBlock_${idx}`] && t(errors[`minBlock_${idx}`]))
                        }
                        required
                        sx={{ width: 150 }}
                    />

                    <TextField
                        type="number"
                        label={t("subject.maxPercentage")}
                        value={rule.maxPercentage}
                        inputProps={{ min: 0, max: 100 }}
                        onChange={(e) =>
                            handlePolicyRuleChange(idx, "maxPercentage", Number(e.target.value))
                        }
                        error={Boolean(errors[`max_${idx}`] || errors[`rule_${idx}`] || errors[`maxBlock_${idx}`])}
                        helperText={
                            (errors[`max_${idx}`] && t(errors[`max_${idx}`])) ||
                            (errors[`rule_${idx}`] && t(errors[`rule_${idx}`])) ||
                            (errors[`maxBlock_${idx}`] && t(errors[`maxBlock_${idx}`]))
                        }
                        required
                        sx={{ width: 150 }}
                    />

                    {policyData.policyRules.length > 1 && (
                      <IconButton
                        color="error"
                        onClick={() => removePolicyRule(idx)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </Grid>
              ))}

              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  onClick={addPolicyRule}
                  startIcon={<AddIcon />}
                  sx={{ mt: 1 }}
                >
                  {t("subject.addRule")}
                </Button>
              </Grid>

              {/* Actions */}
              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/subjects")}
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

export default SubjectForm;
