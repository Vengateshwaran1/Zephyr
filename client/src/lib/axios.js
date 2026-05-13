import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:import.meta.env.MODE === "development" ? "http://localhost:3001/api" : "/api",
  //baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true,
});
