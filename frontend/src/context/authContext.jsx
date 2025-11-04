import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, { verifyUser } from "../utils/axios"; // Ensure you have access to your axios instance

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Keep track of initial auth check

  // On initial mount, check for a token and verify it with the backend
  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await verifyUser();
        if (user) {
          setUser(user);
        }
      } catch (error) {
        console.error("Session validation failed:", error);
        logout(); // Clear invalid session
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  // Login function
  const login = useCallback((userData, token) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }, []);

  // Logout function
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => useContext(AuthContext)