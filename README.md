# AV DMS Frontend

Next.js frontend for receipt upload and treasurer review in the AV bookkeeping workflow.

## Routes

- `/` for receipt submission
- `/treasurer/login` for treasurer authentication
- `/treasurer` for reviewing and managing submitted receipts

## Local Development

```bash
npm install
npm run dev
```

The frontend expects the backend API at `NEXT_PUBLIC_API_BASE_URL`.
If that variable is unset, it falls back to `https://localhost:7215`.

## Build

```bash
npm run build
```
