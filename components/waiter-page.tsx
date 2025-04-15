"use client"

import { useState, useEffect, useRef } from "react"
import { doc, updateDoc, collection, query, getDocs, where, addDoc, onSnapshot, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminLayout } from "@/components/admin/admin-layout"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  History,
  Bell,
  BellOff,
  DollarSign,
  UserCheck,
  Filter,
  Info,
} from "lucide-react"
import type { Order, Table, Room } from "@/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/admin/admin-auth-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function WaiterPage() {
  const [readyOrders, setReadyOrders] = useState<Order[]>([])
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([])
  const [paidOrders, setPaidOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [assignedTables, setAssignedTables] = useState<number[]>([])
  const [assignedRooms, setAssignedRooms] = useState<number[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [waiterFilter, setWaiterFilter] = useState<string>("all")
  const [waiters, setWaiters] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false)
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all")
  const [stats, setStats] = useState({
    totalReady: 0,
    totalDelivered: 0,
    totalPaid: 0,
    totalRevenue: 0,
  })
  const { toast } = useToast()
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null)
  const previousOrderCountRef = useRef(0)
  const auth = useAuth?.() || { user: null }
  const { user } = auth

  // Function to fetch assigned tables and rooms
  const fetchAssignedTablesAndRooms = async () => {
    if (!user) return

    try {
      // Barcha ofitsiantlarni olish
      const waitersQuery = query(collection(db, "users"), where("role", "==", "waiter"))
      const waitersSnapshot = await getDocs(waitersQuery)
      const waitersData: any[] = []

      waitersSnapshot.forEach((doc) => {
        waitersData.push({ id: doc.id, ...doc.data() })
      })

      setWaiters(waitersData)

      // Barcha stollarni olish
      const tablesQuery = query(collection(db, "tables"))
      const tablesSnapshot = await getDocs(tablesQuery)
      const tablesData: Table[] = []
      const tableNumbers: number[] = []

      tablesSnapshot.forEach((doc) => {
        const tableData = doc.data() as Table
        tablesData.push({ id: doc.id, ...tableData })

        // Faqat shu ofitsiantga biriktirilgan stollar raqamlarini saqlash
        if (tableData.waiterId === user.id && tableData.number) {
          tableNumbers.push(tableData.number)
        }
      })

      setTables(tablesData)
      setAssignedTables(tableNumbers)

      // Barcha xonalarni olish
      const roomsQuery = query(collection(db, "rooms"))
      const roomsSnapshot = await getDocs(roomsQuery)
      const roomsData: Room[] = []
      const roomNumbers: number[] = []

      roomsSnapshot.forEach((doc) => {
        const roomData = doc.data() as Room
        roomsData.push({ id: doc.id, ...roomData })

        // Faqat shu ofitsiantga biriktirilgan xonalar raqamlarini saqlash
        if (roomData.waiterId === user.id && roomData.number) {
          roomNumbers.push(roomData.number)
        }
      })

      setRooms(roomsData)
      setAssignedRooms(roomNumbers)
    } catch (error) {
      console.error("Error fetching assigned tables and rooms:", error)
    }
  }

  // Function to assign waiter to table 7
  const assignWaiterToTable7 = async () => {
    try {
      // Create table 7 if it doesn't exist
      const tableQuery = query(collection(db, "tables"), where("number", "==", 7))
      const tableSnapshot = await getDocs(tableQuery)

      let table7Id = ""

      if (tableSnapshot.empty) {
        // Create table 7
        const newTableRef = await addDoc(collection(db, "tables"), {
          number: 7,
          seats: 4,
          status: "available",
          createdAt: new Date(),
        })
        table7Id = newTableRef.id
      } else {
        table7Id = tableSnapshot.docs[0].id
      }

      // Assign current waiter to table 7
      if (user && user.id) {
        await updateDoc(doc(db, "tables", table7Id), {
          waiterId: user.id,
        })

        toast({
          title: "Muvaffaqiyatli",
          description: "Siz 7-stolga biriktirildinggiz",
        })

        // Refresh tables
        fetchAssignedTablesAndRooms()
      }
    } catch (error) {
      console.error("Error assigning waiter to table 7:", error)
      toast({
        title: "Xatolik",
        description: "Ofitsiantni 7-stolga biriktirish jarayonida xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    // Initialize audio element
    notificationAudioRef.current = new Audio("/notification.mp3")

    // Fetch assigned tables and rooms
    fetchAssignedTablesAndRooms()

    // Set up real-time listeners for orders
    const readyOrdersQuery = query(
      collection(db, "orders"),
      where("status", "==", "tayinlanmoqda"),
      orderBy("createdAt", "desc"),
    )

    const deliveredOrdersQuery = query(
      collection(db, "orders"),
      where("status", "==", "yetkazildi"),
      orderBy("createdAt", "desc"),
    )

    const paidOrdersQuery = query(
      collection(db, "orders"),
      where("status", "==", "tolandi"),
      orderBy("createdAt", "desc"),
    )

    const readyOrdersUnsubscribe = onSnapshot(
      readyOrdersQuery,
      (snapshot) => {
        const ordersData: Order[] = []

        snapshot.forEach((doc) => {
          ordersData.push({ id: doc.id, ...doc.data() } as Order)
        })

        // Filter orders based on waiter filter
        let filteredOrders = ordersData
        if (user?.role === "waiter" && waiterFilter === "mine") {
          filteredOrders = ordersData.filter((order) => {
            if (order.waiterId === user.id) return true
            if (order.orderType === "table" && order.tableNumber && assignedTables.includes(order.tableNumber))
              return true
            if (order.orderType === "table" && order.roomNumber && assignedRooms.includes(order.roomNumber)) return true
            return false
          })
        } else if (waiterFilter !== "all" && waiterFilter !== "mine") {
          filteredOrders = ordersData.filter((order) => {
            if (order.waiterId === waiterFilter) return true
            return false
          })
        }

        // Filter by order type
        if (orderTypeFilter !== "all") {
          filteredOrders = filteredOrders.filter((order) => {
            if (orderTypeFilter === "table" && order.orderType === "table" && !order.roomNumber) return true
            if (orderTypeFilter === "room" && order.orderType === "table" && order.roomNumber) return true
            if (orderTypeFilter === "delivery" && order.orderType === "delivery") return true
            return false
          })
        }

        // Check for new orders and play notification
        if (filteredOrders.length > previousOrderCountRef.current && soundEnabled) {
          try {
            notificationAudioRef.current?.play().catch((e) => console.error("Error playing notification:", e))

            // Show toast notification
            toast({
              title: "Yangi buyurtma!",
              description: "Yangi buyurtma qabul qilindi",
            })
          } catch (error) {
            console.error("Error playing notification:", error)
          }
        }
        previousOrderCountRef.current = filteredOrders.length

        setReadyOrders(filteredOrders)
        setStats((prev) => ({ ...prev, totalReady: filteredOrders.length }))
        setIsLoading(false)
      },
      (error) => {
        console.error("Error fetching ready orders:", error)
        setIsLoading(false)
      },
    )

    const deliveredOrdersUnsubscribe = onSnapshot(
      deliveredOrdersQuery,
      (snapshot) => {
        const ordersData: Order[] = []

        snapshot.forEach((doc) => {
          ordersData.push({ id: doc.id, ...doc.data() } as Order)
        })

        // Filter orders based on waiter filter
        let filteredOrders = ordersData
        if (user?.role === "waiter" && waiterFilter === "mine") {
          filteredOrders = ordersData.filter((order) => {
            if (order.waiterId === user.id) return true
            if (order.orderType === "table" && order.tableNumber && assignedTables.includes(order.tableNumber))
              return true
            if (order.orderType === "table" && order.roomNumber && assignedRooms.includes(order.roomNumber)) return true
            return false
          })
        } else if (waiterFilter !== "all" && waiterFilter !== "mine") {
          filteredOrders = ordersData.filter((order) => {
            if (order.waiterId === waiterFilter) return true
            return false
          })
        }

        // Filter by order type
        if (orderTypeFilter !== "all") {
          filteredOrders = filteredOrders.filter((order) => {
            if (orderTypeFilter === "table" && order.orderType === "table" && !order.roomNumber) return true
            if (orderTypeFilter === "room" && order.orderType === "table" && order.roomNumber) return true
            if (orderTypeFilter === "delivery" && order.orderType === "delivery") return true
            return false
          })
        }

        setDeliveredOrders(filteredOrders)
        setStats((prev) => ({ ...prev, totalDelivered: filteredOrders.length }))
      },
      (error) => {
        console.error("Error fetching delivered orders:", error)
      },
    )

    const paidOrdersUnsubscribe = onSnapshot(
      paidOrdersQuery,
      (snapshot) => {
        const ordersData: Order[] = []

        snapshot.forEach((doc) => {
          ordersData.push({ id: doc.id, ...doc.data() } as Order)
        })

        // Filter orders based on waiter filter
        let filteredOrders = ordersData
        if (user?.role === "waiter" && waiterFilter === "mine") {
          filteredOrders = ordersData.filter((order) => {
            if (order.waiterId === user.id) return true
            if (order.orderType === "table" && order.tableNumber && assignedTables.includes(order.tableNumber))
              return true
            if (order.orderType === "table" && order.roomNumber && assignedRooms.includes(order.roomNumber)) return true
            return false
          })
        } else if (waiterFilter !== "all" && waiterFilter !== "mine") {
          filteredOrders = ordersData.filter((order) => {
            if (order.waiterId === waiterFilter) return true
            return false
          })
        }

        // Filter by order type
        if (orderTypeFilter !== "all") {
          filteredOrders = filteredOrders.filter((order) => {
            if (orderTypeFilter === "table" && order.orderType === "table" && !order.roomNumber) return true
            if (orderTypeFilter === "room" && order.orderType === "table" && order.roomNumber) return true
            if (orderTypeFilter === "delivery" && order.orderType === "delivery") return true
            return false
          })
        }

        setPaidOrders(filteredOrders.slice(0, 20)) // Limit to last 20 orders

        // Calculate total revenue
        const totalRevenue = [...deliveredOrders, ...filteredOrders].reduce((sum, order) => sum + order.total, 0)

        setStats((prev) => ({
          ...prev,
          totalPaid: filteredOrders.length,
          totalRevenue: totalRevenue,
        }))
      },
      (error) => {
        console.error("Error fetching paid orders:", error)
      },
    )

    return () => {
      readyOrdersUnsubscribe()
      deliveredOrdersUnsubscribe()
      paidOrdersUnsubscribe()
    }
  }, [toast, user, soundEnabled, waiterFilter, orderTypeFilter, assignedTables, assignedRooms])

  const handleDelivered = async (orderId: string) => {
    if (processingOrderId === orderId) return

    setProcessingOrderId(orderId)

    try {
      const newDate = new Date()

      // Find the order
      const orderToUpdate = [...readyOrders].find((order) => order.id === orderId)

      if (!orderToUpdate) {
        throw new Error("Order not found")
      }

      // Update order status to delivered
      await updateDoc(doc(db, "orders", orderId), {
        status: "yetkazildi",
        updatedAt: newDate,
        waiterId: user?.id || orderToUpdate.waiterId,
      })

      // Play success sound if enabled
      if (soundEnabled) {
        try {
          const audio = new Audio("/delivery.mp3")
          audio.play().catch((e) => console.error("Error playing sound:", e))
        } catch (error) {
          console.error("Error playing sound:", error)
        }
      }

      toast({
        title: "Status yangilandi",
        description: "Buyurtma muvaffaqiyatli yetkazildi",
      })
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Xatolik",
        description: "Buyurtma statusini yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setProcessingOrderId(null)
    }
  }

  const handlePaid = async (orderId: string) => {
    if (processingOrderId === orderId) return

    setProcessingOrderId(orderId)

    try {
      const newDate = new Date()

      // Find the order
      const orderToUpdate = [...deliveredOrders].find((order) => order.id === orderId)

      if (!orderToUpdate) {
        throw new Error("Order not found")
      }

      // Update order status to paid
      await updateDoc(doc(db, "orders", orderId), {
        status: "tolandi",
        updatedAt: newDate,
        paidAt: newDate,
        paidBy: user?.id || null,
      })

      // Play success sound if enabled
      if (soundEnabled) {
        try {
          const audio = new Audio("/success.mp3")
          audio.play().catch((e) => console.error("Error playing sound:", e))
        } catch (error) {
          console.error("Error playing sound:", error)
        }
      }

      toast({
        title: "Status yangilandi",
        description: "Buyurtma to'lovi qabul qilindi",
      })
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Xatolik",
        description: "Buyurtma statusini yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setProcessingOrderId(null)
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

  const getWaiterName = (waiterId: string | null | undefined) => {
    if (!waiterId) return "Belgilanmagan"
    const waiter = waiters.find((w) => w.id === waiterId)
    return waiter ? waiter.name : "Belgilanmagan"
  }

  const getWaiterInitials = (waiterId: string | null | undefined) => {
    if (!waiterId) return "?"
    const waiter = waiters.find((w) => w.id === waiterId)
    if (!waiter) return "?"

    const nameParts = waiter.name.split(" ")
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
    }
    return waiter.name.substring(0, 2).toUpperCase()
  }

  return (
    <AdminLayout>
      <div className="flex flex-1 flex-col">
        <div className="border-b bg-white p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Ofitsiant paneli</h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Select value={waiterFilter} onValueChange={setWaiterFilter}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    <SelectValue placeholder="Ofitsiant bo'yicha" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha buyurtmalar</SelectItem>
                  {user && <SelectItem value="mine">Mening buyurtmalarim</SelectItem>}
                  {waiters.map((waiter) => (
                    <SelectItem key={waiter.id} value={waiter.id}>
                      {waiter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Buyurtma turi" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha turlar</SelectItem>
                  <SelectItem value="table">Stol buyurtmalari</SelectItem>
                  <SelectItem value="room">Xona buyurtmalari</SelectItem>
                  <SelectItem value="delivery">Yetkazib berish</SelectItem>
                </SelectContent>
              </Select>
            </div>

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

            <Button variant="outline" size="sm" onClick={assignWaiterToTable7}>
              7-stolga biriktirish
            </Button>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tayyor buyurtmalar</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReady}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Yetkazilgan</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDelivered}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">To'langan</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPaid}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Jami tushum</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="active">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="active" className={`relative ${readyOrders.length > 0 ? "animate-pulse" : ""}`}>
                  Yetkazish
                  {readyOrders.length > 0 && <Badge className="ml-2 bg-green-500">{readyOrders.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="history" className="relative">
                  <History className="mr-1 h-4 w-4" />
                  Yetkazish Tarixi
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                {readyOrders.length === 0 ? (
                  <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed">
                    <AlertTriangle className="mb-2 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">Tayyor buyurtmalar topilmadi</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {readyOrders.map((order) => {
                      const waiterName = getWaiterName(order.waiterId)
                      const waiterInitials = getWaiterInitials(order.waiterId)
                      const orderNumber = order.id ? order.id.substring(0, 6).toUpperCase() : ""

                      return (
                        <div
                          key={order.id}
                          className="relative overflow-hidden rounded-lg border border-amber-300 bg-card text-card-foreground shadow-sm transition-all hover:shadow"
                        >
                          {/* Status header */}
                          <div className="bg-amber-50 p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-amber-600" />
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
                                <span className="ml-2 text-xs text-muted-foreground">#{orderNumber}</span>
                              </div>
                              <div className="font-semibold text-primary">{formatCurrency(order.total)}</div>
                            </div>

                            <div className="mb-3 flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                  {waiterInitials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">{waiterName}</span>
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
                                  <li key={index} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        id={`item-${order.id}-${index}`}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={item.delivered}
                                        onChange={(e) => {
                                          // Update the item's delivered status
                                          const updatedOrder = { ...order }
                                          updatedOrder.items[index].delivered = e.target.checked

                                          // Update the order in state
                                          setReadyOrders((prev) =>
                                            prev.map((o) => (o.id === order.id ? updatedOrder : o)),
                                          )
                                        }}
                                      />
                                      <label htmlFor={`item-${order.id}-${index}`} className="flex-1">
                                        {item.quantity} × {item.name}
                                        {item.showToChef && (
                                          <Badge variant="outline" className="ml-1 bg-green-100 text-green-800 text-xs">
                                            Oshpazga
                                          </Badge>
                                        )}
                                      </label>
                                    </div>
                                    <span className="text-muted-foreground">
                                      {formatCurrency(item.price * item.quantity)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleDelivered(order.id!)}
                                disabled={processingOrderId === order.id}
                                className="w-full"
                              >
                                {processingOrderId === order.id ? (
                                  <>
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                    Yuborilmoqda...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="mr-1 h-4 w-4" />
                                    Yetkazildi
                                  </>
                                )}
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Mark all items as delivered
                                  const updatedOrder = { ...order }
                                  updatedOrder.items = updatedOrder.items.map((item) => ({
                                    ...item,
                                    delivered: true,
                                  }))

                                  // Update the order in state
                                  setReadyOrders((prev) => prev.map((o) => (o.id === order.id ? updatedOrder : o)))
                                }}
                                className="w-full"
                              >
                                Hammasini belgilash
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrder(order)
                                  setIsOrderDetailsOpen(true)
                                }}
                                className="w-full"
                              >
                                <Info className="mr-1 h-4 w-4" />
                                Batafsil
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history">
                <Tabs defaultValue="delivered">
                  <TabsList className="mb-4 grid w-full grid-cols-2">
                    <TabsTrigger value="delivered">
                      Yetkazilgan
                      {deliveredOrders.length > 0 && (
                        <Badge className="ml-2 bg-purple-500">{deliveredOrders.length}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="paid">
                      To'langan
                      {paidOrders.length > 0 && <Badge className="ml-2 bg-emerald-500">{paidOrders.length}</Badge>}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="delivered">
                    {deliveredOrders.length === 0 ? (
                      <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed">
                        <AlertTriangle className="mb-2 h-10 w-10 text-muted-foreground" />
                        <p className="text-muted-foreground">Yetkazilgan buyurtmalar topilmadi</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {deliveredOrders.map((order) => {
                          const waiterName = getWaiterName(order.waiterId)
                          const waiterInitials = getWaiterInitials(order.waiterId)
                          const orderNumber = order.id ? order.id.substring(0, 6).toUpperCase() : ""

                          return (
                            <div
                              key={order.id}
                              className="relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow"
                            >
                              {/* Status header */}
                              <div className="bg-purple-50 p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-purple-600" />
                                    <Badge variant="outline" className="bg-purple-100 text-purple-800">
                                      Yetkazildi
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
                                    <span className="ml-2 text-xs text-muted-foreground">#{orderNumber}</span>
                                  </div>
                                  <div className="font-semibold text-primary">{formatCurrency(order.total)}</div>
                                </div>

                                <div className="mb-3 flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                      {waiterInitials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground">{waiterName}</span>
                                </div>

                                <div className="mb-3">
                                  <div className="mb-1 text-sm font-medium">Buyurtma tarkibi:</div>
                                  <ul className="space-y-1 text-sm">
                                    {order.items.slice(0, 3).map((item, index) => (
                                      <li key={index} className="flex justify-between">
                                        <span>
                                          {item.quantity} × {item.name}
                                          {item.showToChef && (
                                            <Badge
                                              variant="outline"
                                              className="ml-1 bg-green-100 text-green-800 text-xs"
                                            >
                                              Oshpazga
                                            </Badge>
                                          )}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {formatCurrency(item.price * item.quantity)}
                                        </span>
                                      </li>
                                    ))}
                                    {order.items.length > 3 && (
                                      <li className="text-sm text-muted-foreground">
                                        ... va yana {order.items.length - 3} ta mahsulot
                                      </li>
                                    )}
                                  </ul>
                                </div>

                                <div className="mt-2 text-xs text-muted-foreground">
                                  <span className="font-medium">Yetkazilgan vaqt:</span> {formatDate(order.updatedAt)}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handlePaid(order.id!)}
                                    disabled={processingOrderId === order.id}
                                    className="w-full"
                                  >
                                    {processingOrderId === order.id ? (
                                      <>
                                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                        Yuborilmoqda...
                                      </>
                                    ) : (
                                      <>
                                        <DollarSign className="mr-1 h-4 w-4" />
                                        To'landi
                                      </>
                                    )}
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedOrder(order)
                                      setIsOrderDetailsOpen(true)
                                    }}
                                    className="w-full"
                                  >
                                    <Info className="mr-1 h-4 w-4" />
                                    Batafsil
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="paid">
                    {paidOrders.length === 0 ? (
                      <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed">
                        <AlertTriangle className="mb-2 h-10 w-10 text-muted-foreground" />
                        <p className="text-muted-foreground">To'langan buyurtmalar topilmadi</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {paidOrders.map((order) => {
                          const waiterName = getWaiterName(order.waiterId)
                          const waiterInitials = getWaiterInitials(order.waiterId)
                          const orderNumber = order.id ? order.id.substring(0, 6).toUpperCase() : ""

                          return (
                            <div
                              key={order.id}
                              className="relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow"
                            >
                              {/* Status header */}
                              <div className="bg-emerald-50 p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800">
                                      To'landi
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
                                    <span className="ml-2 text-xs text-muted-foreground">#{orderNumber}</span>
                                  </div>
                                  <div className="font-semibold text-primary">{formatCurrency(order.total)}</div>
                                </div>

                                <div className="mb-3 flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                      {waiterInitials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground">{waiterName}</span>
                                </div>

                                <div className="mb-3">
                                  <div className="mb-1 text-sm font-medium">Buyurtma tarkibi:</div>
                                  <ul className="space-y-1 text-sm">
                                    {order.items.slice(0, 3).map((item, index) => (
                                      <li key={index} className="flex justify-between">
                                        <span>
                                          {item.quantity} × {item.name}
                                          {item.showToChef && (
                                            <Badge
                                              variant="outline"
                                              className="ml-1 bg-green-100 text-green-800 text-xs"
                                            >
                                              Oshpazga
                                            </Badge>
                                          )}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {formatCurrency(item.price * item.quantity)}
                                        </span>
                                      </li>
                                    ))}
                                    {order.items.length > 3 && (
                                      <li className="text-sm text-muted-foreground">
                                        ... va yana {order.items.length - 3} ta mahsulot
                                      </li>
                                    )}
                                  </ul>
                                </div>

                                <div className="mt-2 text-xs text-muted-foreground">
                                  <span className="font-medium">To'langan vaqt:</span> {formatDate(order.updatedAt)}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedOrder(order)
                                      setIsOrderDetailsOpen(true)
                                    }}
                                    className="w-full"
                                  >
                                    <Info className="mr-1 h-4 w-4" />
                                    Batafsil
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Buyurtma tafsilotlari</DialogTitle>
            <DialogDescription>
              {selectedOrder?.orderType === "table"
                ? selectedOrder?.roomNumber
                  ? `Xona #${selectedOrder.roomNumber}`
                  : `Stol #${selectedOrder.tableNumber}`
                : "Yetkazib berish"}
              {selectedOrder?.id && (
                <span className="ml-2 text-xs">#{selectedOrder.id.substring(0, 6).toUpperCase()}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      selectedOrder.status === "tayinlanmoqda"
                        ? "bg-amber-100 text-amber-800"
                        : selectedOrder.status === "yetkazildi"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-emerald-100 text-emerald-800"
                    }
                  >
                    {selectedOrder.status === "tayinlanmoqda"
                      ? "Tayyorlanmoqda"
                      : selectedOrder.status === "yetkazildi"
                        ? "Yetkazildi"
                        : "To'landi"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{formatDate(selectedOrder.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getWaiterInitials(selectedOrder.waiterId)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">{getWaiterName(selectedOrder.waiterId)}</div>
                  <div className="text-xs text-muted-foreground">Ofitsiant</div>
                </div>
              </div>

              {selectedOrder.orderType === "delivery" && (
                <div className="rounded-md bg-muted p-3">
                  <h4 className="mb-2 font-medium">Mijoz ma'lumotlari</h4>
                  {selectedOrder.phoneNumber && (
                    <div className="text-sm">
                      <span className="font-medium">Telefon:</span> {selectedOrder.phoneNumber}
                    </div>
                  )}
                  {selectedOrder.address && (
                    <div className="text-sm">
                      <span className="font-medium">Manzil:</span> {selectedOrder.address}
                    </div>
                  )}
                </div>
              )}

              <div>
                <h4 className="mb-2 font-medium">Buyurtma elementlari</h4>
                <div className="space-y-2 rounded-md border p-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.name} × {item.quantity}
                        {item.showToChef && (
                          <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 text-xs">
                            Oshpazga
                          </Badge>
                        )}
                      </span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Jami:</span>
                    <span>{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Buyurtma statusini yangilash</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.status === "tayinlanmoqda" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        handleDelivered(selectedOrder.id!)
                        setIsOrderDetailsOpen(false)
                      }}
                      disabled={processingOrderId === selectedOrder.id}
                    >
                      {processingOrderId === selectedOrder.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Yuborilmoqda...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Yetkazildi
                        </>
                      )}
                    </Button>
                  )}

                  {selectedOrder.status === "yetkazildi" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        handlePaid(selectedOrder.id!)
                        setIsOrderDetailsOpen(false)
                      }}
                      disabled={processingOrderId === selectedOrder.id}
                    >
                      {processingOrderId === selectedOrder.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Yuborilmoqda...
                        </>
                      ) : (
                        <>
                          <DollarSign className="mr-2 h-4 w-4" />
                          To'landi
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsOrderDetailsOpen(false)}>
                  Yopish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
