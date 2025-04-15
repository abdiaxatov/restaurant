"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, Loader2, Home } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { collection, query, onSnapshot, where, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Define useAuth outside the try-catch block
let useAuth: any = () => ({ user: null })

try {
  // Try to dynamically import the useAuth hook
  const adminAuthProvider = require("@/components/admin/admin-auth-provider")
  if (adminAuthProvider && typeof adminAuthProvider.useAuth === "function") {
    useAuth = adminAuthProvider.useAuth
  }
} catch (error) {
  console.log("Admin auth provider not available in this context")
}

interface TableSelectorProps {
  selectedTable: number | null
  selectedRoom: number | null
  onSelectTable: (tableNumber: number | null, roomNumber: number | null) => void
  hasError?: boolean
}

type TableData = {
  id: string
  number: number
  seats: number
  status: "available" | "occupied" | "reserved"
  roomId?: string
}

type RoomData = {
  id: string
  number: number
  capacity: number
  status?: "available" | "occupied"
}

export function TableSelector({ selectedTable, selectedRoom, onSelectTable, hasError = false }: TableSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tables, setTables] = useState<TableData[]>([])
  const [rooms, setRooms] = useState<RoomData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("tables")
  const [viewingRoom, setViewingRoom] = useState<RoomData | null>(null)
  const [tablesInSelectedRoom, setTablesInSelectedRoom] = useState<TableData[]>([])
  const { toast } = useToast()
  const auth = useAuth()
  const user = auth?.user

  // Modify the useEffect hook that fetches tables to filter tables based on user's previous orders
  useEffect(() => {
    // Initialize with empty functions to avoid undefined errors
    let tablesUnsubscribe = () => {}
    let roomsUnsubscribe = () => {}

    const fetchData = async () => {
      try {
        // Get the user's previous orders from localStorage
        const myOrders = JSON.parse(localStorage.getItem("myOrders") || "[]")
        const lastOrderInfoStr = localStorage.getItem("lastOrderInfo")
        let lastSelectedTable = null
        let lastSelectedRoom = null

        // Agar oxirgi buyurtma ma'lumotlari saqlangan bo'lsa
        if (lastOrderInfoStr) {
          const lastOrderInfo = JSON.parse(lastOrderInfoStr)
          if (lastOrderInfo.tableNumber) {
            lastSelectedTable = lastOrderInfo.tableNumber
          } else if (lastOrderInfo.roomNumber) {
            lastSelectedRoom = lastOrderInfo.roomNumber
          }
        }

        // Fetch previous orders to get tables/rooms the user has ordered from
        const userPreviousTables = new Set<number>()
        const userPreviousRooms = new Set<number>()

        if (myOrders.length > 0) {
          // Fetch order details to get table/room numbers
          for (const orderId of myOrders) {
            try {
              const orderDoc = await getDoc(doc(db, "orders", orderId))
              if (orderDoc.exists()) {
                const orderData = orderDoc.data()
                if (orderData.tableNumber) userPreviousTables.add(orderData.tableNumber)
                if (orderData.roomNumber) userPreviousRooms.add(orderData.roomNumber)
              }
            } catch (error) {
              console.error("Error fetching order:", error)
            }
          }
        }

        // Agar avval tanlangan stol/xona bo'lsa, uni avtomatik tanlash
        if (lastSelectedTable && !selectedTable) {
          onSelectTable(lastSelectedTable, null)
        } else if (lastSelectedRoom && !selectedRoom) {
          onSelectTable(null, lastSelectedRoom)
        }

        // Fetch tables from Firestore
        let tablesQuery

        if (user && user.role === "waiter") {
          // If user is a waiter, only show tables assigned to them
          tablesQuery = query(
            collection(db, "tables"),
            where("status", "==", "available"),
            where("waiterId", "==", user.id),
          )
        } else {
          // For admin, chef, and customers, show all available tables
          tablesQuery = query(collection(db, "tables"), where("status", "==", "available"))
        }

        tablesUnsubscribe = onSnapshot(
          tablesQuery,
          (snapshot) => {
            const tablesData: TableData[] = []
            snapshot.forEach((doc) => {
              tablesData.push({ id: doc.id, ...doc.data() } as TableData)
            })

            // Also fetch occupied tables that the user has previously ordered from
            if (userPreviousTables.size > 0) {
              const fetchOccupiedTables = async () => {
                try {
                  const occupiedTablesQuery = query(collection(db, "tables"), where("status", "==", "occupied"))
                  const occupiedTablesSnapshot = await getDocs(occupiedTablesQuery)

                  occupiedTablesSnapshot.forEach((doc) => {
                    const tableData = doc.data() as TableData
                    // Only add tables the user has previously ordered from
                    if (userPreviousTables.has(tableData.number)) {
                      tablesData.push({ id: doc.id, ...tableData })
                    }
                  })

                  // Sort tables by number after fetching all tables
                  tablesData.sort((a, b) => a.number - b.number)
                  setTables(tablesData)
                } catch (error) {
                  console.error("Error fetching occupied tables:", error)
                }
              }

              fetchOccupiedTables()
            } else {
              // Sort tables by number after fetching
              tablesData.sort((a, b) => a.number - b.number)
              setTables(tablesData)
            }

            setIsLoading(false)
          },
          (error) => {
            console.error("Error fetching tables:", error)
            toast({
              title: "Xatolik",
              description: "Stollarni yuklashda xatolik yuz berdi",
              variant: "destructive",
            })
            setIsLoading(false)
          },
        )

        // Fetch rooms from Firestore with similar logic for previously ordered rooms
        let roomsQuery

        if (user && user.role === "waiter") {
          // If user is a waiter, only show rooms assigned to them
          roomsQuery = query(collection(db, "rooms"), where("waiterId", "==", user.id))
        } else {
          // For admin and chef, show all rooms
          roomsQuery = query(collection(db, "rooms"))
        }

        roomsUnsubscribe = onSnapshot(
          roomsQuery,
          (snapshot) => {
            const roomsData: RoomData[] = []
            snapshot.forEach((doc) => {
              roomsData.push({ id: doc.id, ...doc.data() } as RoomData)
            })

            // Also fetch occupied rooms that the user has previously ordered from
            if (userPreviousRooms.size > 0) {
              const fetchOccupiedRooms = async () => {
                try {
                  const occupiedRoomsQuery = query(collection(db, "rooms"), where("status", "==", "occupied"))
                  const occupiedRoomsSnapshot = await getDocs(occupiedRoomsQuery)

                  occupiedRoomsSnapshot.forEach((doc) => {
                    const roomData = doc.data() as RoomData
                    // Only add rooms the user has previously ordered from
                    if (userPreviousRooms.has(roomData.number)) {
                      roomsData.push({ id: doc.id, ...roomData })
                    }
                  })

                  // Sort rooms by number
                  roomsData.sort((a, b) => a.number - b.number)
                  setRooms(roomsData)
                } catch (error) {
                  console.error("Error fetching occupied rooms:", error)
                }
              }

              fetchOccupiedRooms()
            } else {
              // Sort rooms by number
              roomsData.sort((a, b) => a.number - b.number)

              // Filter out occupied rooms that the user hasn't ordered from before
              const availableRooms = roomsData.filter((room) => !room.status || room.status === "available")
              setRooms(availableRooms)
            }
          },
          (error) => {
            console.error("Error fetching rooms:", error)
          },
        )
      } catch (error) {
        console.error("Error setting up listeners:", error)
        setIsLoading(false)
      }
    }

    fetchData()

    // Clean up function
    return () => {
      try {
        if (typeof tablesUnsubscribe === "function") {
          tablesUnsubscribe()
        }
        if (typeof roomsUnsubscribe === "function") {
          roomsUnsubscribe()
        }
      } catch (error) {
        console.error("Error unsubscribing:", error)
      }
    }
  }, [toast, user, auth])

  // When a room is selected for viewing, fetch tables in that room
  useEffect(() => {
    if (!viewingRoom) {
      setTablesInSelectedRoom([])
      return
    }

    const fetchTablesInRoom = async () => {
      try {
        const tablesInRoomQuery = query(
          collection(db, "tables"),
          where("roomId", "==", viewingRoom.id),
          where("status", "==", "available"),
        )

        const tablesSnapshot = await getDocs(tablesInRoomQuery)
        const tablesData: TableData[] = []

        tablesSnapshot.forEach((doc) => {
          tablesData.push({ id: doc.id, ...doc.data() } as TableData)
        })

        // Sort tables by number
        tablesData.sort((a, b) => a.number - b.number)
        setTablesInSelectedRoom(tablesData)
      } catch (error) {
        console.error("Error fetching tables in room:", error)
        toast({
          title: "Xatolik",
          description: "Xonadagi stollarni yuklashda xatolik yuz berdi",
          variant: "destructive",
        })
      }
    }

    if (viewingRoom) {
      fetchTablesInRoom()
    }
  }, [viewingRoom, toast])

  const handleSelectTable = (tableNumber: number) => {
    onSelectTable(tableNumber, null)
    setIsOpen(false)
    setViewingRoom(null)
  }

  const handleSelectRoom = (room: RoomData) => {
    // If we're selecting a room directly (not viewing its tables)
    if (activeTab === "rooms") {
      onSelectTable(null, room.number)
      setIsOpen(false)
    } else {
      // If we're viewing tables in a room
      setViewingRoom(room)
    }
  }

  const handleBackToRooms = () => {
    setViewingRoom(null)
  }

  // Get the selected table or room info for display
  const getSelectionDisplay = () => {
    if (selectedRoom) {
      const room = rooms.find((r) => r.number === selectedRoom)
      return room ? `${room.number} xona (${room.capacity} kishilik)` : `Xona #${selectedRoom}`
    }

    if (selectedTable) {
      const table = tables.find((t) => t.number === selectedTable)
      return table ? `${table.number} stol (${table.seats} kishilik)` : `Stol #${selectedTable}`
    }

    return "Stol yoki xona tanlang"
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={`w-full justify-start ${hasError ? "border-destructive" : ""}`}>
          {selectedRoom ? <Home className="mr-2 h-4 w-4" /> : <Table className="mr-2 h-4 w-4" />}
          {getSelectionDisplay()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {viewingRoom ? `${viewingRoom.number} xona (${viewingRoom.capacity} kishilik)` : "Stol yoki xona tanlash"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : viewingRoom ? (
          // Show tables in the selected room
          <div>
            <Button variant="ghost" onClick={handleBackToRooms} className="mb-4">
              ← Xonalarga qaytish
            </Button>

            <div className="grid max-h-[60vh] gap-4 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
              {tablesInSelectedRoom.length === 0 ? (
                <div className="col-span-full rounded-lg border border-dashed p-8 text-center">
                  <p className="text-muted-foreground">Bu xonada bo'sh stollar topilmadi</p>
                </div>
              ) : (
                tablesInSelectedRoom.map((table) => (
                  <Card
                    key={table.id}
                    className="cursor-pointer transition-all hover:bg-muted"
                    onClick={() => handleSelectTable(table.number)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-medium">{table.number} stol</span>
                          <Badge variant="outline">{table.seats} kishilik</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="tables">Stollar</TabsTrigger>
              <TabsTrigger value="rooms">Xonalar</TabsTrigger>
            </TabsList>

            {/* Tables Tab */}
            <TabsContent value="tables">
              <div className="grid max-h-[60vh] gap-4 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
                {tables.length === 0 ? (
                  <div className="col-span-full rounded-lg border border-dashed p-8 text-center">
                    <p className="text-muted-foreground">Bo'sh stollar topilmadi</p>
                  </div>
                ) : (
                  tables.map((table) => (
                    <Card
                      key={table.id}
                      className={`cursor-pointer transition-all hover:bg-muted ${
                        table.status === "occupied" ? "border-amber-500" : ""
                      }`}
                      onClick={() => handleSelectTable(table.number)}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-medium">{table.number} stol</span>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline">{table.seats} kishilik</Badge>
                              {table.status === "occupied" && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                  Band
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Rooms Tab */}
            <TabsContent value="rooms">
              <div className="grid max-h-[60vh] gap-4 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
                {rooms.length === 0 ? (
                  <div className="col-span-full rounded-lg border border-dashed p-8 text-center">
                    <p className="text-muted-foreground">Bo'sh xonalar topilmadi</p>
                  </div>
                ) : (
                  rooms.map((room) => (
                    <Card
                      key={room.id}
                      className={`cursor-pointer transition-all hover:bg-muted ${
                        room.status === "occupied" ? "border-amber-500" : ""
                      }`}
                      onClick={() => handleSelectRoom(room)}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-medium">{room.number} xona</span>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline">{room.capacity} kishilik</Badge>
                              {room.status === "occupied" && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                  Band
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
