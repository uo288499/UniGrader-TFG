import { useState, useEffect, useContext, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import axios from "axios";
import Papa from "papaparse";
import {
  Container,
  Paper,
  Autocomplete,
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
  TablePagination,
  Stack,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, HelpOutline as HelpOutlineIcon, } from "@mui/icons-material";
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
  const [csvErrors, setCsvErrors] = useState([]);
  const [errorKey, setErrorKey] = useState("");
  const csvInputRef = useRef(null);

  const [filters, setFilters] = useState({
    name: "",
    dni: "",
    email: "",
    studyProgram: "",
    academicYear: "",
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: enrollmentData } = await axios.get(
        `${GATEWAY_URL}/academic/enrollments/by-university/${sessionUniversity}`
      );
      setEnrollments(enrollmentData?.enrollments ?? []);

      const { data: programData } = await axios.get(
        `${GATEWAY_URL}/academic/studyprograms/by-university/${sessionUniversity}`
      );
      setPrograms(programData?.programs ?? []);

      const { data: yearData } = await axios.get(
        `${GATEWAY_URL}/academic/academicyears/by-university/${sessionUniversity}`
      );
      setYears(yearData?.years ?? []);
    } catch (err) {
      console.error("Error fetching enrollments:", err);
      setEnrollments([]);
      setPrograms([]);
      setYears([]);
      setErrorKey("error.genericError");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionUniversity) fetchData();
  }, [sessionUniversity]);

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((en) => {
      const user = en.account?.userId || {};
      const fullName = `${user.name || ""} ${user.firstSurname || ""} ${user.secondSurname || ""}`.toLowerCase();
      if (filters.name && !fullName.includes(filters.name.toLowerCase())) return false;
      if (filters.dni && !(user.identityNumber || "").toLowerCase().includes(filters.dni.toLowerCase())) return false;
      if (filters.email && !(en.account?.email || "").toLowerCase().includes(filters.email.toLowerCase())) return false;
      if (filters.studyProgram && en.studyProgramId?._id !== filters.studyProgram) return false;
      if (filters.academicYear && en.academicYearId?._id !== filters.academicYear) return false;
      return true;
    });
  }, [enrollments, filters]);

  const handleEnrollmentClick = (id) => navigate(`/enrollments/${id}`);
  const handleCreateEnrollment = () => navigate("/enrollments/new");

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";", 
      delimitersToGuess: [',', '\t', ';', '|'],
      complete: async (results) => {
        try {
          const rows = results.data;
          if (!rows.length) {
            setErrorKey("error.emptyCSV");
            if(csvInputRef.current)
              csvInputRef.current.value = "";
            return;
          }

          setLoading(true);
          const { data } = await axios.post(
            `${GATEWAY_URL}/academic/enrollments/import/${sessionUniversity}`,
            { rows }
          );

          if (data.errors?.length) {
            setCsvErrors(
              data.errors.map((e) => ({
                line: e.line,
                data: e.data,
                key: e.errorKey,
              }))
            );
          } else {
            setCsvErrors([]);
          }

          setErrorKey("");
          await fetchData();
        } catch (err) {
          console.error("Import CSV error:", err);
          const key = "error." + (err.response?.data?.errorKey || "genericError");
          setErrorKey(key);
        } finally {
          setLoading(false);
          if(csvInputRef.current)
            csvInputRef.current.value = "";
        }
      },
    });
  };

  if (loading) {
    return (
      <Container data-testid="enrollments-list-page" maxWidth="lg" sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container data-testid="enrollments-list-page" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>

      {errorKey && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t(errorKey)}
        </Alert>
      )}

      {csvErrors.length > 0 && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {csvErrors.map((e, idx) => (
            <Alert
              key={idx}
              severity="warning"
              onClose={() => setCsvErrors((prev) => prev.filter((_, i) => i !== idx))}
              sx={{
                borderRadius: 2,
                alignItems: "center",
                "& .MuiAlert-message": { width: "100%" },
              }}
            >
              {e.line ? (
                <>
                  {t("error." + e.key)} → <strong>{e.data}</strong> ({t("line")} {e.line})
                </>
              ) : (
                <>
                  {t("error." + e.key)} → <strong>{e.data}</strong>
                </>
              )}
            </Alert>
          ))}
        </Stack>
      )}

      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">{t("enrollmentsNav")}</Typography>

          <Box display="flex" gap={1} alignItems="center">
            <Button variant="outlined" component="label" color="primary">
              {t("enrollments.import")}
              <input
                data-testid="enrollments-file-input"
                key={Date.now()}
                type="file"
                accept=".csv"
                hidden
                ref={csvInputRef}
                onChange={handleImportCSV}
              />
            </Button>

            <Tooltip
              title={t("enrollments.csvHelp")}
              arrow
              placement="right"
            >
              <IconButton color="info" size="small">
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>

            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateEnrollment}>
              {t("enrollments.new")}
            </Button>
          </Box>
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
          <Autocomplete
            sx={{ minWidth: 200 }}
            value={programs.find((p) => p._id === filters.studyProgram) || null}
            options={programs}
            getOptionLabel={(option) => option.name || t("common.all")}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            onChange={(_event, newValue) => {
              setFilters({ ...filters, studyProgram: newValue ? newValue._id : "" });
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("studyPrograms.program")}
                variant="outlined"
              />
            )}
          />
          <Autocomplete
            sx={{ minWidth: 200 }}
            value={years.find((y) => y._id === filters.academicYear) || null}
            options={years}
            getOptionLabel={(option) => option.yearLabel || t("common.all")}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            onChange={(_event, newValue) => {
              setFilters({ ...filters, academicYear: newValue ? newValue._id : "" });
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("academicYears.single")}
                variant="outlined"
              />
            )}
          />
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
                      <TableCell>{user.identityNumber || "—"}</TableCell>
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
          data-testid="rows-per-page"
          component="div"
          count={filteredEnrollments.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number.parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Paper>
    </Container>
  );
};

export default Enrollments;
