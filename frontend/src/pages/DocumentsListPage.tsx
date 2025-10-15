import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItemButton,
  ListItemText,
  Divider
} from '@mui/material';
import { Link } from 'react-router-dom';
import { fetchDocumentsList, DocumentListItem } from '../services/api';

const DocumentsListPage: React.FC = () => {
  const [docs, setDocs] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchDocumentsList();
        setDocs(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" mb={2}>
        Dokumente
      </Typography>
      {docs.length === 0 ? (
        <Typography>Keine Dokumente gefunden.</Typography>
      ) : (
        <List>
          {docs.map(doc => (
            <React.Fragment key={doc.documentId}>
              <ListItemButton component={Link} to={`/documents/${doc.documentId}`}>
                <ListItemText
                  primary={`ID ${doc.documentId} – ${doc.filename ?? ''}`}
                  secondary={`Status: ${doc.state ?? 'N/A'} | Hochgeladen: ${doc.uploadedAt ?? ''}`}
                />
              </ListItemButton>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
};

export default DocumentsListPage; 