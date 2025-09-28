import { useState, useEffect } from "react"
import { Container, Paper, TextField, Button, Typography, Box, Alert, IconButton, InputAdornment } from "@mui/material"
import { Visibility, VisibilityOff } from "@mui/icons-material"
import { useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import axios from "axios"

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000"

const ResetPassword = () => {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState([])
  const [errorKey, setErrorKey] = useState("")
  const [successKey, setSuccessKey] = useState("")
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { token } = useParams()

  const [translatedError, setTranslatedError] = useState("")
  const [translatedMessage, setTranslatedMessage] = useState("")

  useEffect(() => {
    if (error) {
      setTranslatedError(t(error))
    }
    if (errorKey) {
      setTranslatedError(t(errorKey))
    }
    if (message) {
      setTranslatedMessage(t(message))
    }
    if (successKey) {
      setTranslatedMessage(t(successKey))
    }
  }, [i18n.resolvedLanguage, error, errorKey, message, successKey, t])

  const validatePassword = (pwd) => {
    const errors = []
    if (pwd.length < 8) errors.push("resetPassword.validation.minLength")
    if (!/[a-z]/.test(pwd)) errors.push("resetPassword.validation.minLowercase")
    if (!/[A-Z]/.test(pwd)) errors.push("resetPassword.validation.minUppercase")
    if (!/[0-9]/.test(pwd)) errors.push("resetPassword.validation.minNumbers")
    if (!/[^a-zA-Z0-9]/.test(pwd)) errors.push("resetPassword.validation.minSymbols")
    return errors
  }

  useEffect(() => {
    if (password) {
      setPasswordErrors(validatePassword(password))
    } else {
      setPasswordErrors([])
    }
  }, [password])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")
    setErrorKey("")
    setSuccessKey("")

    const validationErrors = validatePassword(password)
    if (validationErrors.length > 0) {
      setError("resetPassword.weakPassword")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("resetPassword.passwordMismatch")
      setLoading(false)
      return
    }

    try {
      await axios.post(`${GATEWAY_URL}/auth/reset-password/${token}`, {
        password,
      })

      setSuccessKey("resetPassword.successMessage")
      setTimeout(() => {
        navigate("/login")
      }, 2000)
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError")
      setErrorKey(key)
    } finally {
      setLoading(false)
    }
  }

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword)
  }

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  return (
    <Container data-testid="reset-password-page" component="main" maxWidth="sm">
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
        <Paper elevation={3} sx={{ padding: 4, width: "100%", backgroundColor: "background.paper" }}>
          <Typography component="h1" variant="h1" align="center" gutterBottom>
            {t("resetPassword.title")}
          </Typography>

          <Typography variant="h4" align="center" sx={{ mb: 3 }}>
            {t("resetPassword.subtitle")}
          </Typography>

          {translatedError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {translatedError}
            </Alert>
          )}

          {translatedMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {translatedMessage}
            </Alert>
          )}

          {passwordErrors.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t("resetPassword.passwordRequirements")}:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {passwordErrors.map((error, index) => (
                  <li key={index}>
                    <Typography variant="body2">{t(error)}</Typography>
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label={t("resetPassword.newPasswordLabel")}
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passwordErrors.length > 0}
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

            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label={t("resetPassword.confirmPasswordLabel")}
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword && password !== confirmPassword}
              helperText={confirmPassword && password !== confirmPassword ? t("resetPassword.passwordMismatch") : ""}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={t("aria.toggleConfirmPassword")}
                      onClick={handleClickShowConfirmPassword}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || passwordErrors.length > 0 || !password || !confirmPassword}
            >
              {loading ? t("resetPassword.updatingButton") : t("resetPassword.updateButton")}
            </Button>

            <Box textAlign="center">
              <Button variant="text" onClick={() => navigate("/login")}>
                {t("resetPassword.backToLogin")}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default ResetPassword
