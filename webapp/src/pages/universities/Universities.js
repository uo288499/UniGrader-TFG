import { useState, useEffect, useMemo } from "react";
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
import { Add as AddIcon, Edit as EditIcon, AccountBalance as UniIcon } from "@mui/icons-material";
import axios from "axios";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const Universities = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    const fetchUniversities = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${GATEWAY_URL}/academic/universities`);
        const uniList = data?.universities ?? data ?? [];
        setUniversities(uniList);
      } catch (err) {
        console.error("Error fetching universities:", err);
        setUniversities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUniversities();
  }, []);

  const filteredUniversities = useMemo(() => {
    let result = universities;

    if (filters.name) {
      result = result.filter((u) =>
        (u.name || "").toLowerCase().includes(filters.name.toLowerCase())
      );
    }
    if (filters.address) {
      result = result.filter((u) =>
        (u.address || "").toLowerCase().includes(filters.address.toLowerCase())
      );
    }
    if (filters.email) {
      result = result.filter((u) =>
        (u.contactEmail || "").toLowerCase().includes(filters.email.toLowerCase())
      );
    }
    if (filters.phone) {
      result = result.filter((u) =>
        (u.contactPhone || "").toLowerCase().includes(filters.phone.toLowerCase())
      );
    }

    return result;
  }, [filters, universities]);

  useEffect(() => {
    setPage(0);
  }, [filters]);

  const handleEditUniversity = (universityId) => {
    navigate(`/universities/${universityId}`);
  };

  const handleCreateUniversity = () => {
    navigate("/universities/new");
  };

  if (loading) {
    return (
      <Container
        data-testid="universities-list-page"
        maxWidth="lg"
        sx={{ mt: 4, display: "flex", justifyContent: "center" }}
      >
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container data-testid="universities-list-page" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">{t("university")}</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateUniversity}>
            {t("universities.new")}
          </Button>
        </Box>

        {/* Filters */}
        <Box mb={2} display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2}>
          <TextField
            label={t("universities.name")}
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            autoComplete="off"
          />
          <TextField
            label={t("universities.address")}
            value={filters.address}
            onChange={(e) => setFilters({ ...filters, address: e.target.value })}
            autoComplete="off"
          />
          <TextField
            label={t("universities.email")}
            value={filters.email}
            onChange={(e) => setFilters({ ...filters, email: e.target.value })}
            autoComplete="off"
          />
          <TextField
            label={t("universities.phone")}
            value={filters.phone}
            onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
            autoComplete="off"
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setFilters({ name: "", address: "", email: "", phone: "" })}
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
                <TableCell sx={{ fontWeight: "bold" }}>{t("universities.uni")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("universities.address")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("universities.email")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("universities.phone")}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUniversities
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((university) => (
                  <TableRow key={university._id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        {university.smallLogoUrl ? (
                          <Box
                            component="img"
                            src={university.smallLogoUrl}
                            alt={university.name}
                            sx={{ width: 40, height: 40, borderRadius: "50%" }}
                          />
                        ) : (
                          <UniIcon sx={{ width: 40, height: 40, color: "action.active" }} />
                        )}
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                            {university.name}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>{university.address || "—"}</TableCell>
                    <TableCell>{university.contactEmail || "—"}</TableCell>
                    <TableCell>{university.contactPhone || "—"}</TableCell>
                    <TableCell>
                      <EditIcon
                        data-testid={`edit-button-${university._id}`}
                        fontSize="small"
                        color="primary"
                        sx={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditUniversity(university._id);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              {filteredUniversities.length === 0 && (
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
          count={filteredUniversities.length}
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

export default Universities;
