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
import StudyProgramForm from './pages/studyPrograms/StudyProgramForm';
import StudyPrograms from './pages/studyPrograms/StudyPrograms';
import AcademicYears from './pages/academicYears/AcademicYears';
import AcademicYearForm from './pages/academicYears/AcademicYearForm';
import EvaluationTypes from './pages/evaluationTypes/EvaluationTypes';
import EvaluationTypeForm from './pages/evaluationTypes/EvaluationTypeForm';
import Subjects from './pages/subjects/Subjects';
import SubjectForm from './pages/subjects/SubjectForm';
import Courses from './pages/courses/Courses';
import CourseForm from './pages/courses/CourseForm';
import Enrollments from './pages/enrollments/Enrollments';
import EnrollmentForm from './pages/enrollments/EnrollmentForm';
import Groups from './pages/groups/Groups';
import GroupForm from './pages/groups/GroupForm';
import EvaluationItemsForm from './pages/evaluationItems/EvaluationItemsForm';
import GradesManagement from './pages/grades/GradesManagement';
import Grades from './pages/grades/Grades';
import Footer from "./components/Footer";
import Profile from "./pages/users/Profile";


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
        paddingBottom: 12,
        backgroundColor: 'background.default',
        color: 'text.primary',
      }}>
        <CssBaseline />
        <Routes>
          {/* Home Page */}
          <Route path="/" element={<PrivateRoute element={<Home themeMode={themeMode} />} />} />
          {/* Login Page */}
          <Route path="/login" element={<PrivateRoute element={<Login />} logged={true}/>} />
          {/* Forgot Password Page */}
          <Route path="/forgot-password" element={<PrivateRoute element={<ForgotPassword />} logged={true}/>} />
          {/* Reset Password Page */}
          <Route path="/reset-password/:token" element={<PrivateRoute element={<ResetPassword />} logged={true}/>} />
          {/* Universities Page */}
          <Route path="/universities" element={<PrivateRoute element={<Universities />} roles={["global-admin"]}/>} />
          <Route path="/universities/new" element={<PrivateRoute element={<UniversityForm /> } roles={["global-admin"]} />} />
          <Route path="/universities/:id" element={<PrivateRoute element={<UniversityForm/>} roles={["global-admin", "admin"]} />} />
          {/* Users Page */}
          <Route path="/users" element={<PrivateRoute element={<Users />} roles={["global-admin", "admin", "professor", "student"]} />} />
          <Route path="/users/new" element={<PrivateRoute element={<UserForm />} roles={["global-admin", "admin"]} />} />
          <Route path="/users/:id" element={<PrivateRoute element={<UserForm />} roles={["global-admin", "admin"]} />} />
          {/* Profile Page */}
          <Route path="/profile/:id" element={<PrivateRoute element={<Profile />} roles={["global-admin", "admin", "professor", "student"]} />} />
          {/* Study Programs Page */}
          <Route path="/study-programs" element={<PrivateRoute element={<StudyPrograms />} roles={["admin"]} />} />
          <Route path="/study-programs/new" element={<PrivateRoute element={<StudyProgramForm />} roles={["admin"]} />} />
          <Route path="/study-programs/:id" element={<PrivateRoute element={<StudyProgramForm />} roles={["admin"]} />} />
          {/* Academic Years Page */}
          <Route path="/academic-years" element={<PrivateRoute element={<AcademicYears />} roles={["admin"]} />} />
          <Route path="/academic-years/new" element={<PrivateRoute element={<AcademicYearForm />} roles={["admin"]} />} />
          <Route path="/academic-years/:id" element={<PrivateRoute element={<AcademicYearForm />} roles={["admin"]} />} />
          {/* Evaluation Types Page */}
          <Route path="/evaluation-types" element={<PrivateRoute element={<EvaluationTypes />} roles={["admin"]} />} />
          <Route path="/evaluation-types/new" element={<PrivateRoute element={<EvaluationTypeForm />} roles={["admin"]} />} />
          <Route path="/evaluation-types/:id" element={<PrivateRoute element={<EvaluationTypeForm />} roles={["admin"]} />} />
          {/* Subjects Page */}
          <Route path="/subjects" element={<PrivateRoute element={<Subjects />} roles={["admin"]} />} />
          <Route path="/subjects/new" element={<PrivateRoute element={<SubjectForm />} roles={["admin"]} />} />
          <Route path="/subjects/:id" element={<PrivateRoute element={<SubjectForm />} roles={["admin"]} />} />
          {/* Courses Page */}
          <Route path="/courses" element={<PrivateRoute element={<Courses />} roles={["admin"]} />} />
          <Route path="/courses/new" element={<PrivateRoute element={<CourseForm />} roles={["admin"]} />} />
          <Route path="/courses/:id" element={<PrivateRoute element={<CourseForm />} roles={["admin"]} />} />
          {/* Enrollments Page */}
          <Route path="/enrollments" element={<PrivateRoute element={<Enrollments />} roles={["admin"]} />} />
          <Route path="/enrollments/new" element={<PrivateRoute element={<EnrollmentForm />} roles={["admin"]} />} />
          <Route path="/enrollments/:id" element={<PrivateRoute element={<EnrollmentForm />} roles={["admin"]} />} />
          {/* Groups Page */}
          <Route path="/groups" element={<PrivateRoute element={<Groups />} roles={["admin", "professor"]} />} />
          <Route path="/groups/new" element={<PrivateRoute element={<GroupForm />} roles={["admin"]} />} />
          <Route path="/groups/:id" element={<PrivateRoute element={<GroupForm />} roles={["admin", "professor"]} />} />
          {/* Evaluation Items Page */}
          <Route path="/groups/:id/evaluation-items" element={<PrivateRoute element={<EvaluationItemsForm />} roles={["professor"]} />} />
          {/* Grades Page */}
          <Route path="/grades-management/:id" element={<PrivateRoute element={<GradesManagement />} roles={["professor"]} />} />
          <Route path="/grades/:id" element={<PrivateRoute element={<Grades />} roles={["student"]} />} />
          {/* Not Existing Path */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Box>
      <Footer themeMode={themeMode} />
    </>
  );
}

export default App;