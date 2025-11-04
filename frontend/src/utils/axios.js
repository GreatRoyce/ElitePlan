import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// ✅ Always attach token dynamically before every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Function to verify user token and get user data
export const verifyUser = async () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const response = await api.get("/auth/me");
  return response.data.user;
};

export default api;
