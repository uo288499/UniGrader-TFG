import { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  Container,
  Autocomplete,
  Paper,
  TextField,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, School as SchoolIcon, } from "@mui/icons-material";
import { SessionContext } from "../../SessionContext";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const Courses = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { universityID: sessionUniversity } = useContext(SessionContext);

  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [studyPrograms, setStudyPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    name: "",
    code: "",
    subject: "",
    academicYear: "",
    studyProgram: "",
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: coursesData } = await axios.get(
          `${GATEWAY_URL}/academic/courses/by-university/${sessionUniversity}`
        );
        setCourses(coursesData?.courses ?? []);

        const { data: subjectsData } = await axios.get(
          `${GATEWAY_URL}/academic/subjects/by-university/${sessionUniversity}`
        );
        setSubjects(subjectsData?.subjects ?? []);

        const { data: yearsData } = await axios.get(
          `${GATEWAY_URL}/academic/academicYears/by-university/${sessionUniversity}`
        );
        setAcademicYears(yearsData?.years ?? []);

        const { data: spData } = await axios.get(
          `${GATEWAY_URL}/academic/studyPrograms/by-university/${sessionUniversity}`
        );
        setStudyPrograms(spData?.programs ?? []);
      } catch (err) {
        console.error("Error fetching courses/subjects/academicYears:", err);
        setCourses([]);
        setSubjects([]);
        setAcademicYears([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (filters.name && !c.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.code && !c.code.toLowerCase().includes(filters.code.toLowerCase())) return false;
      if (filters.subject && c.subjectId?._id !== filters.subject) return false;
      if (filters.academicYear && c.academicYearId?._id !== filters.academicYear) return false;
      if (filters.studyProgram && c.studyProgramId?._id !== filters.studyProgram) return false;
      return true;
    });
  }, [courses, filters]);

  const handleCourseClick = (courseId) => navigate(`/courses/${courseId}`);
  const handleCreateCourse = () => navigate("/courses/new");

  if (loading) {
    return (
      <Container data-testid="courses-list-page" maxWidth="lg" sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container data-testid="courses-list-page" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">{t("courses")}</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateCourse}>
            {t("course.new")}
          </Button>
        </Box>

        {/* Filters */}
        <Box mb={2} display="grid" gridTemplateColumns="repeat(5, 1fr)" gap={2}>
          <TextField
            label={t("course.name")}
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          />
          <TextField
            label={t("course.code")}
            value={filters.code}
            onChange={(e) => setFilters({ ...filters, code: e.target.value })}
          />
          <Autocomplete
            options={subjects}
            getOptionLabel={(s) => s.name || ""}
            value={subjects.find((s) => s._id === filters.subject) || null}
            onChange={(_, v) => setFilters({ ...filters, subject: v?._id || "" })}
            renderInput={(params) => <TextField {...params} label={t("course.subject")} />}
            clearOnEscape
          />
          <Autocomplete
            options={academicYears}
            getOptionLabel={(y) => y.yearLabel || ""}
            value={academicYears.find((y) => y._id === filters.academicYear) || null}
            onChange={(_, v) => setFilters({ ...filters, academicYear: v?._id || "" })}
            renderInput={(params) => <TextField {...params} label={t("course.academicYear")} />}
            ListboxProps={{ style: { maxHeight: 280 } }}
            clearOnEscape
          />
          <Autocomplete
            options={studyPrograms}
            getOptionLabel={(sp) => sp.name || ""}
            value={studyPrograms.find((sp) => sp._id === filters.studyProgram) || null}
            onChange={(_, v) => setFilters({ ...filters, studyProgram: v?._id || "" })}
            renderInput={(params) => <TextField {...params} label={t("studyPrograms.program")} />}
            clearOnEscape
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() =>
              setFilters({
                name: "",
                code: "",
                subject: "",
                academicYear: "",
                studyProgram: "",
              })
            }
          >
            {t("resetFilters")}
          </Button>
        </Box>

        {/* Courses Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>{t("course.name")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("course.code")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("course.subject")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("course.academicYear")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("course.studyProgram")}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCourses.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((course) => (
                <TableRow key={course._id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <SchoolIcon sx={{ width: 40, height: 40, color: "action.active" }} />
                      <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                        {course.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{course.code}</TableCell>
                  <TableCell>{course.subjectId?.name || "—"}</TableCell>
                  <TableCell>{course.academicYearId?.yearLabel || "—"}</TableCell>
                  <TableCell>{course.studyProgramId?.name || "—"}</TableCell>
                  <TableCell>
                    <EditIcon
                      data-testid={`edit-button-${course._id}`}
                      fontSize="small"
                      color="primary"
                      sx={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCourseClick(course._id);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {filteredCourses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {t("noResults")}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          data-testid="rows-per-page"
          component="div"
          count={filteredCourses.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Paper>
    </Container>
  );
};

export default Courses;
