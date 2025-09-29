import NavBar from './components/NavBar';
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import { Routes, Route } from "react-router";
import Home from './pages/Home';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';
import NotFound from './pages/NotFound';
import ForgotPassword from './pages/ForgotPassword';
import Universities from './pages/universities/Universities';
import UniversityForm from './pages/universities/UniversityForm';
import Users from './pages/users/Users';
import UserForm from './pages/users/UserForm';
import ResetPassword from './pages/ResetPassword';


import './i18n/i18n';

function App({ themeMode, setThemeMode, isLargeTextMode, setIsLargeTextMode }) {
  
  return (
    <>
      <NavBar
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        isLargeTextMode={isLargeTextMode}
        setIsLargeTextMode={setIsLargeTextMode}
      />
      <Box sx={{
        marginTop: 10,
        backgroundColor: 'background.default',
        color: 'text.primary',
      }}>
        <CssBaseline />
        <Routes>
          {/* Home Page */}
          <Route path="/" element={<PrivateRoute element={<Home />} />} />
          {/* Login Page */}
          <Route path="/login" element={<Login />} />
          {/* Forgot Password Page */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* Reset Password Page */}
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          {/* Universities Page */}
          <Route path="/universities" element={<PrivateRoute element={<Universities />} roles={["global-admin"]}/>} />
          <Route path="/universities/new" element={<PrivateRoute element={<UniversityForm /> } roles={["global-admin"]} />} />
          <Route path="/universities/:id" element={<PrivateRoute element={<UniversityForm/>} roles={["global-admin", "admin"]} />} />
          {/* Users Page */}
          <Route path="/users" element={<PrivateRoute element={<Users />} roles={["global-admin", "admin"]} />} />
          <Route path="/users/new" element={<PrivateRoute element={<UserForm />} roles={["global-admin", "admin"]} />} />
          <Route path="/users/:id" element={<PrivateRoute element={<UserForm />} roles={["global-admin", "admin"]} />} />
          {/* Not Existing Path */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Box>
    </>
  );
}

export default App;