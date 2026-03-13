import React, { useState, useEffect, useCallback } from "react";
import api, { verifyUser } from "../utils/axios";
import AuthContext from "./authStore";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback((userData, token) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
  }, []);

  // On initial mount, check for a token and verify it with the backend
  useEffect(() => {
    const checkUser = async () => {
      try {
        const verifiedUser = await verifyUser();
        if (verifiedUser) {
          setUser(verifiedUser);
        }
      } catch {
        logout();
      }
      setLoading(false);
    };
    checkUser();
  }, [logout]);

  // Listen for centralized auth logout signals
  useEffect(() => {
    if (typeof window === "undefined") return () => {};
    const handler = () => logout();
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
