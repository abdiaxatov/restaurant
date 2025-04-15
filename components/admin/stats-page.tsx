"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
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
  PieChart,
  Download,
  Calendar,
  TrendingUp,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts"
import * as XLSX from "xlsx"
import { format, subDays } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

interface TopItem {
  name: string
  count: number
  value: number // For pie chart
}

interface DailyRevenue {
  date: string
  revenue: number
  orders: number
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
  })
  const { toast } = useToast()

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)

        // Get date range based on selected time range
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const startDate = new Date(today)
        if (timeRange === "week") {
          startDate.setDate(today.getDate() - 7)
        } else if (timeRange === "month") {
          startDate.setMonth(today.getMonth() - 1)
        }

        const endDate = new Date()
        endDate.setHours(23, 59, 59, 999)

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
        const itemCounts: Record<string, number> = {}
        const statusCounts: Record<string, number> = {
          pending: 0,
          preparing: 0,
          ready: 0,
          completed: 0,
        }
        const typeCounts: Record<string, number> = {
          table: 0,
          delivery: 0,
        }

        // Daily/weekly/monthly data for charts
        const dailyData: Record<string, { revenue: number; orders: number }> = {}

        ordersSnapshot.forEach((doc) => {
          const order = doc.data()
          orderCount++
          revenue += order.total

          // Count items for popularity
          order.items.forEach((item: { name: string; quantity: number; price: number }) => {
            if (itemCounts[item.name]) {
              itemCounts[item.name] += item.quantity
            } else {
              itemCounts[item.name] = item.quantity
            }
          })

          // Count orders by status
          if (statusCounts[order.status] !== undefined) {
            statusCounts[order.status]++
          }

          // Count orders by type
          if (typeCounts[order.orderType] !== undefined) {
            typeCounts[order.orderType]++
          }

          // Aggregate daily data
          const orderDate = order.createdAt.toDate()
          const dateKey = format(orderDate, timeRange === "today" ? "HH:00" : "yyyy-MM-dd")

          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { revenue: 0, orders: 0 }
          }

          dailyData[dateKey].revenue += order.total
          dailyData[dateKey].orders += 1
        })

        // Previous period stats
        let previousOrderCount = 0
        let previousRevenue = 0

        previousOrdersSnapshot.forEach((doc) => {
          const order = doc.data()
          previousOrderCount++
          previousRevenue += order.total
        })

        // Calculate changes
        const ordersChange = previousOrderCount > 0 ? ((orderCount - previousOrderCount) / previousOrderCount) * 100 : 0

        const revenueChange = previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0

        const currentAvgOrder = orderCount > 0 ? revenue / orderCount : 0
        const previousAvgOrder = previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0
        const averageOrderChange =
          previousAvgOrder > 0 ? ((currentAvgOrder - previousAvgOrder) / previousAvgOrder) * 100 : 0

        setComparisonData({
          ordersChange,
          revenueChange,
          averageOrderChange,
        })

        // Convert to array and sort by count
        const topItemsArray = Object.entries(itemCounts)
          .map(([name, count]) => ({ name, count, value: count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        // Create orders by status data for pie chart
        const ordersByStatusArray = [
          { name: "Kutilmoqda", value: statusCounts.pending, color: "#FFBB28" },
          { name: "Tayyorlanmoqda", value: statusCounts.preparing, color: "#0088FE" },
          { name: "Tayyor", value: statusCounts.ready, color: "#00C49F" },
          { name: "Yakunlangan", value: statusCounts.completed, color: "#8884d8" },
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

        // Prepare time series data for charts
        const timeSeriesData: DailyRevenue[] = []

        if (timeRange === "today") {
          // For today, show hourly data
          for (let hour = 0; hour < 24; hour++) {
            const hourKey = `${hour.toString().padStart(2, "0")}:00`
            const hourData = dailyData[hourKey] || { revenue: 0, orders: 0 }
            timeSeriesData.push({
              date: hourKey,
              revenue: hourData.revenue,
              orders: hourData.orders,
            })
          }
        } else {
          // For week/month, show daily data
          const daysToShow = timeRange === "week" ? 7 : 30
          for (let i = daysToShow - 1; i >= 0; i--) {
            const date = subDays(new Date(), i)
            const dateKey = format(date, "yyyy-MM-dd")
            const dateStr = format(date, "dd MMM")
            const dayData = dailyData[dateKey] || { revenue: 0, orders: 0 }

            timeSeriesData.push({
              date: dateStr,
              revenue: dayData.revenue,
              orders: dayData.orders,
            })
          }
        }

        setRevenueData(timeSeriesData)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching stats:", error)
        toast({
          title: "Xatolik",
          description: "Statistikani yuklashda xatolik yuz berdi",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [toast, timeRange])

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
        mainStats.push(["Sana", "Tushum", "Buyurtmalar"])
        revenueData.forEach((item) => {
          mainStats.push([item.date, item.revenue, item.orders])
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

            <Button variant="outline" onClick={exportToExcel} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
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
                  <CardTitle className="text-sm font-medium">O'rtacha buyurtma qiymati</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {todayOrders > 0 ? formatCurrency(todayRevenue / todayOrders) : formatCurrency(0)}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      O'tgan {timeRange === "today" ? "kun" : timeRange === "week" ? "hafta" : "oy"}ga nisbatan
                    </span>
                    {renderChangeIndicator(comparisonData.averageOrderChange)}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Buyurtma turlari</CardTitle>
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="h-[100px]">
                    {ordersByType.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={ordersByType}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={40}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {ordersByType.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => [value, "Buyurtmalar soni"]} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-muted-foreground">Ma'lumot yo'q</p>
                      </div>
                    )}
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
                  <CardDescription>Jami tushum: {formatCurrency(todayRevenue)}</CardDescription>
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
                              name === "revenue" ? "Tushum" : "Buyurtmalar",
                            ]}
                          />
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
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={topItems}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {topItems.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={formatTooltipValue} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center">
                      <p className="text-center text-muted-foreground">Ma'lumot yo'q</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Buyurtmalar holati
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ordersByStatus.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={ordersByStatus}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {ordersByStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center">
                      <p className="text-center text-muted-foreground">Ma'lumot yo'q</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {(timeRange === "week" || timeRange === "month") && revenueData.length > 0 && (
                <Card className="col-span-2 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {timeRange === "week" ? "Haftalik buyurtmalar soni" : "Oylik buyurtmalar soni"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <RechartsTooltip formatter={(value) => [value, "Buyurtmalar soni"]} />
                          <Bar dataKey="orders" fill="#82ca9d" name="Buyurtmalar soni" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
