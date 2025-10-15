export interface UploadResponse {
  documentId: number;
  documentVersionId: number;
}

export interface UploadMetadata {
  receiptDate: string; // YYYY-MM-DD
  amount: string;
  text: string;
  comment?: string;
  uploaderName: string;
  uploaderEmail: string;
  debit?: number;
  credit?: number;
}

export interface DocumentListItem {
  documentId: number;
  uploaderName?: string;
  uploadedAt?: string;
  filename?: string;
  state?: string;
}

export interface DocumentMetadata {
  file?: {
    filename: string;
    hash: string;
    hashAlgorithm: string;
  };
  uploaderName?: string;
  uploaderEmail?: string;
  uploaderIp?: string;
  uploadedAt?: string;
  versions?: unknown[];
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  const hexCodes = [...byteArray].map(byte => byte.toString(16).padStart(2, '0'));
  return hexCodes.join('');
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return arrayBufferToHex(hashBuffer);
}

export async function uploadDocument(
  file: File,
  metadata: UploadMetadata
): Promise<UploadResponse> {
  const arrayBuffer = await file.arrayBuffer();
  const base64Data = await fileToBase64(file);
  const hashHex = await sha256Hex(arrayBuffer);

  const body: Record<string, unknown> = {
    file: {
      data: base64Data,
      filename: file.name,
      hash: hashHex,
      hashAlgorithm: 'SHA256'
    },
    metadata: {
      receiptDate: metadata.receiptDate,
      amount: metadata.amount,
      text: metadata.text,
      comment: metadata.comment,
      ...(metadata.debit !== undefined ? { debit: metadata.debit } : {}),
      ...(metadata.credit !== undefined ? { credit: metadata.credit } : {})
    },
    uploaderName: metadata.uploaderName,
    uploaderEmail: metadata.uploaderEmail
  };

  const res = await fetch('/documents/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }

  return res.status === 201 ? ((await res.json()) as UploadResponse) : ({} as UploadResponse);
}

export async function fetchDocumentsList(): Promise<DocumentListItem[]> {
  const res = await fetch('/documents/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ versionType: 'CURRENT' })
  });

  if (!res.ok) {
    throw new Error(`Fetch documents failed: ${res.status}`);
  }

  return (await res.json()) as DocumentListItem[];
}

export async function fetchDocumentMetadata(
  documentId: number
): Promise<DocumentMetadata> {
  const res = await fetch(`/documents/metadata/${documentId}`);
  if (!res.ok) {
    throw new Error(`Fetch metadata failed: ${res.status}`);
  }
  return (await res.json()) as DocumentMetadata;
} 