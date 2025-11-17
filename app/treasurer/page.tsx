"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Download,
  Filter,
  Search,
  User,
  MessageSquare,
  Clock,
  TrendingUp,
  LogOut,
} from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import Image from "next/image"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface Receipt {
  id: number
  uploaderName: string
  uploaderEmail: string
  receiptDate: string
  amount: number
  purpose: string
  accountType: string
  debitCredit: "debit" | "credit"
  comment: string
  status: "uploaded" | "approved" | "rejected" | "finalized"
  uploadedAt: string
  filename: string
  treasurerComment?: string
  receiptGroup?: string
  markings: ("green" | "yellow" | "red")[]
  previewUrl?: string
  mimeType?: string
  base64?: string
}

const mockReceipts: Receipt[] = [
  {
    id: 1,
    uploaderName: "Max Mustermann",
    uploaderEmail: "max@example.com",
    receiptDate: "2024-01-15",
    amount: 45.5,
    purpose: "Tankstelle Shell - Fahrt zur Veranstaltung",
    accountType: "fahrtkosten",
    debitCredit: "debit",
    comment: "Fahrt zum Vereinsausflug",
    status: "uploaded",
    uploadedAt: "2024-01-16T10:30:00Z",
    filename: "tankbeleg_shell.pdf",
    markings: [],
  },
  {
    id: 2,
    uploaderName: "Anna Schmidt",
    uploaderEmail: "anna@example.com",
    receiptDate: "2024-01-14",
    amount: 23.8,
    purpose: "REWE Supermarkt - Verpflegung",
    accountType: "verpflegung",
    debitCredit: "debit",
    comment: "Getränke für Vereinsfeier",
    status: "approved",
    uploadedAt: "2024-01-15T14:20:00Z",
    filename: "rewe_beleg.pdf",
    treasurerComment: "Alles korrekt",
    receiptGroup: "24W-VER-",
    markings: ["green"],
  },
  {
    id: 3,
    uploaderName: "Peter Weber",
    uploaderEmail: "peter@example.com",
    receiptDate: "2024-01-13",
    amount: 156.0,
    purpose: "Baumarkt - Material für Vereinsheim",
    accountType: "material",
    debitCredit: "debit",
    comment: "Reparatur der Eingangstür",
    status: "rejected",
    uploadedAt: "2024-01-14T09:15:00Z",
    filename: "baumarkt_rechnung.pdf",
    treasurerComment: "Beleg unleserlich, bitte neu einreichen",
    markings: ["red"],
  },
]

const receiptGroups = [
  { value: "24W-VER-", label: "24W-VER- (Veranstaltungen)", lastUsed: 15 },
  { value: "24W-MAT-", label: "24W-MAT- (Material)", lastUsed: 8 },
  { value: "24W-FAH-", label: "24W-FAH- (Fahrtkosten)", lastUsed: 23 },
]

const accountTypes = [
  { value: "fahrtkosten", label: "Fahrtkosten", account: "4510" },
  { value: "verpflegung", label: "Verpflegung", account: "4520" },
  { value: "material", label: "Material & Ausrüstung", account: "4530" },
  { value: "veranstaltung", label: "Veranstaltungskosten", account: "4540" },
  { value: "verwaltung", label: "Verwaltung", account: "4550" },
  { value: "sonstiges", label: "Sonstiges", account: "4560" },
]

