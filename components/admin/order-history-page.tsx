"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, onSnapshot, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import AdminLayout from "@/components/admin/admin-layout"
import { OrderDetails } from "@/components/admin/order-details"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency, getStatusColor, getStatusText } from "@/lib/utils"
import { Loader2, History, AlertTriangle, Calendar, Download, User } from "lucide-react"
import type { Order } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import * as XLSX from "xlsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [dateFilter, setDateFilter] = useState<string>("")
  const [waiters, setWaiters] = useState<{ id: string; name: string }[]>([])
  const [waiterFilter, setWaiterFilter] = useState<string>("all")
  const [waiterNames, setWaiterNames] = useState<Record<string, string>>({})
  const [tableWaiters, setTableWaiters] = useState<Record<number, string>>({})
  const [roomWaiters, setRoomWaiters] = useState<Record<number, string>>({})
  const { toast } = useToast()

  useEffect(() => {
    // Load saved waiter filter from localStorage
    const savedWaiterFilter = localStorage.getItem("historyWaiterFilter")
    if (savedWaiterFilter) {
      setWaiterFilter(savedWaiterFilter)
    }

    // Fetch waiters
    const fetchWaiters = async () => {
      try {
        const waitersQuery = query(collection(db, "users"), where("role", "==", "waiter"))
        const waitersSnapshot = await getDocs(waitersQuery)
        const waitersList: { id: string; name: string }[] = []
        const waiterData: Record<string, string> = {}

        waitersSnapshot.forEach((doc) => {
          waitersList.push({ id: doc.id, name: doc.data().name })
          waiterData[doc.id] = doc.data().name
        })

        setWaiters(waitersList)
        setWaiterNames(waiterData)
      } catch (error) {
        console.error("Error fetching waiters:", error)
      }
    }

    // Fetch tables with their assigned waiters
    const fetchTableWaiters = async () => {
      try {
        const tablesQuery = query(collection(db, "tables"))
        const tablesSnapshot = await getDocs(tablesQuery)
        const tableData: Record<number, string> = {}

        tablesSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.waiterId) {
            tableData[data.number] = data.waiterId
          }
        })

        setTableWaiters(tableData)
      } catch (error) {
        console.error("Error fetching table waiters:", error)
      }
    }

    // Fetch rooms with their assigned waiters
    const fetchRoomWaiters = async () => {
      try {
        const roomsQuery = query(collection(db, "rooms"))
        const roomsSnapshot = await getDocs(roomsQuery)
        const roomData: Record<number, string> = {}

        roomsSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.waiterId) {
            roomData[data.number] = data.waiterId
          }
        })

        setRoomWaiters(roomData)
      } catch (error) {
        console.error("Error fetching room waiters:", error)
      }
    }

    fetchWaiters()
    fetchTableWaiters()
    fetchRoomWaiters()
  }, [])

  // Save waiter filter to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("historyWaiterFilter", waiterFilter)
  }, [waiterFilter])

  // Function to get waiter name for an order
  const getWaiterName = (order: Order) => {
    // First check if the order has a waiterId directly
    if (order.waiterId && waiterNames[order.waiterId]) {
      return waiterNames[order.waiterId]
    }

    // Fallback to the old method for backward compatibility
    if (order.orderType === "table") {
      if (order.tableNumber && tableWaiters[order.tableNumber]) {
        const waiterId = tableWaiters[order.tableNumber]
        return waiterNames[waiterId] || "Belgilanmagan"
      } else if (order.roomNumber && roomWaiters[order.roomNumber]) {
        const waiterId = roomWaiters[order.roomNumber]
        return waiterNames[waiterId] || "Belgilanmagan"
      }
    }
    return "Belgilanmagan"
  }

  useEffect(() => {
    // Get deleted orders from orderHistory collection
    const ordersQuery = query(collection(db, "orderHistory"), orderBy("deletedAt", "desc"))

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const ordersList: Order[] = []
        snapshot.forEach((doc) => {
          ordersList.push({ id: doc.id, ...doc.data() } as Order)
        })
        setOrders(ordersList)
        setIsLoading(false)
      },
      (error) => {
        console.error("Error fetching order history:", error)
        toast({
          title: "Xatolik",
          description: "Buyurtmalar tarixini yuklashda xatolik yuz berdi.",
          variant: "destructive",
        })
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [toast])

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order)
    setIsOrderDetailsOpen(true)
  }

  const handleOrderDetailsClose = () => {
    setIsOrderDetailsOpen(false)
    setSelectedOrder(null)
  }
  const getSeatingTypeDisplay = (order: Order) => {
    if (order.orderType === "delivery") {
      return "Yetkazib berish"
    }

    if (order.seatingType) {
      // If we have the seating type directly
      return order.seatingType
    }

    // For backward compatibility
    if (order.roomNumber) {
      return "Xona"
    }

    return order.tableType || "Stol"
  }
  // Filter orders based on active tab, date, and waiter
  const filteredOrders = orders.filter((order) => {
    // Filter by tab
    const tabMatch =
      activeTab === "all" ||
      (activeTab === "table" && order.orderType === "table") ||
      (activeTab === "delivery" && order.orderType === "delivery")

    // Filter by date if date filter is set
    let dateMatch = true
    if (dateFilter) {
      const orderDate = order.deletedAt?.toDate
        ? format(new Date(order.deletedAt.toDate()), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd")

      dateMatch = orderDate === dateFilter
    }

    // Filter by waiter
    let waiterMatch = true
    if (waiterFilter !== "all" && order.orderType === "table") {
      if (order.tableNumber && tableWaiters[order.tableNumber]) {
        waiterMatch = tableWaiters[order.tableNumber] === waiterFilter
      } else if (order.roomNumber && roomWaiters[order.roomNumber]) {
        waiterMatch = roomWaiters[order.roomNumber] === waiterFilter
      } else {
        waiterMatch = false
      }
    }

    return tabMatch && dateMatch && waiterMatch
  })

  // Count orders by type
  const tableOrdersCount = orders.filter((order) => order.orderType === "table").length
  const deliveryOrdersCount = orders.filter((order) => order.orderType === "delivery").length

  // Calculate total revenue
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0)

  // Export to Excel
  const exportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = filteredOrders.map((order) => {
        const createdDate = order.createdAt?.toDate
          ? format(new Date(order.createdAt.toDate()), "yyyy-MM-dd HH:mm")
          : "Unknown"

        const deletedDate = order.deletedAt?.toDate
          ? format(new Date(order.deletedAt.toDate()), "yyyy-MM-dd HH:mm")
          : "Unknown"

        const waiterName = order.orderType === "table" ? getWaiterName(order) : "-"

        return {
          "Buyurtma ID": order.id,
          "Buyurtma turi": order.orderType === "table" ? "Stol" : "Yetkazib berish",
          "Stol raqami": order.tableNumber || "-",
          "Xona raqami": order.roomNumber || "-",
          Ofitsiant: waiterName,
          Status: getStatusText(order.status),
          "To'langan": order.isPaid ? "Ha" : "Yo'q",
          Telefon: order.phoneNumber || "-",
          Manzil: order.address || "-",
          "Taomlar soni": order.items.reduce((sum, item) => sum + item.quantity, 0),
          "Jami summa": order.total,
          "Yaratilgan sana": createdDate,
          "O'chirilgan sana": deletedDate,
        }
      })

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData)

      // Create workbook
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Buyurtmalar tarixi")

      // Generate Excel file
      const fileName = dateFilter
        ? `Buyurtmalar_tarixi_${dateFilter}.xlsx`
        : `Buyurtmalar_tarixi_${format(new Date(), "yyyy-MM-dd")}.xlsx`

      XLSX.writeFile(workbook, fileName)

      toast({
        title: "Eksport qilindi",
        description: "Buyurtmalar tarixi Excel formatida eksport qilindi",
      })
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      toast({
        title: "Xatolik",
        description: "Excel formatiga eksport qilishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-1 flex-col">
        <div className="border-b bg-white p-4">
          <h1 className="text-2xl font-bold">Buyurtmalar tarixi</h1>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Jami buyurtmalar</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Jami tushum</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sana bo'yicha</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-8" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ofitsiant bo'yicha</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Select value={waiterFilter} onValueChange={(value) => setWaiterFilter(value)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Ofitsiant tanlang" />
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
            </CardContent>
          </Card>
        </div>

        <div className="p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">
                  Barchasi{" "}
                  <Badge variant="secondary" className="ml-1">
                    {orders.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="table">
                  Stol buyurtmalari{" "}
                  <Badge variant="secondary" className="ml-1">
                    {tableOrdersCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="delivery">
                  Yetkazib berish{" "}
                  <Badge variant="secondary" className="ml-1">
                    {deliveryOrdersCount}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button onClick={exportToExcel} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Excel ga eksport
            </Button>
          </div>

          {renderOrdersList(filteredOrders)}
        </div>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogTitle className="text-lg font-semibold">{selectedOrder ? "Buyurtma tafsilotlari" : ""}</DialogTitle>
          {selectedOrder && <OrderDetails order={selectedOrder} onClose={handleOrderDetailsClose} isDeleted={true} />}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )

  function renderOrdersList(orders: Order[]) {
    if (isLoading) {
      return (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )
    }

    if (orders.length === 0) {
      return (
        <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed">
          <AlertTriangle className="mb-2 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Buyurtmalar tarixi topilmadi</p>
        </div>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow"
          >
            <div className="p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-gray-600" />
                  <Badge variant="outline" className="bg-gray-100 text-gray-800">
                    O'chirilgan
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {order.deletedAt?.toDate ? format(new Date(order.deletedAt.toDate()), "dd.MM.yyyy HH:mm") : ""}
                </div>
              </div>
            </div>

            <div className="p-4">
              <div>
                <div className="font-medium">
                {order.orderType === "table"
                                    ? order.roomNumber
                                      ? `Xona #${order.roomNumber}`
                                      : `${getSeatingTypeDisplay(order)} #${order.tableNumber}`
                                    : "Yetkazib berish"}
                </div>
                {order.orderType === "table" && (
                  <div className="text-sm text-muted-foreground">Ofitsiant: {getWaiterName(order)}</div>
                )}
              </div>
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold text-primary">{formatCurrency(order.total)}</div>
              </div>

              <div className="mb-3 text-sm text-muted-foreground">
                {order.orderType === "delivery" && order.address && (
                  <div className="mb-1">
                    <span className="font-medium">Manzil:</span> {order.address}
                  </div>
                )}
                {order.phoneNumber && (
                  <div className="mb-1">
                    <span className="font-medium">Tel:</span> {order.phoneNumber}
                  </div>
                )}
                <div className="mb-1">
                  <span className="font-medium">Yaratilgan:</span>{" "}
                  {order.createdAt?.toDate ? format(new Date(order.createdAt.toDate()), "dd.MM.yyyy HH:mm") : ""}
                </div>
                <div className="mb-1">
                  <span className="font-medium">Status:</span>{" "}
                  <Badge variant="outline" className={getStatusColor(order.status)}>
                    {getStatusText(order.status)}
                  </Badge>
                </div>
                {order.isPaid && (
                  <div className="mb-1">
                    <span className="font-medium">To'langan:</span>{" "}
                    {order.paidAt?.toDate ? format(new Date(order.paidAt.toDate()), "dd.MM.yyyy HH:mm") : ""}
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
                      <span className="text-muted-foreground">{formatCurrency(item.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => handleSelectOrder(order)}>
                  Batafsil
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }
}
