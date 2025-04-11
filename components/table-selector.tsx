// Fix the TableSelector component to properly display table numbers
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TableSelectorProps {
  selectedTable: number | null
  onSelectTable: (tableNumber: number) => void
  hasError?: boolean
}

export function TableSelector({ selectedTable, onSelectTable, hasError = false }: TableSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Generate some sample tables for demonstration
  const tables = Array.from({ length: 20 }, (_, i) => ({
    id: (i + 1).toString(),
    number: i + 1,
    seats: Math.floor(Math.random() * 4) + 2, // Random seats between 2-6
    status: "available" as const,
  }))

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={`w-full justify-start ${hasError ? "border-destructive" : ""}`}>
          <Table className="mr-2 h-4 w-4" />
          {selectedTable ? `Stol #${selectedTable}` : "Stol tanlang"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Stol tanlash</DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-4 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
          {tables.map((table) => (
            <Card
              key={table.id}
              className={`cursor-pointer transition-all hover:bg-muted ${
                selectedTable === table.number ? "border-2 border-primary" : ""
              }`}
              onClick={() => {
                onSelectTable(table.number)
                setIsOpen(false)
              }}
            >
              <CardContent className="p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">Stol #{table.number}</span>
                    <Badge variant="outline">{table.seats} o'rin</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Mavjud</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
