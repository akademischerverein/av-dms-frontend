📘 API-Endpunkte
POST /documents/upload
Erlaubt für alle
 Hash wird bei jedem Upload verifiziert. Nur PDF Dateien erlaubt. Datei wird serverseitig mit zufällig generiertem Schlüssel verschlüsselt.
🔒 Request als TREASURER
{
  "file": {
    "data": "base64-binary",
    "filename": "Beleg.pdf", # optional
    "hash": "hex-hash",
    "hashAlgorithm": "SHA256"
  },
  "metadata": {
    "comment": "hnihgugh", # optional
    "receipts": [
      {
        "date": "2025-05-05",
        "group": "25S-ABR-", # optional, nur zusammen mit number
        "number": 25, # optional, nur zusammen mit group
        "bookings": [
          {
            "amount": "35.5",
            "text": "abcdefg",
            "debit": 2000, # optional
            "credit": 11152, # optional
            "bookingDate": "2025-05-15" # optional
          }
        ]
      }
    ]
  }
}
🙋 Request als alle anderen (⚠Zurzeit nicht Verfügbar)
{
  "file": {
    "data": "base64-binary",
    "filename": "Beleg.pdf", # optional
    "hash": "hex-hash",
    "hashAlgorithm": "SHA256"
  },
  "metadata": {
    "receiptDate": "2025-05-05",
    "amount": "35.5",
    "text": "abcdefg",
    "comment": "hnihgugh", # optional
    "debit": 2000, # optional
    "credit": 11152 # optional
  },
  "uploaderName": "Lea",
  "uploaderEmail": "lea@example.com"
}
🔁 Response
413 – Datei > 5 MB
400 – Fehlerhafte Daten
201 – Upload erfolgreich (body nur bei Login):
{ "documentId": 55, "documentVersionId": 120 }
Uploads starten immer mit Status UPLOADED und müssen durch einen TREASURER bestätigt oder abgelehnt werden. Die selbe Datei darf mehrfach hochgeladen werden.

GET /documents/metadata/{DocumentId}/{DocumentVersionId}
Erlaubt für TREASURER und AUDITOR
{
  "comment": "hnihgugh",
  "receipts": [
      {
        "date": "2025-05-05",
        "group": "25S-ABR-",
        "number": 25,
        "bookings": [
          {
            "amount": "35.5",
            "text": "abcdefg",
            "debit": 2000,
            "credit": 11152,
            "bookingDate": "2025-05-15"
          }
        ]
      }
    ]
  "state": "UPLOADED",
  "createdAt": "2025-05-18"
}

GET /documents/metadata/{DocumentId}
Erlaubt für TREASURER und AUDITOR
{
  "file": {
    "filename": "Beleg.pdf",
    "hash": "hex-hash",
    "hashAlgorithm": "SHA256"
  },
  "uploaderName": "Lea",
  "uploaderEmail": "lea@example.com",
  "uploaderIp": "10.0.0.1",
  "uploadedAt": "2025-05-18T18:45:33Z",
  "versions": [
    {
      "documentVersionId": 120,
      "comment": "hnihgugh",
      "receipts": [
      {
        "date": "2025-05-05",
        "group": "25S-ABR-",
        "number": 25,
        "bookings": [
          {
            "amount": "35.5",
            "text": "abcdefg",
            "debit": 2000,
            "credit": 11152,
            "bookingDate": "2025-05-15"
          }
        ]
      }
    ]
      "state": "UPLOADED",
      "createdAt": "2025-05-18T18:45:33Z"
    }
  ]
}

POST /documents/metadata/{DocumentId}
Erlaubt für TREASURER
Erstellt eine neue Version. Erlaubt für Dokumente deren aktueller Status UPLOADED, APPROVED oder FINALIZED ist.
{
  "comment": "hnihgugh", # optional
  "receipts": [
      {
        "date": "2025-05-05",
        "group": "25S-ABR-", # optional, nur zusammen mit number
        "number": 25, # optional, nur zusammen mit group
        "bookings": [
          {
            "amount": "35.5",
            "text": "abcdefg",
            "debit": 2000, # optional
            "credit": 11152, # optional
            "bookingDate": "2025-05-15" # optional
          }
        ]
      }
    ],
    state = "APPROVED"
}
Response
400 – Fehlerhafte Daten
201 – Erfolgreich:
{ "documentId": 55, "documentVersionId": 120 }

POST /documents/metadata/{DocumentId}/state
Erlaubt für TREASURER
{ "state": "APPROVED" }
Status-Werte: UPLOADED, APPROVED, FINALIZED, REJECTED
Response
400 – Ungültiger Status
200 – Erfolgreich (kein Body)

GET /documents/file/{DocumentId}
Erlaubt für TREASURER und AUDITOR
Gibt die Datei zurück.

GET /documents/groups
Erlaubt für TREASURER
[
  { "group": "25W-ABR-", "lastUsedNum": 25 },
  { "group": "25W-SEA-", "lastUsedNum": 501 }
]

POST /documents/groups
Erlaubt für TREASURER
{
  "group": "25W-SEA-",
  "lastUsedNum": 501 #optional
}

PUT /documents/groups/<group:urlsafe>
Erlaubt für TREASURER
{ "lastUsedNum": 25 }

GET /proxy/accounts/all
Erlaubt für alle
Gibt alle momentan vorhandenen Konten zurück
[
  {
    "number": 5000,
    "name": "Semesterbeiträge",
    "type": "Revenues"
  }
]
Es gibt die Kontentypen Receivables, Debtors, ConnectedEntities, Creditors, Revenues, Expenses, DesignatedFunds, GeneralFunds, Financial und OpeningBalances.

POST /documents/search ⚠WIP
Erlaubt für alle
Ergebnisse begrenzt auf 50. Mehr durch search_token.
{
  "versionType": "CURRENT", # oder ALL
  "searchToken": "opaque-token"
}

