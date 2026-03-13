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
  Plus,
  Settings,
  Save,
} from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import Image from "next/image"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { RequestInfo, SendRequest, PutRequest, Document, Group, BuildApiUrl } from "@/lib/backend"
import { AccountSelector } from "@/components/AccountSelector"

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

interface DocumentMarking {
  markings: ("green" | "yellow" | "red")[]
}

export default function TreasurerPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null) // null = checking, true = authenticated, false = not authenticated
  const [isBelegkreiseLoading, setBelegkreiseLoading] = useState(true)
  const [belegkreise, setBelegkreise] = useState([])
  const [comment, setComment] = useState<string>(null)
  const [documents, setDocuments] = useState<Record<number, Document>>(new Map())
  const [markings, setMarkings] = useState<Record<number, DocumentMarking>>({})
  const [selectedReceipt, setSelectedReceipt] = useState<Document | null>(null)
  const [selectedDocumentAllVersions, setSelectedDocumentAllVersions] = useState<Document | null>(null)
  const [editingReceipt, setEditingReceipt] = useState<Document | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")

  // Groups (Belegkreise) state
  const [groups, setGroups] = useState<Group[]>([])
  const [isGroupsDialogOpen, setIsGroupsDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")

  // Accounts state
  const [accounts, setAccounts] = useState<any[]>([])

  // Edited form state for document detail dialog
  const [editedReceiptDate, setEditedReceiptDate] = useState("")
  const [editedAmount, setEditedAmount] = useState("")
  const [editedText, setEditedText] = useState("")
  const [editedDebit, setEditedDebit] = useState<number | null>(null)
  const [editedCredit, setEditedCredit] = useState<number | null>(null)
  const [editedGroup, setEditedGroup] = useState<string | null>(null)
  const [editedNumber, setEditedNumber] = useState<number | null>(null)
  const [editedComment, setEditedComment] = useState("")
  const [isSaving, setIsSaving] = useState(false)

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
    SendRequest("documents/search", { "versionType": "CURRENT" })
      .then((res) => { if (res.status != 200) { throw new Error(res) } else return res.json() }).then((data) => {
        const docs: Document[] = data
        setDocuments(new Map(docs.documents.map((v): [number, Document] => [v.documentId, v])))
      })

    const marksRaw = typeof window != "undefined" ? localStorage.getItem("documentMarkings") : null
    if (marksRaw) {
      const markings = JSON.parse(marksRaw)
      setMarkings(markings)
    }
  }, [])

  // Load groups (Belegkreise)
  useEffect(() => {
    RequestInfo("documents/groups")
      .then((res) => { if (res.status != 200) { throw new Error(res) } else return res.json() })
      .then((data) => setGroups(data))
      .catch((err) => console.error("Failed to load groups:", err))
  }, [])

  // Load accounts
  useEffect(() => {
    RequestInfo("proxy/accounts/all")
      .then((res) => res.json())
      .then((data) => setAccounts(data))
      .catch((err) => console.error("Failed to load accounts:", err))
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
    SendRequest("auth/logout", {})
    toast({
      title: "Abgemeldet",
      description: "Sie wurden erfolgreich abgemeldet.",
    })
    router.replace("/treasurer/login")
  }

  const loadAllVersions = (documentId: number) => {
    RequestInfo("documents/metadata/" + documentId).then((res) => { if (res.status != 200) { throw new Error(res) } else return res.json() }).then((data) => {
      setSelectedDocumentAllVersions(data)

      const doc = documents.get(documentId)
      setSelectedReceipt(doc)

      // Initialize edited form state from current version
      if (doc && doc.version && doc.version.receipts && doc.version.receipts[0]) {
        const receipt = doc.version.receipts[0]
        const booking = receipt.bookings?.[0] || {}
        setEditedReceiptDate(receipt.date || "")
        setEditedAmount(String(booking.amount || ""))
        setEditedText(booking.text || "")
        setEditedDebit(booking.debit || null)
        setEditedCredit(booking.credit || null)
        setEditedGroup(receipt.group || null)
        setEditedNumber(receipt.number || null)
        setEditedComment(doc.version.comment || "")
      }

      setIsDialogOpen(true)
    })
  }

  const saveDocumentChanges = async (documentId: number, newStatus?: string) => {
    if (!selectedReceipt) return
    setIsSaving(true)

    try {
      const newVersion = {
        comment: editedComment,
        receipts: [
          {
            date: editedReceiptDate,
            group: editedGroup || undefined,
            number: editedNumber || undefined,
            bookings: [
              {
                amount: parseFloat(editedAmount),
                text: editedText,
                debit: editedDebit || undefined,
                credit: editedCredit || undefined,
              }
            ]
          }
        ],
        state: newStatus || selectedReceipt.version.state
      }

      const res = await SendRequest("documents/metadata/" + documentId, newVersion)
      if (res.status !== 201) {
        throw new Error("Save failed")
      }

      const result = await res.json()

      // Reload the documents
      const docRes = await SendRequest("documents/search", { "versionType": "CURRENT" })
      if (docRes.status === 200) {
        const data = await docRes.json()
        setDocuments(new Map(data.documents.map((v: any): [number, Document] => [v.documentId, v])))
      }

      // Reload groups in case numbers changed
      const groupsRes = await RequestInfo("documents/groups")
      if (groupsRes.status === 200) {
        const groupsData = await groupsRes.json()
        setGroups(groupsData)
      }

      toast({
        title: "Änderungen gespeichert",
        description: `Dokument ${documentId} wurde aktualisiert.`,
      })

      if (newStatus === "APPROVED" || newStatus === "REJECTED") {
        // Move to next pending document
        setTimeout(() => {
          const pending = [...documents.values()].filter((r) => r.version.state === "UPLOADED")
          if (pending.length === 0) {
            setIsDialogOpen(false)
            setSelectedReceipt(null)
          } else {
            pending.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime())
            loadAllVersions(pending[0].documentId)
          }
        }, 0)
      } else {
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Fehler beim Speichern",
        description: "Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) return

    try {
      const res = await SendRequest("documents/groups", { group: newGroupName })
      if (res.status !== 201 && res.status !== 200) {
        throw new Error("Create group failed")
      }

      // Reload groups
      const groupsRes = await RequestInfo("documents/groups")
      if (groupsRes.status === 200) {
        const groupsData = await groupsRes.json()
        setGroups(groupsData)
      }

      setNewGroupName("")
      toast({
        title: "Belegkreis erstellt",
        description: `"${newGroupName}" wurde erfolgreich erstellt.`,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Fehler beim Erstellen",
        description: "Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  const updateGroupNumber = async (group: string, lastUsedNum: number) => {
    try {
      const res = await PutRequest("documents/groups/" + encodeURIComponent(group), { lastUsedNum })
      if (res.status !== 200) {
        throw new Error("Update group failed")
      }

      // Reload groups
      const groupsRes = await RequestInfo("documents/groups")
      if (groupsRes.status === 200) {
        const groupsData = await groupsRes.json()
        setGroups(groupsData)
      }

      toast({
        title: "Belegkreis aktualisiert",
        description: `"${group}" Nummer auf ${lastUsedNum} gesetzt.`,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Fehler beim Aktualisieren",
        description: "Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  const handleStatusChange = (documentId: number, newStatus: DocumentVersion["state"], comment?: string) => {
    const newVersion = JSON.parse(JSON.stringify(documents.get(documentId).version))
    newVersion.state = newStatus
    newVersion.comment = comment

    SendRequest("documents/metadata/" + documentId, newVersion).then((res) => { if (res.status != 201) { throw new Error(res) } else return res.json() }).then((data) => {
      RequestInfo("documents/metadata/" + documentId + "/" + data.documentVersionId).then((res) => { if (res.status != 200) { throw new Error(res) } else return res.json() }).then((data) => {
        documents.set(documentId, data)

        setTimeout(() => {
          const pending = onlyDocumentsValues.filter((r) => r.version.state === "UPLOADED")
          if (pending.length === 0) {
            setIsDialogOpen(false)
            setSelectedReceipt(null)
          } else {
            // Pick next pending (oldest first)
            pending.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime())
            loadAllVersions(pending[0].documentId)
          }
        }, 0)
      })
    })
  }

  const handleMarkingToggle = (documentId: number, marking: "green" | "yellow" | "red", comment: string) => {
    if (!(documentId in markings)) {
      markings[documentId] = { "comment": null, "markings": [] }
    }

    const newMarkings = markings[documentId].markings.includes(marking)
      ? markings[documentId].markings.filter((m) => m !== marking)
      : [...markings[documentId].markings, marking]
    markings[documentId].markings = newMarkings
    markings[documentId].comment = comment
    localStorage.setItem("documentMarkings", JSON.stringify(markings))
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
              <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
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
                          {((markings[receipt.documentId] || {}).markings || []).map((marking) => (
                            <div key={marking}>{getMarkingBadge(marking)}</div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              loadAllVersions(receipt.documentId)
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
                    <embed src={BuildApiUrl("documents/file/" + selectedReceipt.documentId)} type="application/pdf" className="w-full h-full" />
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
                        {selectedDocumentAllVersions?.versions?.[0]?.comment && <p className="bg-gray-50 p-2 rounded text-xs">{selectedDocumentAllVersions.versions[0].comment}</p>}
                      </div>

                      {/* Editable Details */}
                      <div className="space-y-3">
                        <div>
                          <Label className="block mb-1">Datum</Label>
                          <Input
                            type="date"
                            value={editedReceiptDate}
                            onChange={(e) => setEditedReceiptDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="block mb-1">Betrag €</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={editedAmount}
                            onChange={(e) => setEditedAmount(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="block mb-1">Verwendungszweck</Label>
                          <Input
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                          />
                        </div>

                        {/* Belegkreis & Number */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="block mb-1">Belegkreis</Label>
                            <Select
                              value={editedGroup || undefined}
                              onValueChange={(value) => {
                                setEditedGroup(value)
                                // Auto-suggest next number
                                const group = groups.find(g => g.group === value)
                                if (group) {
                                  setEditedNumber((group.lastUsedNum || 0) + 1)
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Auswählen" />
                              </SelectTrigger>
                              <SelectContent>
                                {groups.map((g) => (
                                  <SelectItem key={g.group} value={g.group}>
                                    {g.group} (#{g.lastUsedNum})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="block mb-1">Beleg-Nr.</Label>
                            <Input
                              type="number"
                              value={editedNumber || ""}
                              onChange={(e) => setEditedNumber(parseInt(e.target.value) || null)}
                              placeholder="Nr."
                            />
                          </div>
                        </div>

                        {/* Accounts */}
                        <div>
                          <Label className="block mb-1">Soll-Konto</Label>
                          <AccountSelector
                            accounts={accounts}
                            value={editedDebit}
                            onValueChange={(value) => setEditedDebit(value)}
                            placeholder="Soll-Konto auswählen"
                          />
                        </div>
                        <div>
                          <Label className="block mb-1">Haben-Konto</Label>
                          <AccountSelector
                            accounts={accounts}
                            value={editedCredit}
                            onValueChange={(value) => setEditedCredit(value)}
                            placeholder="Haben-Konto auswählen"
                          />
                        </div>

                        {/* Comment for new version */}
                        <div>
                          <Label className="block mb-1">Interne Notiz (für diese Änderung)</Label>
                          <Textarea
                            placeholder="Notiz zur Änderung..."
                            value={editedComment}
                            onChange={(e) => setEditedComment(e.target.value)}
                          />
                        </div>

                        {/* Previous notes */}
                        {selectedDocumentAllVersions?.versions && selectedDocumentAllVersions.versions.length > 1 && (
                          <div>
                            <p className="font-medium mb-2">Frühere Notizen</p>
                            {selectedDocumentAllVersions.versions.slice(1).map((version, idx) => version.comment && (
                              <p key={idx} className="bg-gray-50 p-2 rounded text-xs mb-1">{version.comment}</p>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Markierungen */}
                      <div className="space-y-2">
                        <p className="font-medium">Markierungen</p>
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" className={((markings[selectedReceipt.documentId] || {}).markings || []).includes("green") ? "bg-green-600 text-white" : "bg-transparent border border-green-600 text-green-600"} onClick={() => handleMarkingToggle(selectedReceipt.documentId, "green")}>Korrekt</Button>
                          <Button size="sm" className={((markings[selectedReceipt.documentId] || {}).markings || []).includes("yellow") ? "bg-yellow-500 text-white" : "bg-transparent border border-yellow-500 text-yellow-600"} onClick={() => handleMarkingToggle(selectedReceipt.documentId, "yellow")}>Unklar</Button>
                          <Button size="sm" className={((markings[selectedReceipt.documentId] || {}).markings || []).includes("red") ? "bg-red-600 text-white" : "bg-transparent border border-red-600 text-red-600"} onClick={() => handleMarkingToggle(selectedReceipt.documentId, "red")}>Fehler</Button>
                        </div>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="border-t px-6 py-4 flex justify-end gap-3">
                      <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>Schließen</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveDocumentChanges(selectedReceipt.documentId)}
                        disabled={isSaving}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Speichern
                      </Button>
                      {selectedReceipt.version.state === "UPLOADED" && (
                        <>
                          <Button size="sm" className="bg-red-600 text-white" onClick={() => saveDocumentChanges(selectedReceipt.documentId, "REJECTED")} disabled={isSaving}>Ablehnen</Button>
                          <Button size="sm" className="bg-green-600 text-white" onClick={() => saveDocumentChanges(selectedReceipt.documentId, "APPROVED")} disabled={isSaving}>Genehmigen</Button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Belegkreise Management */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Belegkreise verwalten
            </CardTitle>
            <CardDescription>Erstellen und bearbeiten Sie Belegkreise für die Belegnummerierung</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <Input
                placeholder="Neuer Belegkreis (z.B. 26S-ABR-)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={createGroup} disabled={!newGroupName.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Erstellen
              </Button>
            </div>

            {groups.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Belegkreis</TableHead>
                      <TableHead>Letzte verwendete Nr.</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((g) => (
                      <TableRow key={g.group}>
                        <TableCell className="font-medium">{g.group}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            defaultValue={g.lastUsedNum}
                            onBlur={(e) => {
                              const newNum = parseInt(e.target.value)
                              if (newNum !== g.lastUsedNum && !isNaN(newNum)) {
                                updateGroupNumber(g.group, newNum)
                              }
                            }}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{g.lastUsedNum} Belege</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Keine Belegkreise vorhanden. Erstellen Sie einen neuen Belegkreis oben.</p>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Button variant="outline" asChild>
            <a href="/">Zurück zur Startseite</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
