import { useEffect, useState } from "react";
import api from "../utils/axios";

/**
 * Custom hook to manage authentication state
 * Automatically loads the logged-in user from backend (/auth/me)
 * if a token exists in localStorage.
 */
export default function useAuth() {
  const [user, setUser] = useState(() => {
    // Preload from localStorage for faster UI load
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await api.get("/auth/me");
        const fetchedUser = response.data?.user;

        if (fetchedUser) {
          setUser(fetchedUser);
          localStorage.setItem("user", JSON.stringify(fetchedUser));
        } else {
          throw new Error("Invalid user data from server");
        }
      } catch (error) {
        console.error("❌ Auth check failed:", error.response?.data || error.message);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return { user, loading, setUser, logout };
}
