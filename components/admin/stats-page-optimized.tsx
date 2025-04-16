"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, query, where, getDocs, orderBy, addDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import AdminLayout from "@/components/admin/admin-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  DollarSign,
  ShoppingBag,
  Utensils,
  Download,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Archive,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  RefreshCw,
} from "lucide-react"
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import * as XLSX from "xlsx"
import { format, subDays, startOfMonth, endOfMonth, differenceInDays, isBefore, addDays } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface TopItem {
  name: string
  count: number
  value: number // For pie chart
}

interface DailyRevenue {
  date: string
  revenue: number
  orders: number
  paidRevenue?: number
  unpaidRevenue?: number
}

interface OrdersByStatus {
  name: string
  value: number
  color: string
}

interface OrdersByType {
  name: string
  value: number
  color: string
}

interface UnpaidOrder {
  id: string
  orderType: string
  tableNumber?: number | null
  roomNumber?: number | null
  total: number
  createdAt: any
  status: string
  daysSinceCreated: number
}

export function StatsPage() {
  const [todayOrders, setTodayOrders] = useState(0)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [revenueData, setRevenueData] = useState<DailyRevenue[]>([])
  const [ordersByStatus, setOrdersByStatus] = useState<OrdersByStatus[]>([])
  const [ordersByType, setOrdersByType] = useState<OrdersByType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("today")
  const [comparisonData, setComparisonData] = useState({
    ordersChange: 0,
    revenueChange: 0,
    averageOrderChange: 0,
    paidOrdersChange: 0,
  })
  const [unpaidOrders, setUnpaidOrders] = useState<UnpaidOrder[]>([])
  const [totalPaidAmount, setTotalPaidAmount] = useState(0)
  const [totalUnpaidAmount, setTotalUnpaidAmount] = useState(0)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [expiredOrdersCount, setExpiredOrdersCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [orderDetails, setOrderDetails] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAllOrders, setShowAllOrders] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]
  const STATUS_COLORS = {
    pending: "#FFBB28",
    preparing: "#0088FE",
    ready: "#00C49F",
    completed: "#8884d8",
    paid: "#82ca9d",
  }

  // Function to safely get seating type display
  const getSeatingTypeDisplay = (order: any) => {
    if (!order) return "Noma'lum"

    if (order.orderType === "delivery") {
      return "Yetkazib berish"
    }

    if (order.seatingType) {
      return order.seatingType
    }

    if (order.roomNumber) {
      return "Xona"
    }

    return order.tableType || "Stol"
  }

  const fetchStats = async () => {
    try {
      setIsRefreshing(true)
      setIsLoading(true)

      // Get date range based on selected time range
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      let startDate = new Date(today)
      let endDate = new Date()
      endDate.setHours(23, 59, 59, 999)

      if (timeRange === "week") {
        startDate.setDate(today.getDate() - 7)
      } else if (timeRange === "month") {
        startDate = startOfMonth(today)
        endDate = endOfMonth(today)
      }

      // For comparison with previous period
      const previousStartDate = new Date(startDate)
      const previousEndDate = new Date(startDate)
      previousStartDate.setDate(
        previousStartDate.getDate() - (timeRange === "today" ? 1 : timeRange === "week" ? 7 : 30),
      )
      previousEndDate.setDate(previousEndDate.getDate() - 1)

      // Query for orders in the selected time range
      const ordersQuery = query(
        collection(db, "orders"),
        where("createdAt", ">=", startDate),
        where("createdAt", "<=", endDate),
        orderBy("createdAt", "asc"),
      )

      // Query for orders in the previous period
      const previousOrdersQuery = query(
        collection(db, "orders"),
        where("createdAt", ">=", previousStartDate),
        where("createdAt", "<=", previousEndDate),
        orderBy("createdAt", "asc"),
      )

      const [ordersSnapshot, previousOrdersSnapshot] = await Promise.all([
        getDocs(ordersQuery),
        getDocs(previousOrdersQuery),
      ])

      // Current period stats
      let orderCount = 0
      let revenue = 0
      let paidRevenue = 0
      let paidOrdersCount = 0
      const itemCounts: Record<string, number> = {}
      const statusCounts: Record<string, number> = {
        pending: 0,
        preparing: 0,
        ready: 0,
        completed: 0,
        paid: 0,
      }
      const typeCounts: Record<string, number> = {
        table: 0,
        delivery: 0,
      }

      // Daily/weekly/monthly data for charts
      const dailyData: Record<string, { revenue: number; orders: number; paidRevenue: number; unpaidRevenue: number }> =
        {}

      // Collect unpaid orders
      const unpaidOrdersList: UnpaidOrder[] = []
      const allOrderDetails: any[] = []

      ordersSnapshot.forEach((doc) => {
        const order = doc.data()
        orderCount++
        revenue += order.total || 0

        // Count paid orders
        if (order.status === "paid" || order.isPaid) {
          paidRevenue += order.total || 0
          paidOrdersCount++
        } else {
          // Add to unpaid orders list
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date()
          const daysSinceCreated = differenceInDays(new Date(), orderDate)

          unpaidOrdersList.push({
            id: doc.id,
            orderType: order.orderType || "unknown",
            tableNumber: order.tableNumber,
            roomNumber: order.roomNumber,
            total: order.total || 0,
            createdAt: order.createdAt,
            status: order.status || "unknown",
            daysSinceCreated,
          })
        }

        // Add to order details
        allOrderDetails.push({
          id: doc.id,
          ...order,
          createdAtDate: order.createdAt?.toDate ? order.createdAt.toDate() : new Date(),
          isPaid: order.status === "paid" || order.isPaid,
        })

        // Count items for popularity
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: { name: string; quantity: number; price: number }) => {
            if (item && item.name) {
              if (itemCounts[item.name]) {
                itemCounts[item.name] += item.quantity || 1
              } else {
                itemCounts[item.name] = item.quantity || 1
              }
            }
          })
        }

        // Count orders by status
        if (order.status && statusCounts[order.status] !== undefined) {
          statusCounts[order.status]++
        }

        // Count orders by type
        if (order.orderType && typeCounts[order.orderType] !== undefined) {
          typeCounts[order.orderType]++
        }

        // Aggregate daily data
        if (order.createdAt) {
          const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date()
          const dateKey = format(orderDate, timeRange === "today" ? "HH:00" : "yyyy-MM-dd")

          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { revenue: 0, orders: 0, paidRevenue: 0, unpaidRevenue: 0 }
          }

          dailyData[dateKey].revenue += order.total || 0
          dailyData[dateKey].orders += 1

          if (order.status === "paid" || order.isPaid) {
            dailyData[dateKey].paidRevenue += order.total || 0
          } else {
            dailyData[dateKey].unpaidRevenue += order.total || 0
          }
        }
      })

      // Previous period stats
      let previousOrderCount = 0
      let previousRevenue = 0
      let previousPaidOrdersCount = 0

      previousOrdersSnapshot.forEach((doc) => {
        const order = doc.data()
        previousOrderCount++
        previousRevenue += order.total || 0

        if (order.status === "paid" || order.isPaid) {
          previousPaidOrdersCount++
        }
      })

      // Calculate changes
      const ordersChange = previousOrderCount > 0 ? ((orderCount - previousOrderCount) / previousOrderCount) * 100 : 0
      const revenueChange = previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0
      const paidOrdersChange =
        previousPaidOrdersCount > 0 ? ((paidOrdersCount - previousPaidOrdersCount) / previousPaidOrdersCount) * 100 : 0

      const currentAvgOrder = orderCount > 0 ? revenue / orderCount : 0
      const previousAvgOrder = previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0
      const averageOrderChange =
        previousAvgOrder > 0 ? ((currentAvgOrder - previousAvgOrder) / previousAvgOrder) * 100 : 0

      setComparisonData({
        ordersChange,
        revenueChange,
        averageOrderChange,
        paidOrdersChange,
      })

      // Convert to array and sort by count
      const topItemsArray = Object.entries(itemCounts)
        .map(([name, count]) => ({ name, count, value: count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Create orders by status data for pie chart
      const ordersByStatusArray = [
        { name: "Kutilmoqda", value: statusCounts.pending, color: STATUS_COLORS.pending },
        { name: "Tayyorlanmoqda", value: statusCounts.preparing, color: STATUS_COLORS.preparing },
        { name: "Tayyor", value: statusCounts.ready, color: STATUS_COLORS.ready },
        { name: "Yakunlangan", value: statusCounts.completed, color: STATUS_COLORS.completed },
        { name: "To'landi", value: statusCounts.paid, color: STATUS_COLORS.paid },
      ].filter((item) => item.value > 0)

      // Create orders by type data for pie chart
      const ordersByTypeArray = [
        { name: "Stol buyurtmasi", value: typeCounts.table, color: "#0088FE" },
        { name: "Yetkazib berish", value: typeCounts.delivery, color: "#00C49F" },
      ].filter((item) => item.value > 0)

      setTodayOrders(orderCount)
      setTodayRevenue(revenue)
      setTopItems(topItemsArray)
      setOrdersByStatus(ordersByStatusArray)
      setOrdersByType(ordersByTypeArray)
      setUnpaidOrders(unpaidOrdersList)
      setTotalPaidAmount(paidRevenue)
      setTotalUnpaidAmount(revenue - paidRevenue)
      setOrderDetails(allOrderDetails)

      // Count expired orders (older than 30 days and not paid)
      const thirtyDaysAgo = subDays(new Date(), 30)
      const expiredCount = unpaidOrdersList.filter((order) =>
        isBefore(order.createdAt?.toDate ? order.createdAt.toDate() : new Date(), thirtyDaysAgo),
      ).length
      setExpiredOrdersCount(expiredCount)

      // Prepare time series data for charts
      const timeSeriesData: DailyRevenue[] = []

      if (timeRange === "today") {
        // For today, show hourly data
        for (let hour = 0; hour < 24; hour++) {
          const hourKey = `${hour.toString().padStart(2, "0")}:00`
          const hourData = dailyData[hourKey] || { revenue: 0, orders: 0, paidRevenue: 0, unpaidRevenue: 0 }
          timeSeriesData.push({
            date: hourKey,
            revenue: hourData.revenue,
            orders: hourData.orders,
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
            orders: dayData.orders,
            paidRevenue: dayData.paidRevenue,
            unpaidRevenue: dayData.unpaidRevenue,
          })
        }
      }

      setRevenueData(timeSeriesData)
      setIsLoading(false)
      setIsRefreshing(false)
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast({
        title: "Xatolik",
        description: "Statistikani yuklashda xatolik yuz berdi",
        variant: "destructive",
      })
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [toast, timeRange])

  // Filter order details based on status and search query
  const filteredOrderDetails = useMemo(() => {
    return orderDetails.filter((order) => {
      // Filter by status
      const statusMatch =
        statusFilter === "all"
          ? true
          : statusFilter === "paid"
            ? order.isPaid
            : statusFilter === "unpaid"
              ? !order.isPaid
              : order.status === statusFilter

      // Filter by search query
      if (!searchQuery) return statusMatch

      const query = searchQuery.toLowerCase()
      const orderTypeMatch = order.orderType?.toLowerCase().includes(query) || false
      const tableNumberMatch = order.tableNumber?.toString().includes(query) || false
      const roomNumberMatch = order.roomNumber?.toString().includes(query) || false

      // Search in items
      let itemsMatch = false
      if (order.items && Array.isArray(order.items)) {
        itemsMatch = order.items.some((item: any) => item?.name?.toLowerCase().includes(query) || false)
      }

      return statusMatch && (orderTypeMatch || tableNumberMatch || roomNumberMatch || itemsMatch)
    })
  }, [orderDetails, statusFilter, searchQuery])

  const formatTooltipValue = (value: number) => {
    return formatCurrency(value)
  }

  const exportToExcel = () => {
    try {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()

      // Create main stats sheet
      const mainStats = [
        ["Statistika", timeRange === "today" ? "Bugun" : timeRange === "week" ? "Hafta" : "Oy"],
        ["Buyurtmalar soni", todayOrders],
        ["Jami tushum", todayRevenue],
        ["To'langan summa", totalPaidAmount],
        ["To'lanmagan summa", totalUnpaidAmount],
        ["O'rtacha buyurtma qiymati", todayOrders > 0 ? todayRevenue / todayOrders : 0],
        [],
        ["Buyurtmalar holati"],
        ["Holat", "Soni"],
        ...ordersByStatus.map((item) => [item.name, item.value]),
        [],
        ["Buyurtma turlari"],
        ["Tur", "Soni"],
        ...ordersByType.map((item) => [item.name, item.value]),
        [],
        ["Eng mashhur taomlar"],
        ["Taom nomi", "Soni"],
        ...topItems.map((item) => [item.name, item.count]),
      ]

      // Add revenue data if available
      if (revenueData.length > 0) {
        mainStats.push([])
        mainStats.push([timeRange === "week" ? "Haftalik tushum" : "Oylik tushum"])
        mainStats.push(["Sana", "Tushum", "To'langan", "To'lanmagan", "Buyurtmalar"])
        revenueData.forEach((item) => {
          mainStats.push([item.date, item.revenue, item.paidRevenue, item.unpaidRevenue, item.orders])
        })
      }

      // Add unpaid orders data
      if (unpaidOrders.length > 0) {
        mainStats.push([])
        mainStats.push(["To'lanmagan buyurtmalar"])
        mainStats.push(["ID", "Tur", "Stol/Xona", "Summa", "Yaratilgan sana", "Kun o'tgan"])
        unpaidOrders.forEach((order) => {
          mainStats.push([
            order.id,
            order.orderType === "table" ? "Stol" : "Yetkazib berish",
            order.orderType === "table"
              ? order.roomNumber
                ? `Xona #${order.roomNumber}`
                : `Stol #${order.tableNumber}`
              : "-",
            order.total,
            format(order.createdAt?.toDate ? order.createdAt.toDate() : new Date(), "yyyy-MM-dd"),
            order.daysSinceCreated,
          ])
        })
      }

      const ws = XLSX.utils.aoa_to_sheet(mainStats)
      XLSX.utils.book_append_sheet(wb, ws, "Statistika")

      // Generate filename based on date range
      const dateStr = new Date()
        .toLocaleDateString("uz-UZ", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replace(/\//g, "-")

      const filename = `Statistika_${timeRange === "today" ? "Kun" : timeRange === "week" ? "Hafta" : "Oy"}_${dateStr}.xlsx`

      // Save file
      XLSX.writeFile(wb, filename)

      toast({
        title: "Muvaffaqiyatli",
        description: "Statistika ma'lumotlari Excel formatida yuklab olindi",
      })
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      toast({
        title: "Xatolik",
        description: "Excel faylini yaratishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

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

      toast({
        title: "Arxivlash yakunlandi",
        description: `${archivedCount} ta muddati o'tgan buyurtma arxivlandi`,
      })

      // Refresh stats
      fetchStats()
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

  return (
    <AdminLayout>
      <div className="container mx-auto p-4">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Statistika</h1>

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
                  <BarChart className="h-4 w-4" />
                  <span className="hidden sm:inline">Oy</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="outline"
              onClick={() => fetchStats()}
              className="flex items-center gap-2"
              disabled={isRefreshing}
            >
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="hidden sm:inline">Yangilash</span>
            </Button>

            <Button variant="outline" onClick={exportToExcel} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Excel</span>
            </Button>

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
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                  <div className="text-2xl font-bold">{todayOrders}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      O'tgan {timeRange === "today" ? "kun" : timeRange === "week" ? "hafta" : "oy"}ga nisbatan
                    </span>
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
                  <div className="text-2xl font-bold">{formatCurrency(todayRevenue)}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      O'tgan {timeRange === "today" ? "kun" : timeRange === "week" ? "hafta" : "oy"}ga nisbatan
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
                      value={todayRevenue > 0 ? (totalPaidAmount / todayRevenue) * 100 : 0}
                      className="h-2 bg-gray-100"
                    />
                    <div className="mt-1 text-sm text-muted-foreground">
                      {todayRevenue > 0
                        ? `${((totalPaidAmount / todayRevenue) * 100).toFixed(1)}% to'langan`
                        : "Ma'lumot yo'q"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">To'lanmagan summa</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(totalUnpaidAmount)}</div>
                  <div className="mt-1">
                    <Progress
                      value={todayRevenue > 0 ? (totalUnpaidAmount / todayRevenue) * 100 : 0}
                      className="h-2 bg-gray-100"
                      indicatorClassName="bg-red-500"
                    />
                    <div className="mt-1 text-sm text-muted-foreground">
                      {todayRevenue > 0
                        ? `${((totalUnpaidAmount / todayRevenue) * 100).toFixed(1)}% to'lanmagan`
                        : "Ma'lumot yo'q"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mb-8">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5" />
                    {timeRange === "today"
                      ? "Bugungi tushum (soatlar bo'yicha)"
                      : timeRange === "week"
                        ? "Haftalik tushum"
                        : "Oylik tushum"}
                  </CardTitle>
                  <CardDescription>
                    Jami tushum: {formatCurrency(todayRevenue)} | To'langan: {formatCurrency(totalPaidAmount)} |
                    To'lanmagan: {formatCurrency(totalUnpaidAmount)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
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
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Utensils className="h-5 w-5" />
                    Eng mashhur taomlar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topItems.length > 0 ? (
                    <div className="space-y-4">
                      {topItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold text-white`}
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">{item.count} ta buyurtma</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {((item.count / topItems.reduce((sum, i) => sum + i.count, 0)) * 100).toFixed(1)}%
                            </div>
                            <Progress
                              value={(item.count / topItems.reduce((sum, i) => sum + i.count, 0)) * 100}
                              className="h-2 w-24"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-[200px] items-center justify-center">
                      <p className="text-center text-muted-foreground">Ma'lumot yo'q</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5" />
                    Buyurtmalar holati
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ordersByStatus.length > 0 ? (
                    <div className="space-y-4">
                      {ordersByStatus.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                            <div className="font-medium">{item.name}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Progress
                              value={(item.value / ordersByStatus.reduce((sum, i) => sum + i.value, 0)) * 100}
                              className="h-2 w-24"
                              indicatorClassName={`bg-[${item.color}]`}
                            />
                            <div className="w-16 text-right font-medium">
                              {item.value} ta
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({((item.value / ordersByStatus.reduce((sum, i) => sum + i.value, 0)) * 100).toFixed(0)}
                                %)
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-[200px] items-center justify-center">
                      <p className="text-center text-muted-foreground">Ma'lumot yo'q</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Buyurtmalar jadvali */}
            <div className="mt-8">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Buyurtmalar ro'yxati
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Holat bo'yicha" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Barcha buyurtmalar</SelectItem>
                          <SelectItem value="pending">Kutilmoqda</SelectItem>
                          <SelectItem value="preparing">Tayyorlanmoqda</SelectItem>
                          <SelectItem value="ready">Tayyor</SelectItem>
                          <SelectItem value="completed">Yakunlangan</SelectItem>
                          <SelectItem value="paid">To'langan</SelectItem>
                          <SelectItem value="unpaid">To'lanmagan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Qidirish..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-full"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Buyurtma</TableHead>
                          <TableHead>Sana</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Summa</TableHead>
                          <TableHead>To'lov</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrderDetails
                          .slice(0, showAllOrders ? filteredOrderDetails.length : 10)
                          .map((order, index) => (
                            <TableRow key={order.id || index}>
                              <TableCell>
                                {order.orderType === "table"
                                  ? order.roomNumber
                                    ? `Xona #${order.roomNumber}`
                                    : `${getSeatingTypeDisplay(order)} #${order.tableNumber || "N/A"}`
                                  : "Yetkazib berish"}
                              </TableCell>
                              <TableCell>
                                {order.createdAtDate ? format(order.createdAtDate, "dd.MM.yyyy HH:mm") : "N/A"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`${
                                    !order.status
                                      ? "bg-gray-100 text-gray-800"
                                      : order.status === "pending"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : order.status === "preparing"
                                          ? "bg-blue-100 text-blue-800"
                                          : order.status === "ready"
                                            ? "bg-green-100 text-green-800"
                                            : order.status === "completed"
                                              ? "bg-gray-100 text-gray-800"
                                              : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {!order.status
                                    ? "Noma'lum"
                                    : order.status === "pending"
                                      ? "Kutilmoqda"
                                      : order.status === "preparing"
                                        ? "Tayyorlanmoqda"
                                        : order.status === "ready"
                                          ? "Tayyor"
                                          : order.status === "completed"
                                            ? "Yakunlangan"
                                            : "To'landi"}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatCurrency(order.total || 0)}</TableCell>
                              <TableCell>
                                {order.isPaid ? (
                                  <Badge variant="outline" className="bg-green-100 text-green-800">
                                    To'langan
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-red-100 text-red-800">
                                    To'lanmagan
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredOrderDetails.length > 10 && !showAllOrders && (
                    <div className="mt-4 text-center">
                      <Button variant="outline" size="sm" onClick={() => setShowAllOrders(true)}>
                        Barcha {filteredOrderDetails.length} ta buyurtmani ko'rish
                      </Button>
                    </div>
                  )}
                  {showAllOrders && filteredOrderDetails.length > 10 && (
                    <div className="mt-4 text-center">
                      <Button variant="outline" size="sm" onClick={() => setShowAllOrders(false)}>
                        Kamroq ko'rsatish
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

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
    </AdminLayout>
  )
}
