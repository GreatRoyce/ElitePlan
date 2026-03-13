import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Always attach token dynamically before every request
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

export const getApiErrorStatus = (error) =>
  error?.response?.status ?? error?.status ?? null;

export const getApiErrorMessage = (error, fallback = "Request failed") => {
  if (!error) return fallback;
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message;
  return message || fallback;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = getApiErrorStatus(error);
    const message = getApiErrorMessage(error);
    error.normalized = { status, message };

    if (status === 401) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:logout"));
      }
    }

    return Promise.reject(error);
  }
);

// Function to verify user token and get user data
export const verifyUser = async () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const response = await api.get("/auth/me");
  return response.data.user;
};

export default api;
