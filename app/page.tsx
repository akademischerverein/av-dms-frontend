"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  CalendarIcon,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  User,
  Mail,
  Euro,
  MessageSquare,
  Building2,
} from "lucide-react"
import { format, parse } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { RequestInfo, SendRequest } from "@/lib/backend"

interface UploadData {
  receiptDate: Date | undefined
  amount: string
  purpose: string
  uploaderName: string
  uploaderEmail: string
  file: File | null
  comment: string
  account: Number | null
  person: Number | null
  debitCredit: "debit" | "credit"
}

// OCR helper types
type OcrFields = { amount?: string; date?: Date; receiptNumber?: string }

export default function HomePage() {
  const { toast } = useToast()
  const [formData, setFormData] = useState<UploadData>({
    receiptDate: undefined,
    amount: "",
    purpose: "",
    uploaderName: typeof window !== "undefined" ? localStorage.getItem("uploaderName") || "" : "",
    uploaderEmail: typeof window !== "undefined" ? localStorage.getItem("uploaderEmail") || "" : "",
    file: null,
    comment: "",
    debitCredit: "debit",
  })
 
  const [accounts, setAccounts] = useState([]);
  const [isAccountsLoading, setAccountsLoading] = useState(true);
  
  useEffect(() => {
	  if (accounts.length > 0) return
	  
	  RequestInfo("proxy/accounts/all")
	  .then((res) => res.json()).then((data) => {
		  data.forEach((ele) => {
			ele.label = ele.name
			ele.value = ele.number
		  })
		  setAccounts(data)
		  setAccountsLoading(false)
	  })
  })

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [duplicateWarning, setDuplicateWarning] = useState(false)
  const [ocrSuggestions, setOcrSuggestions] = useState<string[]>([])
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrFields, setOcrFields] = useState<OcrFields>({})

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Datei zu groß",
        description: "Die Datei darf maximal 5 MB groß sein.",
        variant: "destructive",
      })
      return
    }

    let processedFile: File = file

    // Compress images >1MB
    if (file.type.startsWith("image/") && file.size > 1 * 1024 * 1024) {
      try {
        processedFile = await compressImage(file)
      } catch (err) {
        console.error("Image compression failed", err)
      }
    }

    setFormData((prev) => ({ ...prev, file: processedFile }))

    // Trigger OCR for both images and PDFs (PDF gets converted to image first)
    runOcr(processedFile)
  }

  const checkForDuplicates = () => {
    if (formData.amount && formData.receiptDate) {
      // Simulate duplicate check
      const isDuplicate = Math.random() > 0.7
      setDuplicateWarning(isDuplicate)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.file ||
      !formData.receiptDate ||
      !formData.amount ||
      !formData.purpose ||
      !formData.uploaderName ||
      !formData.uploaderEmail
    ) {
      toast({
        title: "Fehlende Angaben",
        description: "Bitte füllen Sie alle Pflichtfelder aus.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Save to localStorage
      localStorage.setItem("uploaderName", formData.uploaderName)
      localStorage.setItem("uploaderEmail", formData.uploaderEmail)
	  const base64 = await fileToBase64(formData.file!)
	  const fileBuffer = await formData.file!.arrayBuffer()
	  const digest = await crypto.subtle.digest("SHA-256", fileBuffer)
	  const hexdigest = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("")
	  
	  const receipt = {
		  file: {
			  filename: formData.file!.name,
			  hash: hexdigest,
			  hashAlgorithm: "SHA256",
			  data: base64
		  },
		  uploaderName: formData.uploaderName,
		  uploaderEmail: formData.uploaderEmail,
		  metadata: {
			  receiptDate: formData.receiptDate.toISOString().split("T")[0],
			  amount: parseFloat(formData.amount),
			  text: formData.purpose,
			  comment: formData.comment,
			  debit: formData.debitCredit == "debit" ? formData.account : formData.person,
			  credit: formData.debitCredit == "credit" ? formData.account : formData.person
		  }
	  }

      const upload = await SendRequest("documents/upload", receipt)
	  if (upload.status > 299) {
		  throw new Exception()
	  }
      setUploadProgress(100)

      toast({
        title: "Beleg erfolgreich eingereicht!",
        description: "Ihr Beleg wurde zur Prüfung an den Kassenwart weitergeleitet.",
      })

      // Reset form
      setFormData((prev) => ({
        ...prev,
        receiptDate: undefined,
        amount: "",
        purpose: "",
        file: null,
        comment: "",
        account: null,
        debitCredit: "debit",
      }))
    } catch (error) {
		console.log(error)
      toast({
        title: "Fehler beim Upload",
        description: "Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // ---------- OCR helper functions ---------- //
  const runOcr = async (file: File) => {
    setOcrLoading(true)
    setOcrSuggestions([])
    try {
      const { createWorker, PSM } = await import("tesseract.js")
      const worker = await createWorker({ logger: (m: any) => console.log(m) })
      await worker.load()
      await worker.loadLanguage("deu")
      await worker.initialize("deu")
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      })

      let source: string | File = file
      if (file.type === "application/pdf") {
        try {
          source = await convertPdfToImage(file)
        } catch (err) {
          console.error("PDF to image conversion failed", err)
        }
      }

      const {
        data: { text },
      } = await worker.recognize(source)
      await worker.terminate()

      extractFields(text)
    } catch (error) {
      console.error("OCR Error:", error)
      toast({ title: "OCR fehlgeschlagen", description: "Die Texterkennung konnte nicht ausgeführt werden.", variant: "destructive" })
    } finally {
      setOcrLoading(false)
    }
  }

  const convertPdfToImage = async (pdfFile: File): Promise<string> => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf")
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

    const data = await pdfFile.arrayBuffer()
    const pdf = await pdfjs.getDocument(data).promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 2.0 })
    const canvas = document.createElement("canvas")
    canvas.height = viewport.height
    canvas.width = viewport.width
    const context = canvas.getContext("2d")!
    await page.render({ canvasContext: context, viewport: viewport }).promise
    return canvas.toDataURL()
  }

  const extractFields = (text: string) => {
    const lines = text.split("\n")
    const suggestions: string[] = []

    // --- 1. Extract Date and Time (Linter-Safe Version) ---
    const datePatterns = [
      /(?:Datum[: ]+)(\d{2}\.\d{2}\.\d{4}).*(?:Zeit[: ]+)(\d{2}:\d{2}:\d{2})/,
      /(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/,
      /(\d{2}\.\d{2}\.\d{4}).*(\d{2}:\d{2}:\d{2})/,
      /(\d{2}\.\d{2}\.\d{4})/,
    ]

    let foundDate: Date | undefined
    for (const line of lines) {
      if (foundDate) break // Exit once found

      for (const pattern of datePatterns) {
        const match = line.match(pattern)
        if (!match) continue

        const dateStr = match[1]
        const timeStr = match[2] || "00:00:00"
        let parsedDate: Date | null = null

        try {
          if (dateStr.includes(".")) {
            // Explicitly create a reference date for parsing
            const referenceDate = new Date()
            parsedDate = parse(`${dateStr} ${timeStr}`, "dd.MM.yyyy HH:mm:ss", referenceDate)
          } else {
            const referenceDate = new Date()
            parsedDate = parse(`${dateStr}T${timeStr}`, "yyyy-MM-dd'T'HH:mm:ss", referenceDate)
          }

          if (parsedDate && !isNaN(parsedDate.getTime())) {
            foundDate = parsedDate
            break // Exit inner loop
          }
        } catch (e) {
          // Parsing failed, continue to next pattern
        }
      }
    }

    if (foundDate) {
      const finalDate = foundDate // Assign to a new const for type stability
      setFormData((prev) => ({ ...prev, receiptDate: finalDate }))
      suggestions.push(`Datum: ${format(finalDate, "dd.MM.yyyy")}`)
    }

    // --- 2. Extract Total Amount (remains the same) ---
    const amountCandidates: number[] = []
    const amountRegex = /(\d{1,3}(?:[.,]\d{2}))/g

    for (const line of lines) {
      if (/summe|gesamt|total|brutto/i.test(line)) {
        const matches = Array.from(line.matchAll(amountRegex))
        for (const match of matches) {
          const amountValue = parseFloat(match[1].replace(",", "."))
          if (!isNaN(amountValue)) {
            amountCandidates.push(amountValue)
          }
        }
      }
    }

    if (amountCandidates.length > 0) {
      const totalAmount = Math.max(...amountCandidates)
      const amountStr = totalAmount.toFixed(2)
      setFormData((prev) => ({ ...prev, amount: amountStr }))
      suggestions.push(`Betrag: ${amountStr} €`)
    }

    if (suggestions.length > 0) {
      setOcrSuggestions(suggestions)
    }
  }

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const maxDim = 1400
        let { width, height } = img
        if (width > height && width > maxDim) {
          height = (maxDim / width) * height
          width = maxDim
        } else if (height > maxDim) {
          width = (maxDim / height) * width
          height = maxDim
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject("Compression failed")
            const compressedFile = new File([blob], file.name.replace(/\.(png|jpeg|jpg)$/i, ".jpg"), {
              type: "image/jpeg",
            })
            resolve(compressedFile)
          },
          "image/jpeg",
          0.7,
        )
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
		  const base64DataUrl = reader.result as string
		  resolve(base64DataUrl.split(",")[1])
	  }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
  
  const personAccounts = accounts.filter((acc) => {
	  return acc.type == "DEBTORS" || acc.type == "CREDITORS"
  })
  
  const viewableAccounts = accounts.filter((acc) => {
	  const disallowedTypes = [
		"DEBTORS", "CREDITORS", "TRANSIT", "DEPRICATION_EXPENSES", "EQUITIES", "FINANCIAL", "CONNECTED_ENTITIES", "OPENING_BALANCES"
	  ]
	  return !disallowedTypes.includes(acc.type)
  }).sort((a, b) => b.number - a.number)

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#e53b3e]/40 p-4">
      <div className="max-w-4xl mx-auto relative">
        {/* Zirkel Watermark */}
        <Image src="/Zirkel.png" alt="Zirkel" width={220} height={220} className="hidden md:block absolute -top-6 -right-10 opacity-10" />

        <div className="flex justify-center mb-8">
          <Image src="/AV_Logo.jpg" alt="Akademischer Verein Darmstadt" width={180} height={180} className="rounded-md shadow-md" />
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Beleg einreichen
            </CardTitle>
            <CardDescription>Reichen Sie Ihren Beleg zur Erstattung oder Buchung ein</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.uploaderName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, uploaderName: e.target.value }))}
                    placeholder="Ihr vollständiger Name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    E-Mail *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.uploaderEmail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, uploaderEmail: e.target.value }))}
                    placeholder="ihre.email@example.com"
                    required
                  />
                </div>
              </div>

              {/* Receipt Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Belegdatum *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.receiptDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.receiptDate
                          ? format(formData.receiptDate, "dd.MM.yyyy", { locale: de })
                          : "Datum auswählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.receiptDate}
                        locale={de}
                        onSelect={(date) => {
                          setFormData((prev) => ({ ...prev, receiptDate: date }))
                          checkForDuplicates()
                        }}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    Betrag € *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, amount: e.target.value }))
                      checkForDuplicates()
                    }}
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>

              {duplicateWarning && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Mögliches Duplikat:</strong> Ein ähnlicher Beleg mit diesem Betrag und Datum wurde bereits
                    eingereicht.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="purpose">Verwendungszweck *</Label>
                <Input
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))}
                  placeholder="Wofür wurde das Geld ausgegeben?"
                  required
                />
                {ocrSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-sm text-gray-600">Vorschläge:</span>
                    {ocrSuggestions.map((suggestion, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => setFormData((prev) => ({ ...prev, purpose: suggestion }))}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
				<div className="space-y-2">
                  <Label>Geld erhalten/ausgegeben</Label>
                  <Select
                    value={formData.debitCredit}
                    onValueChange={(value: "debit" | "credit") =>
                      setFormData((prev) => ({ ...prev, debitCredit: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">Geld ausgegeben</SelectItem>
                      <SelectItem value="credit">Geld erhalten</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
				<div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {formData.debitCredit == "credit" ? "Wer hat Geld bekommen?" : "Wer hat gezahlt?"}
                  </Label>
                  <Select
                    value={formData.person}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, person: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Person auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {personAccounts.map((type) => (
                        <SelectItem key={type.number} value={String(type.number)}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Konto
                  </Label>
                  <Select
                    value={formData.account}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, account: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Konto auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {viewableAccounts.map((type) => (
                        <SelectItem key={type.number} value={String(type.number)}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Beleg hochladen *</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    id="file"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={handleFileChange}
                    className="hidden"
                    required
                  />
                  <Label htmlFor="file" className="cursor-pointer">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-lg font-medium">Datei auswählen oder hierher ziehen</p>
                    <p className="text-sm text-gray-500">PDF, JPEG oder PNG (max. 5 MB)</p>
                  </Label>
                  {formData.file && (
                    <div className="mt-4">
                      {formData.file.type.startsWith("image/") ? (
                        <img
                          src={URL.createObjectURL(formData.file)}
                          alt="Vorschau"
                          className="max-h-56 rounded-md mx-auto"
                        />
                      ) : formData.file.type === "application/pdf" ? (
                        <embed
                          src={URL.createObjectURL(formData.file)}
                          type="application/pdf"
                          className="w-full h-64 border rounded-md"
                        />
                      ) : (
                        <div className="p-3 bg-green-50 rounded-lg text-center">
                          <FileText className="h-8 w-8 mx-auto text-green-800" />
                          <p className="text-sm font-medium text-green-800">{formData.file.name}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {ocrLoading && <p className="text-sm text-gray-500 mt-2">OCR läuft …</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Kommentar (optional)
                </Label>
                <Textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => setFormData((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Zusätzliche Informationen zum Beleg..."
                  rows={3}
                />
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Upload läuft...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={isUploading}>
                {isUploading ? "Wird hochgeladen..." : "Beleg einreichen"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Button variant="outline" asChild>
            <a href="/treasurer/login">Kassenwart-Bereich</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
