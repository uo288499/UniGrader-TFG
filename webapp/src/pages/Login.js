import { useState, useContext, useEffect } from "react"
import { Container, Paper, TextField, Button, Typography, Box, Alert, IconButton, InputAdornment } from "@mui/material"
import { Visibility, VisibilityOff } from "@mui/icons-material"
import { useNavigate } from "react-router"
import { SessionContext } from "../SessionContext"
import { useTranslation } from "react-i18next"
import axios from 'axios';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000';

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { createSession } = useContext(SessionContext)
  const { t, i18n } = useTranslation()

  const [translatedError, setTranslatedError] = useState("");

  useEffect(() => {
    if (error) {
      setTranslatedError(t(error));
    }
  }, [i18n.resolvedLanguage, error, t]);

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const {
        data: { token, userId, universityId, role, accountId },
      } = await axios.post(`${GATEWAY_URL}/auth/login`, { email, password });

      createSession(token, userId, accountId, role, universityId);
      navigate("/")
    } catch (err) {
      setError("error." + (err.response?.data?.errorKey || "genericError"))
    } finally {
      setLoading(false)
    }
  }

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword)
  }

  return (
    <Container data-testid="login-page" component="main" maxWidth="sm">
      <Box
        sx={{
          pt: 8,
          pb: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: "100%", backgroundColor: 'background.paper' }}>
          <Typography component="h1" variant="h1" align="center" gutterBottom>
            {t("login.title")}
          </Typography>

          {translatedError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {translatedError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label={t("login.emailLabel")}
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label={t("login.passwordLabel")}
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label={t("aria.togglePassword")} onClick={handleClickShowPassword} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
              {loading ? t("login.signingInButton") : t("login.signInButton")}
            </Button>
            <Box textAlign="center">
              <Button variant="text" onClick={() => navigate("/forgot-password")}>
                {t("login.forgotPassword")}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default Login
