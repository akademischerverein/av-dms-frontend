import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Stack,
  Divider,
  Button
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { fetchDocumentMetadata, DocumentMetadata } from '../services/api';

const DocumentDetailsPage: React.FC = () => {
  const { id } = useParams();
  const [data, setData] = useState<DocumentMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const meta = await fetchDocumentMetadata(Number(id));
        setData(meta);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

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

  if (!data) {
    return <Alert severity="info">Keine Daten gefunden.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" mb={2}>
        Dokument {id}
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1">Datei: {data.file?.filename}</Typography>
          <Typography variant="body2">Hash: {data.file?.hash}</Typography>
          <Typography variant="body2">Uploader: {data.uploaderName}</Typography>
          <Typography variant="body2">Upload-Zeit: {data.uploadedAt}</Typography>
        </Stack>
      </Paper>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6">Versionen</Typography>
      {Array.isArray(data.versions) && data.versions.length > 0 ? (
        data.versions.map((v: any) => (
          <Paper key={v.documentVersionId} sx={{ p: 2, my: 1 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Version ID: {v.documentVersionId}</Typography>
              <Typography variant="body2">Status: {v.state}</Typography>
              <Typography variant="body2">Kommentar: {v.comment}</Typography>
              <Typography variant="body2">Erstellt: {v.createdAt}</Typography>
            </Stack>
          </Paper>
        ))
      ) : (
        <Typography>Keine Versionen vorhanden.</Typography>
      )}
      <Button variant="contained" disabled sx={{ mt: 2 }}>
        Neue Version (TODO)
      </Button>
    </Box>
  );
};

export default DocumentDetailsPage; 