import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  LinearProgress,
  Stack
} from '@mui/material';
import { uploadDocument, UploadMetadata } from '../services/api';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { jsPDF } from 'jspdf';

const UploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [receiptDate, setReceiptDate] = useState<Dayjs | null>(dayjs());
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [name, setName] = useState(localStorage.getItem('uploaderName') || '');
  const [email, setEmail] = useState(localStorage.getItem('uploaderEmail') || '');
  const [comment, setComment] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let selected = e.target.files[0];
      if (selected.type.startsWith('image/')) {
        try {
          selected = await convertImageToPdf(selected);
        } catch (err) {
          setError('Bild konnte nicht in PDF umgewandelt werden');
          return;
        }
      }
      setFile(selected);
    }
  };

  const convertImageToPdf = async (imgFile: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const imgData = reader.result as string;
        const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const image = new Image();
        image.onload = () => {
          let imgWidth = image.width;
          let imgHeight = image.height;
          const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
          imgWidth *= ratio;
          imgHeight *= ratio;
          const x = (pageWidth - imgWidth) / 2;
          const y = (pageHeight - imgHeight) / 2;
          pdf.addImage(imgData, undefined as any, x, y, imgWidth, imgHeight);
          const pdfBlob = pdf.output('blob');
          const pdfFile = new File([pdfBlob], imgFile.name.replace(/\.[^.]+$/, '.pdf'), {
            type: 'application/pdf'
          });
          resolve(pdfFile);
        };
        image.onerror = reject;
        image.src = imgData;
      };
      reader.onerror = reject;
      reader.readAsDataURL(imgFile);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Bitte ein PDF oder Bild auswählen.');
      return;
    }

    // Simple validation
    if (!receiptDate || !amount || !purpose || !name || !email) {
      setError('Bitte alle Pflichtfelder ausfüllen.');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Persist name/email
      localStorage.setItem('uploaderName', name);
      localStorage.setItem('uploaderEmail', email);

      const metadata: UploadMetadata = {
        receiptDate: receiptDate!.format('YYYY-MM-DD'),
        amount: amount,
        text: purpose,
        comment: comment || undefined,
        uploaderName: name,
        uploaderEmail: email
      };

      const res = await uploadDocument(file, metadata);
      setSuccess(`Upload erfolgreich! Document ID: ${res.documentId}`);
      // Reset form
      setFile(null);
      setAmount('');
      setPurpose('');
      setComment('');
      setReceiptDate(dayjs());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box maxWidth={700} mx="auto">
        <Typography variant="h4" mb={2}>
          Beleg einreichen
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <DatePicker
              label="Belegdatum *"
              value={receiptDate}
              onChange={(val: Dayjs | null) => setReceiptDate(val)}
              disableFuture
              format="DD.MM.YYYY"
            />
            <TextField
              label="Betrag € *"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              inputProps={{ step: '0.01' }}
            />
            <TextField
              label="Verwendungszweck *"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              fullWidth
            />
            <TextField
              label="Name *"
              value={name}
              onChange={e => setName(e.target.value)}
              fullWidth
            />
            <TextField
              label="E-Mail *"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              fullWidth
            />
            <Button variant="contained" component="label">
              Datei auswählen (PDF/Bild)
              <input
                type="file"
                hidden
                accept="application/pdf,image/jpeg,image/png"
                onChange={handleFileChange}
              />
            </Button>
            {file && (
              <Typography variant="body2">Ausgewählt: {file.name}</Typography>
            )}
            <TextField
              label="Kommentar"
              value={comment}
              onChange={e => setComment(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
            <Button type="submit" variant="contained" disabled={loading} size="large">
              Einreichen
            </Button>
            {loading && <LinearProgress />}
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
          </Stack>
        </form>
      </Box>
    </LocalizationProvider>
  );
};

export default UploadPage; 