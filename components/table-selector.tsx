"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Table, Filter } from "lucide-react"

type TableProps = {
  id: string
  number: number
  seats: number
  status: "available" | "occupied" | "reserved"
  roomId?: string
  roomName?: string
  tableType?: string
}

type RoomProps = {
  id: string
  name: string
  capacity: number
}

type TableTypeProps = {
  id: string
  name: string
  seats: number
}

interface TableSelectorProps {
  onSelectTable: (tableId: string, tableNumber: number) => void
  selectedTableId?: string
}

export function TableSelector({ onSelectTable, selectedTableId }: TableSelectorProps) {
  const [tables, setTables] = useState<TableProps[]>([])
  const [rooms, setRooms] = useState<RoomProps[]>([])
  const [tableTypes, setTableTypes] = useState<TableTypeProps[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<string>("all")
  const [selectedTableType, setSelectedTableType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch available tables
        const tablesQuery = query(collection(db, "tables"), where("status", "==", "available"))
        const tablesSnapshot = await getDocs(tablesQuery)
        const tablesData: TableProps[] = []
        tablesSnapshot.forEach((doc) => {
          tablesData.push({ id: doc.id, ...doc.data() } as TableProps)
        })

        // Fetch rooms
        const roomsSnapshot = await getDocs(collection(db, "rooms"))
        const roomsData: RoomProps[] = []
        roomsSnapshot.forEach((doc) => {
          roomsData.push({ id: doc.id, ...doc.data() } as RoomProps)
        })

        // Fetch table types
        const tableTypesSnapshot = await getDocs(collection(db, "tableTypes"))
        const tableTypesData: TableTypeProps[] = []
        tableTypesSnapshot.forEach((doc) => {
          tableTypesData.push({ id: doc.id, ...doc.data() } as TableTypeProps)
        })

        // Add room names to tables
        const tablesWithRoomNames = tablesData.map((table) => {
          if (table.roomId) {
            const room = roomsData.find((r) => r.id === table.roomId)
            return { ...table, roomName: room ? room.name : "Unknown" }
          }
          return table
        })

        setTables(tablesWithRoomNames)
        setRooms(roomsData)
        setTableTypes(tableTypesData)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching tables:", error)
        toast({
          title: "Xatolik",
          description: "Stollarni yuklashda xatolik yuz berdi.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    if (isOpen) {
      fetchData()
    }
  }, [isOpen, toast])

  // Filter tables by room, type, and search query
  const filteredTables = tables.filter((table) => {
    const roomMatch = selectedRoom === "all" || table.roomId === selectedRoom
    const typeMatch = selectedTableType === "all" || table.tableType === selectedTableType
    const searchMatch = searchQuery === "" || table.number.toString().includes(searchQuery)
    return roomMatch && typeMatch && searchMatch
  })

  // Get selected table number
  const selectedTableNumber = tables.find((table) => table.id === selectedTableId)?.number || 0

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Table className="mr-2 h-4 w-4" />
          {selectedTableId ? `Stol #${selectedTableNumber}` : "Stol tanlang"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Stol tanlash</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Xonani tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha xonalar</SelectItem>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTableType} onValueChange={setSelectedTableType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stol turini tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha turlar</SelectItem>
                {tableTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} ({type.seats} o'rin)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Filter className="h-4 w-4" /> Filter
            </Button>
          </div>

          <div>
            <Label htmlFor="searchTable">Stol raqami bo'yicha qidirish</Label>
            <Input
              id="searchTable"
              placeholder="Stol raqamini kiriting..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading ? (
            <p>Stollar yuklanmoqda...</p>
          ) : (
            <div className="grid max-h-[300px] gap-2 overflow-y-auto sm:grid-cols-2 md:grid-cols-3">
              {filteredTables.length === 0 ? (
                <p>Bo'sh stollar topilmadi.</p>
              ) : (
                filteredTables.map((table) => (
                  <Card
                    key={table.id}
                    className={`cursor-pointer transition-all hover:bg-muted ${
                      selectedTableId === table.id ? "border-2 border-primary" : ""
                    }`}
                    onClick={() => {
                      onSelectTable(table.id, table.number)
                      setIsOpen(false)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Stol #{table.number}</span>
                          <span className="text-sm">{table.seats} o'rin</span>
                        </div>
                        {table.roomName && <span className="text-xs text-muted-foreground">{table.roomName}</span>}
                        {table.tableType && (
                          <span className="text-xs text-muted-foreground">
                            {tableTypes.find((t) => t.id === table.tableType)?.name || ""}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
