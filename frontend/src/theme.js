import { createTheme } from "@mui/material/styles";

export const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      ...(mode === "light"
        ? {
            primary: { main: "#1976d2" },
            background: { default: "#f5f5f5", paper: "#fff" },
          }
        : {
            primary: { main: "#90caf9" },
            background: { default: "#121212", paper: "#1d1d1d" },
          }),
    },
    typography: {
      fontFamily: "Roboto, sans-serif",
    },
  });
