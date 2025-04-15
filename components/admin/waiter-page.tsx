"use client"

import { useState, useEffect, useRef } from "react"
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import AdminLayout  from "@/components/admin/admin-layout"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, getStatusColor, getStatusText } from "@/lib/utils"
import { Loader2, CheckCircle, AlertTriangle, History, Bell, BellOff, User, CreditCard } from "lucide-react"
import type { Order } from "@/types"
import { getDocs as getDocsHelper } from "@/lib/getDocs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/admin/admin-auth-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function WaiterPage() {
  const [preparingOrders, setPreparingOrders] = useState<Order[]>([])
  const [completedOrders, setCompletedOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [assignedTables, setAssignedTables] = useState<number[]>([])
  const [assignedRooms, setAssignedRooms] = useState<number[]>([])
  const [waiters, setWaiters] = useState<{ id: string; name: string }[]>([])
  const [waiterFilter, setWaiterFilter] = useState<string>("all")
  const { toast } = useToast()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousOrderCountRef = useRef(0)
  const auth = useAuth?.() || { user: null }
  const { user } = auth

  useEffect(() => {
    // Load saved waiter filter from localStorage
    const savedWaiterFilter = localStorage.getItem("waiterPageFilter")
    if (savedWaiterFilter) {
      setWaiterFilter(savedWaiterFilter)
    }

    // Fetch waiters
    const fetchWaiters = async () => {
      try {
        const waitersQuery = query(collection(db, "users"), where("role", "==", "waiter"))
        const waitersSnapshot = await getDocs(waitersQuery)
        const waitersList: { id: string; name: string }[] = []

        waitersSnapshot.forEach((doc) => {
          waitersList.push({ id: doc.id, name: doc.data().name })
        })

        setWaiters(waitersList)
      } catch (error) {
        console.error("Error fetching waiters:", error)
      }
    }

    fetchWaiters()
  }, [])

  // Save waiter filter to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("waiterPageFilter", waiterFilter)
  }, [waiterFilter])

  // Function to fetch assigned tables and rooms
  const fetchAssignedTablesAndRooms = async () => {
    if (!user) return

    try {
      // Fetch tables assigned to this waiter
      const tablesQuery = query(collection(db, "tables"), where("waiterId", "==", user.id))
      const tablesSnapshot = await getDocs(tablesQuery)
      const tableNumbers: number[] = []

      tablesSnapshot.forEach((doc) => {
        const tableData = doc.data()
        if (tableData.number) {
          tableNumbers.push(tableData.number)
        }
      })

      setAssignedTables(tableNumbers)

      // Fetch rooms assigned to this waiter
      const roomsQuery = query(collection(db, "rooms"), where("waiterId", "==", user.id))
      const roomsSnapshot = await getDocs(roomsQuery)
      const roomNumbers: number[] = []

      roomsSnapshot.forEach((doc) => {
        const roomData = doc.data()
        if (roomData.number) {
          roomNumbers.push(roomData.number)
        }
      })

      setAssignedRooms(roomNumbers)
    } catch (error) {
      console.error("Error fetching assigned tables and rooms:", error)
    }
  }

  // Function to fetch orders
  const fetchOrders = async () => {
    try {
      // Get preparing orders
      const preparingOrdersData = await getDocsHelper("orders", [["status", "==", "preparing"]])

      // Filter orders based on assigned tables and rooms if user is a waiter
      let filteredPreparingOrders = preparingOrdersData

      if (user && user.role === "waiter") {
        filteredPreparingOrders = preparingOrdersData.filter((order) => {
          // Include orders for assigned tables
          if (order.tableNumber && assignedTables.includes(order.tableNumber)) {
            return true
          }

          // Include orders for assigned rooms
          if (order.roomNumber && assignedRooms.includes(order.roomNumber)) {
            return true
          }

          // Include delivery orders if no table/room is specified
          if (order.orderType === "delivery") {
            return true
          }

          return false
        })
      } else if (waiterFilter !== "all") {
        // If admin is viewing and has selected a specific waiter
        filteredPreparingOrders = preparingOrdersData.filter((order) => {
          if (order.orderType !== "table") return false

          // Check if the order's table or room is assigned to the selected waiter
          const tablesQuery = query(
            collection(db, "tables"),
            where("number", "==", order.tableNumber),
            where("waiterId", "==", waiterFilter),
          )
          const roomsQuery = query(
            collection(db, "rooms"),
            where("number", "==", order.roomNumber),
            where("waiterId", "==", waiterFilter),
          )

          return tablesQuery.size > 0 || roomsQuery.size > 0
        })
      }

      // Check for new orders to play notification
      if (filteredPreparingOrders.length > previousOrderCountRef.current && soundEnabled) {
        audioRef.current?.play().catch((e) => console.error("Error playing notification sound:", e))
      }

      previousOrderCountRef.current = filteredPreparingOrders.length
      setPreparingOrders(filteredPreparingOrders)

      // Get completed orders (limit to last 20 for performance)
      const completedOrdersData = await getDocsHelper("orders", [["status", "in", ["completed", "paid"]]])

      // Filter completed orders based on assigned tables and rooms if user is a waiter
      let filteredCompletedOrders = completedOrdersData

      if (user && user.role === "waiter") {
        filteredCompletedOrders = completedOrdersData.filter((order) => {
          // Include orders for assigned tables
          if (order.tableNumber && assignedTables.includes(order.tableNumber)) {
            return true
          }

          // Include orders for assigned rooms
          if (order.roomNumber && assignedRooms.includes(order.roomNumber)) {
            return true
          }

          // Include delivery orders if no table/room is specified
          if (order.orderType === "delivery") {
            return true
          }

          return false
        })
      } else if (waiterFilter !== "all") {
        // If admin is viewing and has selected a specific waiter
        filteredCompletedOrders = completedOrdersData.filter((order) => {
          if (order.orderType !== "table") return false

          // Check if the order's table or room is assigned to the selected waiter
          const tablesQuery = query(
            collection(db, "tables"),
            where("number", "==", order.tableNumber),
            where("waiterId", "==", waiterFilter),
          )
          const roomsQuery = query(
            collection(db, "rooms"),
            where("number", "==", order.roomNumber),
            where("waiterId", "==", waiterFilter),
          )

          return tablesQuery.size > 0 || roomsQuery.size > 0
        })
      }

      setCompletedOrders(filteredCompletedOrders.slice(0, 20)) // Limit to last 20 orders

      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast({
        title: "Xatolik",
        description: "Buyurtmalarni yuklashda xatolik yuz berdi.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio("/notification.mp3")

    // Fetch assigned tables and rooms
    fetchAssignedTablesAndRooms()

    // Initial fetch
    fetchOrders()

    // Set up a simple interval to refresh data every 3 seconds
    const intervalId = setInterval(() => {
      fetchOrders()
    }, 3000)

    return () => {
      clearInterval(intervalId)
    }
  }, [toast, user, assignedTables, assignedRooms, waiterFilter])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === "paid" ? { isPaid: true, paidAt: new Date() } : {}),
      })

      // Play success sound if enabled
      if (soundEnabled) {
        const audio = new Audio("/success.mp3")
        audio.play().catch((e) => console.error("Error playing sound:", e))
      }

      toast({
        title: "Status yangilandi",
        description: `Buyurtma muvaffaqiyatli ${newStatus === "paid" ? "to'landi" : "yakunlandi"}`,
      })

      // Refresh orders after update
      fetchOrders()
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Xatolik",
        description: "Buyurtma statusini yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ""
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <AdminLayout>
      <div className="flex flex-1 flex-col">
        <div className="border-b bg-white p-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Ofitsiant paneli</h1>
          <div className="flex items-center gap-4">
            {user?.role !== "waiter" && (
              <Select value={waiterFilter} onValueChange={(value) => setWaiterFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <SelectValue placeholder="Ofitsiant" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha ofitsiantlar</SelectItem>
                  {waiters.map((waiter) => (
                    <SelectItem key={waiter.id} value={waiter.id}>
                      {waiter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Bell className="h-5 w-5 text-green-600" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-400" />
              )}
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} id="sound-mode" />
              <Label htmlFor="sound-mode" className="text-sm">
                Ovozli bildirishnoma
              </Label>
            </div>
          </div>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="preparing">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="preparing" className="relative">
                  Tayyorlanmoqda
                  {preparingOrders.length > 0 && <Badge className="ml-2 bg-amber-500">{preparingOrders.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="history" className="relative">
                  <History className="mr-1 h-4 w-4" />
                  Tarix
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preparing">
                {preparingOrders.length === 0 ? (
                  <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed">
                    <AlertTriangle className="mb-2 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">Tayyorlanayotgan buyurtmalar topilmadi</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {preparingOrders.map((order) => (
                      <div
                        key={order.id}
                        className="relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow"
                      >
                        {/* Status header */}
                        <div className="bg-amber-50 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-amber-600" />
                              <Badge variant="outline" className="bg-amber-100 text-amber-800">
                                Tayyorlanmoqda
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</div>
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="font-medium">
                              {order.orderType === "table"
                                ? order.roomNumber
                                  ? `Xona #${order.roomNumber}`
                                  : `Stol #${order.tableNumber || "?"}`
                                : order.orderType === "delivery"
                                  ? "Yetkazib berish"
                                  : "Buyurtma"}
                            </div>
                            <div className="font-semibold text-primary">{formatCurrency(order.total)}</div>
                          </div>

                          <div className="mb-3 text-sm text-muted-foreground">
                            {order.orderType === "delivery" && (
                              <div className="mb-1">
                                <span className="font-medium">Manzil:</span> {order.address}
                              </div>
                            )}
                            {order.phoneNumber && (
                              <div className="mb-1">
                                <span className="font-medium">Tel:</span> {order.phoneNumber}
                              </div>
                            )}
                          </div>

                          <div className="mb-3">
                            <div className="mb-1 text-sm font-medium">Buyurtma tarkibi:</div>
                            <ul className="space-y-1 text-sm">
                              {order.items.map((item, index) => (
                                <li key={index} className="flex justify-between">
                                  <span>
                                    {item.quantity} × {item.name}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {formatCurrency(item.price * item.quantity)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => handleStatusChange(order.id!, "completed")}>
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Yetkazildi
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleStatusChange(order.id!, "paid")}
                            >
                              <CreditCard className="mr-1 h-4 w-4" />
                              To'landi
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history">
                {completedOrders.length === 0 ? (
                  <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed">
                    <AlertTriangle className="mb-2 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">Yakunlangan buyurtmalar topilmadi</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {completedOrders.map((order) => (
                      <div
                        key={order.id}
                        className="relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow"
                      >
                        {/* Status header */}
                        <div className={order.status === "paid" ? "bg-green-100 p-3" : "bg-green-50 p-3"}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <Badge variant="outline" className={getStatusColor(order.status)}>
                                {getStatusText(order.status)}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</div>
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="font-medium">
                              {order.orderType === "table"
                                ? order.roomNumber
                                  ? `Xona #${order.roomNumber}`
                                  : `Stol #${order.tableNumber || "?"}`
                                : order.orderType === "delivery"
                                  ? "Yetkazib berish"
                                  : "Buyurtma"}
                            </div>
                            <div className="font-semibold text-primary">{formatCurrency(order.total)}</div>
                          </div>

                          <div className="mb-3">
                            <div className="mb-1 text-sm font-medium">Buyurtma tarkibi:</div>
                            <ul className="space-y-1 text-sm">
                              {order.items.map((item, index) => (
                                <li key={index} className="flex justify-between">
                                  <span>
                                    {item.quantity} × {item.name}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {formatCurrency(item.price * item.quantity)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="font-medium">
                              {order.status === "paid" ? "To'langan vaqt:" : "Yakunlangan vaqt:"}
                            </span>{" "}
                            {formatDate(order.status === "paid" ? order.paidAt : order.updatedAt)}
                          </div>

                          {order.status === "completed" && (
                            <div className="mt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 w-full"
                                onClick={() => handleStatusChange(order.id!, "paid")}
                              >
                                <CreditCard className="mr-1 h-4 w-4" />
                                To'landi deb belgilash
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
