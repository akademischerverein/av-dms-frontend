# Projekt: Automatisierung der vereinsinternen Buchhaltungsprozesse

## Ziel
Einreichung und Verarbeitung von Belegen durch Aktive digitalisieren. Der Kassenwart (KW) soll Belege nur noch kontrollieren und mit einem Klick bearbeiten oder freigeben können.

---

## Architekturüberblick
- Frontend: Weboberfläche (React oder Vue.js)
- Backend: Python (z. B. FastAPI oder Django)
- Datenbank: PostgreSQL oder SQLite
- File Storage: Lokaler Serverordner + Umwandlung in PDF (PDFLib oder ImageMagick)
- OCR: Tesseract (für Texterkennung aus Bildern)
- E-Mail-Benachrichtigungen: SMTP-Service (z. B. SendGrid oder lokal)

---

## Hauptansichten & Funktionen

### 1. **Startseite / Ansicht für Aktive** (ohne Login erreichbar)
- Felder:
  - Belegdatum* (Datepicker)
  - Betrag* (Float-Input)
  - Verwendungszweck* (Textfeld)
  - Wer lädt hoch?* (Textfeld)
  - E-Mail* (Regex-Check)
  - Datei-Upload* (PDF, JPEG; Max 5 MB; automatischer Kompressor)
  - Geld bekommen (Soll/Haben-Auswahl)
  - Auswahl Kontovorschläge (Dropdown: Fahrtkosten, Verpflegung, Material, ...)
  - Kommentar (Freitext, escaped)

- Features:
  - Lokale Speicherung von Name/E-Mail
  - Auto-Vervollständigung durch OCR
  - Hinweis bei doppeltem Betrag+Datum
  - Hinweis: Datei wird komprimiert + konvertiert

### 2. **Beleg-Ansicht für KW** (Login erforderlich)
- Eingereichte Daten anzeigen (nicht änderbar: Beleg, E-Mail, Einreicher, Kommentar)
- Änderbare Felder: Betrag, Datum, Verwendungszweck, Soll/Haben, Konto
- Belegkreis auswählen (Dropdown)
- Kommentare für interne Doku
- Markierungen:
  - Grüner Haken = passt
  - Gelb = unklar
  - Rot = Fehler
- Buttons:
  - **Ablehnen** (Kommentar + Mail an Einreicher)
  - **Ändern & Annehmen** (Mail an Einreicher)
  - **Annehmen**

### 3. **Beleg-Übersicht / Buchungen (KW/Admin)**
- Tabellenansicht mit Filter
- Spalten: Status, Betrag, Datum, Name, Markierungen, Belegkreis
- Warnsystem: Dubletten, fehlende Pflichtfelder
- Export als Buchungsdatendatei (CSV/JSON für Lexware)
- Separate Ansicht: Abgelehnte Belege

### 4. **Alte Belege & Revision**
- Änderungshistorie einsehbar
- Entscheidungen nachträglich änderbar (Mail an Einreicher)

### 5. **Belegkreisverwaltung (Admin/KW)**
- Erstellen, ändern, löschen von Belegkreisen
- Zuweisung von Buchungslogik

### 6. **Nutzerverwaltung**
- Rollen: Aktiver, KW, Prüfer, Admin
- Rechtevergabe

### 7. **Audit-Log**
- Jede Aktion protokollieren
- Zweck: Nachvollziehbarkeit / Anforderungen Finanzamt

---

## Nice-to-haves
- Vereinfachte Buchungsmaske für Aktive (nur Pflichtfelder)
- Fortgeschrittenen-Modus für KW
- Unterstützung für Belege mit mehreren Buchungen (nur KW-Seite)
- ZIP-Upload für Sammelbuchungen

---

## Sicherheit & Technik
- Alle Eingaben validieren (Client + Server)
- Freitext escapen
- Datei-Uploads virenprüfen (ClamAV o.ä.)
- Mailserver absichern
- DSGVO beachten: Speicherung, Zugriff, Löschung

---

## Weiterer Fahrplan
1. Prototyp in Python/JS
2. Interner Test (nur Aktive & 1 KW)
3. Feedback einbauen
4. Anbindung Lexware-Testimport
5. Voller Rollout

