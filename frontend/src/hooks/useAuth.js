import { useEffect, useState } from "react";
import api from "../utils/axios"; // your axios setup

export default function useAuth() {
  const [user, setUser] = useState(null);
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
        setUser(response.data.user);
      } catch (error) {
        console.error("❌ Auth check failed:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading, setUser };
}
