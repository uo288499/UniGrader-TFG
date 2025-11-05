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
  Chip,
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

const Subjects = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { universityID: sessionUniversity } = useContext(SessionContext);

  const [subjects, setSubjects] = useState([]);
  const [studyPrograms, setStudyPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    name: "",
    code: "",
    studyProgram: "",
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: subjectsData } = await axios.get(
          `${GATEWAY_URL}/academic/subjects/by-university/${sessionUniversity}`
        );
        setSubjects(subjectsData?.subjects ?? []);

        const { data: spData } = await axios.get(
          `${GATEWAY_URL}/academic/studyPrograms/by-university/${sessionUniversity}`
        );
        setStudyPrograms(spData?.programs ?? []);
      } catch (err) {
        console.error("Error fetching subjects/study programs:", err);
        setSubjects([]);
        setStudyPrograms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (filters.name && !s.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.code && !s.code.toLowerCase().includes(filters.code.toLowerCase())) return false;
      if (filters.studyProgram && !s.studyPrograms?.some(sp => sp === filters.studyProgram)) return false;
      return true;
    });
  }, [subjects, filters]);

  const handleSubjectClick = (subjectId) => navigate(`/subjects/${subjectId}`);
  const handleCreateSubject = () => navigate("/subjects/new");

  if (loading) {
    return (
      <Container data-testid="subjects-list-page" maxWidth="lg" sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container data-testid="subjects-list-page" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">{t("subjects")}</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateSubject}>
              {t("subject.new")}
            </Button>
        </Box>

        {/* Filters */}
        <Box mb={2} display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={2}>
          <TextField
            label={t("subject.name")}
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          />
          <TextField
            label={t("subject.code")}
            value={filters.code}
            onChange={(e) => setFilters({ ...filters, code: e.target.value })}
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
                studyProgram: "",
              })
            }
          >
            {t("resetFilters")}
          </Button>
        </Box>

        {/* Subjects Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>{t("subject.name")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("subject.code")}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSubjects.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((subject) => (
                <TableRow key={subject._id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <SchoolIcon
                          sx={{ width: 40, height: 40, color: "action.active" }}
                        />
                        <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                          {subject.name}
                        </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{subject.code}</TableCell>
                  <TableCell>
                    <EditIcon
                      data-testid={`edit-button-${subject._id}`}
                      fontSize="small"
                      color="primary"
                      sx={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubjectClick(subject._id);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {filteredSubjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
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
          count={filteredSubjects.length}
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

export default Subjects;
