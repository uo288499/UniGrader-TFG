import { useState, useContext } from "react"
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
} from "@mui/material"
import { Menu as MenuIcon, Logout, Palette, Close, Language as LanguageIcon } from "@mui/icons-material"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { SessionContext } from "../SessionContext"

const NavBar = ({ themeMode, setThemeMode, isLargeTextMode, setIsLargeTextMode }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [accessibilityAnchor, setAccessibilityAnchor] = useState(null)
  const [languageAnchor, setLanguageAnchor] = useState(null)
  const navigate = useNavigate();
  const { role, isLoggedIn, destroySession, universityID } = useContext(SessionContext)
  const { t, i18n } = useTranslation()

  const navigationItems = [
    { name: "university", href: "/universities", roles: ["global-admin"] },
    { name: "university", href: `/universities/${universityID}`, roles: ["admin"] },
    { name: "usersNav", href: "/users", roles: ["global-admin", "admin"] },
    { name: "studyProgramsNav", href: "/study-programs", roles: ["admin"] },
    { name: "academicYearNav", href: "/academic-years", roles: ["admin"] },
    { name: "enrollmentsNav", href: "/enrollments", roles: ["admin"] },
    { name: "evaluationTypes.title", href: "/evaluation-types", roles: ["admin"] },
    { name: "subjects", href: "/subjects", roles: ["admin"] },
    { name: "courses", href: "/courses", roles: ["admin", "professor"] },
    { name: "groupsNav", href: "/groups", roles: ["admin", "professor"] },
    { name: "grades", href: "/grades", roles: ["professor", "student"] },
    { name: "login.title", href: "/login", roles: [""] },
    { name: "forgotPassword.title", href: "/forgot-password", roles: [""] },
  ]

  const languageOptions = [
    {
      lang: 'en',
      label: 'EN',
      flagSrc: '/images/flags/Flag_of_the_United_Kingdom.svg',
      altText: 'Flag of United Kingdom'
    },
    {
      lang: 'es',
      label: 'ES',
      flagSrc: '/images/flags/Flag_of_Spain.svg',
      altText: 'Flag of Spain'
    }
  ];

  const filteredNavigationItems = navigationItems.filter((item) => {
    return item.roles.includes(role)
  })

  const currentLanguage = languageOptions.find(option => option.lang === i18n.resolvedLanguage);

  const handleLanguageClick = (event) => {
    setLanguageAnchor(event.currentTarget)
  }

  const handleLanguageClose = () => {
    setLanguageAnchor(null)
  }

  const handleChangeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    handleLanguageClose();
  }

  const handleLogout = () => {
    destroySession()
    navigate("/login")
  }

  const toggleDrawer = (open) => (event) => {
    if (event.type === "keydown" && (event.key === "Tab" || event.key === "Shift")) {
      return
    }
    setDrawerOpen(open)
  }

  const handleAccessibilityClick = (event) => {
    setAccessibilityAnchor(event.currentTarget)
  }

  const handleAccessibilityClose = () => {
    setAccessibilityAnchor(null)
  }

  return (
    <>
      <AppBar position="fixed" >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 0,
          }}
        >
          {/* Left side - Hamburger menu */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton color="inherit" aria-label={t("aria.openDrawer")} onClick={toggleDrawer(true)} edge="start">
              <MenuIcon />
            </IconButton>
          </Box>

          {/* Right side - Controls */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, ml: 'auto' }}>
            {/* Language selector */}
            <IconButton color="inherit" onClick={handleLanguageClick} aria-label={t("aria.selectLanguage")}>
              {themeMode === 'grayscale' ? (
                <LanguageIcon />
              ) : (
                <img src={currentLanguage.flagSrc} alt={currentLanguage.altText} style={{ width: '24px', height: 'auto' }} />
              )}
            </IconButton>
            <Menu anchorEl={languageAnchor} open={Boolean(languageAnchor)} onClose={handleLanguageClose}
              sx={{
                '& .MuiPaper-root': {
                  backgroundColor: 'background.paper',
                  color: 'text.primary',
                },
              }}
            >
              {languageOptions.map((option) => (
                <MenuItem key={option.lang} onClick={() => handleChangeLanguage(option.lang)}>
                  <img src={option.flagSrc} alt={option.altText} style={{ width: '24px', height: 'auto', marginRight: '8px' }} />
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
              sx={{
                '& .MuiPaper-root': {
                  backgroundColor: 'background.paper',
                  color: 'text.primary',
                },
              }}
            >
              <MenuItem>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={themeMode === 'grayscale'}
                      onChange={(e) => {
                        setThemeMode(e.target.checked ? 'grayscale' : 'normal');
                      }}
                    />
                  }
                  label={t('themes.grayscale')}
                />
              </MenuItem>
              <MenuItem>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isLargeTextMode}
                      onChange={() => setIsLargeTextMode(prev => !prev)}
                    />
                  }
                  label={t('themes.largeText')}
                />
              </MenuItem>
            </Menu>

            {/* Logout button */}
            {isLoggedIn && (
              <Button color="inherit" onClick={handleLogout} startIcon={<Logout />} sx={{ textTransform: "none" }}>
                {t('logout')}
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Lateral drawer menu */}
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}
        sx={{
            '& .MuiDrawer-paper': {
                backgroundColor: 'background.paper',
                color: 'text.primary',
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
            <Typography variant="h2" component="div">
              {t('navigation')}
            </Typography>
            <IconButton onClick={toggleDrawer(false)} size="small" color="inherit">
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
  )
}

export default NavBar;