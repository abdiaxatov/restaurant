"use client"

import { useState, useEffect } from "react"
import {
  collection,
  doc,
  deleteDoc,
  writeBatch,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  getDocs,
  where,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Pencil, Trash2, Plus, Loader2, LayoutGrid, Home, RefreshCw, ClipboardList } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type Table = {
  id: string
  number: number
  seats: number
  status: "available" | "occupied" | "reserved"
  roomId?: string | null
  createdAt?: any
  updatedAt?: any
}

type Room = {
  id: string
  number: number
  capacity: number
  status?: "available" | "occupied"
  createdAt?: any
  updatedAt?: any
}

type Order = {
  id: string
  orderType: "table" | "delivery"
  tableNumber?: number | null
  roomNumber?: number | null
  status: string
  createdAt: any
  items: any[]
  total: number
}

export function TableManagement() {
  const [tables, setTables] = useState<Table[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("tables")

  // Table state
  const [isAddingTable, setIsAddingTable] = useState(false)
  const [isEditingTable, setIsEditingTable] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [newTableNumber, setNewTableNumber] = useState<number>(1)
  const [newTableSeats, setNewTableSeats] = useState<number>(4)
  const [newTableRoomId, setNewTableRoomId] = useState<string | null>(null)
  const [newTableStatus, setNewTableStatus] = useState<"available" | "occupied" | "reserved">("available")
  const [showOccupiedTables, setShowOccupiedTables] = useState(true)
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string | null>(null)

  // Batch table creation
  const [isBatchAddingTables, setIsBatchAddingTables] = useState(false)
  const [batchTableCount, setBatchTableCount] = useState<number>(10)
  const [batchTableStartNumber, setBatchTableStartNumber] = useState<number>(1)
  const [batchTableSeats, setBatchTableSeats] = useState<number>(4)
  const [batchTableRoomId, setBatchTableRoomId] = useState<string | null>(null)

  // Room state
  const [isAddingRoom, setIsAddingRoom] = useState(false)
  const [isEditingRoom, setIsEditingRoom] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [newRoomNumber, setNewRoomNumber] = useState<number>(1)
  const [newRoomCapacity, setNewRoomCapacity] = useState<number>(20)
  const [newRoomStatus, setNewRoomStatus] = useState<"available" | "occupied">("available")
  const [showOccupiedRooms, setShowOccupiedRooms] = useState(true)

  // Room tables view
  const [viewingRoomTables, setViewingRoomTables] = useState<Room | null>(null)
  const [roomTables, setRoomTables] = useState<Table[]>([])

  // Order details view
  const [viewingOrderDetails, setViewingOrderDetails] = useState<Order | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ", {
      style: "currency",
      currency: "UZS",
    }).format(amount)
  }

  // Fetch tables, rooms, and active orders
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Tables listener
        const tablesUnsubscribe = onSnapshot(
          collection(db, "tables"),
          (snapshot) => {
            const tablesData: Table[] = []
            snapshot.forEach((doc) => {
              tablesData.push({ id: doc.id, ...doc.data() } as Table)
            })

            // Sort tables by number
            tablesData.sort((a, b) => a.number - b.number)
            setTables(tablesData)

            // Set next table number suggestion
            if (tablesData.length > 0) {
              const maxTableNumber = Math.max(...tablesData.map((t) => t.number))
              setNewTableNumber(maxTableNumber + 1)
              setBatchTableStartNumber(maxTableNumber + 1)
            }
          },
          (error) => {
            console.error("Error fetching tables:", error)
            toast({
              title: "Xatolik",
              description: "Stollarni yuklashda xatolik yuz berdi",
              variant: "destructive",
            })
          },
        )

        // Rooms listener
        const roomsUnsubscribe = onSnapshot(
          collection(db, "rooms"),
          (snapshot) => {
            const roomsData: Room[] = []
            snapshot.forEach((doc) => {
              roomsData.push({ id: doc.id, ...doc.data() } as Room)
            })

            // Sort rooms by number
            roomsData.sort((a, b) => a.number - b.number)
            setRooms(roomsData)

            // Set next room number suggestion
            if (roomsData.length > 0) {
              const maxRoomNumber = Math.max(...roomsData.map((r) => r.number))
              setNewRoomNumber(maxRoomNumber + 1)
            }

            setIsLoading(false)
          },
          (error) => {
            console.error("Error fetching rooms:", error)
            toast({
              title: "Xatolik",
              description: "Xonalarni yuklashda xatolik yuz berdi",
              variant: "destructive",
            })
            setIsLoading(false)
          },
        )

        // Active orders listener (pending, preparing, ready)
        const ordersUnsubscribe = onSnapshot(
          query(collection(db, "orders"), where("status", "in", ["pending", "preparing", "ready"])),
          (snapshot) => {
            const ordersData: Order[] = []
            snapshot.forEach((doc) => {
              ordersData.push({ id: doc.id, ...doc.data() } as Order)
            })
            setActiveOrders(ordersData)
          },
          (error) => {
            console.error("Error fetching active orders:", error)
          },
        )

        return () => {
          tablesUnsubscribe()
          roomsUnsubscribe()
          ordersUnsubscribe()
        }
      } catch (error) {
        console.error("Error setting up listeners:", error)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])

  // Fetch tables for a specific room when viewing room tables
  useEffect(() => {
    if (!viewingRoomTables) {
      setRoomTables([])
      return
    }

    const fetchRoomTables = async () => {
      try {
        const q = query(collection(db, "tables"), where("roomId", "==", viewingRoomTables.id))

        const querySnapshot = await getDocs(q)
        const roomTablesData: Table[] = []

        querySnapshot.forEach((doc) => {
          roomTablesData.push({ id: doc.id, ...doc.data() } as Table)
        })

        // Sort tables by number
        roomTablesData.sort((a, b) => a.number - b.number)
        setRoomTables(roomTablesData)
      } catch (error) {
        console.error("Error fetching room tables:", error)
        toast({
          title: "Xatolik",
          description: "Xonadagi stollarni yuklashda xatolik yuz berdi",
          variant: "destructive",
        })
      }
    }

    fetchRoomTables()
  }, [viewingRoomTables, toast])

  // Filter tables based on selected filters
  const filteredTables = tables.filter((table) => {
    const statusMatch = showOccupiedTables ? true : table.status === "available"
    const roomMatch = !selectedRoomFilter || selectedRoomFilter === "all" ? true : table.roomId === selectedRoomFilter
    return statusMatch && roomMatch
  })

  // Filter rooms based on selected filters
  const filteredRooms = rooms.filter((room) => {
    return showOccupiedRooms ? true : room.status === "available" || !room.status
  })

  // Check if a table has an active order
  const hasActiveOrder = (tableNumber: number) => {
    return activeOrders.some((order) => order.tableNumber === tableNumber)
  }

  // Check if a room has an active order
  const hasActiveRoomOrder = (roomNumber: number) => {
    return activeOrders.some((order) => order.roomNumber === roomNumber)
  }

  // Get active order for a table
  const getActiveOrderForTable = (tableNumber: number) => {
    return activeOrders.find((order) => order.tableNumber === tableNumber)
  }

  // Get active order for a room
  const getActiveOrderForRoom = (roomNumber: number) => {
    return activeOrders.find((order) => order.roomNumber === roomNumber)
  }

  // Add a single table
  const handleAddTable = async () => {
    setIsSubmitting(true)

    try {
      const tableData = {
        number: newTableNumber,
        seats: newTableSeats,
        status: newTableStatus,
        roomId: newTableRoomId === "none" ? null : newTableRoomId,
        createdAt: new Date(),
      }

      await addDoc(collection(db, "tables"), tableData)

      setIsAddingTable(false)
      setNewTableNumber((prev) => prev + 1)
      setNewTableSeats(4)
      setNewTableRoomId(null)
      setNewTableStatus("available")

      toast({
        title: "Muvaffaqiyatli",
        description: "Stol muvaffaqiyatli qo'shildi",
      })
    } catch (error) {
      console.error("Error adding table:", error)
      toast({
        title: "Xatolik",
        description: "Stolni qo'shishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add multiple tables at once
  const handleBatchAddTables = async () => {
    setIsSubmitting(true)

    try {
      const batch = writeBatch(db)

      for (let i = 0; i < batchTableCount; i++) {
        const tableData = {
          number: batchTableStartNumber + i,
          seats: batchTableSeats,
          status: "available",
          roomId: batchTableRoomId === "none" ? null : batchTableRoomId,
          createdAt: new Date(),
        }

        const newTableRef = doc(collection(db, "tables"))
        batch.set(newTableRef, tableData)
      }

      await batch.commit()

      setIsBatchAddingTables(false)
      setBatchTableStartNumber((prev) => prev + batchTableCount)

      toast({
        title: "Muvaffaqiyatli",
        description: `${batchTableCount} ta stol muvaffaqiyatli qo'shildi`,
      })
    } catch (error) {
      console.error("Error batch adding tables:", error)
      toast({
        title: "Xatolik",
        description: "Stollarni qo'shishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Edit a table
  const handleEditTable = async () => {
    if (!selectedTable) return
    setIsSubmitting(true)

    try {
      const tableData = {
        number: newTableNumber,
        seats: newTableSeats,
        status: newTableStatus,
        roomId: newTableRoomId === "none" ? null : newTableRoomId,
        updatedAt: new Date(),
      }

      await updateDoc(doc(db, "tables", selectedTable.id), tableData)

      setIsEditingTable(false)
      setSelectedTable(null)

      toast({
        title: "Muvaffaqiyatli",
        description: "Stol muvaffaqiyatli tahrirlandi",
      })
    } catch (error) {
      console.error("Error editing table:", error)
      toast({
        title: "Xatolik",
        description: "Stolni tahrirlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete a table
  const handleDeleteTable = async (tableId: string) => {
    try {
      await deleteDoc(doc(db, "tables", tableId))

      toast({
        title: "Muvaffaqiyatli",
        description: "Stol muvaffaqiyatli o'chirildi",
      })
    } catch (error) {
      console.error("Error deleting table:", error)
      toast({
        title: "Xatolik",
        description: "Stolni o'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  // Toggle table status
  const handleToggleTableStatus = async (table: Table) => {
    try {
      const newStatus = table.status === "available" ? "occupied" : "available"

      await updateDoc(doc(db, "tables", table.id), {
        status: newStatus,
        updatedAt: new Date(),
      })

      toast({
        title: "Status yangilandi",
        description: `Stol statusi ${newStatus === "available" ? "bo'sh" : "band"} qilindi`,
      })
    } catch (error) {
      console.error("Error toggling table status:", error)
      toast({
        title: "Xatolik",
        description: "Stol statusini yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  // Add a room
  const handleAddRoom = async () => {
    setIsSubmitting(true)

    try {
      const roomData = {
        number: newRoomNumber,
        capacity: newRoomCapacity,
        status: newRoomStatus,
        createdAt: new Date(),
      }

      await addDoc(collection(db, "rooms"), roomData)

      setIsAddingRoom(false)
      setNewRoomNumber((prev) => prev + 1)
      setNewRoomCapacity(20)
      setNewRoomStatus("available")

      toast({
        title: "Muvaffaqiyatli",
        description: "Xona muvaffaqiyatli qo'shildi",
      })
    } catch (error) {
      console.error("Error adding room:", error)
      toast({
        title: "Xatolik",
        description: "Xonani qo'shishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Edit a room
  const handleEditRoom = async () => {
    if (!selectedRoom) return
    setIsSubmitting(true)

    try {
      const roomData = {
        number: newRoomNumber,
        capacity: newRoomCapacity,
        status: newRoomStatus,
        updatedAt: new Date(),
      }

      await updateDoc(doc(db, "rooms", selectedRoom.id), roomData)

      setIsEditingRoom(false)
      setSelectedRoom(null)

      toast({
        title: "Muvaffaqiyatli",
        description: "Xona muvaffaqiyatli tahrirlandi",
      })
    } catch (error) {
      console.error("Error editing room:", error)
      toast({
        title: "Xatolik",
        description: "Xonani tahrirlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete a room
  const handleDeleteRoom = async (roomId: string) => {
    try {
      // Check if there are tables in this room
      const tablesInRoom = tables.filter((table) => table.roomId === roomId)

      if (tablesInRoom.length > 0) {
        toast({
          title: "Xatolik",
          description: "Bu xonada stollar mavjud. Avval stollarni o'chiring yoki boshqa xonaga o'tkazing.",
          variant: "destructive",
        })
        return
      }

      await deleteDoc(doc(db, "rooms", roomId))

      toast({
        title: "Muvaffaqiyatli",
        description: "Xona muvaffaqiyatli o'chirildi",
      })
    } catch (error) {
      console.error("Error deleting room:", error)
      toast({
        title: "Xatolik",
        description: "Xonani o'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  // Toggle room status
  const handleToggleRoomStatus = async (room: Room) => {
    try {
      const newStatus = room.status === "occupied" ? "available" : "occupied"

      await updateDoc(doc(db, "rooms", room.id), {
        status: newStatus,
        updatedAt: new Date(),
      })

      toast({
        title: "Status yangilandi",
        description: `Xona statusi ${newStatus === "available" ? "bo'sh" : "band"} qilindi`,
      })
    } catch (error) {
      console.error("Error toggling room status:", error)
      toast({
        title: "Xatolik",
        description: "Xona statusini yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  // Get room name by ID
  const getRoomName = (roomId: string | null | undefined) => {
    if (!roomId) return "Xonasiz"
    const room = rooms.find((r) => r.id === roomId)
    return room ? `${room.number} xona` : "Xonasiz"
  }

  // Reset all tables to available
  const handleResetAllTables = async () => {
    setIsSubmitting(true)

    try {
      const batch = writeBatch(db)

      tables.forEach((table) => {
        if (table.status !== "available") {
          const tableRef = doc(db, "tables", table.id)
          batch.update(tableRef, {
            status: "available",
            updatedAt: new Date(),
          })
        }
      })

      await batch.commit()

      toast({
        title: "Muvaffaqiyatli",
        description: "Barcha stollar bo'sh holatga o'tkazildi",
      })
    } catch (error) {
      console.error("Error resetting tables:", error)
      toast({
        title: "Xatolik",
        description: "Stollarni qayta o'rnatishda xatolik yuz berdi",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset all rooms to available
  const handleResetAllRooms = async () => {
    setIsSubmitting(true)

    try {
      const batch = writeBatch(db)

      rooms.forEach((room) => {
        if (room.status === "occupied") {
          const roomRef = doc(db, "rooms", room.id)
          batch.update(roomRef, {
            status: "available",
            updatedAt: new Date(),
          })
        }
      })

      await batch.commit()

      toast({
        title: "Muvaffaqiyatli",
        description: "Barcha xonalar bo'sh holatga o'tkazildi",
      })
    } catch (error) {
      console.error("Error resetting rooms:", error)
      toast({
        title: "Xatolik",
        description: "Xonalarni qayta o'rnatishda xatolik yuz berdi",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format date for order display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat("uz-UZ", {
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).format(date)
  }

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Kutilmoqda"
      case "preparing":
        return "Tayyorlanmoqda"
      case "ready":
        return "Tayyor"
      default:
        return status
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stollar va xonalar boshqaruvi</h1>

        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Qayta o'rnatish
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Barcha stollar va xonalarni qayta o'rnatish</AlertDialogTitle>
                <AlertDialogDescription>
                  Bu amal barcha stollar va xonalarni bo'sh holatga o'tkazadi. Bu amalni qaytarib bo'lmaydi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    handleResetAllTables()
                    handleResetAllRooms()
                  }}
                >
                  Qayta o'rnatish
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {viewingRoomTables ? (
        // Room tables view
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setViewingRoomTables(null)}>
                ← Orqaga
              </Button>
              <h2 className="text-xl font-semibold">
                {viewingRoomTables.number} xona ({viewingRoomTables.capacity} kishilik) - Stollar
              </h2>
              <Badge
                className={
                  viewingRoomTables.status === "occupied" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                }
              >
                {viewingRoomTables.status === "occupied" ? "Band" : "Bo'sh"}
              </Badge>

              {hasActiveRoomOrder(viewingRoomTables.number) && (
                <Badge
                  className="bg-blue-100 text-blue-800 cursor-pointer"
                  onClick={() => {
                    const order = getActiveOrderForRoom(viewingRoomTables.number)
                    if (order) setViewingOrderDetails(order)
                  }}
                >
                  <ClipboardList className="mr-1 h-3 w-3" />
                  Faol buyurtma
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Dialog open={isAddingTable} onOpenChange={setIsAddingTable}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Stol qo'shish
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Xonaga stol qo'shish</DialogTitle>
                    <DialogDescription>{viewingRoomTables.number} xonaga yangi stol qo'shish</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tableNumber">Stol raqami</Label>
                        <Input
                          id="tableNumber"
                          type="number"
                          value={newTableNumber}
                          onChange={(e) => setNewTableNumber(Number.parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tableSeats">O'rinlar soni</Label>
                        <Input
                          id="tableSeats"
                          type="number"
                          value={newTableSeats}
                          onChange={(e) => setNewTableSeats(Number.parseInt(e.target.value) || 4)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tableStatus">Status</Label>
                      <Select
                        value={newTableStatus}
                        onValueChange={(value) => setNewTableStatus(value as "available" | "occupied" | "reserved")}
                      >
                        <SelectTrigger id="tableStatus">
                          <SelectValue placeholder="Status tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Bo'sh</SelectItem>
                          <SelectItem value="occupied">Band</SelectItem>
                          <SelectItem value="reserved">Rezerv qilingan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingTable(false)} disabled={isSubmitting}>
                      Bekor qilish
                    </Button>
                    <Button
                      onClick={() => {
                        setNewTableRoomId(viewingRoomTables.id)
                        handleAddTable()
                      }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Qo'shilmoqda...
                        </>
                      ) : (
                        "Qo'shish"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Ko'p stollar qo'shish
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Xonaga ko'p stollar qo'shish</DialogTitle>
                    <DialogDescription>{viewingRoomTables.number} xonaga bir nechta stol qo'shish</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="batchStartNumber">Boshlang'ich raqam</Label>
                        <Input
                          id="batchStartNumber"
                          type="number"
                          value={batchTableStartNumber}
                          onChange={(e) => setBatchTableStartNumber(Number.parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="batchCount">Stollar soni</Label>
                        <Input
                          id="batchCount"
                          type="number"
                          value={batchTableCount}
                          onChange={(e) => setBatchTableCount(Number.parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batchSeats">O'rinlar soni</Label>
                      <Input
                        id="batchSeats"
                        type="number"
                        value={batchTableSeats}
                        onChange={(e) => setBatchTableSeats(Number.parseInt(e.target.value) || 4)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsBatchAddingTables(false)} disabled={isSubmitting}>
                      Bekor qilish
                    </Button>
                    <Button
                      onClick={() => {
                        setBatchTableRoomId(viewingRoomTables.id)
                        handleBatchAddTables()
                      }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Qo'shilmoqda...
                        </>
                      ) : (
                        "Qo'shish"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {roomTables.length === 0 ? (
                <div className="col-span-full rounded-lg border border-dashed p-8 text-center">
                  <p className="text-muted-foreground">Bu xonada stollar topilmadi</p>
                </div>
              ) : (
                roomTables.map((table) => (
                  <Card
                    key={table.id}
                    className={`overflow-hidden ${
                      table.status === "occupied"
                        ? "border-red-500"
                        : table.status === "reserved"
                          ? "border-amber-500"
                          : ""
                    }`}
                  >
                    <CardHeader className="bg-muted/50 p-4">
                      <CardTitle className="flex items-center justify-between">
                        <span>{table.number} stol</span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedTable(table)
                              setNewTableNumber(table.number)
                              setNewTableSeats(table.seats)
                              setNewTableRoomId(table.roomId || null)
                              setNewTableStatus(table.status)
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
                      <CardDescription>{table.seats} kishilik</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${
                              table.status === "available"
                                ? "bg-green-100 text-green-800"
                                : table.status === "occupied"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {table.status === "available"
                              ? "Bo'sh"
                              : table.status === "occupied"
                                ? "Band"
                                : "Rezerv qilingan"}
                          </Badge>
                          <Switch
                            checked={table.status === "available"}
                            onCheckedChange={() => handleToggleTableStatus(table)}
                          />
                        </div>
                      </div>

                      {hasActiveOrder(table.number) && (
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              const order = getActiveOrderForTable(table.number)
                              if (order) setViewingOrderDetails(order)
                            }}
                          >
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Buyurtmani ko'rish
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      ) : viewingOrderDetails ? (
        // Order details view
        <div>
          <div className="mb-4 flex items-center">
            <Button variant="outline" onClick={() => setViewingOrderDetails(null)}>
              ← Orqaga
            </Button>
            <h2 className="ml-4 text-xl font-semibold">
              {viewingOrderDetails.roomNumber
                ? `Xona #${viewingOrderDetails.roomNumber} buyurtmasi`
                : `Stol #${viewingOrderDetails.tableNumber} buyurtmasi`}
            </h2>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Buyurtma tafsilotlari</CardTitle>
                <Badge className="bg-blue-500">{getStatusText(viewingOrderDetails.status)}</Badge>
              </div>
              <CardDescription>Buyurtma vaqti: {formatDate(viewingOrderDetails.createdAt)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Taomlar:</h3>
                  <ul className="mt-2 space-y-2">
                    {viewingOrderDetails.items.map((item, index) => (
                      <li key={index} className="flex justify-between">
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span>{formatCurrency(item.price * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Jami:</span>
                  <span className="font-semibold">{formatCurrency(viewingOrderDetails.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="tables" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Stollar
            </TabsTrigger>
            <TabsTrigger value="rooms" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Xonalar
            </TabsTrigger>
          </TabsList>

          {/* Tables Tab */}
          <TabsContent value="tables">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-2 mr-4">
                  <Switch id="show-occupied" checked={showOccupiedTables} onCheckedChange={setShowOccupiedTables} />
                  <Label htmlFor="show-occupied">Band stollarni ko'rsatish</Label>
                </div>

              </div>

              <div className="flex gap-2">
                <Dialog open={isAddingTable} onOpenChange={setIsAddingTable}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Stol qo'shish
                    </Button>
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
                            onChange={(e) => setNewTableNumber(Number.parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tableSeats">O'rinlar soni</Label>
                          <Input
                            id="tableSeats"
                            type="number"
                            value={newTableSeats}
                            onChange={(e) => setNewTableSeats(Number.parseInt(e.target.value) || 4)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tableStatus">Status</Label>
                        <Select
                          value={newTableStatus}
                          onValueChange={(value) => setNewTableStatus(value as "available" | "occupied" | "reserved")}
                        >
                          <SelectTrigger id="tableStatus">
                            <SelectValue placeholder="Status tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Bo'sh</SelectItem>
                            <SelectItem value="occupied">Band</SelectItem>
                            <SelectItem value="reserved">Rezerv qilingan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingTable(false)} disabled={isSubmitting}>
                        Bekor qilish
                      </Button>
                      <Button onClick={handleAddTable} disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Qo'shilmoqda...
                          </>
                        ) : (
                          "Qo'shish"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isBatchAddingTables} onOpenChange={setIsBatchAddingTables}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Ko'p stollar qo'shish
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ko'p stollar qo'shish</DialogTitle>
                      <DialogDescription>Bir vaqtda bir nechta stol qo'shish</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="batchStartNumber">Boshlang'ich raqam</Label>
                          <Input
                            id="batchStartNumber"
                            type="number"
                            value={batchTableStartNumber}
                            onChange={(e) => setBatchTableStartNumber(Number.parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="batchCount">Stollar soni</Label>
                          <Input
                            id="batchCount"
                            type="number"
                            value={batchTableCount}
                            onChange={(e) => setBatchTableCount(Number.parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="batchSeats">O'rinlar soni</Label>
                        <Input
                          id="batchSeats"
                          type="number"
                          value={batchTableSeats}
                          onChange={(e) => setBatchTableSeats(Number.parseInt(e.target.value) || 4)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsBatchAddingTables(false)} disabled={isSubmitting}>
                        Bekor qilish
                      </Button>
                      <Button onClick={handleBatchAddTables} disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Qo'shilmoqda...
                          </>
                        ) : (
                          "Qo'shish"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {isLoading ? (
              <div className="flex h-60 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredTables.length === 0 ? (
                  <div className="col-span-full rounded-lg border border-dashed p-8 text-center">
                    <p className="text-muted-foreground">Stollar topilmadi</p>
                  </div>
                ) : (
                  filteredTables.map((table) => (
                    <Card
                      key={table.id}
                      className={`overflow-hidden ${
                        table.status === "occupied"
                          ? "border-red-500"
                          : table.status === "reserved"
                            ? "border-amber-500"
                            : ""
                      }`}
                    >
                      <CardHeader className="bg-muted/50 p-4">
                        <CardTitle className="flex items-center justify-between">
                          <span>{table.number} stol</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedTable(table)
                                setNewTableNumber(table.number)
                                setNewTableSeats(table.seats)
                                setNewTableRoomId(table.roomId || null)
                                setNewTableStatus(table.status)
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
                          {table.seats} kishilik
                          {table.roomId && ` • ${getRoomName(table.roomId)}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`${
                                table.status === "available"
                                  ? "bg-green-100 text-green-800"
                                  : table.status === "occupied"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {table.status === "available"
                                ? "Bo'sh"
                                : table.status === "occupied"
                                  ? "Band"
                                  : "Rezerv qilingan"}
                            </Badge>
                            <Switch
                              checked={table.status === "available"}
                              onCheckedChange={() => handleToggleTableStatus(table)}
                            />
                          </div>
                        </div>

                        {hasActiveOrder(table.number) && (
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                const order = getActiveOrderForTable(table.number)
                                if (order) setViewingOrderDetails(order)
                              }}
                            >
                              <ClipboardList className="mr-2 h-4 w-4" />
                              Buyurtmani ko'rish
                            </Button>
                          </div>
                        )}
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
                        onChange={(e) => setNewTableNumber(Number.parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editTableSeats">O'rinlar soni</Label>
                      <Input
                        id="editTableSeats"
                        type="number"
                        value={newTableSeats}
                        onChange={(e) => setNewTableSeats(Number.parseInt(e.target.value) || 4)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editTableStatus">Status</Label>
                    <Select
                      value={newTableStatus}
                      onValueChange={(value) => setNewTableStatus(value as "available" | "occupied" | "reserved")}
                    >
                      <SelectTrigger id="editTableStatus">
                        <SelectValue placeholder="Status tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Bo'sh</SelectItem>
                        <SelectItem value="occupied">Band</SelectItem>
                        <SelectItem value="reserved">Rezerv qilingan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditingTable(false)} disabled={isSubmitting}>
                    Bekor qilish
                  </Button>
                  <Button onClick={handleEditTable} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saqlanmoqda...
                      </>
                    ) : (
                      "Saqlash"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Rooms Tab */}
          <TabsContent value="rooms">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <Switch id="show-occupied-rooms" checked={showOccupiedRooms} onCheckedChange={setShowOccupiedRooms} />
                <Label htmlFor="show-occupied-rooms">Band xonalarni ko'rsatish</Label>
              </div>

              <Dialog open={isAddingRoom} onOpenChange={setIsAddingRoom}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Xona qo'shish
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yangi xona qo'shish</DialogTitle>
                    <DialogDescription>Xona ma'lumotlarini kiriting</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="roomNumber">Xona raqami</Label>
                        <Input
                          id="roomNumber"
                          type="number"
                          value={newRoomNumber}
                          onChange={(e) => setNewRoomNumber(Number.parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="roomCapacity">Sig'imi (kishi)</Label>
                        <Input
                          id="roomCapacity"
                          type="number"
                          value={newRoomCapacity}
                          onChange={(e) => setNewRoomCapacity(Number.parseInt(e.target.value) || 20)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roomStatus">Status</Label>
                      <Select
                        value={newRoomStatus}
                        onValueChange={(value) => setNewRoomStatus(value as "available" | "occupied")}
                      >
                        <SelectTrigger id="roomStatus">
                          <SelectValue placeholder="Status tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Bo'sh</SelectItem>
                          <SelectItem value="occupied">Band</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingRoom(false)} disabled={isSubmitting}>
                      Bekor qilish
                    </Button>
                    <Button onClick={handleAddRoom} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Qo'shilmoqda...
                        </>
                      ) : (
                        "Qo'shish"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="flex h-60 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredRooms.length === 0 ? (
                  <div className="col-span-full rounded-lg border border-dashed p-8 text-center">
                    <p className="text-muted-foreground">Xonalar topilmadi</p>
                  </div>
                ) : (
                  filteredRooms.map((room) => (
                    <Card key={room.id} className={room.status === "occupied" ? "border-red-500" : ""}>
                      <CardHeader className="bg-muted/50 p-4">
                        <CardTitle className="flex items-center justify-between">
                          <span>{room.number} xona</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedRoom(room)
                                setNewRoomNumber(room.number)
                                setNewRoomCapacity(room.capacity)
                                setNewRoomStatus(room.status || "available")
                                setIsEditingRoom(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteRoom(room.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardTitle>
                        <CardDescription>{room.capacity} kishilik</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`${
                                !room.status || room.status === "available"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {!room.status || room.status === "available" ? "Bo'sh" : "Band"}
                            </Badge>
                            <Switch
                              checked={!room.status || room.status === "available"}
                              onCheckedChange={() => handleToggleRoomStatus(room)}
                            />
                          </div>
                        </div>

                        {hasActiveRoomOrder(room.number) && (
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                const order = getActiveOrderForRoom(room.number)
                                if (order) setViewingOrderDetails(order)
                              }}
                            >
                              <ClipboardList className="mr-2 h-4 w-4" />
                              Buyurtmani ko'rish
                            </Button>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Edit Room Dialog */}
            <Dialog open={isEditingRoom} onOpenChange={setIsEditingRoom}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Xonani tahrirlash</DialogTitle>
                  <DialogDescription>Xona ma'lumotlarini o'zgartiring</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editRoomNumber">Xona raqami</Label>
                      <Input
                        id="editRoomNumber"
                        type="number"
                        value={newRoomNumber}
                        onChange={(e) => setNewRoomNumber(Number.parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editRoomCapacity">Sig'imi (kishi)</Label>
                      <Input
                        id="editRoomCapacity"
                        type="number"
                        value={newRoomCapacity}
                        onChange={(e) => setNewRoomCapacity(Number.parseInt(e.target.value) || 20)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editRoomStatus">Status</Label>
                    <Select
                      value={newRoomStatus}
                      onValueChange={(value) => setNewRoomStatus(value as "available" | "occupied")}
                    >
                      <SelectTrigger id="editRoomStatus">
                        <SelectValue placeholder="Status tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Bo'sh</SelectItem>
                        <SelectItem value="occupied">Band</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditingRoom(false)} disabled={isSubmitting}>
                    Bekor qilish
                  </Button>
                  <Button onClick={handleEditRoom} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saqlanmoqda...
                      </>
                    ) : (
                      "Saqlash"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
