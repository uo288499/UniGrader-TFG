import { Container, Typography, Button, Box } from "@mui/material"
import { Home as HomeIcon, ArrowBack as ArrowBackIcon } from "@mui/icons-material"
import { useNavigate } from "react-router"
import { useTranslation } from "react-i18next"

const NotFound = () => {
  const navigate = useNavigate();
  const { t } = useTranslation()

  const handleGoHome = () => {
    navigate("/")
  }

  return (
    <Container
      maxWidth="md"
      sx={{
        pt: 8,
        pb: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
      data-testid="not-found-page"
    >
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontSize: { xs: "4rem", md: "6rem" },
            fontWeight: "bold",
            color: "var(--state-error)",
            mb: 2,
            textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          404
        </Typography>

        <Typography
          variant="h4"
          component="h2"
          sx={{
            color: "var(--state-error)",
            mb: 2,
            fontWeight: "medium",
          }}
        >
          {t("notFound.title")}
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: "var(--text-color)",
            mb: 4,
            maxWidth: "500px",
            mx: "auto",
          }}
        >
          {t("notFound.message")}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<HomeIcon />}
          onClick={handleGoHome}
          sx={{
            px: 3,
            py: 1.5,
            textTransform: "none",
            borderRadius: 2,
          }}
        >
          {t("notFound.goHome")}
        </Button>
      </Box>
    </Container>
  )
}

export default NotFound;