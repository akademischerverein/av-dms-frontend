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
import { RequestInfo, SendRequest, Document } from "@/lib/backend"

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

export default function TreasurerPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null) // null = checking, true = authenticated, false = not authenticated
  const [documents, setDocuments] = useState<Record<number, Document>>(new Map())
  const [selectedReceipt, setSelectedReceipt] = useState<Document | null>(null)
  const [editingReceipt, setEditingReceipt] = useState<Document | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")

  // Check authentication on mount
  useEffect(() => {
	RequestInfo("auth/whoami").then((res) => res.json()).then((data) => {
		setIsAuthenticated(data.isAuthenticated)
		
		if (!data.isAuthenticated) {
			// Not authenticated or session expired
			setIsAuthenticated(false)
			router.replace("/treasurer/login")
		}
	})
  }, [router])

  // Load receipts
  useEffect(() => {
	SendRequest("documents/search", {"versionType": "CURRENT"})
		.then((res) => res.json()).then((data) => {
			const docs: Document[] = data
			setDocuments(new Map(docs.documents.map((v) : [number, Document] => [v.documentId, v])))
		})
  }, [])

  const onlyDocumentsValues = [...documents.values()]
  
  const filteredReceipts = onlyDocumentsValues.filter((receipt) => {
    const matchesStatus = filterStatus === "all" || receipt.version.state === filterStatus
    const matchesSearch =
      searchTerm === "" ||
      receipt.uploaderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.version.receipts[0].booking[0].toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const sortedReceipts = [...filteredReceipts].sort((a, b) => {
    const diff = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    return sortOrder === "newest" ? -diff : diff
  })

  const getStatusBadge = (status: DocumentVersion["state"]) => {
    const variants = {
      UPLOADED: { variant: "secondary" as const, label: "Eingereicht", icon: Clock },
      APPROVED: { variant: "default" as const, label: "Genehmigt", icon: CheckCircle },
      REJECTED: { variant: "destructive" as const, label: "Abgelehnt", icon: XCircle },
      FINALIZED: { variant: "outline" as const, label: "Finalisiert", icon: FileText },
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
	fetch("https://localhost:7215/auth/logout", {"method": "POST", "credentials": "include"})
    toast({
      title: "Abgemeldet",
      description: "Sie wurden erfolgreich abgemeldet.",
    })
    router.replace("/treasurer/login")
  }

  const handleStatusChange = (documentId: number, newStatus: DocumentVersion["state"], comment?: string) => {
    setDocuments((prev) => {
      const updated = prev.map((r) =>
        r.id === receiptId ? { ...r, status: newStatus, treasurerComment: comment || r.treasurerComment } : r,
      )

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
        const pending = current.filter((r) => r.status === "UPLOADED")
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

  const handleMarkingToggle = (documentId: number, marking: "green" | "yellow" | "red") => {
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
    total: documents.size,
    uploaded: onlyDocumentsValues.filter((r) => r.version.state === "UPLOADED").length,
    approved: onlyDocumentsValues.filter((r) => r.version.state === "APPROVED").length,
    rejected: onlyDocumentsValues.filter((r) => r.version.state === "REJECTED").length,
    totalAmount: onlyDocumentsValues.filter((r) => r.version.state === "APPROVED").reduce((sum, r) => sum + r.version.receipts[0].bookings[0].amount, 0),
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
                  <SelectItem value="UPLOADED">Eingereicht</SelectItem>
                  <SelectItem value="APPROVED">Genehmigt</SelectItem>
                  <SelectItem value="REJECTED">Abgelehnt</SelectItem>
                  <SelectItem value="FINALIZED">Finalisiert</SelectItem>
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
                    <TableRow key={receipt.documentId}>
                      <TableCell>{getStatusBadge(receipt.version.state)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{receipt.uploaderName}</p>
                          <p className="text-sm text-gray-500">{receipt.uploaderEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(receipt.version.receipts[0].date), "dd.MM.yyyy", { locale: de })}</TableCell>
                      <TableCell className="font-medium">€{receipt.version.receipts[0].bookings[0].amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="truncate">{receipt.version.receipts[0].bookings[0].text}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {[].map((marking, index) => (
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
                          {receipt.version.state === "UPLOADED" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(receipt.documentId, "APPROVED")}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(receipt.documentId, "REJECTED", "Bitte überprüfen")}
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
                  <div className="md:w-7/12 w-full h-full flex justify-center items-start bg-gray-100">
                    <embed src={"https://localhost:7215/documents/file/"+selectedReceipt.documentId} type="application/pdf" className="w-full h-full" />
                  </div>

                  <div className="md:w-5/12 w-full h-full flex flex-col bg-white shadow-inner">
                    {/* Header info */}
                    <div className="px-6 pt-6 pb-4 border-b">
                      <h2 className="font-semibold text-lg mb-1">Beleg ID {selectedReceipt.documentId}</h2>
                      <p className="text-xs text-gray-500">
                        {format(new Date(selectedReceipt.uploadedAt), "dd.MM.yyyy HH:mm", { locale: de })} · {selectedReceipt.uploaderName}
                      </p>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
                      {/* Einreicher */}
                      <div className="space-y-1">
                        <p><span className="font-medium">E-Mail:</span> {selectedReceipt.uploaderEmail}</p>
                        <p><span className="font-medium">Datei:</span> {selectedReceipt.file.filename}</p>
                        {selectedReceipt.version.comment && <p className="bg-gray-50 p-2 rounded text-xs">{selectedReceipt.version.comment}</p>}
                      </div>

                      {/* Details */}
                      <div className="space-y-2">
                        <Label className="block">Datum</Label>
                        <Input
                          type="date"
                          defaultValue={format(new Date(selectedReceipt.version.receipts[0].date), "yyyy-MM-dd")}
                          onChange={(e)=> setSelectedReceipt(r=>{r.version.receipts[0].date = e.target.value; return r})}
                        />
                        <Label className="block mt-3">Betrag €</Label>
                        <Input type="number" step="0.01" defaultValue={selectedReceipt.version.receipts[0].bookings[0].amount.toFixed(2)} />
                        <Label className="block mt-3">Verwendungszweck</Label>
                        <Input defaultValue={selectedReceipt.version.receipts[0].bookings[0].text} />
                      </div>

                      {/* Markierungen */}
                      <div className="space-y-2">
                        <p className="font-medium">Markierungen</p>
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" className={[].includes("green")?"bg-green-600 text-white":"bg-transparent border border-green-600 text-green-600"} onClick={()=>handleMarkingToggle(selectedReceipt.id,"green")}>Korrekt</Button>
                          <Button size="sm" className={[].includes("yellow")?"bg-yellow-500 text-white":"bg-transparent border border-yellow-500 text-yellow-600"} onClick={()=>handleMarkingToggle(selectedReceipt.id,"yellow")}>Unklar</Button>
                          <Button size="sm" className={[].includes("red")?"bg-red-600 text-white":"bg-transparent border border-red-600 text-red-600"} onClick={()=>handleMarkingToggle(selectedReceipt.id,"red")}>Fehler</Button>
                        </div>
                      </div>

                      <Textarea placeholder="Interne Notizen…" defaultValue={selectedReceipt.treasurerComment} className="mt-2" />
                    </div>

                    {/* Buttons */}
                    <div className="border-t px-6 py-4 flex justify-end gap-3">
                      <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>Schließen</Button>
                      {selectedReceipt.version.state === "UPLOADED" && (
                        <>
                          <Button size="sm" className="bg-red-600 text-white" onClick={()=>handleStatusChange(selectedReceipt.documentId,"REJECTED","Beleg abgelehnt")}>Ablehnen</Button>
                          <Button size="sm" className="bg-green-600 text-white" onClick={()=>handleStatusChange(selectedReceipt.documentId,"APPROVED","Beleg genehmigt")}>Genehmigen</Button>
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
