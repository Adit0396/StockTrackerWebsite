import React from "react";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";

const Navbar = ({ page, setPage }) => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          📊 Stock Dashboard
        </Typography>
        <Button color="inherit" onClick={() => setPage("dashboard")}>Home</Button>
        <Button color="inherit" onClick={() => setPage("portfolio")}>Portfolio</Button>
        <Button color="inherit" onClick={() => setPage("profile")}>Profile</Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
