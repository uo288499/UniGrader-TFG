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
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, CalendarToday as YearIcon } from "@mui/icons-material";
import axios from "axios";
import { SessionContext } from "../../SessionContext";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const AcademicYears = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { universityID } = useContext(SessionContext);

  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    yearLabel: "",
  });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Fetch data: Academic Years for the sessionUniversity
  useEffect(() => {
    const fetchYears = async () => {
      if (!universityID) return;
      setLoading(true);
      try {
        const { data } = await axios.get(`${GATEWAY_URL}/academic/academicyears/by-university/${universityID}`);
        setYears(data.years ?? []);
      } catch (err) {
        console.error(err);
        setYears([]);
      } finally {
        setLoading(false);
      }
    };
    fetchYears();
  }, [universityID]);

  // Filtered Academic Years
  const filteredYears = useMemo(() => {
    return years.filter((y) =>
      (y.yearLabel || "").toLowerCase().includes(filters.yearLabel.toLowerCase())
    );
  }, [filters, years]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters]);

  const handleEditYear = (id) => navigate(`/academic-years/${id}`);
  const handleCreateYear = () => navigate("/academic-years/new");
  const handleResetFilters = () => setFilters({ yearLabel: "" });

  if (loading) {
    return (
      <Container
        data-testid="academicyears-list-page"
        maxWidth="lg"
        sx={{ mt: 4, display: "flex", justifyContent: "center" }}
      >
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container data-testid="academicyears-list-page" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">{t("academicYears.title")}</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateYear}>
            {t("academicYears.new")}
          </Button>
        </Box>

        {/* Filters */}
        <Box mb={2} display="grid" gridTemplateColumns="1fr" gap={2}>
          <TextField
            label={t("academicYears.yearLabel")}
            value={filters.yearLabel}
            onChange={(e) => setFilters({ yearLabel: e.target.value })}
            inputProps={{ maxLength: 50 }}
            autoComplete="off"
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <Button variant="outlined" color="primary" onClick={handleResetFilters} sx={{ whiteSpace: "nowrap" }}>
            {t("resetFilters")}
          </Button>
        </Box>

        {/* Results Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>{t("academicYears.yearLabel")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("academicYears.startDate")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("academicYears.endDate")}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredYears
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((y) => (
                  <TableRow key={y._id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <YearIcon sx={{ width: 40, height: 40, color: "action.active" }} />
                        <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                          {y.yearLabel}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{new Date(y.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(y.endDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <EditIcon
                        data-testid={`edit-button-${y._id}`}
                        fontSize="small"
                        color="primary"
                        sx={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditYear(y._id);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              {filteredYears.length === 0 && (
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
          component="div"
          count={filteredYears.length}
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

export default AcademicYears;
