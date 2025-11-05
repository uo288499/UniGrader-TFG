import { useState, useEffect, useContext, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import axios from "axios";
import Papa from "papaparse";
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
  Chip,
  Avatar,
  CircularProgress,
  TablePagination,
  Autocomplete,
  Stack,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, HelpOutline as HelpOutlineIcon } from "@mui/icons-material";
import { SessionContext } from "../../SessionContext";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const Users = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role: sessionRole, universityID: sessionUniversity, userId } = useContext(SessionContext);

  const [users, setUsers] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState("");
  const [csvErrors, setCsvErrors] = useState([]);
  const csvInputRef = useRef(null);

  const [filters, setFilters] = useState({
    name: "",
    dni: "",
    email: "",
    role: "",
    university: "",
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const roleOptions = {
    "global-admin": ["student", "professor", "admin", "global-admin"],
    admin: ["student", "professor", "admin"],
    student: ["student", "professor"],
    professor: ["student", "professor"],
  };

  const getRoleColor = (role) => {
    const colors = {
      student: "primary",
      professor: "secondary",
      admin: "warning",
      "global-admin": "error",
    };
    return colors[role] || "default";
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: usersData } = await axios.get(`${GATEWAY_URL}/authVerify/accounts`);
      setUsers(usersData?.accounts ?? usersData ?? []);

      if (sessionRole === "global-admin") {
        const { data: uniData } = await axios.get(`${GATEWAY_URL}/academic/universities`);
        setUniversities(uniData?.universities ?? uniData ?? []);
      } else {
        const { data: uniData } = await axios.get(
          `${GATEWAY_URL}/academic/universities/${sessionUniversity}`
        );
        setUniversities([uniData.university]);
        setFilters((prev) => ({ ...prev, university: sessionUniversity }));
      }
    } catch (err) {
      console.error("Error fetching users/universities:", err);
      setUsers([]);
      setUniversities([]);
      setErrorKey("error.genericError");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";",
      delimitersToGuess: [",", "\t", ";", "|"],
      complete: async (results) => {
        try {
          const rows = results.data;
          if (!rows.length) {
            setErrorKey("error.emptyCSV");
            if (csvInputRef.current) csvInputRef.current.value = "";
            return;
          }

          setLoading(true);
          const { data } = await axios.post(`${GATEWAY_URL}/authVerify/users/import`, { rows });

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
          if (csvInputRef.current) csvInputRef.current.value = "";
        }
      },
    });
  };

  const handleUserClick = (userId) => navigate(`/users/${userId}`);
  const handleCreateUser = () => navigate("/users/new");

  const filteredUsers = useMemo(() => {
    const visibleUsers =
      sessionRole === "student" || sessionRole === "professor"
        ? users.filter((u) => ["student", "professor"].includes(u.role))
        : users;

    return visibleUsers.filter((u) => {
      const fullName = `${u.userId.name} ${u.userId.firstSurname} ${u.userId.secondSurname || ""}`.toLowerCase();
      if (filters.name && !fullName.includes(filters.name.toLowerCase())) return false;
      if (filters.dni && !(u.userId.identityNumber || "").toLowerCase().includes(filters.dni.toLowerCase())) return false;
      if (filters.email && !(u.email || "").toLowerCase().includes(filters.email.toLowerCase())) return false;
      if (filters.role && u.role !== filters.role) return false;
      if (filters.university && u.universityId !== filters.university) return false;
      return true;
    });
  }, [users, filters]);

  if (loading) {
    return (
      <Container data-testid="users-list-page" maxWidth="lg" sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container data-testid="users-list-page" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
          <Typography variant="h4">{t("usersNav")}</Typography>
          {sessionRole !== "student" && sessionRole !== "professor" && (
            <Box display="flex" gap={1} alignItems="center">
              <Button variant="outlined" component="label" color="primary">
                {t("users.import")}
                <input
                  data-testid="users-file-input"
                  key={Date.now()}
                  type="file"
                  accept=".csv"
                  hidden
                  ref={csvInputRef}
                  onChange={handleImportCSV}
                />
              </Button>

              <Tooltip
                title={t("users.csvHelp")}
                arrow
                placement="right"
              >
                <IconButton color="info" size="small">
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>

              <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateUser}>
                {t("user.new")}
              </Button>
            </Box>
          )}
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
            options={roleOptions[sessionRole]}
            value={filters.role || null}
            onChange={(e, v) => setFilters({ ...filters, role: v || "" })}
            getOptionLabel={(role) => t(`user.roles.${role}`)}
            renderInput={(params) => <TextField {...params} label={t("user.role")} />}
          />

          <Autocomplete
            options={universities}
            getOptionLabel={(u) => u.name || ""}
            value={universities.find((u) => u._id === filters.university) || null}
            onChange={(e, v) => setFilters({ ...filters, university: v?._id || "" })}
            renderInput={(params) => <TextField {...params} label={t("universities.uni")} />}
            disabled={sessionRole !== "global-admin"}
            ListboxProps={{ style: { maxHeight: 200 } }}
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
                role: "",
                university: sessionRole !== "global-admin" ? sessionUniversity : "",
              })
            }
          >
            {t("resetFilters")}
          </Button>
        </Box>

        {/* Users Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>{t("user.fullName")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("user.identityNumber")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("user.email")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("user.role")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("universities.uni")}</TableCell>
                {sessionRole !== "student" && sessionRole !== "professor" && <TableCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((user) => (
                <TableRow key={user._id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        src={user.userId.photoUrl}
                        alt={`${user.userId.name} ${user.userId.firstSurname}`}
                        sx={{ width: 40, height: 40, borderRadius: "50%" }}
                      >
                        {user.userId.name.charAt(0)}
                        {user.userId.firstSurname.charAt(0)}
                      </Avatar>
                      <Typography variant="body1" sx={{ fontWeight: "medium", color: "var(--primary-main)" }}>
                        {user.userId.name} {user.userId.firstSurname} {user.userId.secondSurname || ""}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{user.userId.identityNumber}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip label={t(`user.roles.${user.role}`)} color={getRoleColor(user.role)} size="small" />
                  </TableCell>
                  <TableCell>{user.university?.university?.name || "—"}</TableCell>
                  {sessionRole !== "student" && sessionRole !== "professor" && (
                    <TableCell>
                      <EditIcon
                        data-testid={`edit-button-${user._id}`}
                        fontSize="small"
                        color="primary"
                        sx={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserClick(user._id);
                        }}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
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

        <TablePagination
          data-testid="rows-per-page"
          component="div"
          count={filteredUsers.length}
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

export default Users;
