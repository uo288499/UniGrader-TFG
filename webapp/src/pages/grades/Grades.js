import React, { useEffect, useState, useMemo, useContext } from "react";
import { useParams } from "react-router";
import {
  Container,
  Paper,
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Autocomplete,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  MenuItem,
  TablePagination,
  TableContainer,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import axios from "axios";
import { SessionContext } from "../../SessionContext";
import { useTranslation } from "react-i18next";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const Grades = () => {
  const { t } = useTranslation();
  const { id: studentId } = useParams();
  const { universityID: sessionUniversity } = useContext(SessionContext);

  const [grades, setGrades] = useState([]);
  const [courses, setCourses] = useState([]);
  const [evaluationTypes, setEvaluationTypes] = useState([]);
  const [filters, setFilters] = useState({
    course: "",
    academicYear: "",
    studyProgram: "",
    period: "",
    status: "",
  });
  const [details, setDetails] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState([]);
  const [studyPrograms, setStudyPrograms] = useState([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [gradesRes, coursesRes, typesRes, groupsRes] = await Promise.all([
          axios.get(`${GATEWAY_URL}/grade/final-grades/by-student/${studentId}`),
          axios.get(`${GATEWAY_URL}/academic/courses/by-university/${sessionUniversity}`),
          axios.get(`${GATEWAY_URL}/academic/evaluation-types/by-university/${sessionUniversity}`),
          axios.get(`${GATEWAY_URL}/academic/groups/by-student/${studentId}`),
        ]);

        const [yearsRes, spRes] = await Promise.all([
          axios.get(`${GATEWAY_URL}/academic/academicYears/by-university/${sessionUniversity}`),
          axios.get(`${GATEWAY_URL}/academic/studyPrograms/by-university/${sessionUniversity}`),
        ]);

        setAcademicYears(yearsRes.data.years || []);
        setStudyPrograms(spRes.data.programs || []);

        const studentGrades = gradesRes.data.grades || [];
        const allCourses = coursesRes.data.courses || [];
        const evalTypes = typesRes.data.evaluationTypes || [];
        const studentGroups = groupsRes.data.groups || [];

        const filteredCourses = allCourses.filter((course) =>
          studentGrades.some((g) => g.courseId === course._id)
        );

        const coursesWithGroup = filteredCourses.map((course) => {
          const group = studentGroups.find((g) => g.courseId._id === course._id);
          return { ...course, studentGroupId: group?._id || null };
        });

        setGrades(studentGrades);
        setCourses(coursesWithGroup);
        setEvaluationTypes(evalTypes);
      } catch (err) {
        console.error("Error loading grades/courses/types:", err);
        setGrades([]);
        setCourses([]);
        setEvaluationTypes([]);
      } finally {
        setLoading(false);
      }
    };

    if (sessionUniversity) fetchData();
  }, [studentId, sessionUniversity]);

  const displayedGrades = useMemo(() => {
    return grades.filter((g) => {
      const course = courses.find((c) => c._id === g.courseId);
      if (!course) return false;

      if (
        filters.course &&
        !course.name.toLowerCase().includes(filters.course.toLowerCase())
      )
      return false;
      if (filters.academicYear && course.academicYearId?._id !== filters.academicYear)
        return false;
      if (filters.studyProgram && course.studyProgramId?._id !== filters.studyProgram)
        return false;
      if (filters.period && g.evaluationPeriod !== filters.period) return false;
      if (filters.status) {
        const isPassed = g.isPassed ? "Passed" : "Failed";
        if (isPassed !== filters.status) return false;
      }
      return true;
    });
  }, [grades, filters, courses]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleResetFilters = () => {
    setFilters({
      course: "",
      academicYear: "",
      studyProgram: "",
      period: "",
      status: "",
    });
    setPage(0);
  };

  const toggleDetails = async (courseId, evaluationPeriod) => {
    if (evaluationPeriod === "Extraordinary") return;

    if (expanded === courseId) {
      setExpanded(null);
      return;
    }
    setExpanded(courseId);

    if (!details[courseId]) {
      setLoading(true);
      try {
        const [systemRes, itemGradesRes] = await Promise.all([
          axios.get(`${GATEWAY_URL}/eval/evaluation-systems/by-course/${courseId}`),
          axios.get(`${GATEWAY_URL}/grade/grades/by-student/${studentId}`),
        ]);

        const system = systemRes.data.system;
        const itemGrades = itemGradesRes.data.grades;

        const studentGroupId =
          courses.find((c) => c._id === courseId)?.studentGroupId;

        let items = [];
        if (studentGroupId) {
          const itemsRes = await axios.get(
            `${GATEWAY_URL}/eval/evaluation-items/by-group/${studentGroupId}`
          );
          items = itemsRes.data.items || [];
        }

        setDetails((prev) => ({
          ...prev,
          [courseId]: { system, itemGrades, items, studentGroupId },
        }));
      } catch (err) {
        console.error("Error fetching detailed course info:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading && grades.length === 0) {
    return (
      <Container data-testid="grades-page"
        maxWidth="lg"
        sx={{ mt: 4, display: "flex", justifyContent: "center" }}
      >
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container data-testid="grades-page" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">{t("grades.title")}</Typography>
        </Box>

        {/* Filters */}
        <Box mb={2} display="grid" gridTemplateColumns="repeat(5, 1fr)" gap={2}>
          <TextField
            label={t("course.name")}
            fullWidth
            value={filters.course}
            onChange={(e) => handleFilterChange("course", e.target.value)}
          />

          <Autocomplete
            options={academicYears}
            getOptionLabel={(y) => y.yearLabel || ""}
            value={academicYears.find((y) => y._id === filters.academicYear) || null}
            onChange={(_, v) => handleFilterChange("academicYear", v?._id || "")}
            renderInput={(params) => <TextField {...params} label={t("academicYears.single")} />}
            clearOnEscape
          />

          <Autocomplete
            options={studyPrograms}
            getOptionLabel={(sp) => sp.name || ""}
            value={studyPrograms.find((sp) => sp._id === filters.studyProgram) || null}
            onChange={(_, v) => handleFilterChange("studyProgram", v?._id || "")}
            renderInput={(params) => <TextField {...params} label={t("studyPrograms.program")} />}
            clearOnEscape
          />

          <Autocomplete
            options={["Ordinary", "Extraordinary"]}
            getOptionLabel={(option) => t(`grades.${option}`)}
            value={filters.period || null}
            onChange={(_, v) => handleFilterChange("period", v || "")}
            renderInput={(params) => <TextField {...params} label={t("grades.evaluationPeriod")} />}
            clearOnEscape
          />

          <Autocomplete
            options={["Passed", "Failed"]}
            getOptionLabel={(option) => t(`grades.${option}`)}
            value={filters.status || null}
            onChange={(_, v) => handleFilterChange("status", v || "")}
            renderInput={(params) => <TextField {...params} label={t("grades.status")} />}
            clearOnEscape
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <Button variant="outlined" color="primary" onClick={handleResetFilters}>
            {t("resetFilters")}
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>{t("course.single")}</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>{t("studyPrograms.program")}</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>{t("grades.evaluationPeriod")}</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>{t("grades.finalGrade")}</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>{t("grades.status")}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>

          <TableBody>
            {displayedGrades
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((g) => {
                const course = courses.find((c) => c._id === g.courseId);
                const isExtra = g.evaluationPeriod === "Extraordinary";
                const isExpanded = expanded === g.courseId;

                return (
                  <React.Fragment key={g._id}>
                    <TableRow
                      hover={!isExtra}
                      onClick={() => !isExtra && toggleDetails(g.courseId, g.evaluationPeriod)}
                      sx={{
                        cursor: isExtra ? "default" : "pointer",
                        backgroundColor: isExpanded ? (isExtra ? "inherit" : "action.hover") : "inherit",
                      }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">
                            {(course?.name + " - " + course?.academicYearId?.yearLabel) || t("course.single")}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{course?.studyProgramId?.name || "—"}</TableCell>
                      <TableCell>
                        <Chip
                          label={t(`grades.${g.evaluationPeriod}`)}
                          color={isExtra ? "warning" : "primary"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        {Number(g.value).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={g.isPassed ? t("grades.Passed") : t("grades.Failed")}
                          color={g.isPassed ? "success" : "error"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {!isExtra && (
                            <ExpandMoreIcon
                              sx={{
                                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                transition: "transform 0.2s",
                              }}
                            />
                          )}
                      </TableCell>
                    </TableRow>

                    {!isExtra && isExpanded && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ backgroundColor: "#fafafa" }}>
                          {details[g.courseId]?._loading ? (
                            <Box display="flex" justifyContent="center" p={2}>
                              <CircularProgress size={24} />
                            </Box>
                          ) : (
                            <>
                              {details[g.courseId]?.system?.evaluationGroups?.map(
                                (group) => {
                                  const typeName =
                                    evaluationTypes.find(
                                      (t) => t._id === group.evaluationTypeId
                                    )?.name || t("grades.unknownType");

                                  const totalWeight = group.totalWeight;

                                  const groupItems =
                                    details[g.courseId]?.items?.filter(
                                      (item) =>
                                        item.groupId ===
                                          details[g.courseId]?.studentGroupId &&
                                        item.evaluationTypeId ===
                                          group.evaluationTypeId
                                    ) || [];

                                  const groupGrades =
                                    details[g.courseId]?.itemGrades?.filter((ig) =>
                                      groupItems.some((item) => item._id === ig.itemId)
                                    ) || [];

                                  return (
                                    <Box key={group._id} sx={{ mb: 2 }}>
                                      <Typography
                                        sx={{ fontWeight: "bold" }}
                                        variant="subtitle1"
                                        gutterBottom
                                      >
                                        {typeName} ({totalWeight}%)
                                      </Typography>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell sx={{ fontWeight: "bold" }}>{t("gradesManagement.title")}</TableCell>
                                            <TableCell sx={{ fontWeight: "bold" }}>{t("evaluationItem.weight")}</TableCell>
                                            <TableCell sx={{ fontWeight: "bold" }}>{t("grades.finalGrade")}</TableCell>
                                            <TableCell sx={{ fontWeight: "bold" }}>{t("evaluationItem.minGrade")}</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {groupItems.map((item) => {
                                            const grade =
                                              groupGrades.find(
                                                (ig) => ig.itemId === item._id
                                              )?.value ?? "—";
                                            return (
                                              <TableRow key={item._id}>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>{item.weight}%</TableCell>
                                                <TableCell>{grade}</TableCell>
                                                <TableCell>
                                                  {item.minGrade || "—"}
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </Box>
                                  );
                                }
                              )}

                              {!details[g.courseId]?.system && (
                                <Typography color="text.secondary">
                                  {t("grades.noEvaluationSystem")}
                                </Typography>
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={displayedGrades.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number.parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage={t("rowsPage")}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} ${t("of")} ${count}`
          }
        />
      </Paper>
    </Container>
  );
};

export default Grades;
