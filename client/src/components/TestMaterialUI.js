import React from "react";
import { AppBar, Toolbar, Typography, Container, Card, CardContent, Button } from "@mui/material";

const HomePage = () => {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">My MUI Page</Typography>
        </Toolbar>
      </AppBar>
      <Container style={{ marginTop: "20px" }}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Welcome to Material UI
            </Typography>
            <Typography variant="body1">
              This is a simple page using Material UI components.
            </Typography>
            <Button variant="contained" color="primary" style={{ marginTop: "10px" }}>
              Click Me
            </Button>
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default HomePage;
