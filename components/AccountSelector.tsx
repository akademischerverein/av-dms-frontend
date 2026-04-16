"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Search, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Check } from "lucide-react"

// Account type definitions
export interface Account {
    number: number
    name: string
    type: string
    label?: string
    value?: number
}

// Category configuration with user-friendly German labels
// Categories can be customized based on the organization's needs
const ACCOUNT_CATEGORIES = {
    food: {
        label: "Essen/Trinken",
        types: ["FOOD", "BEVERAGES", "GROCERIES"],
        // Account numbers or name patterns that should go in this category
        patterns: ["Lebensmittel", "Getränke", "Essen", "Trinken", "Grillen", "Küche"],
    },
    party: {
        label: "Party/Events",
        types: ["EVENTS", "PARTY"],
        patterns: ["Party", "Aktivitas", "Feier", "Event", "Veranstaltung"],
    },
    office: {
        label: "Büro/Material",
        types: ["OFFICE", "SUPPLIES"],
        patterns: ["Büro", "Material", "Druck", "Papier", "Porto"],
    },
    utilities: {
        label: "Nebenkosten",
        types: ["UTILITIES"],
        patterns: ["Strom", "Gas", "Wasser", "Heizung", "Internet", "Telefon", "Versicherung"],
    },
    maintenance: {
        label: "Instandhaltung",
        types: ["MAINTENANCE", "REPAIRS"],
        patterns: ["Reparatur", "Wartung", "Renovierung", "Instandhaltung"],
    },
    income: {
        label: "Einnahmen",
        types: ["REVENUE", "INCOME", "INTEREST_INCOME"],
        patterns: ["Beitrag", "Spende", "Miete", "Einnahme", "Zins"],
    },
    banking: {
        label: "Bank/Kasse",
        types: ["ASSETS", "CASH", "BANK", "FINANCIAL"],
        patterns: ["Kasse", "Bank", "Giro", "Spar", "Konto"],
    },
    other: {
        label: "Sonstige",
        types: [], // Catch-all for unmatched
        patterns: [],
    },
} as const

type CategoryKey = keyof typeof ACCOUNT_CATEGORIES
type SortField = "number" | "name"
type SortDirection = "asc" | "desc"

interface AccountSelectorProps {
    accounts: Account[]
    value?: number | string | null
    onValueChange: (value: number) => void
    placeholder?: string
    excludeTypes?: string[]
    className?: string
    disabled?: boolean
}

function categorizeAccount(account: Account): CategoryKey {
    // First try to match by account type
    for (const [key, category] of Object.entries(ACCOUNT_CATEGORIES)) {
        if (key === "other") continue
        if (category.types.includes(account.type)) {
            return key as CategoryKey
        }
    }

    // Then try to match by name patterns
    const accountName = account.name.toLowerCase()
    for (const [key, category] of Object.entries(ACCOUNT_CATEGORIES)) {
        if (key === "other") continue
        if (category.patterns && category.patterns.some((pattern: string) =>
            accountName.includes(pattern.toLowerCase())
        )) {
            return key as CategoryKey
        }
    }

    return "other"
}

