import { useState, useEffect } from "react"
import { Container, Paper, TextField, Button, Typography, Box, Alert } from "@mui/material"
import { useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import axios from "axios"

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000';

const ForgotPassword = () => {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [errorKey, setErrorKey] = useState("")
  const [successKey, setSuccessKey] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const [translatedError, setTranslatedError] = useState("")
  const [translatedMessage, setTranslatedMessage] = useState("")

  useEffect(() => {
    if (errorKey) {
      setTranslatedError(t(errorKey))
    } else if (error) {
      setTranslatedError(error)
    }

    if (successKey) {
      setTranslatedMessage(t(successKey))
    } else if (message) {
      setTranslatedMessage(message)
    }
  }, [t, i18n.resolvedLanguage, errorKey, successKey, error, message])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setTranslatedError("")
    setErrorKey("")
    setMessage("")
    setSuccessKey("")
    setTranslatedMessage("")

    if (!email.trim()) {
      setErrorKey("users.errorEmailRequired")
      setLoading(false)
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorKey("users.errorInvalidEmail")
      setLoading(false)
      return
    }

    try {
      await axios.post(`${GATEWAY_URL}/auth/forgot-password`, {
        email: email.trim(),
        language: i18n.resolvedLanguage,
      })

      setSuccessKey("forgotPassword.successMessage")
      setTimeout(() => setSuccessKey(""), 2000)
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError")
      setErrorKey(key)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container data-testid="forgot-password-page" component="main" maxWidth="sm">
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
            {t("forgotPassword.title")}
          </Typography>

          <Typography variant="h4" align="center" sx={{ mb: 3 }}>
            {t("forgotPassword.subtitle")}
          </Typography>

          {errorKey && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {translatedError}
            </Alert>
          )}

          {successKey && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {translatedMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label={t("forgotPassword.emailLabel")}
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
              {loading ? t("forgotPassword.sendingButton") : t("forgotPassword.sendButton")}
            </Button>
            <Box textAlign="center">
              <Button variant="text" onClick={() => navigate("/login")}>
                {t("forgotPassword.backToLogin")}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default ForgotPassword