export default function TreasurerPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null) // null = checking, true = authenticated, false = not authenticated
  const [receipts, setReceipts] = useState<Receipt[]>(mockReceipts)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")

  // Check authentication on mount
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsAuthenticated(false)
      return
    }

    const checkAuth = () => {
      const authStatus = localStorage.getItem("treasurerAuthenticated")
      const authTime = localStorage.getItem("treasurerAuthTime")

      // Check if authenticated and session is valid (24 hours)
      if (authStatus === "true" && authTime) {
        const timeDiff = Date.now() - parseInt(authTime)
        const hours24 = 24 * 60 * 60 * 1000

        if (timeDiff < hours24) {
          setIsAuthenticated(true)
          return
        } else {
          // Session expired
          localStorage.removeItem("treasurerAuthenticated")
          localStorage.removeItem("treasurerAuthTime")
        }
      }

      // Not authenticated or session expired
      setIsAuthenticated(false)
      router.replace("/treasurer/login")
    }

    checkAuth()
  }, [router])

  // Load persisted receipts from localStorage (uploads)
  useEffect(() => {
    try {
      const storedRaw = typeof window !== "undefined" ? localStorage.getItem("uploadedReceipts") : null
      if (storedRaw) {
        const stored: Receipt[] = JSON.parse(storedRaw)
        const byId = new Map<number, Receipt>()
        ;[...stored, ...mockReceipts].forEach((r) => {
          byId.set(r.id, r)
        })
        setReceipts(Array.from(byId.values()))
      }
    } catch (err) {
      console.error("Failed to load stored receipts", err)
    }
  }, [])

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesStatus = filterStatus === "all" || receipt.status === filterStatus
    const matchesSearch =
      searchTerm === "" ||
      receipt.uploaderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.purpose.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const sortedReceipts = [...filteredReceipts].sort((a, b) => {
    const diff = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    return sortOrder === "newest" ? -diff : diff
  })

  const getStatusBadge = (status: Receipt["status"]) => {
    const variants = {
      uploaded: { variant: "secondary" as const, label: "Eingereicht", icon: Clock },
      approved: { variant: "default" as const, label: "Genehmigt", icon: CheckCircle },
      rejected: { variant: "destructive" as const, label: "Abgelehnt", icon: XCircle },
      finalized: { variant: "outline" as const, label: "Finalisiert", icon: FileText },
    }
    const config = variants[status]
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getMarkingBadge = (marking: "green" | "yellow" | "red") => {
    const configs = {
      green: { color: "bg-green-500", label: "Korrekt" },
      yellow: { color: "bg-yellow-500", label: "Unklar" },
      red: { color: "bg-red-500", label: "Fehler" },
    }
    const config = configs[marking]
    return <div className={`w-3 h-3 rounded-full ${config.color}`} title={config.label} />
  }

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("treasurerAuthenticated")
      localStorage.removeItem("treasurerAuthTime")
    }
    toast({
      title: "Abgemeldet",
      description: "Sie wurden erfolgreich abgemeldet.",
    })
    router.replace("/treasurer/login")
  }

  const handleStatusChange = (receiptId: number, newStatus: Receipt["status"], comment?: string) => {
    setReceipts((prev) => {
      const updated = prev.map((r) =>
        r.id === receiptId ? { ...r, status: newStatus, treasurerComment: comment || r.treasurerComment } : r,
      )

      // Persist only uploaded receipts (i.e., those from localStorage)
      try {
        const raw = localStorage.getItem("uploadedReceipts")
        if (raw) {
          const arr: Receipt[] = JSON.parse(raw)
          const arrUpdated = arr.map((r) => (r.id === receiptId ? { ...r, status: newStatus } : r))
          localStorage.setItem("uploadedReceipts", JSON.stringify(arrUpdated))
        }
      } catch (e) {
        console.error("Failed to persist status", e)
      }

      return updated
    })

    // Auto-advance to next receipt awaiting review
    setTimeout(() => {
      setReceipts((current) => {
        const pending = current.filter((r) => r.status === "uploaded")
        if (pending.length === 0) {
          setIsDialogOpen(false)
          setSelectedReceipt(null)
          return current
        }
        // Pick next pending (oldest first)
        pending.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime())
        setSelectedReceipt(pending[0])
        return current
      })
    }, 0)
  }

  const handleMarkingToggle = (receiptId: number, marking: "green" | "yellow" | "red") => {
    setReceipts((prev) =>
      prev.map((receipt) => {
        if (receipt.id === receiptId) {
          const newMarkings = receipt.markings.includes(marking)
            ? receipt.markings.filter((m) => m !== marking)
            : [...receipt.markings, marking]
          return { ...receipt, markings: newMarkings }
        }
        return receipt
      }),
    )
  }

  const stats = {
    total: receipts.length,
    uploaded: receipts.filter((r) => r.status === "uploaded").length,
    approved: receipts.filter((r) => r.status === "approved").length,
    rejected: receipts.filter((r) => r.status === "rejected").length,
    totalAmount: receipts.filter((r) => r.status === "approved").reduce((sum, r) => sum + r.amount, 0),
  }

  // Show loading state while checking authentication or redirecting
  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isAuthenticated === null ? "Wird geladen..." : "Weiterleitung zur Anmeldung..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image src="/AV_Logo.jpg" alt="Logo" width={90} height={90} className="rounded shadow-md" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Kassenwart-Dashboard</h1>
              <p className="text-gray-600">Verwaltung und Prüfung eingereicherter Belege</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Abmelden
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gesamt</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Eingereicht</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.uploaded}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Genehmigt</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Abgelehnt</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Summe €</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalAmount.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Belegverwaltung</CardTitle>
            <CardDescription>Prüfen und verwalten Sie eingereichte Belege</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters & Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Nach Name oder Verwendungszweck suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="uploaded">Eingereicht</SelectItem>
                  <SelectItem value="approved">Genehmigt</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                  <SelectItem value="finalized">Finalisiert</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(v: any)=>setSortOrder(v)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Neueste zuerst</SelectItem>
                  <SelectItem value="oldest">Älteste zuerst</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={()=>{
                    localStorage.removeItem("uploadedReceipts");
                    location.reload();
               }}>Reset Demo</Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Receipts Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Einreicher</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Betrag</TableHead>
                    <TableHead>Verwendungszweck</TableHead>
                    <TableHead>Markierungen</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{receipt.uploaderName}</p>
                          <p className="text-sm text-gray-500">{receipt.uploaderEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(receipt.receiptDate), "dd.MM.yyyy", { locale: de })}</TableCell>
                      <TableCell className="font-medium">€{receipt.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="truncate">{receipt.purpose}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {accountTypes.find((t) => t.value === receipt.accountType)?.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {receipt.markings.map((marking, index) => (
                            <div key={index}>{getMarkingBadge(marking)}</div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReceipt(receipt)
                              setIsDialogOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {receipt.status === "uploaded" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(receipt.id, "approved")}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(receipt.id, "rejected", "Bitte überprüfen")}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Receipt Detail Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-screen h-screen max-w-none p-0 flex">
            <div className="flex flex-col md:flex-row h-full w-full">
              {selectedReceipt && (
                <>
                  {selectedReceipt.base64 || selectedReceipt.previewUrl || selectedReceipt.filename ? (
                    <div className="md:w-7/12 w-full h-full flex justify-center items-start bg-gray-100">
                      {(() => {
                        const src = selectedReceipt.previewUrl || selectedReceipt.base64;
                        if (!src) {
                          return <p className="text-sm text-gray-500 m-auto">Keine Vorschau verfügbar</p>;
                        }
                        
                        const mimeType = selectedReceipt.mimeType;
                        const filename = selectedReceipt.filename?.toLowerCase() || '';

                        if (mimeType?.startsWith("image/") || filename.match(/\.(jpg|jpeg|png|gif)$/)) {
                          return <img src={src} alt="Beleg Vorschau" className="max-h-full max-w-full object-contain" />;
                        }
                        if (mimeType === "application/pdf" || filename.endsWith('.pdf')) {
                          return <embed src={src} type="application/pdf" className="w-full h-full" />;
                        }
                        
                        return <p className="text-sm text-gray-500 m-auto">Vorschau für diesen Dateityp nicht unterstützt.</p>;
                      })()}
                    </div>
                  ) : (
                    <div className="md:w-7/12 w-full flex items-center justify-center text-sm text-gray-400 bg-gray-100">Keine Vorschau verfügbar</div>
                  )}

                  <div className="md:w-5/12 w-full h-full flex flex-col bg-white shadow-inner">
                    {/* Header info */}
                    <div className="px-6 pt-6 pb-4 border-b">
                      <h2 className="font-semibold text-lg mb-1">Beleg ID {selectedReceipt.id}</h2>
                      <p className="text-xs text-gray-500">
                        {format(new Date(selectedReceipt.uploadedAt), "dd.MM.yyyy HH:mm", { locale: de })} · {selectedReceipt.uploaderName}
                      </p>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
                      {/* Einreicher */}
                      <div className="space-y-1">
                        <p><span className="font-medium">E-Mail:</span> {selectedReceipt.uploaderEmail}</p>
                        <p><span className="font-medium">Datei:</span> {selectedReceipt.filename}</p>
                        {selectedReceipt.comment && <p className="bg-gray-50 p-2 rounded text-xs">{selectedReceipt.comment}</p>}
                      </div>

                      {/* Details */}
                      <div className="space-y-2">
                        <Label className="block">Datum</Label>
                        <Input
                          type="date"
                          defaultValue={format(new Date(selectedReceipt.receiptDate), "yyyy-MM-dd")}
                          onChange={(e)=> setSelectedReceipt(r=>r?{...r, receiptDate:e.target.value}:r)}
                        />
                        <Label className="block mt-3">Betrag €</Label>
                        <Input type="number" step="0.01" defaultValue={selectedReceipt.amount} />
                        <Label className="block mt-3">Verwendungszweck</Label>
                        <Input defaultValue={selectedReceipt.purpose} />
                      </div>

                      {/* Markierungen */}
                      <div className="space-y-2">
                        <p className="font-medium">Markierungen</p>
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" className={selectedReceipt.markings.includes("green")?"bg-green-600 text-white":"bg-transparent border border-green-600 text-green-600"} onClick={()=>handleMarkingToggle(selectedReceipt.id,"green")}>Korrekt</Button>
                          <Button size="sm" className={selectedReceipt.markings.includes("yellow")?"bg-yellow-500 text-white":"bg-transparent border border-yellow-500 text-yellow-600"} onClick={()=>handleMarkingToggle(selectedReceipt.id,"yellow")}>Unklar</Button>
                          <Button size="sm" className={selectedReceipt.markings.includes("red")?"bg-red-600 text-white":"bg-transparent border border-red-600 text-red-600"} onClick={()=>handleMarkingToggle(selectedReceipt.id,"red")}>Fehler</Button>
                        </div>
                      </div>

                      <Textarea placeholder="Interne Notizen…" defaultValue={selectedReceipt.treasurerComment} className="mt-2" />
                    </div>

                    {/* Buttons */}
                    <div className="border-t px-6 py-4 flex justify-end gap-3">
                      <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>Schließen</Button>
                      {selectedReceipt.status === "uploaded" && (
                        <>
                          <Button size="sm" className="bg-red-600 text-white" onClick={()=>handleStatusChange(selectedReceipt.id,"rejected","Beleg abgelehnt")}>Ablehnen</Button>
                          <Button size="sm" className="bg-green-600 text-white" onClick={()=>handleStatusChange(selectedReceipt.id,"approved","Beleg genehmigt")}>Genehmigen</Button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="text-center mt-8">
          <Button variant="outline" asChild>
            <a href="/">Zurück zur Startseite</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
