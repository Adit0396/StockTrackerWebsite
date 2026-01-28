import React from "react";
import { Card, CardContent, Typography, Switch, Box } from "@mui/material";

const Profile = ({ darkMode, setDarkMode }) => {
  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ maxWidth: 400, mx: "auto" }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            User Profile
          </Typography>
          <Typography variant="body1">Username: demo_user</Typography>
          <Typography variant="body1">Email: demo@example.com</Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">Theme Mode</Typography>
            <Switch
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
            />
            {darkMode ? "Dark Mode" : "Light Mode"}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;
