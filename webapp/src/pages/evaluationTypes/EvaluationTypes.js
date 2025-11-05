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
import { Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";
import { Assessment as EvalTypeIcon } from "@mui/icons-material";
import axios from "axios";
import { SessionContext } from "../../SessionContext";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const EvaluationTypes = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { universityID: sessionUniversity } = useContext(SessionContext);

  const [evaluationTypes, setEvaluationTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ name: "" });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    if (!sessionUniversity) return setLoading(false);

    const fetchTypes = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(
          `${GATEWAY_URL}/academic/evaluation-types/by-university/${sessionUniversity}`
        );
        setEvaluationTypes(data.evaluationTypes ?? []);
      } catch (err) {
        console.error("Error fetching evaluation types:", err);
        setEvaluationTypes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTypes();
  }, [sessionUniversity]);

  const filteredTypes = useMemo(() => {
    return evaluationTypes.filter((tpe) =>
      tpe.name.toLowerCase().includes(filters.name.toLowerCase())
    );
  }, [filters, evaluationTypes]);

  useEffect(() => setPage(0), [filters]);

  const handleEdit = (id) => navigate(`/evaluation-types/${id}`);
  const handleCreate = () => navigate("/evaluation-types/new");
  const handleResetFilters = () => setFilters({ name: "" });

  if (loading) {
    return (
      <Container data-testid="evaluationtypes-list-page" maxWidth="lg" sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container data-testid="evaluationtypes-list-page" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">{t("evaluationTypes.title")}</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            {t("evaluationTypes.new")}
          </Button>
        </Box>

        <Box mb={2} display="grid" gridTemplateColumns="1fr" gap={2}>
          <TextField
            label={t("evaluationTypes.name")}
            value={filters.name}
            onChange={(e) => setFilters({ name: e.target.value })}
            autoComplete="off"
            inputProps={{ maxLength: 50 }}
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <Button variant="outlined" color="primary" onClick={handleResetFilters} sx={{ whiteSpace: "nowrap" }}>
            {t("resetFilters")}
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>{t("evaluationTypes.name")}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTypes
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((type) => (
                  <TableRow key={type._id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <EvalTypeIcon sx={{ width: 40, height: 40, color: "action.active" }} />
                        <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                          {type.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <EditIcon
                        data-testid={`edit-button-${type._id}`}
                        fontSize="small"
                        color="primary"
                        sx={{ cursor: "pointer" }}
                        onClick={(e) => { e.stopPropagation(); handleEdit(type._id); }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              {filteredTypes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {t("noResults")}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          data-testid="rows-per-page"
          component="div"
          count={filteredTypes.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
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

export default EvaluationTypes;