export function AccountSelector({
    accounts,
    value,
    onValueChange,
    placeholder = "Konto auswählen",
    excludeTypes = [],
    className,
    disabled = false,
}: AccountSelectorProps) {
    const [open, setOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [sortField, setSortField] = useState<SortField>("number")
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
    const [activeTab, setActiveTab] = useState<CategoryKey>("food")

    // Filter out excluded types
    const filteredAccounts = useMemo(() => {
        return accounts.filter((acc) => !excludeTypes.includes(acc.type))
    }, [accounts, excludeTypes])

    // Group accounts by category
    const categorizedAccounts = useMemo(() => {
        const categories: Record<CategoryKey, Account[]> = {
            food: [],
            party: [],
            office: [],
            utilities: [],
            maintenance: [],
            income: [],
            banking: [],
            other: [],
        }

        for (const account of filteredAccounts) {
            const category = categorizeAccount(account)
            categories[category].push(account)
        }

        return categories
    }, [filteredAccounts])

    // Get accounts for current tab with search and sort applied
    const displayedAccounts = useMemo(() => {
        let tabAccounts = categorizedAccounts[activeTab] || []

        // Apply search filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase()
            tabAccounts = tabAccounts.filter(
                (acc) =>
                    acc.name.toLowerCase().includes(lowerSearch) ||
                    String(acc.number).includes(lowerSearch)
            )
        }

        // Apply sorting
        tabAccounts = [...tabAccounts].sort((a, b) => {
            let comparison = 0
            if (sortField === "number") {
                comparison = a.number - b.number
            } else {
                comparison = a.name.localeCompare(b.name, "de")
            }
            return sortDirection === "asc" ? comparison : -comparison
        })

        return tabAccounts
    }, [categorizedAccounts, activeTab, searchTerm, sortField, sortDirection])

    // Find selected account for display
    const selectedAccount = useMemo(() => {
        if (value === null || value === undefined) return null
        const numValue = typeof value === "string" ? parseInt(value) : value
        return filteredAccounts.find((acc) => acc.number === numValue) || null
    }, [filteredAccounts, value])

    // Get counts for each category (for badges)
    const categoryCounts = useMemo(() => {
        const counts: Record<CategoryKey, number> = {
            food: 0,
            party: 0,
            office: 0,
            utilities: 0,
            maintenance: 0,
            income: 0,
            banking: 0,
            other: 0,
        }
        for (const [key, accounts] of Object.entries(categorizedAccounts)) {
            counts[key as CategoryKey] = accounts.length
        }
        return counts
    }, [categorizedAccounts])

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
        } else {
            setSortField(field)
            setSortDirection("asc")
        }
    }

    const handleSelect = (account: Account) => {
        onValueChange(account.number)
        setOpen(false)
        setSearchTerm("")
    }

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return <ArrowUpDown className="h-3 w-3 opacity-50" />
        }
        return sortDirection === "asc" ? (
            <ArrowUp className="h-3 w-3" />
        ) : (
            <ArrowDown className="h-3 w-3" />
        )
    }

    // Get non-empty categories for tabs
    const visibleCategories = useMemo(() => {
        return (Object.keys(ACCOUNT_CATEGORIES) as CategoryKey[]).filter(
            (key) => categoryCounts[key] > 0
        )
    }, [categoryCounts])

    // Set initial active tab to first non-empty category
    React.useEffect(() => {
        if (visibleCategories.length > 0 && !visibleCategories.includes(activeTab)) {
            setActiveTab(visibleCategories[0])
        }
    }, [visibleCategories, activeTab])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between font-normal",
                        !selectedAccount && "text-muted-foreground",
                        className
                    )}
                >
                    {selectedAccount ? (
                        <span className="truncate">
                            {selectedAccount.number} - {selectedAccount.name}
                        </span>
                    ) : (
                        <span>{placeholder}</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <div className="p-3 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Suchen nach Name oder Nummer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryKey)}>
                    <div className="border-b px-2">
                        <TabsList className="w-full h-auto flex-wrap gap-1 bg-transparent p-1">
                            {visibleCategories.map((key) => (
                                <TabsTrigger
                                    key={key}
                                    value={key}
                                    className="text-xs px-2 py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                >
                                    {ACCOUNT_CATEGORIES[key].label}
                                    <span className="ml-1 text-[10px] opacity-70">
                                        ({categoryCounts[key]})
                                    </span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    {/* Sort controls */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                        <span className="text-xs text-muted-foreground">Sortieren:</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => toggleSort("number")}
                        >
                            Nr. <SortIcon field="number" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => toggleSort("name")}
                        >
                            Name <SortIcon field="name" />
                        </Button>
                    </div>

                    {visibleCategories.map((key) => (
                        <TabsContent key={key} value={key} className="m-0">
                            <ScrollArea className="h-[280px]">
                                {displayedAccounts.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        {searchTerm
                                            ? "Keine Konten gefunden"
                                            : "Keine Konten in dieser Kategorie"}
                                    </div>
                                ) : (
                                    <div className="p-1">
                                        {displayedAccounts.map((account) => {
                                            const isSelected = selectedAccount?.number === account.number
                                            return (
                                                <button
                                                    key={account.number}
                                                    onClick={() => handleSelect(account)}
                                                    className={cn(
                                                        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-left transition-colors",
                                                        "hover:bg-accent hover:text-accent-foreground",
                                                        isSelected && "bg-accent"
                                                    )}
                                                >
                                                    <span className="font-mono text-xs text-muted-foreground w-12 shrink-0">
                                                        {account.number}
                                                    </span>
                                                    <span className="flex-1 truncate">{account.name}</span>
                                                    {isSelected && (
                                                        <Check className="h-4 w-4 shrink-0 text-primary" />
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>
                    ))}
                </Tabs>
            </PopoverContent>
        </Popover>
    )
}
