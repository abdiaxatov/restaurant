"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef } from "react"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import AdminLayout  from "@/components/admin/admin-layout"
import { OrderList } from "@/components/admin/order-list"
import { OrderDetails } from "@/components/admin/order-details"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, getStatusText } from "@/lib/utils"
import {
  ShoppingBag,
  DollarSign,
  Clock,
  Loader2,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  BarChartIcon,
  ChevronRight,
  Utensils,
  CreditCard,
  User,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"
import type { Order } from "@/types"
import { format, subDays, startOfDay, endOfDay } from "date-fns"

export function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | "table" | "delivery">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<string>("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [isLoading, setIsLoading] = useState(true)
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false)
  const { toast } = useToast()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousOrderCountRef = useRef(0)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [comparisonData, setComparisonData] = useState({
    ordersChange: 0,
    revenueChange: 0,
  })
  const [statusData, setStatusData] = useState<{ name: string; count: number }[]>([])
  const [revenueData, setRevenueData] = useState<{ date: string; revenue: number }[]>([])
  const [waiters, setWaiters] = useState<{ id: string; name: string }[]>([])
  const [waiterFilter, setWaiterFilter] = useState<string>("all")

  useEffect(() => {
    // Load saved waiter filter from localStorage
    const savedWaiterFilter = localStorage.getItem("dashboardWaiterFilter")
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
    localStorage.setItem("dashboardWaiterFilter", waiterFilter)
  }, [waiterFilter])

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio("/notification.mp3")

    // Get today's date range
    const today = new Date()
    const startOfToday = startOfDay(today)
    const endOfToday = endOfDay(today)

    // Get yesterday's date range for comparison
    const yesterday = subDays(today, 1)
    const startOfYesterday = startOfDay(yesterday)
    const endOfYesterday = endOfDay(yesterday)

    // Query for today's orders
    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", sortOrder))

    // Query for yesterday's orders (for comparison)
    const yesterdayOrdersQuery = query(
      collection(db, "orders"),
      where("createdAt", ">=", startOfYesterday),
      where("createdAt", "<=", endOfYesterday),
    )

    // Listen for real-time updates to orders
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const ordersList: Order[] = []
        let todayOrderCount = 0
        let todayRevenue = 0
        const dailyData: Record<string, number> = {}
        const statusCounts: Record<string, number> = {
          pending: 0,
          preparing: 0,
          ready: 0,
          completed: 0,
          paid: 0,
        }

        snapshot.forEach((doc) => {
          const data = doc.data()
          // Make sure delivery orders don't have table numbers
          if (data.orderType === "delivery") {
            data.tableNumber = null
            data.roomNumber = null
          }

          const order = { id: doc.id, ...data } as Order
          ordersList.push(order)

          // Count today's orders and revenue
          const orderDate = order.createdAt?.toDate ? new Date(order.createdAt.toDate()) : null
          if (orderDate && orderDate >= startOfToday && orderDate <= endOfToday) {
            todayOrderCount++
            todayRevenue += order.total
          }

          // Count statuses
          if (statusCounts[order.status] !== undefined) {
            statusCounts[order.status]++
          }

          // Aggregate daily data for the last 7 days
          if (orderDate) {
            const dateKey = format(orderDate, "MM-dd")
            if (!dailyData[dateKey]) {
              dailyData[dateKey] = 0
            }
            dailyData[dateKey] += order.total
          }
        })

        // Prepare revenue data for chart
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), i)
          const dateKey = format(date, "MM-dd")
          const dateLabel = format(date, "dd MMM")
          return {
            date: dateLabel,
            revenue: dailyData[dateKey] || 0,
          }
        }).reverse()

        setRevenueData(last7Days)

        // Prepare status data for chart
        const statusDataArray = Object.entries(statusCounts).map(([name, count]) => ({
          name: getStatusText(name),
          count,
        }))

        setStatusData(statusDataArray)
        setOrders(ordersList)
        setIsLoading(false)

        // Check for new orders
        const pendingOrders = ordersList.filter((order) => order.status === "pending")
        if (pendingOrders.length > previousOrderCountRef.current) {
          // Play notification sound
          audioRef.current?.play().catch((e) => console.error("Error playing notification sound:", e))
        }
        previousOrderCountRef.current = pendingOrders.length

        // Get yesterday's data for comparison
        getDocs(yesterdayOrdersQuery)
          .then((yesterdaySnapshot) => {
            let yesterdayOrderCount = 0
            let yesterdayRevenue = 0

            yesterdaySnapshot.forEach((doc) => {
              const order = doc.data() as Order
              yesterdayOrderCount++
              yesterdayRevenue += order.total
            })

            // Calculate percentage changes
            const ordersChange =
              yesterdayOrderCount > 0 ? ((todayOrderCount - yesterdayOrderCount) / yesterdayOrderCount) * 100 : 0

            const revenueChange =
              yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0

            setComparisonData({
              ordersChange,
              revenueChange,
            })
          })
          .catch((error) => {
            console.error("Error fetching yesterday's orders:", error)
          })
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
  }, [toast, sortOrder])

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

  // Handle delete button click
  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order)
    setIsDeleteDialogOpen(true)
  }

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!orderToDelete || !orderToDelete.id) return

    setIsDeleting(true)
    try {
      // Before deleting, add the order to orderHistory collection
      await addDoc(collection(db, "orderHistory"), {
        ...orderToDelete,
        deletedAt: serverTimestamp(),
        deletedBy: "admin", // You could add user info here if available
      })

      // Now delete the original order
      await deleteDoc(doc(db, "orders", orderToDelete.id))

      // Play delete sound
      const audio = new Audio("/click.mp3")
      audio.play().catch((e) => console.error("Error playing sound:", e))

      toast({
        title: "Buyurtma o'chirildi",
        description: "Buyurtma muvaffaqiyatli o'chirildi va tarixga saqlandi",
      })
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Error deleting order:", error)
      toast({
        title: "Xatolik",
        description: "Buyurtmani o'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter orders based on status, type, date, search query, and waiter
  const filteredOrders = orders.filter((order) => {
    // Filter by status
    const statusMatch = statusFilter === "all" || order.status === statusFilter

    // Filter by type
    const typeMatch = orderTypeFilter === "all" || order.orderType === orderTypeFilter

    // Filter by date
    let dateMatch = true
    if (dateFilter) {
      const orderDate = order.createdAt?.toDate ? format(new Date(order.createdAt.toDate()), "yyyy-MM-dd") : ""
      dateMatch = orderDate === dateFilter
    }

    // Filter by waiter
    let waiterMatch = true
    if (waiterFilter !== "all" && order.orderType === "table") {
      // Get waiter ID from table or room
      let waiterId = null
      if (order.tableNumber) {
        const table = orders.find((o) => o.tableNumber === order.tableNumber)
        waiterId = table?.waiterId
      } else if (order.roomNumber) {
        const room = orders.find((o) => o.roomNumber === order.roomNumber)
        waiterId = room?.waiterId
      }
      waiterMatch = waiterId === waiterFilter
    }

    // Filter by search query
    let searchMatch = true
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      searchMatch =
        order.tableNumber?.toString().includes(query) ||
        false ||
        order.roomNumber?.toString().includes(query) ||
        false ||
        order.phoneNumber?.toLowerCase().includes(query) ||
        false ||
        order.address?.toLowerCase().includes(query) ||
        false ||
        order.items.some((item) => item.name.toLowerCase().includes(query))
    }

    return statusMatch && typeMatch && dateMatch && searchMatch && waiterMatch
  })

  // Count orders by status
  const pendingCount = orders.filter((order) => order.status === "pending").length
  const preparingCount = orders.filter((order) => order.status === "preparing").length
  const readyCount = orders.filter((order) => order.status === "ready").length
  const completedCount = orders.filter((order) => order.status === "completed").length
  const paidCount = orders.filter((order) => order.status === "paid").length

  // Count orders by type
  const tableOrdersCount = orders.filter((order) => order.orderType === "table").length
  const deliveryOrdersCount = orders.filter((order) => order.orderType === "delivery").length

  // Calculate total revenue
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)

  // Calculate today's revenue
  const today = new Date()
  const startOfToday = startOfDay(today)
  const endOfToday = endOfDay(today)

  const todayOrders = orders.filter((order) => {
    const orderDate = order.createdAt?.toDate ? new Date(order.createdAt.toDate()) : null
    return orderDate && orderDate >= startOfToday && orderDate <= endOfToday
  })

  const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0)
  const todayOrdersCount = todayOrders.length

  // Calculate paid orders revenue
  const paidOrdersRevenue = orders
    .filter((order) => order.status === "paid")
    .reduce((sum, order) => sum + order.total, 0)

  const renderChangeIndicator = (value: number) => {
    if (value > 0) {
      return (
        <div className="flex items-center text-green-600">
          <ArrowUpRight className="mr-1 h-4 w-4" />
          <span>+{value.toFixed(1)}%</span>
        </div>
      )
    } else if (value < 0) {
      return (
        <div className="flex items-center text-red-600">
          <ArrowDownRight className="mr-1 h-4 w-4" />
          <span>{value.toFixed(1)}%</span>
        </div>
      )
    }
    return <span className="text-muted-foreground">0%</span>
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Boshqaruv paneli</h1>

          {pendingCount > 0 && (
            <div className="flex items-center">
              <Badge variant="destructive" className="mr-2 animate-pulse">
                {pendingCount} yangi buyurtma
              </Badge>
              <Bell className="h-5 w-5 text-amber-500" />
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Bugungi buyurtmalar</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayOrdersCount}</div>
              <div className="mt-1 flex items-center justify-between">
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    Stol: {todayOrders.filter((o) => o.orderType === "table").length}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Yetkazib berish: {todayOrders.filter((o) => o.orderType === "delivery").length}
                  </Badge>
                </div>
                {renderChangeIndicator(comparisonData.ordersChange)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Bugungi tushum</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(todayRevenue)}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  O'rtacha: {todayOrdersCount > 0 ? formatCurrency(todayRevenue / todayOrdersCount) : formatCurrency(0)}
                </span>
                {renderChangeIndicator(comparisonData.revenueChange)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Kutilayotgan buyurtmalar</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount + preparingCount + readyCount}</div>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={`text-xs ${pendingCount > 0 ? "bg-yellow-100 text-yellow-800" : ""}`}
                >
                  Kutilmoqda: {pendingCount}
                </Badge>
                <Badge variant="outline" className={`text-xs ${preparingCount > 0 ? "bg-blue-100 text-blue-800" : ""}`}>
                  Tayyorlanmoqda: {preparingCount}
                </Badge>
                <Badge variant="outline" className={`text-xs ${readyCount > 0 ? "bg-green-100 text-green-800" : ""}`}>
                  Tayyor: {readyCount}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">To'langan buyurtmalar</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paidCount}</div>
              <div className="mt-1 text-sm text-muted-foreground">Jami: {formatCurrency(paidOrdersRevenue)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Weekly Revenue Chart */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChartIcon className="h-5 w-5" />
                Haftalik tushum
              </CardTitle>
              <CardDescription>So'nggi 7 kun uchun tushum</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(value) => formatCurrency(value).replace(/\s+/g, "")} />
                      <RechartsTooltip formatter={(value) => [formatCurrency(value as number), "Tushum"]} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Tushum"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-center text-muted-foreground">Ma'lumot yo'q</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="ghost" size="sm" asChild>
                <a href="/admin/stats">
                  Batafsil <ChevronRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
            </CardFooter>
          </Card>

          {/* Status Chart */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Buyurtma statuslari
              </CardTitle>
              <CardDescription>Buyurtmalar statusi bo'yicha taqsimlanishi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <RechartsTooltip />
                      <Bar dataKey="count" name="Buyurtmalar soni" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-center text-muted-foreground">Ma'lumot yo'q</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="ghost" size="sm" asChild>
                <a href="/admin/stats">
                  Batafsil <ChevronRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Update the dashboard design for orders section */}
        <div className="mt-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Buyurtmalar</CardTitle>
              <CardDescription>Barcha buyurtmalarni ko'rish va boshqarish</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <Tabs
                    defaultValue="all"
                    value={orderTypeFilter}
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

                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-auto"
                  />
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buyurtmalarni qidirish..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

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

                  <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "asc" | "desc")}>
                    <SelectTrigger className="w-[180px]">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <SelectValue placeholder="Saralash" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Eng yangi</SelectItem>
                      <SelectItem value="asc">Eng eski</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2">
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
                      statusFilter === "pending"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
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
                      statusFilter === "preparing"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
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
                      statusFilter === "completed"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    Yakunlangan{" "}
                    <Badge variant="secondary" className="ml-1">
                      {completedCount}
                    </Badge>
                  </button>
                  <button
                    onClick={() => setStatusFilter("paid")}
                    className={`rounded-md px-3 py-1 text-sm ${
                      statusFilter === "paid" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    To'landi{" "}
                    <Badge variant="secondary" className="ml-1">
                      {paidCount}
                    </Badge>
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex h-60 items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed">
                  <ShoppingBag className="mb-2 h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground">Buyurtmalar topilmadi</p>
                  {searchQuery && (
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearchQuery("")}>
                      Qidiruvni tozalash
                    </Button>
                  )}
                  {dateFilter && (
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setDateFilter("")}>
                      Sana filtrini tozalash
                    </Button>
                  )}
                </div>
              ) : (
                <OrderList
                  orders={filteredOrders}
                  selectedOrderId={selectedOrder?.id}
                  onSelectOrder={handleSelectOrder}
                  onDeleteOrder={handleDeleteClick}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Details Modal */}
        <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
          <DialogContent className="sm:max-w-[600px]">
            {/* Add DialogTitle for accessibility */}
            <DialogTitle className="text-lg font-semibold">{selectedOrder ? "Buyurtma tafsilotlari" : ""}</DialogTitle>
            {selectedOrder && <OrderDetails order={selectedOrder} onClose={handleOrderDetailsClose} />}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogTitle>Buyurtmani o'chirishni tasdiqlaysizmi?</DialogTitle>
            <DialogDescription>
              Bu amal qaytarib bo'lmaydi. Buyurtma butunlay o'chiriladi va tarixga saqlanadi.
            </DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
                Bekor qilish
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    O'chirilmoqda...
                  </>
                ) : (
                  "O'chirish"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
