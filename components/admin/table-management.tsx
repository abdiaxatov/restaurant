"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Pencil, Trash2, Plus, Filter } from "lucide-react"

type Table = {
  id: string
  number: number
  seats: number
  status: "available" | "occupied" | "reserved"
  roomId?: string
  roomName?: string
  tableType?: string
}

type Room = {
  id: string
  name: string
  capacity: number
}

type TableType = {
  id: string
  name: string
  seats: number
}

export function TableManagement() {
  const [tables, setTables] = useState<Table[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [tableTypes, setTableTypes] = useState<TableType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingTable, setIsAddingTable] = useState(false)
  const [isAddingRoom, setIsAddingRoom] = useState(false)
  const [isAddingTableType, setIsAddingTableType] = useState(false)
  const [isEditingTable, setIsEditingTable] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<string>("all")
  const [selectedTableType, setSelectedTableType] = useState<string>("all")
  const [newTableNumber, setNewTableNumber] = useState<number>(1)
  const [newTableSeats, setNewTableSeats] = useState<number>(4)
  const [newTableRoomId, setNewTableRoomId] = useState<string>("")
  const [newTableType, setNewTableType] = useState<string>("")
  const [newRoomName, setNewRoomName] = useState<string>("")
  const [newRoomCapacity, setNewRoomCapacity] = useState<number>(20)
  const [newTableTypeName, setNewTableTypeName] = useState<string>("")
  const [newTableTypeSeats, setNewTableTypeSeats] = useState<number>(4)
  const [batchTableStart, setBatchTableStart] = useState<number>(1)
  const [batchTableCount, setBatchTableCount] = useState<number>(10)
  const [batchTableSeats, setBatchTableSeats] = useState<number>(4)
  const [batchTableRoomId, setBatchTableRoomId] = useState<string>("")
  const [batchTableType, setBatchTableType] = useState<string>("")
  const { toast } = useToast()

  // Fetch tables, rooms, and table types
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tables
        const tablesSnapshot = await getDocs(collection(db, "tables"))
        const tablesData: Table[] = []
        tablesSnapshot.forEach((doc) => {
          tablesData.push({ id: doc.id, ...doc.data() } as Table)
        })

        // Fetch rooms
        const roomsSnapshot = await getDocs(collection(db, "rooms"))
        const roomsData: Room[] = []
        roomsSnapshot.forEach((doc) => {
          roomsData.push({ id: doc.id, ...doc.data() } as Room)
        })

        // Fetch table types
        const tableTypesSnapshot = await getDocs(collection(db, "tableTypes"))
        const tableTypesData: TableType[] = []
        tableTypesSnapshot.forEach((doc) => {
          tableTypesData.push({ id: doc.id, ...doc.data() } as TableType)
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
        console.error("Error fetching data:", error)
        toast({
          title: "Xatolik",
          description: "Ma'lumotlarni yuklashda xatolik yuz berdi.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])

  // Add a single table
  const handleAddTable = async () => {
    try {
      const tableData = {
        number: newTableNumber,
        seats: newTableSeats,
        status: "available",
        roomId: newTableRoomId === "none" ? null : newTableRoomId,
        tableType: newTableType === "none" ? null : newTableType,
      }

      await addDoc(collection(db, "tables"), tableData)

      // Refresh tables
      const tablesSnapshot = await getDocs(collection(db, "tables"))
      const tablesData: Table[] = []
      tablesSnapshot.forEach((doc) => {
        tablesData.push({ id: doc.id, ...doc.data() } as Table)
      })

      // Add room names to tables
      const tablesWithRoomNames = tablesData.map((table) => {
        if (table.roomId) {
          const room = rooms.find((r) => r.id === table.roomId)
          return { ...table, roomName: room ? room.name : "Unknown" }
        }
        return table
      })

      setTables(tablesWithRoomNames)
      setIsAddingTable(false)
      setNewTableNumber(Math.max(...tablesData.map((t) => t.number), 0) + 1)
      setNewTableSeats(4)
      setNewTableRoomId("")
      setNewTableType("")

      toast({
        title: "Muvaffaqiyatli",
        description: "Stol muvaffaqiyatli qo'shildi.",
      })
    } catch (error) {
      console.error("Error adding table:", error)
      toast({
        title: "Xatolik",
        description: "Stolni qo'shishda xatolik yuz berdi.",
        variant: "destructive",
      })
    }
  }

  // Add multiple tables at once
  const handleAddBatchTables = async () => {
    try {
      const batch = writeBatch(db)
      const startNumber = batchTableStart
      const count = batchTableCount

      for (let i = 0; i < count; i++) {
        const tableData = {
          number: startNumber + i,
          seats: batchTableSeats,
          status: "available",
          roomId: batchTableRoomId === "none" ? null : batchTableRoomId,
          tableType: batchTableType === "none" ? null : batchTableType,
        }

        const newTableRef = doc(collection(db, "tables"))
        batch.set(newTableRef, tableData)
      }

      await batch.commit()

      // Refresh tables
      const tablesSnapshot = await getDocs(collection(db, "tables"))
      const tablesData: Table[] = []
      tablesSnapshot.forEach((doc) => {
        tablesData.push({ id: doc.id, ...doc.data() } as Table)
      })

      // Add room names to tables
      const tablesWithRoomNames = tablesData.map((table) => {
        if (table.roomId) {
          const room = rooms.find((r) => r.id === table.roomId)
          return { ...table, roomName: room ? room.name : "Unknown" }
        }
        return table
      })

      setTables(tablesWithRoomNames)
      setBatchTableStart(Math.max(...tablesData.map((t) => t.number), 0) + 1)
      setBatchTableCount(10)
      setBatchTableSeats(4)
      setBatchTableRoomId("")
      setBatchTableType("")

      toast({
        title: "Muvaffaqiyatli",
        description: `${count} ta stol muvaffaqiyatli qo'shildi.`,
      })
    } catch (error) {
      console.error("Error adding batch tables:", error)
      toast({
        title: "Xatolik",
        description: "Stollarni qo'shishda xatolik yuz berdi.",
        variant: "destructive",
      })
    }
  }

  // Add a room
  const handleAddRoom = async () => {
    try {
      const roomData = {
        name: newRoomName,
        capacity: newRoomCapacity,
      }

      await addDoc(collection(db, "rooms"), roomData)

      // Refresh rooms
      const roomsSnapshot = await getDocs(collection(db, "rooms"))
      const roomsData: Room[] = []
      roomsSnapshot.forEach((doc) => {
        roomsData.push({ id: doc.id, ...doc.data() } as Room)
      })

      setRooms(roomsData)
      setIsAddingRoom(false)
      setNewRoomName("")
      setNewRoomCapacity(20)

      toast({
        title: "Muvaffaqiyatli",
        description: "Xona muvaffaqiyatli qo'shildi.",
      })
    } catch (error) {
      console.error("Error adding room:", error)
      toast({
        title: "Xatolik",
        description: "Xonani qo'shishda xatolik yuz berdi.",
        variant: "destructive",
      })
    }
  }

  // Add a table type
  const handleAddTableType = async () => {
    try {
      const tableTypeData = {
        name: newTableTypeName,
        seats: newTableTypeSeats,
      }

      await addDoc(collection(db, "tableTypes"), tableTypeData)

      // Refresh table types
      const tableTypesSnapshot = await getDocs(collection(db, "tableTypes"))
      const tableTypesData: TableType[] = []
      tableTypesSnapshot.forEach((doc) => {
        tableTypesData.push({ id: doc.id, ...doc.data() } as TableType)
      })

      setTableTypes(tableTypesData)
      setIsAddingTableType(false)
      setNewTableTypeName("")
      setNewTableTypeSeats(4)

      toast({
        title: "Muvaffaqiyatli",
        description: "Stol turi muvaffaqiyatli qo'shildi.",
      })
    } catch (error) {
      console.error("Error adding table type:", error)
      toast({
        title: "Xatolik",
        description: "Stol turini qo'shishda xatolik yuz berdi.",
        variant: "destructive",
      })
    }
  }

  // Edit a table
  const handleEditTable = async () => {
    if (!selectedTable) return

    try {
      const tableData = {
        number: newTableNumber,
        seats: newTableSeats,
        status: selectedTable.status,
        roomId: newTableRoomId === "none" ? null : newTableRoomId,
        tableType: newTableType === "none" ? null : newTableType,
      }

      await setDoc(doc(db, "tables", selectedTable.id), tableData)

      // Refresh tables
      const tablesSnapshot = await getDocs(collection(db, "tables"))
      const tablesData: Table[] = []
      tablesSnapshot.forEach((doc) => {
        tablesData.push({ id: doc.id, ...doc.data() } as Table)
      })

      // Add room names to tables
      const tablesWithRoomNames = tablesData.map((table) => {
        if (table.roomId) {
          const room = rooms.find((r) => r.id === table.roomId)
          return { ...table, roomName: room ? room.name : "Unknown" }
        }
        return table
      })

      setTables(tablesWithRoomNames)
      setIsEditingTable(false)
      setSelectedTable(null)

      toast({
        title: "Muvaffaqiyatli",
        description: "Stol muvaffaqiyatli tahrirlandi.",
      })
    } catch (error) {
      console.error("Error editing table:", error)
      toast({
        title: "Xatolik",
        description: "Stolni tahrirlashda xatolik yuz berdi.",
        variant: "destructive",
      })
    }
  }

  // Delete a table
  const handleDeleteTable = async (tableId: string) => {
    try {
      await deleteDoc(doc(db, "tables", tableId))

      // Remove table from state
      setTables(tables.filter((table) => table.id !== tableId))

      toast({
        title: "Muvaffaqiyatli",
        description: "Stol muvaffaqiyatli o'chirildi.",
      })
    } catch (error) {
      console.error("Error deleting table:", error)
      toast({
        title: "Xatolik",
        description: "Stolni o'chirishda xatolik yuz berdi.",
        variant: "destructive",
      })
    }
  }

  // Delete a room
  const handleDeleteRoom = async (roomId: string) => {
    try {
      // Check if there are tables using this room
      const tablesInRoom = tables.filter((table) => table.roomId === roomId)
      if (tablesInRoom.length > 0) {
        toast({
          title: "Xatolik",
          description: "Bu xonada stollar mavjud. Avval stollarni o'chiring.",
          variant: "destructive",
        })
        return
      }

      await deleteDoc(doc(db, "rooms", roomId))

      // Remove room from state
      setRooms(rooms.filter((room) => room.id !== roomId))

      toast({
        title: "Muvaffaqiyatli",
        description: "Xona muvaffaqiyatli o'chirildi.",
      })
    } catch (error) {
      console.error("Error deleting room:", error)
      toast({
        title: "Xatolik",
        description: "Xonani o'chirishda xatolik yuz berdi.",
        variant: "destructive",
      })
    }
  }

  // Delete a table type
  const handleDeleteTableType = async (tableTypeId: string) => {
    try {
      // Check if there are tables using this type
      const tablesWithType = tables.filter((table) => table.tableType === tableTypeId)
      if (tablesWithType.length > 0) {
        toast({
          title: "Xatolik",
          description: "Bu turdagi stollar mavjud. Avval stollarni o'chiring.",
          variant: "destructive",
        })
        return
      }

      await deleteDoc(doc(db, "tableTypes", tableTypeId))

      // Remove table type from state
      setTableTypes(tableTypes.filter((type) => type.id !== tableTypeId))

      toast({
        title: "Muvaffaqiyatli",
        description: "Stol turi muvaffaqiyatli o'chirildi.",
      })
    } catch (error) {
      console.error("Error deleting table type:", error)
      toast({
        title: "Xatolik",
        description: "Stol turini o'chirishda xatolik yuz berdi.",
        variant: "destructive",
      })
    }
  }

  // Filter tables by room and type
  const filteredTables = tables.filter((table) => {
    const roomMatch = selectedRoom === "all" || table.roomId === selectedRoom
    const typeMatch = selectedTableType === "all" || table.tableType === selectedTableType
    return roomMatch && typeMatch
  })

  return (
    <AdminLayout>
      <div className="container mx-auto p-4">
        <h1 className="mb-6 text-2xl font-bold">Stollar boshqaruvi</h1>

        <Tabs defaultValue="tables">
          <TabsList className="mb-4">
            <TabsTrigger value="tables">Stollar</TabsTrigger>
            <TabsTrigger value="rooms">Xonalar</TabsTrigger>
            <TabsTrigger value="tableTypes">Stol turlari</TabsTrigger>
          </TabsList>

          {/* Tables Tab */}
          <TabsContent value="tables">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
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

              <div className="flex gap-2">
                <Dialog open={isAddingTable} onOpenChange={setIsAddingTable}>
                  <DialogTrigger asChild>
                    <Button>Yangi stol qo'shish</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Yangi stol qo'shish</DialogTitle>
                      <DialogDescription>Stol ma'lumotlarini kiriting</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tableNumber">Stol raqami</Label>
                          <Input
                            id="tableNumber"
                            type="number"
                            value={newTableNumber}
                            onChange={(e) => setNewTableNumber(Number.parseInt(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tableSeats">O'rinlar soni</Label>
                          <Input
                            id="tableSeats"
                            type="number"
                            value={newTableSeats}
                            onChange={(e) => setNewTableSeats(Number.parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tableRoom">Xona</Label>
                        <Select value={newTableRoomId} onValueChange={setNewTableRoomId}>
                          <SelectTrigger id="tableRoom">
                            <SelectValue placeholder="Xonani tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Xonasiz</SelectItem>
                            {rooms.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tableType">Stol turi</Label>
                        <Select value={newTableType} onValueChange={setNewTableType}>
                          <SelectTrigger id="tableType">
                            <SelectValue placeholder="Stol turini tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Turisiz</SelectItem>
                            {tableTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name} ({type.seats} o'rin)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingTable(false)}>
                        Bekor qilish
                      </Button>
                      <Button onClick={handleAddTable}>Qo'shish</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Ko'p stollarni qo'shish</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ko'p stollarni qo'shish</DialogTitle>
                      <DialogDescription>Bir vaqtda bir nechta stol qo'shish</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="batchStart">Boshlang'ich raqam</Label>
                          <Input
                            id="batchStart"
                            type="number"
                            value={batchTableStart}
                            onChange={(e) => setBatchTableStart(Number.parseInt(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="batchCount">Stollar soni</Label>
                          <Input
                            id="batchCount"
                            type="number"
                            value={batchTableCount}
                            onChange={(e) => setBatchTableCount(Number.parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="batchSeats">O'rinlar soni</Label>
                        <Input
                          id="batchSeats"
                          type="number"
                          value={batchTableSeats}
                          onChange={(e) => setBatchTableSeats(Number.parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="batchRoom">Xona</Label>
                        <Select value={batchTableRoomId} onValueChange={setBatchTableRoomId}>
                          <SelectTrigger id="batchRoom">
                            <SelectValue placeholder="Xonani tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Xonasiz</SelectItem>
                            {rooms.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="batchType">Stol turi</Label>
                        <Select value={batchTableType} onValueChange={setBatchTableType}>
                          <SelectTrigger id="batchType">
                            <SelectValue placeholder="Stol turini tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Turisiz</SelectItem>
                            {tableTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name} ({type.seats} o'rin)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingTable(false)}>
                        Bekor qilish
                      </Button>
                      <Button onClick={handleAddBatchTables}>Qo'shish</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {isLoading ? (
              <p>Yuklanmoqda...</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredTables.length === 0 ? (
                  <p>Stollar topilmadi.</p>
                ) : (
                  filteredTables.map((table) => (
                    <Card key={table.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 p-4">
                        <CardTitle className="flex items-center justify-between">
                          <span>Stol #{table.number}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedTable(table)
                                setNewTableNumber(table.number)
                                setNewTableSeats(table.seats)
                                setNewTableRoomId(table.roomId || "")
                                setNewTableType(table.tableType || "")
                                setIsEditingTable(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTable(table.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardTitle>
                        <CardDescription>
                          {table.seats} o'rinli
                          {table.roomName && ` • ${table.roomName}`}
                          {table.tableType && ` • ${tableTypes.find((t) => t.id === table.tableType)?.name || ""}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              table.status === "available"
                                ? "bg-green-100 text-green-800"
                                : table.status === "occupied"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {table.status === "available"
                              ? "Bo'sh"
                              : table.status === "occupied"
                                ? "Band"
                                : "Rezerv qilingan"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Edit Table Dialog */}
            <Dialog open={isEditingTable} onOpenChange={setIsEditingTable}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Stolni tahrirlash</DialogTitle>
                  <DialogDescription>Stol ma'lumotlarini o'zgartiring</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editTableNumber">Stol raqami</Label>
                      <Input
                        id="editTableNumber"
                        type="number"
                        value={newTableNumber}
                        onChange={(e) => setNewTableNumber(Number.parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editTableSeats">O'rinlar soni</Label>
                      <Input
                        id="editTableSeats"
                        type="number"
                        value={newTableSeats}
                        onChange={(e) => setNewTableSeats(Number.parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editTableRoom">Xona</Label>
                    <Select value={newTableRoomId} onValueChange={setNewTableRoomId}>
                      <SelectTrigger id="editTableRoom">
                        <SelectValue placeholder="Xonani tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Xonasiz</SelectItem>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editTableType">Stol turi</Label>
                    <Select value={newTableType} onValueChange={setNewTableType}>
                      <SelectTrigger id="editTableType">
                        <SelectValue placeholder="Stol turini tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Turisiz</SelectItem>
                        {tableTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} ({type.seats} o'rin)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditingTable(false)}>
                    Bekor qilish
                  </Button>
                  <Button onClick={handleEditTable}>Saqlash</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Rooms Tab */}
          <TabsContent value="rooms">
            <div className="mb-4 flex justify-between">
              <h2 className="text-xl font-semibold">Xonalar</h2>
              <Dialog open={isAddingRoom} onOpenChange={setIsAddingRoom}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Yangi xona qo'shish
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yangi xona qo'shish</DialogTitle>
                    <DialogDescription>Xona ma'lumotlarini kiriting</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="roomName">Xona nomi</Label>
                      <Input id="roomName" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roomCapacity">Sig'imi</Label>
                      <Input
                        id="roomCapacity"
                        type="number"
                        value={newRoomCapacity}
                        onChange={(e) => setNewRoomCapacity(Number.parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingRoom(false)}>
                      Bekor qilish
                    </Button>
                    <Button onClick={handleAddRoom}>Qo'shish</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <p>Yuklanmoqda...</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rooms.length === 0 ? (
                  <p>Xonalar topilmadi.</p>
                ) : (
                  rooms.map((room) => (
                    <Card key={room.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between">
                          <span>{room.name}</span>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRoom(room.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardTitle>
                        <CardDescription>Sig'imi: {room.capacity} kishi</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Stollar soni: {tables.filter((table) => table.roomId === room.id).length}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          {/* Table Types Tab */}
          <TabsContent value="tableTypes">
            <div className="mb-4 flex justify-between">
              <h2 className="text-xl font-semibold">Stol turlari</h2>
              <Dialog open={isAddingTableType} onOpenChange={setIsAddingTableType}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Yangi stol turi qo'shish
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yangi stol turi qo'shish</DialogTitle>
                    <DialogDescription>Stol turi ma'lumotlarini kiriting</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="tableTypeName">Tur nomi</Label>
                      <Input
                        id="tableTypeName"
                        value={newTableTypeName}
                        onChange={(e) => setNewTableTypeName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tableTypeSeats">O'rinlar soni</Label>
                      <Input
                        id="tableTypeSeats"
                        type="number"
                        value={newTableTypeSeats}
                        onChange={(e) => setNewTableTypeSeats(Number.parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingTableType(false)}>
                      Bekor qilish
                    </Button>
                    <Button onClick={handleAddTableType}>Qo'shish</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <p>Yuklanmoqda...</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tableTypes.length === 0 ? (
                  <p>Stol turlari topilmadi.</p>
                ) : (
                  tableTypes.map((type) => (
                    <Card key={type.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between">
                          <span>{type.name}</span>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTableType(type.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardTitle>
                        <CardDescription>O'rinlar soni: {type.seats}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Stollar soni: {tables.filter((table) => table.tableType === type.id).length}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
