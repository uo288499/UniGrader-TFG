import { useState, useEffect, useRef, useContext } from "react"
import { useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { SessionContext } from "../../SessionContext"
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Grid,
  Card,
  CardContent,
  FormHelperText,
  IconButton,
  Autocomplete,
  Divider,
} from "@mui/material"
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
} from "@mui/icons-material"
import { useTheme } from "@mui/material"
import axios from "axios"

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000"

/**
 * Convierte un objeto File a una cadena Base64.
 * @param {File} file El objeto File a convertir.
 * @returns {Promise<string>} Promesa que resuelve con la cadena Base64.
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

const UserForm = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const [userEditID, setuserEditID] = useState("")
  const isEditing = Boolean(id)
  const { role: currentUserRole, userID: currentUserId } = useContext(SessionContext)

  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [errorKey, setErrorKey] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState("")
  const [successKey, setSuccessKey] = useState("")
  const [universities, setUniversities] = useState([])
  const [existingUsers, setExistingUsers] = useState([])
  const [selectedExistingUser, setSelectedExistingUser] = useState(null)

  const theme = useTheme()
  const terciary = theme.palette.error.main

  const photoInputRef = useRef(null)

  const [userData, setUserData] = useState({
    identityNumber: "",
    name: "",
    firstSurname: "",
    secondSurname: "",
    photoUrl: "", // URL de la imagen actual en la DB
  })

  const [accountData, setAccountData] = useState({
    email: "",
    universityId: "",
    role: "",
  })

  const [errors, setErrors] = useState({})
  const [photoFile, setPhotoFile] = useState(null) // Archivo de imagen seleccionado
  const [photoPreview, setPhotoPreview] = useState("") // Preview Base64 o URL de Cloudinary

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [uniRes, usersRes] = await Promise.all([
          axios.get(`${GATEWAY_URL}/academic/universities`),
          axios.get(`${GATEWAY_URL}/auth/users`),
        ])

        setUniversities(uniRes.data.universities || [])
        setExistingUsers(usersRes.data.users || [])

        if (isEditing) {
          const { data } = await axios.get(`${GATEWAY_URL}/auth/accounts/${id}`) 
          const u = data.account

          setuserEditID(u.userId._id)

          setUserData({
            identityNumber: u.userId.identityNumber,
            name: u.userId.name,
            firstSurname: u.userId.firstSurname,
            secondSurname: u.userId.secondSurname || "",
            photoUrl: u.userId.photoUrl || "", // Guarda la URL de la DB
          })

          setAccountData({
            email: u.email || "",
            universityId: u.universityId || "",
            role: u.role || "",
          })

          setPhotoPreview(u.userId.photoUrl || "")
        }
      } catch (err) {
        const key = "error." + (err.response?.data?.errorKey || "genericError")
        setErrorKey(key)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, isEditing])

  useEffect(() => {
    if (errorKey) {
      setSubmitError(t(errorKey))
    }

    if (successKey) {
      setSubmitSuccess(t(successKey))
    }
  }, [t, i18n.resolvedLanguage, errorKey, successKey])

  const validateForm = () => {
    const newErrors = {}

    if (!userData.identityNumber.trim()) {
      newErrors.identityNumber = t("users.errorIdentityRequired")
    }
    if (!userData.name.trim()) {
      newErrors.name = t("users.errorNameRequired")
    }
    if (!userData.firstSurname.trim()) {
      newErrors.firstSurname = t("users.errorFirstSurnameRequired")
    }

    if (!accountData.email.trim()) {
      newErrors.email = t("users.errorEmailRequired")
    } else if (!/\S+@\S+\.\S+/.test(accountData.email)) {
      newErrors.email = t("users.errorInvalidEmail")
    }

    if (!accountData.role) {
      newErrors.role = t("users.errorRoleRequired")
    }

    if (accountData.role && accountData.role !== "global-admin" && !accountData.universityId) {
      newErrors.universityId = t("users.errorUniversityRequired")
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleUserDataChange = (field, value) => {
    setUserData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleAccountDataChange = (field, value) => {
    setAccountData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }

    if (field === "role" && value === "global-admin") {
      setAccountData((prev) => ({ ...prev, universityId: "" }))
    }
  }

  const handleExistingUserSelect = (event, user) => {
    if (user) {
      setSelectedExistingUser(user)
      setUserData({
        identityNumber: user.identityNumber,
        name: user.name,
        firstSurname: user.firstSurname,
        secondSurname: user.secondSurname || "",
        photoUrl: user.photoUrl || "",
      })
      setPhotoPreview(user.photoUrl || "")
    } else {
      setSelectedExistingUser(null)
      setUserData({
        identityNumber: "",
        name: "",
        firstSurname: "",
        secondSurname: "",
        photoUrl: "",
      })
      setPhotoPreview("")
    }
  }

  const handlePhotoChange = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        photo: t("users.errorMaxSize"),
      }))
      return
    }

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"]
    if (!allowed.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        photo: t("users.errorInvalidFormat"),
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
    // IMPORTANTE: En edición, si el usuario borra la foto, enviamos una cadena vacía
    // para que el backend sepa que debe borrar la imagen de Cloudinary.
    setUserData((prev) => ({ ...prev, photoUrl: "" })) 

    if (photoInputRef.current) {
      photoInputRef.current.value = ""
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorKey("")
    setSuccessKey("")
    setSubmitError("")

    if (!validateForm()) {
      return
    }

    setLoading(true)

    // --- Lógica de Base64 para la imagen ---
    let photoUrlBase64 = null
    if (photoFile) {
      try {
        photoUrlBase64 = await fileToBase64(photoFile)
      } catch (e) {
        setSubmitError(t("error.imageConversion"))
        setLoading(false)
        return
      }
    }
    // ----------------------------------------

    try {
      if (!isEditing && selectedExistingUser) {
        // Lógica para crear solo la cuenta (mantener igual)
        const accountPayload = {
          email: accountData.email,
          role: accountData.role,
          universityId: accountData.universityId,
          userId: selectedExistingUser._id,
        }
        const { data } = await axios.post(`${GATEWAY_URL}/auth/accounts`, accountPayload)
        setSuccessKey("users.accountCreated")

        const newAccountId = data.account._id || data.account.id
        if (newAccountId) {
          window.history.pushState({}, "", `/users/${newAccountId}`)
          setTimeout(() => {
            navigate(`/users/${newAccountId}`, { replace: true })
          }, 0)
        }
      } else {
        // Lógica para crear/editar User y Account
        const payload = {
          ...userData,
          email: accountData.email,
          role: accountData.role,
          universityId: accountData.universityId,
          // Añadir Base64 si existe, si no, se deja fuera o se manda la photoUrl de la DB.
          ...(photoUrlBase64 && { photoUrlBase64 }), 
          // Si el usuario borró la foto (photoUrl="") o no se subió una nueva Base64,
          // el campo photoUrl del userData se envía, incluyendo la cadena vacía
          // que indica al backend que debe eliminar la foto en PUT.
        }

        if (isEditing) {
          await axios.put(`${GATEWAY_URL}/auth/users/${id}`, payload)
          setSuccessKey("users.updated")
        } else {
          const { data } = await axios.post(`${GATEWAY_URL}/auth/users`, payload)
          setSuccessKey("users.created")

          const newId = data.account._id || data.account.id
          if (newId) {
            window.history.pushState({}, "", `/users/${newId}`)
            setTimeout(() => {
              navigate(`/users/${newId}`, { replace: true })
            }, 0)
          }
        }
      }

      setTimeout(() => setSuccessKey(""), 2000)
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError")
      setErrorKey(key)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!window.confirm(t("users.confirmDeleteUser"))) return

    setDeleting(true)
    try {
      await axios.delete(`${GATEWAY_URL}/auth/users/${id}`)
      setSuccessKey("users.deleted")
      setTimeout(() => navigate("/users"), 1500)
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError")
      setErrorKey(key)
      setDeleting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm(t("users.confirmDeleteAccount"))) return

    setDeletingAccount(true)
    try {
      await axios.delete(`${GATEWAY_URL}/auth/accounts/${id}`) 
      setSuccessKey("users.accountDeleted")
      setTimeout(() => navigate("/users"), 1500)
    } catch (err) {
      const key = "error." + (err.response?.data?.errorKey || "genericError")
      setErrorKey(key)
      setDeletingAccount(false)
    }
  }

  const canDeleteUser = currentUserRole === "global-admin" && userEditID !== currentUserId
  const canDeleteAccount = userEditID !== currentUserId

  if (loading && isEditing && !submitSuccess) {
    return (
      <Container data-testid="user-form-page" maxWidth="md" sx={{ mt: 4, mb: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {t("common.loadingData")}
        </Typography>
      </Container>
    )
  }

  return (
    <Container data-testid="user-form-page" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate("/users")} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditing ? t("users.edit") : t("users.create")}
        </Typography>
      </Box>

      {successKey && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {submitSuccess}
        </Alert>
      )}
      {errorKey && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {!isEditing && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      {t("users.selectExistingUser")}
                    </Typography>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      {t("users.selectExistingUserDescription")}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Autocomplete
                      options={existingUsers}
                      getOptionLabel={(option) =>
                        `${option.identityNumber} - ${option.name} ${option.firstSurname} ${option.secondSurname || ""}`
                      }
                      value={selectedExistingUser}
                      onChange={handleExistingUserSelect}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t("users.searchExistingUser")}
                          placeholder={t("users.searchPlaceholder")}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          {option.photoUrl ? (
                            <Box
                              component="img" 
                              src={option.photoUrl}
                              alt={option.name}
                              sx={{ 
                                width: 24, 
                                height: 24, 
                                borderRadius: '50%',
                                mr: 2
                              }}
                            />
                          ) : (
                            <PersonIcon 
                              sx={{ 
                                width: 24, 
                                height: 24, 
                              }}
                            />
                          )}
                          <Box>
                            <Typography variant="body1">
                              {option.name} {option.firstSurname} {option.secondSurname || ""}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.identityNumber}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {t("users.personalInfo")}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t("users.identityNumber")}
                  value={userData.identityNumber}
                  onChange={(e) => handleUserDataChange("identityNumber", e.target.value)}
                  error={!!errors.identityNumber}
                  helperText={errors.identityNumber && <span>{errors.identityNumber}</span>}
                  required
                  disabled={!!selectedExistingUser}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t("users.name")}
                  value={userData.name}
                  onChange={(e) => handleUserDataChange("name", e.target.value)}
                  error={!!errors.name}
                  helperText={errors.name && <span>{errors.name}</span>}
                  required
                  disabled={!!selectedExistingUser}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t("users.firstSurname")}
                  value={userData.firstSurname}
                  onChange={(e) => handleUserDataChange("firstSurname", e.target.value)}
                  error={!!errors.firstSurname}
                  helperText={errors.firstSurname && <span>{errors.firstSurname}</span>}
                  required
                  disabled={!!selectedExistingUser}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t("users.secondSurname")}
                  value={userData.secondSurname}
                  onChange={(e) => handleUserDataChange("secondSurname", e.target.value)}
                  disabled={!!selectedExistingUser}
                />
              </Grid>

              <Grid item xs={12}>
                <Box>
                  <InputLabel sx={{ mb: 1 }}>{t("users.profilePhoto")}</InputLabel>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    {t("users.photoDescription")}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar src={photoPreview} sx={{ width: 80, height: 80 }}>
                      {userData.name.charAt(0)}
                      {userData.firstSurname.charAt(0)}
                    </Avatar>
                    <Box>
                      <Button variant="outlined" component="label" disabled={!!selectedExistingUser}>
                        {t("users.uploadPhoto")}
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.svg"
                          hidden
                          ref={photoInputRef}
                          onChange={handlePhotoChange}
                        />
                      </Button>
                      {(photoPreview || photoFile) && ( // Muestra el botón de eliminar si hay preview (URL o Base64) o un archivo cargado
                        <IconButton
                          size="small"
                          onClick={handleRemovePhoto}
                          sx={{ ml: 1, color: terciary }}
                          disabled={!!selectedExistingUser}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                      {errors.photo && (
                        <FormHelperText sx={{ color: terciary }}>
                          <span>{errors.photo}</span>
                        </FormHelperText>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {t("users.accessAccount")}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t("user.email")}
                  type="email"
                  value={accountData.email}
                  onChange={(e) => handleAccountDataChange("email", e.target.value)}
                  error={!!errors.email}
                  helperText={errors.email && <span>{errors.email}</span>}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!errors.role} required>
                  <InputLabel>{t("user.role")}</InputLabel>
                  <Select
                    value={accountData.role}
                    label={t("user.role")}
                    onChange={(e) => handleAccountDataChange("role", e.target.value)}
                  >
                    <MenuItem value="student">{t("user.roles.student")}</MenuItem>
                    <MenuItem value="professor">{t("user.roles.professor")}</MenuItem>
                    <MenuItem value="admin">{t("user.roles.admin")}</MenuItem>
                    <MenuItem value="global-admin">{t("user.roles.global-admin")}</MenuItem>
                  </Select>
                  {errors.role && (
                    <FormHelperText>
                      <span>{errors.role}</span>
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {accountData.role !== "global-admin" && (
                <Grid item xs={12}>
                  <FormControl fullWidth error={!!errors.universityId} required>
                    <InputLabel>{t("universities.uni")}</InputLabel>
                    <Select
                      value={accountData.universityId}
                      label={t("universities.uni")}
                      onChange={(e) => handleAccountDataChange("universityId", e.target.value)}
                    >
                      {universities.map((university) => (
                        <MenuItem key={university._id} value={university._id}>
                          {university.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.universityId && (
                      <FormHelperText>
                        <span>{errors.universityId}</span>
                      </FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/users")}
                    disabled={loading || deleting || deletingAccount}
                  >
                    {t("common.cancel")}
                  </Button>

                  {isEditing && canDeleteAccount && (
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={handleDeleteAccount}
                      disabled={loading || deleting || deletingAccount}
                    >
                      {deletingAccount ? t("users.deleting") : t("users.deleteAccount")}
                    </Button>
                  )}

                  {isEditing && canDeleteUser && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleDeleteUser}
                      disabled={loading || deleting || deletingAccount}
                    >
                      {deleting ? t("users.deleting") : t("users.deleteUser")}
                    </Button>
                  )}

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || deleting || deletingAccount}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                  >
                    {loading ? t("users.saving") : isEditing ? t("update") : t("create")}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Container>
  )
}

export default UserForm