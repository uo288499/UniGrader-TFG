import { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Container,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Paper,
  CircularProgress,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  School as ProgramIcon,
} from "@mui/icons-material";
import axios from "axios";
import { SessionContext } from "../../SessionContext";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const StudyPrograms = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { universityID: sessionUniversity } = useContext(SessionContext);

  const [studyPrograms, setStudyPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    name: "",
    type: "",
  });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const programTypes = [
    "Bachelor",
    "Master",
    "Doctorate",
    "Postgraduate",
    "Specialization",
    "Other",
  ];

  // Fetch data: Study Programs for the sessionUniversity
  useEffect(() => {
    const fetchPrograms = async () => {
      if (!sessionUniversity) {
        setLoading(false);
        setStudyPrograms([]);
        console.error("Session University ID is missing.");
        return;
      }
      
      setLoading(true);
      try {
        const programsUrl = `${GATEWAY_URL}/academic/studyprograms/by-university/${sessionUniversity}`;

        const { data } = await axios.get(programsUrl);
        setStudyPrograms(data.programs ?? []);
      } catch (err) {
        console.error("Error fetching study programs:", err);
        setStudyPrograms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, [sessionUniversity]);

  // Filtered Study Programs using useMemo
  const filteredStudyPrograms = useMemo(() => {
    let result = studyPrograms;

    if (filters.name) {
      result = result.filter((p) =>
        (p.name || "").toLowerCase().includes(filters.name.toLowerCase())
      );
    }
    if (filters.type) {
      result = result.filter((p) => p.type === filters.type);
    }

    return result;
  }, [filters, studyPrograms]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters]);

  const handleEditProgram = (programId) => {
    navigate(`/study-programs/${programId}`);
  };

  const handleCreateProgram = () => {
    navigate("/study-programs/new");
  };

  const handleResetFilters = () => {
    setFilters({
      name: "",
      type: "",
    });
  };

  if (loading) {
    return (
      <Container
        data-testid="studyprograms-list-page"
        maxWidth="lg"
        sx={{ mt: 4, display: "flex", justifyContent: "center" }}
      >
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container
      data-testid="studyprograms-list-page"
      maxWidth="lg"
      sx={{ mt: 4, mb: 4 }}
    >
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h4">{t("studyPrograms.title")}</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateProgram}
          >
            {t("studyPrograms.new")}
          </Button>
        </Box>

        {/* Filters */}
        <Box
          mb={2}
          display="grid"
          gridTemplateColumns="repeat(2, 1fr)"
          gap={2}
        >
          <TextField
            label={t("studyPrograms.name")}
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            autoComplete="off"
          />

          <FormControl>
            <InputLabel>{t("studyPrograms.type")}</InputLabel>
            <Select
              value={filters.type}
              label={t("studyPrograms.type")}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <MenuItem value="">{t("all")}</MenuItem>
              {programTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {t(`studyPrograms.types.${type}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleResetFilters}
            sx={{ whiteSpace: "nowrap" }}
          >
            {t("resetFilters")}
          </Button>
        </Box>

        {/* Results Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>
                  {t("studyPrograms.name")}
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  {t("studyPrograms.type")}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudyPrograms
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((program) => (
                  <TableRow key={program._id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <ProgramIcon
                          sx={{ width: 40, height: 40, color: "action.active" }}
                        />
                        <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                          {program.name}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      {t(`studyPrograms.types.${program.type}`)}
                    </TableCell>

                    <TableCell>
                      <EditIcon
                        data-testid={`edit-button-${program._id}`}
                        fontSize="small"
                        color="primary"
                        sx={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProgram(program._id);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              {filteredStudyPrograms.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    align="center"
                    sx={{ py: 4 }}
                  >
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
          count={filteredStudyPrograms.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage={t("rowsPage")}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} ${t("of")} ${count > -1 ? count : `${t("moreThan")} ${to}`}`
          }
        />
      </Paper>
    </Container>
  );
};

export default StudyPrograms;