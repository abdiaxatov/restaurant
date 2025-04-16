"use client"

import { DialogHeader } from "@/components/ui/dialog"

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
  updateDoc,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import AdminLayout  from "@/components/admin/admin-layout"
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
  User,
  Calendar,
  Archive,
  AlertTriangle,
  CheckCircle,
  XCircle,
  PieChart,
  Info,
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import type { Order } from "@/types"
import { format, subDays, startOfDay, endOfDay, differenceInDays, addDays, startOfMonth, endOfMonth } from "date-fns"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

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
  const [statusData, setStatusData] = useState<{ name: string; count: number; color: string }[]>([])
  const [revenueData, setRevenueData] = useState<
    { date: string; revenue: number; paidRevenue: number; unpaidRevenue: number }[]
  >([])
  const [waiters, setWaiters] = useState<{ id: string; name: string }[]>([])
  const [waiterFilter, setWaiterFilter] = useState<string>("all")
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("today")
  const [totalPaidAmount, setTotalPaidAmount] = useState(0)
  const [totalUnpaidAmount, setTotalUnpaidAmount] = useState(0)
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([])
  const [expiredOrdersCount, setExpiredOrdersCount] = useState(0)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [selectedStatusForModal, setSelectedStatusForModal] = useState<string | null>(null)
  const [ordersByType, setOrdersByType] = useState<{ name: string; value: number; color: string }[]>([])

  const STATUS_COLORS = {
    pending: "#FFBB28",
    preparing: "#0088FE",
    completed: "#8884d8",
    paid: "#82ca9d",
  }

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

    // Get date range based on selected time range
    const today = new Date()
    let startDate = new Date(today)
    let endDate = new Date()

    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    if (timeRange === "week") {
      startDate.setDate(today.getDate() - 7)
    } else if (timeRange === "month") {
      startDate = startOfMonth(today)
      endDate = endOfMonth(today)
    }

    // Get yesterday's date range for comparison
    const previousStartDate = new Date(startDate)
    const previousEndDate = new Date(startDate)
    previousStartDate.setDate(previousStartDate.getDate() - (timeRange === "today" ? 1 : timeRange === "week" ? 7 : 30))
    previousEndDate.setDate(previousEndDate.getDate() - 1)

    // Query for orders in the selected time range
    const ordersQuery = query(
      collection(db, "orders"),
      where("createdAt", ">=", startDate),
      where("createdAt", "<=", endDate),
      orderBy("createdAt", sortOrder),
    )

    // Query for yesterday's orders (for comparison)
    const yesterdayOrdersQuery = query(
      collection(db, "orders"),
      where("createdAt", ">=", previousStartDate),
      where("createdAt", "<=", previousEndDate),
    )

    // Check for expired orders (older than 30 days and not paid)
    const checkExpiredOrders = async () => {
      try {
        const thirtyDaysAgo = subDays(new Date(), 30)
        const expiredOrdersQuery = query(
          collection(db, "orders"),
          where("createdAt", "<", thirtyDaysAgo),
          where("status", "!=", "paid"),
        )

        const expiredOrdersSnapshot = await getDocs(expiredOrdersQuery)
        setExpiredOrdersCount(expiredOrdersSnapshot.size)

        // Auto-archive expired orders if there are any
        if (expiredOrdersSnapshot.size > 0) {
          handleArchiveExpiredOrders()
        }
      } catch (error) {
        console.error("Error checking expired orders:", error)
      }
    }

    // Check for expired orders on component mount
    checkExpiredOrders()

    // Listen for real-time updates to orders
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const ordersList: Order[] = []
        let periodOrderCount = 0
        let periodRevenue = 0
        let paidRevenue = 0
        let unpaidRevenue = 0
        const dailyData: Record<
          string,
          { revenue: number; orders: number; paidRevenue: number; unpaidRevenue: number }
        > = {}
        const statusCounts: Record<string, number> = {
          pending: 0,
          preparing: 0,
          completed: 0,
          paid: 0,
        }
        const typeCounts: Record<string, number> = {
          table: 0,
          delivery: 0,
        }
        const unpaidOrdersList: Order[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()
          // Make sure delivery orders don't have table numbers
          if (data.orderType === "delivery") {
            data.tableNumber = null
            data.roomNumber = null
          }

          // Convert "ready" status to "preparing" for consistency
          if (data.status === "ready") {
            data.status = "preparing"
          }

          const order = { id: doc.id, ...data } as Order
          ordersList.push(order)

          // Count period orders and revenue
          periodOrderCount++
          periodRevenue += order.total

          // Track paid vs unpaid revenue
          if (order.status === "paid" || order.isPaid) {
            paidRevenue += order.total
          } else {
            unpaidRevenue += order.total
            unpaidOrdersList.push(order)
          }

          // Count statuses
          if (statusCounts[order.status] !== undefined) {
            statusCounts[order.status]++
          }

          // Count order types
          if (typeCounts[order.orderType] !== undefined) {
            typeCounts[order.orderType]++
          }

          // Aggregate daily data
          const orderDate = order.createdAt?.toDate ? new Date(order.createdAt.toDate()) : null
          if (orderDate) {
            const dateKey = format(orderDate, timeRange === "today" ? "HH:00" : "yyyy-MM-dd")
            if (!dailyData[dateKey]) {
              dailyData[dateKey] = { revenue: 0, orders: 0, paidRevenue: 0, unpaidRevenue: 0 }
            }
            dailyData[dateKey].revenue += order.total
            dailyData[dateKey].orders += 1

            if (order.status === "paid" || order.isPaid) {
              dailyData[dateKey].paidRevenue += order.total
            } else {
              dailyData[dateKey].unpaidRevenue += order.total
            }
          }
        })

        // Prepare revenue data for chart
        const timeSeriesData: { date: string; revenue: number; paidRevenue: number; unpaidRevenue: number }[] = []

        if (timeRange === "today") {
          // For today, show hourly data
          for (let hour = 0; hour < 24; hour++) {
            const hourKey = `${hour.toString().padStart(2, "0")}:00`
            const hourData = dailyData[hourKey] || { revenue: 0, orders: 0, paidRevenue: 0, unpaidRevenue: 0 }
            timeSeriesData.push({
              date: hourKey,
              revenue: hourData.revenue,
              paidRevenue: hourData.paidRevenue,
              unpaidRevenue: hourData.unpaidRevenue,
            })
          }
        } else {
          // For week/month, show daily data
          const daysToShow = timeRange === "week" ? 7 : differenceInDays(endDate, startDate) + 1
          for (let i = 0; i < daysToShow; i++) {
            const date = addDays(startDate, i)
            const dateKey = format(date, "yyyy-MM-dd")
            const dateStr = format(date, "dd MMM")
            const dayData = dailyData[dateKey] || { revenue: 0, orders: 0, paidRevenue: 0, unpaidRevenue: 0 }

            timeSeriesData.push({
              date: dateStr,
              revenue: dayData.revenue,
              paidRevenue: dayData.paidRevenue,
              unpaidRevenue: dayData.unpaidRevenue,
            })
          }
        }

        setRevenueData(timeSeriesData)

        // Prepare status data for chart
        const statusDataArray = Object.entries(statusCounts).map(([status, count]) => ({
          name: getStatusText(status),
          count,
          color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "#999",
        }))

        // Prepare order type data for chart
        const orderTypeDataArray = [
          { name: "Stol buyurtmasi", value: typeCounts.table, color: "#0088FE" },
          { name: "Yetkazib berish", value: typeCounts.delivery, color: "#00C49F" },
        ].filter((item) => item.value > 0)

        setStatusData(statusDataArray)
        setOrdersByType(orderTypeDataArray)
        setOrders(ordersList)
        setTotalPaidAmount(paidRevenue)
        setTotalUnpaidAmount(unpaidRevenue)
        setUnpaidOrders(unpaidOrdersList)
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
              yesterdayOrderCount > 0 ? ((periodOrderCount - yesterdayOrderCount) / yesterdayOrderCount) * 100 : 0

            const revenueChange =
              yesterdayRevenue > 0 ? ((periodRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0

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
  }, [toast, sortOrder, timeRange])






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

  // Handle status selection from modal
  const handleStatusSelect = async (status: string) => {
    if (!selectedStatusForModal) {
      setIsStatusModalOpen(false)
      return
    }

    try {
      // Update order status
      await updateDoc(doc(db, "orders", selectedStatusForModal), {
        status,
        updatedAt: new Date(),
        // Add paid flag if the status is "paid"
        ...(status === "paid" ? { isPaid: true, paidAt: new Date() } : {}),
      })

      // Play appropriate sound based on status
      let soundFile = ""
      switch (status) {
        case "preparing":
          soundFile = "/cooking.mp3"
          break
        case "completed":
        case "paid":
          soundFile = "/success.mp3"
          break
      }

      if (soundFile) {
        const audio = new Audio(soundFile)
        audio.play().catch((e) => console.error("Error playing sound:", e))
      }

      toast({
        title: "Status yangilandi",
        description: `Buyurtma statusi "${status === "paid" ? "To'landi" : getStatusText(status)}" ga o'zgartirildi`,
      })

      // Close modal
      setIsStatusModalOpen(false)
      setSelectedStatusForModal(null)
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Xatolik",
        description: "Buyurtma statusini yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  // Handle archive expired orders
  const handleArchiveExpiredOrders = async () => {
    setIsArchiving(true)
    try {
      const thirtyDaysAgo = subDays(new Date(), 30)

      // Get expired orders
      const expiredOrdersQuery = query(
        collection(db, "orders"),
        where("createdAt", "<", thirtyDaysAgo),
        where("status", "!=", "paid"),
      )

      const expiredOrdersSnapshot = await getDocs(expiredOrdersQuery)
      let archivedCount = 0

      // Archive each expired order
      for (const doc of expiredOrdersSnapshot.docs) {
        const order = doc.data()

        // Add to orderHistory collection
        await addDoc(collection(db, "orderHistory"), {
          ...order,
          id: doc.id,
          deletedAt: Timestamp.now(),
          deletedBy: "system",
          archiveReason: "expired",
        })

        // Delete from orders collection
        await deleteDoc(doc.ref)
        archivedCount++
      }

      if (archivedCount > 0) {
        toast({
          title: "Arxivlash yakunlandi",
          description: `${archivedCount} ta muddati o'tgan buyurtma arxivlandi`,
        })
      }

      setExpiredOrdersCount(0)
      setIsArchiveDialogOpen(false)
    } catch (error) {
      console.error("Error archiving expired orders:", error)
      toast({
        title: "Xatolik",
        description: "Buyurtmalarni arxivlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsArchiving(false)
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
      if (order.seatingType) {
        // If we have the seating type directly
        return order.seatingType
      }
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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Boshqaruv paneli</h1>

          <div className="flex flex-wrap items-center gap-4">
            <Tabs defaultValue={timeRange} onValueChange={(value) => setTimeRange(value as "today" | "week" | "month")}>
              <TabsList>
                <TabsTrigger value="today" className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Bugun</span>
                </TabsTrigger>
                <TabsTrigger value="week" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Hafta</span>
                </TabsTrigger>
                <TabsTrigger value="month" className="flex items-center gap-1">
                  <BarChartIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Oy</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {expiredOrdersCount > 0 && (
              <Button
                variant="outline"
                className="flex items-center gap-2 text-amber-600 border-amber-600"
                onClick={() => setIsArchiveDialogOpen(true)}
              >
                <Archive className="h-4 w-4" />
                <span>Arxivlash ({expiredOrdersCount})</span>
              </Button>
            )}

            {pendingCount > 0 && (
              <div className="flex items-center">
                <Badge variant="destructive" className="mr-2 animate-pulse">
                  {pendingCount} yangi buyurtma
                </Badge>
                <Bell className="h-5 w-5 text-amber-500" />
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}

            <Card className="col-span-2">
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {timeRange === "today"
                      ? "Bugungi buyurtmalar"
                      : timeRange === "week"
                        ? "Haftalik buyurtmalar"
                        : "Oylik buyurtmalar"}
                  </CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todayOrders.length}</div>
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
                  <CardTitle className="text-sm font-medium">
                    {timeRange === "today"
                      ? "Bugungi tushum"
                      : timeRange === "week"
                        ? "Haftalik tushum"
                        : "Oylik tushum"}
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      O'rtacha:{" "}
                      {todayOrdersCount > 0 ? formatCurrency(todayRevenue / todayOrdersCount) : formatCurrency(0)}
                    </span>
                    {renderChangeIndicator(comparisonData.revenueChange)}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">To'langan summa</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaidAmount)}</div>
                  <div className="mt-1">
                    <Progress
                      value={totalRevenue > 0 ? (totalPaidAmount / totalRevenue) * 100 : 0}
                      className="h-2 bg-gray-100"
                    />
                    <div className="mt-1 text-sm text-muted-foreground">
                      {totalRevenue > 0
                        ? `${((totalPaidAmount / totalRevenue) * 100).toFixed(1)}% to'langan`
                        : "Ma'lumot yo'q"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">To'lanmagan summa</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(totalUnpaidAmount)}</div>
                  <div className="mt-1">
                    <Progress
                      value={totalRevenue > 0 ? (totalUnpaidAmount / totalRevenue) * 100 : 0}
                      className="h-2 bg-gray-100"
                    />
                    <div className="mt-1 text-sm text-muted-foreground">
                      {totalRevenue > 0
                        ? `${((totalUnpaidAmount / totalRevenue) * 100).toFixed(1)}% to'lanmagan`
                        : "Ma'lumot yo'q"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mb-8 grid gap-6 md:grid-cols-2">
              {/* Revenue Chart */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChartIcon className="h-5 w-5" />
                    {timeRange === "today"
                      ? "Bugungi tushum"
                      : timeRange === "week"
                        ? "Haftalik tushum"
                        : "Oylik tushum"}
                  </CardTitle>
                  <CardDescription>
                    Jami tushum: {formatCurrency(totalRevenue)} | To'langan: {formatCurrency(totalPaidAmount)} |
                    To'lanmagan: {formatCurrency(totalUnpaidAmount)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    {revenueData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis tickFormatter={(value) => formatCurrency(value).replace(/\s+/g, "")} />
                          <RechartsTooltip
                            formatter={(value, name) => [
                              formatCurrency(value as number),
                              name === "paidRevenue"
                                ? "To'langan"
                                : name === "unpaidRevenue"
                                  ? "To'lanmagan"
                                  : name === "revenue"
                                    ? "Jami tushum"
                                    : "Buyurtmalar",
                            ]}
                          />
                          <Area
                            type="monotone"
                            dataKey="paidRevenue"
                            name="To'langan"
                            stackId="1"
                            stroke="#82ca9d"
                            fill="#82ca9d"
                            fillOpacity={0.6}
                          />
                          <Area
                            type="monotone"
                            dataKey="unpaidRevenue"
                            name="To'lanmagan"
                            stackId="1"
                            stroke="#ff8042"
                            fill="#ff8042"
                            fillOpacity={0.6}
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
                    <PieChart className="h-5 w-5" />
                    Buyurtmalar holati
                  </CardTitle>
                  <CardDescription>Buyurtmalar statusi bo'yicha taqsimlanishi</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    {statusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-center text-muted-foreground">Ma'lumot yo'q</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Buyurtmalar holati kartlari */}
            <div className="mb-8 grid gap-4 md:grid-cols-3">
              <Card
                className={`shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                  statusFilter === "pending" ? "border-2 border-yellow-400" : ""
                }`}
                onClick={() => {
                  setStatusFilter("pending")
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-yellow-50">
                  <CardTitle className="text-sm font-medium text-yellow-800">Kutilmoqda</CardTitle>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    {pendingCount}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-lg font-medium text-yellow-600">
                    {formatCurrency(orders.filter((o) => o.status === "pending").reduce((sum, o) => sum + o.total, 0))}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        setStatusFilter("pending")
                      }}
                    >
                      Ko'rish <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                  statusFilter === "preparing" ? "border-2 border-blue-400" : ""
                }`}
                onClick={() => {
                  setStatusFilter("preparing")
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-blue-50">
                  <CardTitle className="text-sm font-medium text-blue-800">Tayyorlanmoqda</CardTitle>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    {preparingCount}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-lg font-medium text-blue-600">
                    {formatCurrency(
                      orders.filter((o) => o.status === "preparing").reduce((sum, o) => sum + o.total, 0),
                    )}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        setStatusFilter("preparing")
                      }}
                    >
                      Ko'rish <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                  statusFilter === "completed" ? "border-2 border-purple-400" : ""
                }`}
                onClick={() => {
                  setStatusFilter("completed")
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-purple-50">
                  <CardTitle className="text-sm font-medium text-purple-800">Yakunlangan</CardTitle>
                  <Badge variant="outline" className="bg-purple-100 text-purple-800">
                    {completedCount}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-lg font-medium text-purple-600">
                    {formatCurrency(
                      orders.filter((o) => o.status === "completed").reduce((sum, o) => sum + o.total, 0),
                    )}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        setStatusFilter("completed")
                      }}
                    >
                      Ko'rish <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                  statusFilter === "paid" ? "border-2 border-green-400" : ""
                }`}
                onClick={() => {
                  setStatusFilter("paid")
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-green-50">
                  <CardTitle className="text-sm font-medium text-green-800">To'landi</CardTitle>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    {paidCount}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-lg font-medium text-green-600">
                    {formatCurrency(orders.filter((o) => o.status === "paid").reduce((sum, o) => sum + o.total, 0))}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-800 hover:bg-green-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        setStatusFilter("paid")
                      }}
                    >
                      Ko'rish <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* To'lanmagan buyurtmalar */}
            {unpaidOrders.length > 0 && (
              <div className="mt-8 mb-8">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      To'lanmagan buyurtmalar
                    </CardTitle>
                    <CardDescription>
                      Jami {unpaidOrders.length} ta to'lanmagan buyurtma, {formatCurrency(totalUnpaidAmount)} summa
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Buyurtma</TableHead>
                            <TableHead>Summa</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Yaratilgan sana</TableHead>
                            <TableHead>Amallar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {unpaidOrders.slice(0, 5).map((order) => {
                            const orderDate = order.createdAt?.toDate ? new Date(order.createdAt.toDate()) : new Date()
                            const daysSinceCreated = differenceInDays(new Date(), orderDate)

                            return (
                              <TableRow key={order.id} className={daysSinceCreated > 7 ? "bg-red-50" : ""}>
                                <TableCell>
                                {order.orderType === "table"
                          ? order.roomNumber
                            ? `Xona #${order.roomNumber}`
                            : `${getSeatingTypeDisplay(order)} #${order.tableNumber}`
                          : "Yetkazib berish"}
                                </TableCell>
                                <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`${
                                      order.status === "pending"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : order.status === "preparing"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {order.status === "pending"
                                      ? "Kutilmoqda"
                                      : order.status === "preparing"
                                        ? "Tayyorlanmoqda"
                                        : "Yakunlangan"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {format(orderDate, "dd.MM.yyyy HH:mm")}
                                  {daysSinceCreated > 0 && (
                                    <Badge
                                      variant="outline"
                                      className={`ml-2 ${
                                        daysSinceCreated > 30
                                          ? "bg-red-100 text-red-800"
                                          : daysSinceCreated > 7
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {daysSinceCreated} kun
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 hover:bg-green-50"
                                    onClick={() => {
                                      setSelectedStatusForModal(order.id)
                                      setIsStatusModalOpen(true)
                                    }}
                                  >
                                    Status o'zgartirish
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {unpaidOrders.length > 5 && (
                      <div className="mt-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setStatusFilter("all")
                            setOrderTypeFilter("all")
                          }}
                        >
                          Barcha {unpaidOrders.length} ta buyurtmani ko'rish
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Buyurtmalar ro'yxati */}
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
                          statusFilter === "all"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        Barchasi
                      </button>
                      <button
                        onClick={() => setStatusFilter("pending")}
                        className={`rounded-md px-3 py-1 text-sm ${
                          statusFilter === "pending" ? "bg-yellow-500 text-white" : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        Kutilmoqda{" "}
                        <Badge variant="secondary" className="ml-1 bg-yellow-200 text-yellow-800">
                          {pendingCount}
                        </Badge>
                      </button>
                      <button
                        onClick={() => setStatusFilter("preparing")}
                        className={`rounded-md px-3 py-1 text-sm ${
                          statusFilter === "preparing" ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        Tayyorlanmoqda{" "}
                        <Badge variant="secondary" className="ml-1 bg-blue-200 text-blue-800">
                          {preparingCount}
                        </Badge>
                      </button>
                      <button
                        onClick={() => setStatusFilter("completed")}
                        className={`rounded-md px-3 py-1 text-sm ${
                          statusFilter === "completed" ? "bg-purple-500 text-white" : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        Yakunlangan{" "}
                        <Badge variant="secondary" className="ml-1 bg-purple-200 text-purple-800">
                          {completedCount}
                        </Badge>
                      </button>
                      <button
                        onClick={() => setStatusFilter("paid")}
                        className={`rounded-md px-3 py-1 text-sm ${
                          statusFilter === "paid" ? "bg-green-600 text-white" : "bg-green-100 text-green-800"
                        }`}
                      >
                        To'landi{" "}
                        <Badge variant="secondary" className="ml-1 bg-green-200 text-green-800">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredOrders.map((order) => {
                        const orderDate = order.createdAt?.toDate ? new Date(order.createdAt.toDate()) : new Date()
                        const daysSinceCreated = differenceInDays(new Date(), orderDate)
                        const isOld = daysSinceCreated > 7 && order.status !== "paid" && !order.isPaid

                        return (
                          <Card
                            key={order.id}
                            className={`hover:shadow-md transition-shadow cursor-pointer ${
                              selectedOrder?.id === order.id ? "border-2 border-primary" : ""
                            } ${isOld ? "border-red-300" : ""}`}
                            onClick={() => handleSelectOrder(order)}
                          >
                            <CardHeader
                              className={`pb-2 ${
                                order.status === "pending"
                                  ? "bg-yellow-50"
                                  : order.status === "preparing"
                                    ? "bg-blue-50"
                                    : order.status === "completed"
                                      ? "bg-purple-50"
                                      : "bg-green-50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium">
                                  {order.orderType === "table"
                          ? order.roomNumber
                            ? `Xona #${order.roomNumber}`
                            : `${getSeatingTypeDisplay(order)} #${order.tableNumber}`
                          : "Yetkazib berish"}
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={`${
                                      order.status === "pending"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : order.status === "preparing"
                                          ? "bg-blue-100 text-blue-800"
                                          : order.status === "completed"
                                            ? "bg-purple-100 text-purple-800"
                                            : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {order.status === "pending"
                                      ? "Kutilmoqda"
                                      : order.status === "preparing"
                                        ? "Tayyorlanmoqda"
                                        : order.status === "completed"
                                          ? "Yakunlangan"
                                          : "To'landi"}
                                  </Badge>
                                </div>
                                {isOld && (
                                  <Badge variant="outline" className="bg-red-100 text-red-800">
                                    <Clock className="mr-1 h-3 w-3" />
                                    {daysSinceCreated} kun
                                  </Badge>
                                )}
                              </div>
                              <CardDescription className="text-xs mt-1">
                                {format(orderDate, "dd.MM.yyyy HH:mm")}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Buyurtma elementlari:</span>
                                  <span className="text-sm font-medium">{order.items.length} ta</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Jami summa:</span>
                                  <span
                                    className={`font-bold ${order.status === "paid" || order.isPaid ? "text-green-600" : ""}`}
                                  >
                                    {formatCurrency(order.total)}
                                  </span>
                                </div>
                                {order.orderType === "table" && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Ofitsiant:</span>
                                    <span className="text-sm">
                                      {waiters.find((w) => w.id === order.waiterId)?.name || "Belgilanmagan"}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-4 flex justify-between items-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-600 hover:bg-blue-50"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedStatusForModal(order.id)
                                    setIsStatusModalOpen(true)
                                  }}
                                >
                                  Status o'zgartirish
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-600"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSelectOrder(order)
                                  }}
                                >
                                  <Info className="h-4 w-4 mr-1" />
                                  Batafsil
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

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

        {/* Archive Dialog */}
        <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Muddati o'tgan buyurtmalarni arxivlash</DialogTitle>
              <DialogDescription>
                30 kundan ortiq vaqt o'tgan va to'lanmagan {expiredOrdersCount} ta buyurtma mavjud. Ularni arxivlashni
                istaysizmi?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)} disabled={isArchiving}>
                Bekor qilish
              </Button>
              <Button onClick={handleArchiveExpiredOrders} disabled={isArchiving}>
                {isArchiving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Arxivlanmoqda...
                  </>
                ) : (
                  "Arxivlash"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Status Change Modal */}
        <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Buyurtma statusini o'zgartirish</DialogTitle>
              <DialogDescription>Buyurtma uchun yangi statusni tanlang</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Button
                className="w-full justify-start bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:text-yellow-900"
                onClick={() => handleStatusSelect("pending")}
              >
                Kutilmoqda
              </Button>
              <Button
                className="w-full justify-start bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900"
                onClick={() => handleStatusSelect("preparing")}
              >
                Tayyorlanmoqda
              </Button>
              <Button
                className="w-full justify-start bg-purple-100 text-purple-800 hover:bg-purple-200 hover:text-purple-900"
                onClick={() => handleStatusSelect("completed")}
              >
                Yakunlangan
              </Button>
              <Button
                className="w-full justify-start bg-green-600 text-white hover:bg-green-700"
                onClick={() => handleStatusSelect("paid")}
              >
                To'landi
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
                Bekor qilish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
