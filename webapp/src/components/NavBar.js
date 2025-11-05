import { useState, useContext, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  MenuItem,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  Typography,
  Checkbox,
  FormControlLabel,
  Chip,
  Avatar,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Logout,
  Palette,
  Close,
  Language as LanguageIcon,
  Home as HomeIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { SessionContext } from "../SessionContext";
import axios from "axios";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const NavBar = ({ themeMode, setThemeMode, isLargeTextMode, setIsLargeTextMode }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accessibilityAnchor, setAccessibilityAnchor] = useState(null);
  const [languageAnchor, setLanguageAnchor] = useState(null);
  const [userData, setUserData] = useState(null);

  const navigate = useNavigate();
  const { role, isLoggedIn, destroySession, universityID, accountID, userImageUpdated } = useContext(SessionContext);
  const { t, i18n } = useTranslation();

  // Fetch user data for avatar
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (isLoggedIn && accountID) {
          const { data } = await axios.get(`${GATEWAY_URL}/authVerify/accounts/${accountID}`);
          setUserData(data.account.userId);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };
    fetchUserData();
  }, [accountID, isLoggedIn, userImageUpdated]);

  // Role color logic
  const getRoleColor = (r) => {
    const colors = {
      student: "primary",
      professor: "secondary",
      admin: "warning",
      "global-admin": "error",
    };
    return colors[r] || "default";
  };

  // Navigation items 
  const navigationItems = [
    { name: "usersNav", href: "/users", roles: ["global-admin", "admin", "professor", "student"] },
    { name: "university", href: "/universities", roles: ["global-admin"] },
    { name: "university", href: `/universities/${universityID}`, roles: ["admin"] },
    { name: "studyProgramsNav", href: "/study-programs", roles: ["admin"] },
    { name: "academicYearNav", href: "/academic-years", roles: ["admin"] },
    { name: "enrollmentsNav", href: "/enrollments", roles: ["admin"] },
    { name: "evaluationTypes.title", href: "/evaluation-types", roles: ["admin"] },
    { name: "subjects", href: "/subjects", roles: ["admin"] },
    { name: "courses", href: "/courses", roles: ["admin"] },
    { name: "groupsNav", href: "/groups", roles: ["admin", "professor"] },
    { name: "gradesNav", href: `/grades/${accountID}`, roles: ["student"] },
    { name: "gradesNav", href: `/grades-management/${universityID}`, roles: ["professor"] },
    { name: "login.title", href: "/login", roles: [""] },
    { name: "forgotPassword.title", href: "/forgot-password", roles: [""] },
  ];

  const filteredNavigationItems = navigationItems.filter((item) => item.roles.includes(role));

  const languageOptions = [
    { lang: "en", label: "EN", flagSrc: "/images/flags/Flag_of_the_United_Kingdom.svg", altText: "Flag of UK" },
    { lang: "es", label: "ES", flagSrc: "/images/flags/Flag_of_Spain.svg", altText: "Flag of Spain" },
  ];

  const currentLanguage = languageOptions.find((opt) => opt.lang === i18n.resolvedLanguage);

  const handleLanguageClick = (e) => setLanguageAnchor(e.currentTarget);
  const handleLanguageClose = () => setLanguageAnchor(null);
  const handleChangeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    handleLanguageClose();
  };

  const handleLogout = () => {
    destroySession();
    navigate("/login");
  };

  const toggleDrawer = (open) => (event) => {
    if (event.type === "keydown" && (event.key === "Tab" || event.key === "Shift")) return;
    setDrawerOpen(open);
  };

  const handleAccessibilityClick = (event) => setAccessibilityAnchor(event.currentTarget);
  const handleAccessibilityClose = () => setAccessibilityAnchor(null);

  return (
    <>
      <AppBar data-testid="navbar" position="fixed">
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0 }}>
          {/* Left side - Drawer + Home + Role */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton color="inherit" aria-label={t("aria.openDrawer")} onClick={toggleDrawer(true)} edge="start">
              <MenuIcon />
            </IconButton>

            {/* Home icon */}
            <IconButton color="inherit" aria-label="home" onClick={() => navigate("/")}>
              <HomeIcon />
            </IconButton>

            {/* Role Chip */}
            {isLoggedIn && role && (
              <Chip
                label={t(`user.roles.${role}`)}
                color={getRoleColor(role)}
                size="small"
                sx={{ fontWeight: "bold" }}
              />
            )}
          </Box>

          {/* Right side - Controls */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Language selector */}
            <IconButton color="inherit" onClick={handleLanguageClick} aria-label={t("aria.selectLanguage")}>
              {themeMode === "grayscale" ? (
                <LanguageIcon />
              ) : (
                <img
                  src={currentLanguage.flagSrc}
                  alt={currentLanguage.altText}
                  style={{ width: "24px", height: "auto" }}
                />
              )}
            </IconButton>
            <Menu anchorEl={languageAnchor} open={Boolean(languageAnchor)} onClose={handleLanguageClose}>
              {languageOptions.map((option) => (
                <MenuItem key={option.lang} onClick={() => handleChangeLanguage(option.lang)}>
                  <img
                    src={option.flagSrc}
                    alt={option.altText}
                    style={{ width: "24px", height: "auto", marginRight: "8px" }}
                  />
                  {option.label}
                </MenuItem>
              ))}
            </Menu>

            {/* Accessibility options */}
            <IconButton color="inherit" onClick={handleAccessibilityClick} aria-label={t("aria.accessibilityOptions")}>
              <Palette />
            </IconButton>
            <Menu
              anchorEl={accessibilityAnchor}
              open={Boolean(accessibilityAnchor)}
              onClose={handleAccessibilityClose}
              onClick={(e) => e.stopPropagation()}
            >
              <MenuItem>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={themeMode === "grayscale"}
                      onChange={(e) => setThemeMode(e.target.checked ? "grayscale" : "normal")}
                    />
                  }
                  label={t("themes.grayscale")}
                />
              </MenuItem>
              <MenuItem>
                <FormControlLabel
                  control={<Checkbox checked={isLargeTextMode} onChange={() => setIsLargeTextMode((p) => !p)} />}
                  label={t("themes.largeText")}
                />
              </MenuItem>
            </Menu>

            {/* User avatar */}
            {isLoggedIn && (
              <IconButton aria-label={t("aria.profile")} onClick={() => navigate(`/profile/${accountID}`)}>
                <Avatar
                  src={userData?.photoUrl}
                  alt={userData?.name}
                  sx={{ width: 36, height: 36, bgcolor: "primary.main" }}
                >
                  {!userData?.photoUrl &&
                    `${userData?.name?.[0] ?? ""}${userData?.firstSurname?.[0] ?? ""}`}
                </Avatar>
              </IconButton>
            )}

            {/* Logout button */}
            {isLoggedIn && (
              <Button color="inherit" onClick={handleLogout} startIcon={<Logout />} sx={{ textTransform: "none" }}>
                {t("logout")}
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        sx={{
          "& .MuiDrawer-paper": {
            backgroundColor: "background.paper",
            color: "text.primary",
          },
        }}
      >
        <Box minWidth={300} role="presentation">
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h2">{t("navigation")}</Typography>
              {isLoggedIn && role && (
                <Chip
                  label={t(`user.roles.${role}`)}
                  color={getRoleColor(role)}
                  size="small"
                  sx={{ fontWeight: "bold" }}
                />
              )}
            </Box>
            <IconButton onClick={toggleDrawer(false)} aria-label={t("aria.closeDrawer")} size="small" color="inherit">
              <Close />
            </IconButton>
          </Box>

          <List onClick={toggleDrawer(false)} onKeyDown={toggleDrawer(false)}>
            {filteredNavigationItems.map((item) => (
              <ListItem key={item.name} disablePadding>
                <ListItemButton onClick={() => navigate(item.href)}>
                  <ListItemText primary={t(item.name)} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default NavBar;
