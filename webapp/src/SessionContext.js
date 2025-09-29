import { createContext, useState, useEffect } from "react";
import axios from "axios";

// Create a React Context for managing session-related data
const SessionContext = createContext();

const SessionProvider = ({ children }) => {
  // State variables to manage session information
  const [sessionId, setSessionId] = useState("");
  const [userID, setUserID] = useState("");
  const [accountID, setAccountID] = useState(""); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState("");
  const [universityID, setUniversityID] = useState("");

  const INACTIVITY_LIMIT = 60 * 60 * 1000; 
  let activityTimer;

  // This effect runs once when the provider is mounted
  useEffect(() => {
    const storedSessionId = sessionStorage.getItem("sessionId");
    if (storedSessionId) {
      setSessionId(storedSessionId);
      setIsLoggedIn(true);

      const storedUserID = sessionStorage.getItem("userID");
      if (storedUserID) setUserID(storedUserID);

      const storedAccountID = sessionStorage.getItem("accountID"); 
      if (storedAccountID) setAccountID(storedAccountID);

      const storedRole = sessionStorage.getItem("role");
      if (storedRole) setRole(storedRole);

      const storedUniversityID = sessionStorage.getItem("universityID");
      if (storedUniversityID) setUniversityID(storedUniversityID);

      startInactivityTimer();
    }

    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetInactivityTimer));

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetInactivityTimer));
      clearTimeout(activityTimer);
    };
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) 
        {
          destroySession();
          alert("Your session has expired. Please log in again.");
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const startInactivityTimer = () => {
    clearTimeout(activityTimer);
    activityTimer = setTimeout(() => {
      destroySession();
      alert("Session expired due to inactivity.");
    }, INACTIVITY_LIMIT);
  };

  const resetInactivityTimer = () => {
    if (isLoggedIn) {
      startInactivityTimer();
    }
  };

  // Function to create a new session when a user logs in
  const createSession = (token, userID, accountID, role, universityID) => {
    setSessionId(token);
    setUserID(userID);
    setAccountID(accountID); 
    setIsLoggedIn(true);
    setRole(role);
    setUniversityID(universityID);

    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    sessionStorage.setItem("sessionId", token);
    sessionStorage.setItem("userID", userID);
    sessionStorage.setItem("accountID", accountID); 
    sessionStorage.setItem("role", role);
    if (universityID) sessionStorage.setItem("universityID", universityID);

    startInactivityTimer();
  };

  // Function to destroy the session when the user logs out
  const destroySession = () => {
    sessionStorage.removeItem("sessionId");
    sessionStorage.removeItem("userID");
    sessionStorage.removeItem("accountID"); 
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("universityID");

    setSessionId("");
    setUserID("");
    setAccountID(""); 
    setIsLoggedIn(false);
    setRole("");
    setUniversityID("");

    delete axios.defaults.headers.common["Authorization"];
    clearTimeout(activityTimer);
  };

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        userID,
        accountID, 
        isLoggedIn,
        role,
        universityID,
        createSession,
        destroySession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export { SessionContext, SessionProvider };
