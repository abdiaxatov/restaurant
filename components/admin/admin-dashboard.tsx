"use client"
import { useState, useEffect, useRef } from "react"
import { collection, query, orderBy, onSnapshot, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminLayout } from "@/components/admin/admin-layout"
import { OrderList } from "@/components/admin/order-list"
import { OrderDetails } from "@/components/admin/order-details"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { ShoppingBag, DollarSign, Clock, Truck, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { Order } from "@/types"

export function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | "table" | "delivery">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false)
  const { toast } = useToast()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousOrderCountRef = useRef(0)

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio("/notification.mp3")

    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"))

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const ordersList: Order[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          // Make sure delivery orders don't have table numbers
          if (data.orderType === "delivery") {
            data.tableNumber = null
            data.roomNumber = null
          }
          ordersList.push({ id: doc.id, ...data } as Order)
        })
        setOrders(ordersList)
        setIsLoading(false)

        // Check for new orders
        const pendingOrders = ordersList.filter((order) => order.status === "pending")
        if (pendingOrders.length > previousOrderCountRef.current) {
          // Play notification sound
          audioRef.current?.play().catch((e) => console.error("Error playing notification sound:", e))
        }
        previousOrderCountRef.current = pendingOrders.length
      },
      (error) => {
        console.error("Error fetching orders:", error)
        toast({
          title: "Xatolik",
          description: "Buyurtmalarni yuklashda xatolik yuz berdi.",
          variant: "destructive",
        })
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [toast])

  // Handle order selection
  const handleSelectOrder = (order: Order) => {
    // Get additional information about the order
    if (order.orderType === "table" && order.tableNumber) {
      // Find the table in the tables state
      const tableQuery = query(collection(db, "tables"), where("number", "==", order.tableNumber))

      getDocs(tableQuery)
        .then((snapshot) => {
          if (!snapshot.empty) {
            const tableData = snapshot.docs[0].data()
            // Add table info to the selected order
            setSelectedOrder({
              ...order,
              tableInfo: {
                status: tableData.status,
                seats: tableData.seats,
                roomId: tableData.roomId,
              },
            })
          } else {
            setSelectedOrder(order)
          }
        })
        .catch((error) => {
          console.error("Error fetching table info:", error)
          setSelectedOrder(order)
        })
    } else {
      setSelectedOrder(order)
    }

    setIsOrderDetailsOpen(true)
  }

  // Handle order details close
  const handleOrderDetailsClose = () => {
    setIsOrderDetailsOpen(false)
    setSelectedOrder(null)
  }

  // Filter orders based on status and type
  const filteredOrders = orders.filter((order) => {
    const statusMatch = statusFilter === "all" || order.status === statusFilter
    const typeMatch = orderTypeFilter === "all" || order.orderType === orderTypeFilter
    return statusMatch && typeMatch
  })

  // Count orders by status
  const pendingCount = orders.filter((order) => order.status === "pending").length
  const preparingCount = orders.filter((order) => order.status === "preparing").length
  const readyCount = orders.filter((order) => order.status === "ready").length
  const completedCount = orders.filter((order) => order.status === "completed").length

  // Count orders by type
  const tableOrdersCount = orders.filter((order) => order.orderType === "table").length
  const deliveryOrdersCount = orders.filter((order) => order.orderType === "delivery").length

  // Calculate total revenue
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)

  return (
    <AdminLayout>
      <div className="flex flex-1 flex-col">
        <div className="border-b bg-white p-4">
          <h1 className="text-2xl font-bold">Boshqaruv paneli</h1>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Jami buyurtmalar</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
              <div className="mt-1 flex gap-2">
                <Badge variant="outline" className="text-xs">
                  Stol: {tableOrdersCount}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Yetkazib berish: {deliveryOrdersCount}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Jami tushum</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Kutilayotgan buyurtmalar</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount + preparingCount + readyCount}</div>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  Kutilmoqda: {pendingCount}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Tayyorlanmoqda: {preparingCount}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Tayyor: {readyCount}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Yakunlangan buyurtmalar</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Tabs
              defaultValue="all"
              onValueChange={(value) => setOrderTypeFilter(value as "all" | "table" | "delivery")}
            >
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

            <div className="flex gap-2  pb-2">
              <button
                onClick={() => setStatusFilter("all")}
                className={`rounded-md px-3 py-1 text-sm ${
                  statusFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                Barchasi
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`rounded-md px-3 py-1 text-sm ${
                  statusFilter === "pending" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                Kutilmoqda{" "}
                <Badge variant="secondary" className="ml-1">
                  {pendingCount}
                </Badge>
              </button>
              <button
                onClick={() => setStatusFilter("preparing")}
                className={`rounded-md px-3 py-1 text-sm ${
                  statusFilter === "preparing" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                Tayyorlanmoqda{" "}
                <Badge variant="secondary" className="ml-1">
                  {preparingCount}
                </Badge>
              </button>
              <button
                onClick={() => setStatusFilter("ready")}
                className={`rounded-md px-3 py-1 text-sm ${
                  statusFilter === "ready" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                Tayyor{" "}
                <Badge variant="secondary" className="ml-1">
                  {readyCount}
                </Badge>
              </button>
              <button
                onClick={() => setStatusFilter("completed")}
                className={`rounded-md px-3 py-1 text-sm ${
                  statusFilter === "completed" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                Yakunlangan{" "}
                <Badge variant="secondary" className="ml-1">
                  {completedCount}
                </Badge>
              </button>
            </div>
          </div>

          {isLoading ? (
                  <div className="flex min-h-screen flex-col items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground"> Buyurtmalar yuklanmoqda...</p>
                  </div>
          ) : (
            <OrderList orders={filteredOrders} selectedOrderId={selectedOrder?.id} onSelectOrder={handleSelectOrder} />
          )}
        </div>

        {/* Order Details Modal */}
        <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
          <DialogContent className="sm:max-w-[600px]">
            {/* Add DialogTitle for accessibility */}
            <DialogTitle className="text-lg font-semibold">{selectedOrder ? "Buyurtma tafsilotlari" : ""}</DialogTitle>
            {selectedOrder && <OrderDetails order={selectedOrder} onClose={handleOrderDetailsClose} />}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
