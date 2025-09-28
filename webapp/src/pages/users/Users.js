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
  Chip,
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

const Users = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role: sessionRole, universityID: sessionUniversity } = useContext(SessionContext);

  const [users, setUsers] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: usersData } = await axios.get(`${GATEWAY_URL}/auth/accounts`);
        setUsers(usersData?.accounts ?? usersData ?? []);

        if (sessionRole === "global-admin") {
          const { data: uniData } = await axios.get(`${GATEWAY_URL}/academic/universities`);
          setUniversities(uniData?.universities ?? uniData ?? []);
        } else {
          const { data: uniData } = await axios.get(
            `${GATEWAY_URL}/academic/universities/${sessionUniversity}`
          );
          setUniversities([uniData]);
          setFilters((prev) => ({ ...prev, university: sessionUniversity }));
        }
      } catch (err) {
        console.error("Error fetching users/universities:", err);
        setUsers([]);
        setUniversities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionRole, sessionUniversity]);

  // Use useMemo to compute filtered users to avoid setState in useEffect
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const fullName = `${u.userId.name} ${u.userId.firstSurname} ${u.userId.secondSurname || ""}`.toLowerCase();
      if (filters.name && !fullName.includes(filters.name.toLowerCase())) return false;
      if (filters.dni && !(u.userId.identityNumber || "").toLowerCase().includes(filters.dni.toLowerCase())) return false;
      if (filters.email && !(u.email || "").toLowerCase().includes(filters.email.toLowerCase())) return false;
      if (filters.role && u.role !== filters.role) return false;
      if (filters.university && u.universityId !== filters.university) return false;
      return true;
    });
  }, [users, filters]);

  const handleUserClick = (userId) => navigate(`/users/${userId}`);
  const handleCreateUser = () => navigate("/users/new");

  if (loading) {
    return (
      <Container data-testid="users-list-page" maxWidth="lg" sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container data-testid="users-list-page" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">{t("usersNav")}</Typography>
          {sessionRole !== "student" && sessionRole !== "professor" && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateUser}>
              {t("user.new")}
            </Button>
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
          <FormControl>
            <InputLabel>{t("user.role")}</InputLabel>
            <Select
              value={filters.role}
              label={t("user.role")}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            >
              <MenuItem value="">{t("common.all")}</MenuItem>
              {roleOptions[sessionRole].map((role) => (
                <MenuItem key={role} value={role}>
                  {t(`user.roles.${role}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl>
            <InputLabel>{t("universities.uni")}</InputLabel>
            <Select
              value={filters.university}
              label={t("universities.uni")}
              onChange={(e) => setFilters({ ...filters, university: e.target.value })}
              disabled={sessionRole !== "global-admin"}
            >
              {sessionRole === "global-admin" && <MenuItem value="">{t("common.all")}</MenuItem>}
              {universities.map((university) => (
                <MenuItem key={university._id} value={university._id}>
                  {university.name}
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
                role: "",
                university: sessionRole !== "global-admin" ? sessionUniversity : "",
              })
            }
            sx={{ whiteSpace: "nowrap" }}
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
                <TableCell />
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
                  <TableCell>{user.university?.university.name || "—"}</TableCell>
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

        {/* Pagination */}
        <TablePagination
          component="div"
          count={filteredUsers.length}
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

export default Users;
