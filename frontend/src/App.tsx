import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';

import UploadPage from './pages/UploadPage';
import DocumentsListPage from './pages/DocumentsListPage';
import DocumentDetailsPage from './pages/DocumentDetailsPage';

const App: React.FC = () => {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            KWDigital
          </Typography>
          <Button color="inherit" component={Link} to="/upload">
            Upload
          </Button>
          <Button color="inherit" component={Link} to="/documents">
            Dokumente
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/upload" />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/documents" element={<DocumentsListPage />} />
          <Route path="/documents/:id" element={<DocumentDetailsPage />} />
        </Routes>
      </Box>
    </>
  );
};

export default App; 