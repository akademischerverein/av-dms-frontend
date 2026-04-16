"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, Search, ArrowUpDown } from "lucide-react"

interface Account {
    number: number
    name: string
    type: string
    label?: string
    value?: number
}

interface PersonSelectorProps {
    accounts: Account[]
    value: number | string | null
    onValueChange: (value: number | string) => void
    placeholder?: string
    className?: string
}

export function PersonSelector({
    accounts,
    value,
    onValueChange,
    placeholder = "Person auswählen",
    className,
}: PersonSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

    // Filter to only show person accounts (DEBTORS and CREDITORS)
    const personAccounts = React.useMemo(() => {
        return accounts.filter((acc) => acc.type === "DEBTORS" || acc.type === "CREDITORS")
    }, [accounts])

    // Filter accounts based on search
    const filteredAccounts = React.useMemo(() => {
        let filtered = personAccounts

        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(
                (acc) =>
                    acc.name.toLowerCase().includes(query) ||
                    acc.number.toString().includes(query)
            )
        }

        // Sort alphabetically by name
        filtered = [...filtered].sort((a, b) => {
            const comparison = a.name.localeCompare(b.name, 'de')
            return sortOrder === "asc" ? comparison : -comparison
        })

        return filtered
    }, [personAccounts, searchQuery, sortOrder])

    const selectedAccount = accounts.find((acc) => String(acc.number) === String(value))

    const toggleSortOrder = () => {
        setSortOrder(prev => prev === "asc" ? "desc" : "asc")
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between", className)}
                >
                    <span className="truncate">
                        {selectedAccount ? selectedAccount.name : placeholder}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0" align="start">
                <div className="flex flex-col">
                    {/* Search and Sort Header */}
                    <div className="p-3 border-b space-y-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Suchen nach Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                {filteredAccounts.length} Personen
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleSortOrder}
                                className="h-7 text-xs"
                            >
                                <ArrowUpDown className="h-3 w-3 mr-1" />
                                {sortOrder === "asc" ? "A → Z" : "Z → A"}
                            </Button>
                        </div>
                    </div>

                    {/* Account List */}
                    <div className="max-h-[300px] overflow-y-auto">
                        {filteredAccounts.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                Keine Person gefunden
                            </div>
                        ) : (
                            filteredAccounts.map((account) => (
                                <button
                                    key={account.number}
                                    onClick={() => {
                                        onValueChange(String(account.number))
                                        setOpen(false)
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 text-left hover:bg-accent text-sm",
                                        String(value) === String(account.number) && "bg-accent"
                                    )}
                                >
                                    <span className="truncate">{account.name}</span>
                                    {String(value) === String(account.number) && (
                                        <Check className="h-4 w-4 shrink-0 text-primary" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
