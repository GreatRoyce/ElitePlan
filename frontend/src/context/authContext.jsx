import React, { useState, useEffect, useCallback } from "react";
import api, { verifyUser } from "../utils/axios";
import AuthContext from "./authStore";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState("");

  const login = useCallback((userData, token) => {
    setUser(userData);
    setAuthNotice("");
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }, []);

  const logout = useCallback((notice) => {
    setUser(null);
    setAuthNotice(typeof notice === "string" ? notice : "");
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
      } catch (error) {
        const restricted = ["ACCOUNT_ARCHIVED", "ACCOUNT_SUSPENDED", "ACCOUNT_BANNED", "SESSION_REVOKED"].includes(error?.response?.data?.code);
        logout(restricted ? error.response.data.message : undefined);
      }
      setLoading(false);
    };
    checkUser();
  }, [logout]);

  // Listen for centralized auth logout signals
  useEffect(() => {
    if (typeof window === "undefined") return () => {};
    const handler = (event) => logout(event.detail?.message);
    const warningHandler = (event) => setUser((current) => current && current.id === event.detail?.userId ? { ...current, warning: event.detail.warning } : current);
    window.addEventListener("auth:logout", handler);
    window.addEventListener("auth:warning", warningHandler);
    return () => { window.removeEventListener("auth:logout", handler); window.removeEventListener("auth:warning", warningHandler); };
  }, [logout]);

  const acknowledgeWarning = useCallback(async (id) => {
    await api.post(`/auth/warnings/${encodeURIComponent(id)}/acknowledge`);
    setUser((current) => current?.warning?.id === id ? { ...current, warning: null } : current);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, authNotice, acknowledgeWarning }}>
      {children}
    </AuthContext.Provider>
  );
};
