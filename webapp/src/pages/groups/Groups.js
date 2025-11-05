import { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  Container,
  Paper,
  TextField,
  Autocomplete,
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
import { Add as AddIcon, Edit as EditIcon, Groups as GroupsIcon } from "@mui/icons-material";
import { SessionContext } from "../../SessionContext";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const Groups = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { universityID, role, accountID } = useContext(SessionContext);

  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    name: "",
    course: "",
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: groupsData } = await axios.get(
          `${GATEWAY_URL}/academic/groups/by-university/${universityID}`
        );
        let groupsFetched = groupsData?.groups ?? [];

        if (role === "professor") {
          groupsFetched = groupsFetched.filter((g) =>
            g.professors?.includes(accountID)
          );
        }

        setGroups(groupsFetched);

        const { data: coursesData } = await axios.get(
          `${GATEWAY_URL}/academic/courses/by-university/${universityID}`
        );
        setCourses(coursesData?.courses ?? []);
      } catch (err) {
        console.error("Error fetching groups/courses:", err);
        setGroups([]);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    if (universityID) fetchData();
  }, [universityID]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (filters.name && !g.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.course && g.courseId?._id !== filters.course) return false;
      return true;
    });
  }, [groups, filters]);

  const handleGroupClick = (id) => navigate(`/groups/${id}`);
  const handleCreateGroup = () => navigate("/groups/new");

  if (loading) {
    return (
      <Container data-testid="groups-list-page" maxWidth="lg" sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container data-testid="groups-list-page" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">{t("groupsNav")}</Typography>
          { role !== "professor" && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateGroup}>
              {t("group.new")}
            </Button>
          )}
        </Box>

        {/* Filters */}
        <Box mb={2} display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2}>
          <TextField
            label={t("group.name")}
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          />
          <Autocomplete
            options={courses}
            getOptionLabel={(c) => `${c.name} - ${c.academicYearId.yearLabel}`}
            value={courses.find(c => c._id === filters.course) || null}
            onChange={(_, v) => setFilters({ ...filters, course: v?._id || "" })}
            renderInput={(params) => <TextField {...params} label={t("group.course")} />}
            isOptionEqualToValue={(option, value) => option._id === value._id}
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() =>
              setFilters({
                name: "",
                course: "",
              })
            }
          >
            {t("resetFilters")}
          </Button>
        </Box>

        {/* Groups Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>{t("group.name")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("group.course")}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGroups
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((group) => (
                  <TableRow key={group._id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <GroupsIcon sx={{ width: 40, height: 40, color: "action.active" }} />
                        <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                          {group.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const course = courses.find(c => c._id === group.courseId?._id);
                        return course ? `${course.name} - ${course.academicYearId.yearLabel}` : "-";
                      })()}
                    </TableCell>
                    <TableCell>
                      <EditIcon
                        data-testid={`edit-button-${group._id}`}
                        fontSize="small"
                        color="primary"
                        sx={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGroupClick(group._id);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              {filteredGroups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
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
          count={filteredGroups.length}
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

export default Groups;
