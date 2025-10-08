import { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  Container,
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
  Avatar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";
import { SessionContext } from "../../SessionContext";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const Enrollments = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { universityID: sessionUniversity } = useContext(SessionContext);

  const [enrollments, setEnrollments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    name: "",
    dni: "", 
    email: "",
    studyProgram: "",
    academicYear: "",
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get enrollments
        const { data: enrollmentData } = await axios.get(
          `${GATEWAY_URL}/academic/enrollments/by-university/${sessionUniversity}`
        );
        setEnrollments(enrollmentData?.enrollments ?? []);

        // Get study programs for filters
        const { data: programData } = await axios.get(
          `${GATEWAY_URL}/academic/studyprograms/by-university/${sessionUniversity}`
        );
        setPrograms(programData?.programs ?? []);

        // Get academic years
        const { data: yearData } = await axios.get(
          `${GATEWAY_URL}/academic/academicyears/by-university/${sessionUniversity}`
        );
        setYears(yearData?.years ?? []);
      } catch (err) {
        console.error("Error fetching enrollments:", err);
        setEnrollments([]);
        setPrograms([]);
        setYears([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionUniversity]);

  // Apply filters client-side
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((en) => {
      const user = en.account?.userId || {};
      const fullName = `${user.name || ""} ${user.firstSurname || ""} ${
        user.secondSurname || ""
      }`.toLowerCase();

      if (filters.name && !fullName.includes(filters.name.toLowerCase())) return false;
      if (filters.dni && !(user.identityNumber || "").toLowerCase().includes(filters.dni.toLowerCase())) return false; // NEW
      if (filters.email && !(en.account?.email || "").toLowerCase().includes(filters.email.toLowerCase())) return false;
      if (filters.studyProgram && en.studyProgramId?._id !== filters.studyProgram) return false;
      if (filters.academicYear && en.academicYearId?._id !== filters.academicYear) return false;
      return true;
    });
  }, [enrollments, filters]);

  const handleEnrollmentClick = (id) => navigate(`/enrollments/${id}`);
  const handleCreateEnrollment = () => navigate("/enrollments/new");

  if (loading) {
    return (
      <Container data-testid="enrollments-list-page" maxWidth="lg" sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container data-testid="enrollments-list-page" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">{t("enrollmentsNav")}</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateEnrollment}>
            {t("enrollments.new")}
          </Button>
        </Box>

        {/* Filters */}
        <Box mb={2} display="grid" gridTemplateColumns="repeat(5, 1fr)" gap={2}>
          <TextField
            label={t("user.fullName")}
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            autoComplete="off"
          />
          <TextField
            label={t("user.identityNumber")}
            value={filters.dni}
            onChange={(e) => setFilters({ ...filters, dni: e.target.value })}
            autoComplete="off"
          />
          <TextField
            label={t("user.email")}
            value={filters.email}
            onChange={(e) => setFilters({ ...filters, email: e.target.value })}
            autoComplete="off"
          />
          <FormControl>
            <InputLabel>{t("studyPrograms.program")}</InputLabel>
            <Select
              value={filters.studyProgram}
              label={t("studyPrograms.program")}
              onChange={(e) => setFilters({ ...filters, studyProgram: e.target.value })}
            >
              <MenuItem value="">{t("common.all")}</MenuItem>
              {programs.map((p) => (
                <MenuItem key={p._id} value={p._id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>{t("academicYears.single")}</InputLabel>
            <Select
              value={filters.academicYear}
              label={t("academicYears.single")}
              onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
            >
              <MenuItem value="">{t("common.all")}</MenuItem>
              {years.map((y) => (
                <MenuItem key={y._id} value={y._id}>
                  {y.yearLabel}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() =>
              setFilters({
                name: "",
                dni: "", 
                email: "",
                studyProgram: "",
                academicYear: "",
              })
            }
            sx={{ whiteSpace: "nowrap" }}
          >
            {t("resetFilters")}
          </Button>
        </Box>

        {/* Enrollments Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>{t("user.fullName")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("user.identityNumber")}</TableCell> {/* NEW */}
                <TableCell sx={{ fontWeight: "bold" }}>{t("user.email")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("studyPrograms.program")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("academicYears.single")}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEnrollments
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((en) => {
                  const user = en.account?.userId || {};
                  return (
                    <TableRow key={en._id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar
                            src={user.photoUrl}
                            alt={`${user.name || ""} ${user.firstSurname || ""}`}
                            sx={{ width: 40, height: 40 }}
                          >
                            {(user.name || "").charAt(0)}
                            {(user.firstSurname || "").charAt(0)}
                          </Avatar>
                          <Typography
                            variant="body1"
                            sx={{ fontWeight: "medium", color: "var(--primary-main)" }}
                          >
                            {user.name} {user.firstSurname} {user.secondSurname || ""}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{user.identityNumber || "—"}</TableCell> {/* NEW */}
                      <TableCell>{en.account?.email}</TableCell>
                      <TableCell>{en.studyProgramId?.name || "—"}</TableCell>
                      <TableCell>{en.academicYearId?.yearLabel || "—"}</TableCell>
                      <TableCell>
                        <EditIcon
                          data-testid={`edit-button-${en._id}`}
                          fontSize="small"
                          color="primary"
                          sx={{ cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEnrollmentClick(en._id);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              {filteredEnrollments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
          component="div"
          count={filteredEnrollments.length}
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

export default Enrollments;
