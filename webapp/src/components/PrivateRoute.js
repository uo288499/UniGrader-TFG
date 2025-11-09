import { useContext } from "react";
import { Navigate } from "react-router";
import PropTypes from "prop-types";
import { SessionContext } from "../SessionContext";

// Private route component to restrict access
const PrivateRoute = ({ element, roles = [], logged = false }) => {
  const { isLoggedIn, role, destroySession } = useContext(SessionContext); // Check if user has an active session;

  if (logged && isLoggedIn === true) {
    return <Navigate to="/" />; // Redirect to home if already logged in
  }
  if (!isLoggedIn) {
    if (logged === true) return element; // Allow access to login/forgot password/reset password if not logged in
    destroySession();
    return <Navigate to="/login" />; // Redirect to login if no session
  }
  if (roles.length > 0 && !roles.includes(role))
    return <Navigate to="/not-found" />; // Redirect to not found if role not authorized
  return element;
};

// PropTypes validation
PrivateRoute.propTypes = {
  element: PropTypes.node.isRequired,
};

export default PrivateRoute;