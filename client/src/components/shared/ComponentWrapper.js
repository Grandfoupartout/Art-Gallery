import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Paper, Typography, Box } from '@mui/material';

const ComponentWrapper = ({ title, children }) => {
  const { theme } = useTheme();

  return (
    <Box sx={{ 
      padding: '20px',
      width: '100%',
      backgroundColor: 'var(--background)',
      minHeight: '100%'
    }}>
      <Typography 
        variant="h4" 
        sx={{ 
          color: 'var(--text)',
          marginBottom: '20px',
          fontWeight: 500
        }}
      >
        {title}
      </Typography>
      <Paper 
        elevation={2}
        sx={{
          backgroundColor: 'var(--surface)',
          color: 'var(--text)',
          borderRadius: '8px',
          padding: '20px'
        }}
      >
        {children}
      </Paper>
    </Box>
  );
};

export default ComponentWrapper; 