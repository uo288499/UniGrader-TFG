import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Grid,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { SessionContext } from "../../SessionContext";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const EvaluationItemsForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { universityID, accountID } = useContext(SessionContext);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const [successKey, setSuccessKey] = useState("");
  const [evaluationSystem, setEvaluationSystem] = useState(null);
  const [course, setCourse] = useState(null);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const groupRes = await axios.get(`${GATEWAY_URL}/academic/groups/${id}`);
        const group = groupRes.data.group;
        if (!group) return navigate("/not-found");

        setGroupName(group.name || "");

        const isProfessorInGroup = group.professors?.some(
          (p) => String(p) === String(accountID)
        );
        if (!isProfessorInGroup) return navigate("/not-found");

        const courseRes = await axios.get(`${GATEWAY_URL}/academic/courses/${group.courseId._id}`);
        const courseData = courseRes.data.course;
        setCourse(courseData);

        const system = courseRes.data.system;
        if (!system) {
          setErrorKey("error.evaluationSystemNotFound");
          return;
        }

        setEvaluationSystem(system);

        const itemsRes = await axios.get(`${GATEWAY_URL}/eval/evaluation-items/by-group/${id}`);
        let fetchedItems = itemsRes.data.items || [];

        const allowedTypeIds = system.evaluationGroups.map((g) => g.evaluationTypeId);
        const typesRes = await axios.get(
          `${GATEWAY_URL}/academic/evaluation-types/by-university/${universityID}`
        );
        const filteredTypes = (typesRes.data.evaluationTypes || []).filter((et) =>
          allowedTypeIds.includes(et._id)
        );
        setAvailableTypes(filteredTypes);

        filteredTypes.forEach((type) => {
          const groupItems = fetchedItems.filter((i) => i.evaluationTypeId === type._id);
          if (groupItems.length === 0) {
            fetchedItems.push({
              name: "",
              evaluationTypeId: type._id,
              weight: 0,
              minGrade: null,
            });
          }
        });

        setItems(fetchedItems);
      } catch (err) {
        console.error("Error loading data:", err);
        const key = "error." + (err.response?.data?.errorKey || "genericError");
        setErrorKey(key);
      } finally {
        setLoading(false);
      }
    };

    if (id && universityID && accountID) fetchData();
  }, [id, universityID, accountID, navigate]);

  useEffect(() => {
    setSubmitError(errorKey ? t(errorKey) : "");
    setSubmitSuccess(successKey ? t(successKey) : "");
  }, [errorKey, successKey, t]);

  const addItem = (evaluationTypeId) =>
    setItems([
      ...items,
      { name: "", evaluationTypeId, weight: 0, minGrade: null },
    ]);

  const removeItem = (index) => {
    const item = items[index];
    const groupItems = items.filter((i) => i.evaluationTypeId === item.evaluationTypeId);
    if (groupItems.length === 1) return;
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
    if (errors[index]?.[field]) {
      setErrors((prev) => ({
        ...prev,
        [index]: { ...prev[index], [field]: "" },
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const usedKeys = {};
    const typeWeightSums = {}; 

    items.forEach((item, idx) => {
      if (!newErrors[idx]) newErrors[idx] = {};

      // --- Name validation ---
      if (!item.name || !item.name.trim()) {
        newErrors[idx].name = "evaluationItem.error.nameRequired";
      } else if (item.name.trim().length > 100) {
        newErrors[idx].name = "evaluationItem.error.nameTooLong";
      }

      // --- Type validation ---
      if (!item.evaluationTypeId) {
        newErrors[idx].evaluationTypeId = "evaluationItem.error.typeRequired";
      }

      // --- Weight validation ---
      if (item.weight === null || item.weight === undefined || isNaN(item.weight)) {
        newErrors[idx].weight = "evaluationItem.error.weightRequired";
      } else if (item.weight <= 0 || item.weight > 100) {
        newErrors[idx].weight = "evaluationItem.error.weightInvalid";
      }

      // --- Minimum grade validation ---
      if (item.minGrade !== null && item.minGrade !== undefined) {
        if (isNaN(item.minGrade)) {
          newErrors[idx].minGrade = "evaluationItem.error.minGradeRequired";
        } else if (item.minGrade < 0 || item.minGrade > 10) {
          newErrors[idx].minGrade = "evaluationItem.error.minGradeInvalid";
        }
      }

      // --- Duplicate name within the same type ---
      const key = `${item.name?.trim().toLowerCase() || ""}-${item.evaluationTypeId}`;
      if (usedKeys[key] !== undefined) {
        if (!newErrors[idx]) newErrors[idx] = {};
        if (!newErrors[usedKeys[key]]) newErrors[usedKeys[key]] = {};

        newErrors[idx].name = "evaluationItem.error.duplicate";
        newErrors[usedKeys[key]].name = "evaluationItem.error.duplicate";
      } else {
        usedKeys[key] = idx;
      }

      // --- Track total weight per evaluation type ---
      if (item.evaluationTypeId) {
        if (!typeWeightSums[item.evaluationTypeId])
          typeWeightSums[item.evaluationTypeId] = 0;
        typeWeightSums[item.evaluationTypeId] += item.weight || 0;
      }
    });

    // --- Check that total weight per type equals 100% ---
    availableTypes.forEach((type) => {
      const totalWeight = typeWeightSums[type._id] || 0;
      if (Math.abs(totalWeight - 100) > 0.001) {
        items.forEach((item, idx) => {
          if (item.evaluationTypeId === type._id) {
            if (!newErrors[idx]) newErrors[idx] = {};
            newErrors[idx].weight = "evaluationItem.error.totalWeightNot100";
          }
        });
      }
    });

    Object.keys(newErrors).forEach((idx) => {
      if (Object.keys(newErrors[idx]).length === 0) delete newErrors[idx];
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorKey("");
    setSuccessKey("");

    if (!validateForm()) return;

    setSaving(true);
    try {
      const res = await axios.put(
        `${GATEWAY_URL}/eval/evaluation-items/sync/${id}`,
        {
            items: items.map((i) => ({
            ...i,
            evaluationSystemId: evaluationSystem._id,
            courseId: course?._id,
            }))
        }
      );
      setSuccessKey("evaluationItem.success.synced");
      setItems(res.data.items);
      setTimeout(() => setSuccessKey(""), 2000);
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError");
      setErrorKey(key);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container data-testid="evaluationitems-form-page" maxWidth="md" sx={{ mt: 4, mb: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {t("common.loadingData")}
        </Typography>
      </Container>
    );
  }

  return (
    <Container data-testid="evaluationitems-form-page" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center">
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {t("evaluationItem.manageItems")}
          </Typography>
        </Box>
        <Typography variant="subtitle1" color="text.secondary">
          {course?.name +  " - " + groupName}
        </Typography>
      </Box>

      {submitSuccess && <Alert severity="success" sx={{ mb: 3 }}>{submitSuccess}</Alert>}
      {submitError && <Alert severity="error" sx={{ mb: 3 }}>{submitError}</Alert>}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            {availableTypes.map((type) => {
              const groupItems = items.filter((i) => i.evaluationTypeId === type._id);

              return (
                <Box key={type._id} sx={{ mb: 4 }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
                    {type.name}
                  </Typography>

                  <Grid container spacing={3}>
                    {groupItems.map((item, idx) => {
                      const index = items.indexOf(item);
                      const hasMinGrade = item.minGrade !== null;
                      return (
                        <Grid item xs={12} key={idx}>
                          <Box
                            display="flex"
                            gap={2}
                            flexWrap="wrap"
                            alignItems="flex-start"                         
                          >
                            <Box sx={{ display: "flex", flexDirection: "column", minHeight: 90 }}>
                              <TextField
                                label={t("evaluationItem.name")}
                                value={item.name}
                                onChange={(e) => handleChange(index, "name", e.target.value)}
                                error={Boolean(errors[index]?.name)}
                                helperText={errors[index]?.name && t(errors[index].name)}
                                required
                                sx={{ flex: 1, minWidth: 200 }}
                              />
                            </Box>

                            <Box sx={{ display: "flex", flexDirection: "column", minHeight: 90 }}>
                              <TextField
                                label={t("evaluationItem.weight")}
                                type="number"
                                value={item.weight}
                                onChange={(e) => handleChange(index, "weight", Number(e.target.value))}
                                error={Boolean(errors[index]?.weight)}
                                helperText={errors[index]?.weight && t(errors[index].weight)}
                                required
                                sx={{ width: 120 }}
                                inputProps={{ min: 1, max: 100 }}
                              />
                            </Box>

                            <Box sx={{ display: "flex", flexDirection: "column", minHeight: 90 }}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={hasMinGrade}
                                    onChange={(e) =>
                                      handleChange(index, "minGrade", e.target.checked ? 0 : null)
                                    }
                                  />
                                }
                                label={t("evaluationItem.hasMinGrade")}
                              />
                            </Box>

                            <Box sx={{ display: "flex", flexDirection: "column", minHeight: 90 }}>
                              <TextField
                                label={t("evaluationItem.minGrade")}
                                type="number"
                                value={item.minGrade ?? ""}
                                onChange={(e) =>
                                  handleChange(
                                    index,
                                    "minGrade",
                                    e.target.value ? Number(e.target.value) : null
                                  )
                                }
                                disabled={!hasMinGrade}
                                error={Boolean(errors[index]?.minGrade)}
                                helperText={
                                  errors[index]?.minGrade && t(errors[index].minGrade)
                                }
                                sx={{ width: 120 }}
                                inputProps={{ min: 0, max: 10, step: 0.1 }}
                              />
                            </Box>

                            {groupItems.length > 1 && (
                              <IconButton color="error" onClick={() => removeItem(index)}>
                                <RemoveIcon />
                              </IconButton>
                            )}
                          </Box>
                        </Grid>
                      );
                    })}

                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => addItem(type._id)}
                      >
                        {t("evaluationItem.addItem")}
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              );
            })}

            <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
              <Button variant="outlined" onClick={() => navigate(-1)} disabled={saving}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : null}
              >
                {saving ? t("saving") : t("evaluationItem.saveChanges")}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default EvaluationItemsForm;
