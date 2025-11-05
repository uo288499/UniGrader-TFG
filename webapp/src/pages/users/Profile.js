import { useState, useEffect, useContext, useRef } from "react"
import { useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { SessionContext } from "../../SessionContext"
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  Box,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  InputAdornment,
} from "@mui/material"
import { PhotoCamera, Save, ArrowBack, Delete as DeleteIcon, Visibility, VisibilityOff, AccountBalance as UniIcon } from "@mui/icons-material"
import axios from "axios"

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000"

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Failed to read file'))
  })
}

const Profile = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { accountID , toggleUserImageUpdated} = useContext(SessionContext)

  const photoInputRef = useRef(null)

  const [initialPhotoUrl, setInitialPhotoUrl] = useState("");

  const [userData, setUserData] = useState({
    identityNumber: "",
    name: "",
    firstSurname: "",
    secondSurname: "",
    photoUrl: "",
  })

  const [accountData, setAccountData] = useState({
    email: "",
    role: "",
    universityName: "",
  })

  const [editableData, setEditableData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorKey, setErrorKey] = useState("")
  const [successKey, setSuccessKey] = useState("")
  const [errors, setErrors] = useState({})
  const [passwordErrors, setPasswordErrors] = useState([])
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [translatedError, setTranslatedError] = useState("")
  const [translatedSuccess, setTranslatedSuccess] = useState("")

  useEffect(() => {
    if (errorKey) {
      setTranslatedError(t(errorKey))
    }
    if (successKey) {
      setTranslatedSuccess(t(successKey))
    }
  }, [t, i18n.resolvedLanguage, errorKey, successKey])

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
    if (editableData.newPassword) {
      setPasswordErrors(validatePassword(editableData.newPassword))
    } else {
      setPasswordErrors([])
    }
  }, [editableData.newPassword])

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true)
        const { data } = await axios.get(`${GATEWAY_URL}/authVerify/accounts/${id}`)
        const account = data.account

        setUserData({
          identityNumber: account.userId.identityNumber,
          name: account.userId.name,
          firstSurname: account.userId.firstSurname,
          secondSurname: account.userId.secondSurname || "",
          photoUrl: account.userId.photoUrl || "",
        })

        setAccountData({
          email: account.email || "",
          role: account.role || "",
          universityName: account.university?.university.name || "N/A",
          universitySmallLogoUrl: account.university?.university.smallLogoUrl || "",
        })

        setPhotoPreview(account.userId.photoUrl || "")

        setInitialPhotoUrl(account.userId.photoUrl || "")
      } catch (err) {
        const key = "error." + (err.response?.data?.errorKey || "genericError")
        setErrorKey(key)
      } finally {
        setLoading(false)
      }
    }

    if (accountID !== id) {
      navigate("not-found");
      return;
    }

    fetchUserProfile()
  }, [id])

  const handlePhotoChange = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        photo: "users.errorMaxSize",
      }))
      return
    }

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"]
    if (!allowed.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        photo: "users.errorInvalidFormat",
      }))
      return
    }

    setErrors((prev) => ({ ...prev, photo: "" }))
    setPhotoFile(file)

    const reader = new FileReader()
    reader.onload = (e) => {
      setPhotoPreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview("")
    setUserData((prev) => ({ ...prev, photoUrl: "" }))

    if (photoInputRef.current) {
      photoInputRef.current.value = ""
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (editableData.newPassword) {
      if (!editableData.currentPassword) {
        newErrors.currentPassword = "profile.errorCurrentPasswordRequired"
      }

      const validationErrors = validatePassword(editableData.newPassword)
      if (validationErrors.length > 0) {
        newErrors.newPassword = "resetPassword.weakPassword"
      }

      if (editableData.newPassword !== editableData.confirmPassword) {
        newErrors.confirmPassword = "resetPassword.passwordMismatch"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorKey("")
    setSuccessKey("")

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      let photoUrlBase64 = null
      if (photoFile) {
        try {
          photoUrlBase64 = await fileToBase64(photoFile)
        } catch (e) {
          setErrorKey("error.imageConversion")
          setLoading(false)
          return
        }
      }

      const payload = {
        accountId: id, 
        user: {}, 
      }

      if (photoUrlBase64) {
        payload.photoUrlBase64 = photoUrlBase64
      } else if (photoFile === null && !photoPreview) {
        payload.photoUrl = ""
      }

      if (editableData.newPassword) {
        payload.password = editableData.newPassword
        payload.currentPassword = editableData.currentPassword
      }

      if (Object.keys(payload).length > 2) {
        const { data } = await axios.put(`${GATEWAY_URL}/authVerify/change-password`, payload)

        if (data.success) {
          setSuccessKey("profile.updated")

          setEditableData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          })

          // Refrescar datos de perfil
          const { data: refreshed } = await axios.get(`${GATEWAY_URL}/authVerify/accounts/${id}`)
          const account = refreshed.account
          setUserData({
            identityNumber: account.userId.identityNumber,
            name: account.userId.name,
            firstSurname: account.userId.firstSurname,
            secondSurname: account.userId.secondSurname || "",
            photoUrl: account.userId.photoUrl || "",
          })
          setPhotoPreview(account.userId.photoUrl || "")

          const updatedPhoto = account.userId.photoUrl || "";
          if (updatedPhoto !== initialPhotoUrl) {
            toggleUserImageUpdated(); 
            setInitialPhotoUrl(updatedPhoto);
          }    

          setPhotoFile(null)
        } else {
          setErrorKey("error.genericError")
        }
      }

      setTimeout(() => setSuccessKey(""), 3000)
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError")
      setErrorKey(key)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !userData.name) {
    return (
      <Container data-testid="profile-page" maxWidth="md" sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {t("common.loadingData")}
        </Typography>
      </Container>
    )
  }

  return (
    <Container data-testid="profile-page" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            {t("profile.title")}
          </Typography>
        </Box>

        {successKey && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {translatedSuccess}
          </Alert>
        )}
        {errorKey && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {translatedError}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Personal Information */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t("profile.personalInfo")}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t("users.identityNumber")}
                        value={userData.identityNumber}
                        InputProps={{ readOnly: true }}
                        variant="filled"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t("users.name")}
                        value={userData.name}
                        InputProps={{ readOnly: true }}
                        variant="filled"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t("users.firstSurname")}
                        value={userData.firstSurname}
                        InputProps={{ readOnly: true }}
                        variant="filled"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t("users.secondSurname")}
                        value={userData.secondSurname}
                        InputProps={{ readOnly: true }}
                        variant="filled"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Account Information */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t("profile.accountInfo")}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t("user.email")}
                        value={accountData.email}
                        InputProps={{ readOnly: true }}
                        variant="filled"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", alignItems: "center", height: "56px" }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          {t("user.role")}:
                        </Typography>
                        <Chip
                          label={t(`user.roles.${accountData.role}`)}
                          color={
                            accountData.role === "global-admin"
                              ? "error"
                              : accountData.role === "admin"
                                ? "warning"
                                : accountData.role === "professor"
                                  ? "secondary"
                                  : "primary"
                          }
                          size="small"
                        />
                      </Box>
                    </Grid>
                    {accountData.role !== "global-admin" && (
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          {t("universities.uni")}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            p: 1.2,
                            borderRadius: 1,
                            bgcolor: "action.hover",
                          }}
                        >
                          {accountData.universitySmallLogoUrl ? (
                            <Box
                              component="img"
                              src={accountData.universitySmallLogoUrl}
                              alt={accountData.universityName}
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <UniIcon sx={{ width: 40, height: 40, color: "action.active" }} />
                          )}

                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {accountData.universityName}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Editable Information */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t("profile.editableInfo")}
                  </Typography>

                  {/* Photo Section */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {t("users.profilePhoto")}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar src={photoPreview} sx={{ width: 80, height: 80 }}>
                        {userData.name.charAt(0)}
                        {userData.firstSurname.charAt(0)}
                      </Avatar>
                      <Box>
                        <Button variant="outlined" component="label" startIcon={<PhotoCamera />}>
                          {t("profile.changePhoto")}
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.svg"
                            hidden
                            ref={photoInputRef}
                            onChange={handlePhotoChange}
                          />
                        </Button>
                        {(photoPreview || photoFile) && (
                          <IconButton size="small" onClick={handleRemovePhoto} sx={{ ml: 1 }} color="error">
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: "block" }}>
                      {t("users.photoDescription")}
                    </Typography>
                    {errors.photo && (
                      <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
                        {t(errors.photo)}
                      </Typography>
                    )}
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  {/* Password Section */}
                  <Typography variant="subtitle1" gutterBottom>
                    {t("profile.changePassword")}
                  </Typography>

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

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type={showCurrentPassword ? "text" : "password"}
                        label={t("profile.currentPassword")}
                        value={editableData.currentPassword}
                        onChange={(e) =>
                          setEditableData((prev) => ({
                            ...prev,
                            currentPassword: e.target.value,
                          }))
                        }
                        error={!!errors.currentPassword}
                        helperText={errors.currentPassword && t(errors.currentPassword)}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end">
                                {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type={showNewPassword ? "text" : "password"}
                        label={t("profile.newPassword")}
                        value={editableData.newPassword}
                        onChange={(e) =>
                          setEditableData((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                        error={!!errors.newPassword}
                        helperText={errors.newPassword && t(errors.newPassword)}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end">
                                {showNewPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type={showConfirmPassword ? "text" : "password"}
                        label={t("profile.confirmPassword")}
                        value={editableData.confirmPassword}
                        onChange={(e) =>
                          setEditableData((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword && t(errors.confirmPassword)}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                <Button variant="outlined" onClick={() => navigate(-1)} disabled={loading}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                  disabled={loading}
                >
                  {loading ? t("users.saving") : t("profile.saveChanges")}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  )
}

export default Profile
