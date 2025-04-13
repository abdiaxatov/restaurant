"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { BarChart, DollarSign, ShoppingBag, Utensils, PieChart, Download } from "lucide-react"
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts"
import * as XLSX from "xlsx"

interface TopItem {
  name: string
  count: number
  value: number // For pie chart
}

interface DailyRevenue {
  date: string
  revenue: number
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
  const [weeklyRevenue, setWeeklyRevenue] = useState<DailyRevenue[]>([])
  const [ordersByStatus, setOrdersByStatus] = useState<OrdersByStatus[]>([])
  const [ordersByType, setOrdersByType] = useState<OrdersByType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("today")
  const { toast } = useToast()

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get date range based on selected time range
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const startDate = new Date(today)
        if (timeRange === "week") {
          startDate.setDate(today.getDate() - 7)
        } else if (timeRange === "month") {
          startDate.setMonth(today.getMonth() - 1)
        }

        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // Query for orders in the selected time range
        const ordersQuery = query(
          collection(db, "orders"),
          where("createdAt", ">=", startDate),
          where("createdAt", "<", tomorrow),
          orderBy("createdAt", "asc"),
        )

        const ordersSnapshot = await getDocs(ordersQuery)

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

        ordersSnapshot.forEach((doc) => {
          const order = doc.data()
          orderCount++
          revenue += order.total

          // Count items for popularity
          order.items.forEach((item: { name: string; quantity: number }) => {
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

        // Get weekly/monthly revenue data
        if (timeRange === "week" || timeRange === "month") {
          const daysToFetch = timeRange === "week" ? 7 : 30
          const weeklyData: DailyRevenue[] = []

          for (let i = daysToFetch - 1; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            date.setHours(0, 0, 0, 0)

            const nextDate = new Date(date)
            nextDate.setDate(nextDate.getDate() + 1)

            const dayQuery = query(
              collection(db, "orders"),
              where("createdAt", ">=", date),
              where("createdAt", "<", nextDate),
            )

            const daySnapshot = await getDocs(dayQuery)
            let dayRevenue = 0

            daySnapshot.forEach((doc) => {
              dayRevenue += doc.data().total
            })

            const dateStr = date.toLocaleDateString("uz-UZ", {
              day: "numeric",
              month: "short",
            })
            weeklyData.push({ date: dateStr, revenue: dayRevenue })
          }

          setWeeklyRevenue(weeklyData)
        }

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
      if (weeklyRevenue.length > 0) {
        mainStats.push([])
        mainStats.push([timeRange === "week" ? "Haftalik tushum" : "Oylik tushum"])
        mainStats.push(["Sana", "Tushum"])
        weeklyRevenue.forEach((item) => {
          mainStats.push([item.date, item.revenue])
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

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Statistika</h1>

          <div className="flex items-center gap-4">
            <Tabs defaultValue={timeRange} onValueChange={(value) => setTimeRange(value as "today" | "week" | "month")}>
              <TabsList>
                <TabsTrigger value="today">Bugun</TabsTrigger>
                <TabsTrigger value="week">Hafta</TabsTrigger>
                <TabsTrigger value="month">Oy</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button variant="outline" onClick={exportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted"></div>
                    <div className="h-4 w-4 animate-pulse rounded bg-muted"></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-20 animate-pulse rounded bg-muted"></div>
                </CardContent>
              </Card>
            ))}

            <Card className="col-span-2">
              <CardHeader>
                <div className="h-5 w-40 animate-pulse rounded bg-muted"></div>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full animate-pulse rounded bg-muted"></div>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <div className="h-5 w-40 animate-pulse rounded bg-muted"></div>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full animate-pulse rounded bg-muted"></div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
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
                </CardContent>
              </Card>

              <Card>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">O'rtacha buyurtma qiymati</CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {todayOrders > 0 ? formatCurrency(todayRevenue / todayOrders) : formatCurrency(0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
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
                          <Tooltip formatter={(value) => [value, "Buyurtmalar soni"]} />
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

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="col-span-2 md:col-span-1">
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
                          <Tooltip formatter={formatTooltipValue} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">Ma'lumot yo'q</p>
                  )}
                </CardContent>
              </Card>

              <Card className="col-span-2 md:col-span-1">
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
                          <Tooltip />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">Ma'lumot yo'q</p>
                  )}
                </CardContent>
              </Card>

              {(timeRange === "week" || timeRange === "month") && weeklyRevenue.length > 0 && (
                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart className="h-5 w-5" />
                      {timeRange === "week" ? "Haftalik tushum" : "Oylik tushum"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={weeklyRevenue}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis tickFormatter={(value) => formatCurrency(value).replace(/\s+/g, "")} />
                          <Tooltip formatter={(value) => [formatCurrency(value as number), "Tushum"]} />
                          <Bar dataKey="revenue" fill="#8884d8" name="Tushum" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {(timeRange === "week" || timeRange === "month") && weeklyRevenue.length > 0 && (
                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart className="h-5 w-5" />
                      {timeRange === "week" ? "Haftalik tushum (chiziq)" : "Oylik tushum (chiziq)"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weeklyRevenue}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis tickFormatter={(value) => formatCurrency(value).replace(/\s+/g, "")} />
                          <Tooltip formatter={(value) => [formatCurrency(value as number), "Tushum"]} />
                          <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Tushum" strokeWidth={2} />
                        </LineChart>
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
