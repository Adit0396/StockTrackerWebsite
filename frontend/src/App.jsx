import React, { useState, useEffect } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { getTheme } from "./theme";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import Portfolio from "./components/Portfolio";
import Profile from "./components/Profile";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(JSON.parse(localStorage.getItem("darkMode")) ?? true);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  return (
    <ThemeProvider theme={getTheme(darkMode ? "dark" : "light")}>
      <CssBaseline />
      <Navbar page={page} setPage={setPage} />
      {page === "dashboard" && <Dashboard />}
      {page === "portfolio" && <Portfolio />}
      {page === "profile" && <Profile darkMode={darkMode} setDarkMode={setDarkMode} />}
    </ThemeProvider>
  );
}
