"use client"

import { useState, useEffect, useRef } from "react"
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSpinner } from "@/components/admin/loading-spinner"
import { formatCurrency } from "@/lib/utils"
import { Clock, History, Bell, BellOff, ChefHat, AlertTriangle } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import type { Order } from "@/types"

export function ChefPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [completedOrders, setCompletedOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const previousOrderCountRef = useRef(0)
  const { toast } = useToast()
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Initialize audio element
    notificationAudioRef.current = new Audio("/notification.mp3")

    // Fetch orders
    const ordersQuery = query(
      collection(db, "orders"),
      where("status", "==", "tayinlanmoqda"),
      orderBy("createdAt", "desc"),
    )

    const completedOrdersQuery = query(
      collection(db, "orders"),
      where("status", "in", ["yetkazildi", "tolandi"]),
      orderBy("createdAt", "desc"),
    )

    const ordersUnsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const ordersData: Order[] = []

        snapshot.forEach((doc) => {
          const orderData = { id: doc.id, ...doc.data() } as Order

          // Filter items to only include those marked for chef
          const chefItems = orderData.items.filter((item) => item.showToChef)

          // Only include orders that have items for the chef
          if (chefItems.length > 0) {
            orderData.items = chefItems
            ordersData.push(orderData)
          }
        })

        // Check for new orders to play notification
        if (ordersData.length > previousOrderCountRef.current && soundEnabled) {
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
        previousOrderCountRef.current = ordersData.length

        setOrders(ordersData)
        setIsLoading(false)
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

    const completedOrdersUnsubscribe = onSnapshot(
      completedOrdersQuery,
      (snapshot) => {
        const ordersData: Order[] = []

        snapshot.forEach((doc) => {
          const orderData = { id: doc.id, ...doc.data() } as Order

          // Filter items to only include those marked for chef
          const chefItems = orderData.items.filter((item) => item.showToChef)

          // Only include orders that have items for the chef
          if (chefItems.length > 0) {
            orderData.items = chefItems
            ordersData.push(orderData)
          }
        })

        setCompletedOrders(ordersData.slice(0, 20)) // Limit to last 20 orders
      },
      (error) => {
        console.error("Error fetching completed orders:", error)
      },
    )

    return () => {
      ordersUnsubscribe()
      completedOrdersUnsubscribe()
    }
  }, [toast, soundEnabled])

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ""
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    })
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "tayinlanmoqda":
        return "Tayyorlanmoqda"
      case "yetkazildi":
        return "Yetkazildi"
      case "tolandi":
        return "To'landi"
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "tayinlanmoqda":
        return "bg-amber-100 text-amber-800"
      case "yetkazildi":
        return "bg-purple-100 text-purple-800"
      case "tolandi":
        return "bg-emerald-100 text-emerald-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Oshxona</h1>
        </div>
        <div className="flex items-center gap-2">
          {soundEnabled ? <Bell className="h-5 w-5 text-green-600" /> : <BellOff className="h-5 w-5 text-gray-400" />}
          <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} id="sound-mode" />
          <Label htmlFor="sound-mode" className="text-sm">
            Ovozli bildirishnoma
          </Label>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="active" className="relative">
            Buyurtmalar
            {orders.length > 0 && <Badge className="ml-2 bg-primary">{orders.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="relative">
            <History className="mr-1 h-4 w-4" />
            Buyurtma Tarixi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="mb-6">
            <h2 className="mb-4 text-lg font-semibold">Buyurtmalar</h2>
            {orders.length === 0 ? (
              <div className="flex h-20 items-center justify-center rounded-lg border border-dashed">
                <p className="text-muted-foreground">Yangi buyurtmalar yo'q</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {orders.map((order) => {
                  const orderNumber = order.id ? order.id.substring(0, 6).toUpperCase() : ""

                  return (
                    <Card key={order.id} className="overflow-hidden border-amber-300">
                      <CardHeader className="bg-amber-50 pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {order.orderType === "table"
                              ? order.roomNumber
                                ? `Xona #${order.roomNumber}`
                                : `Stol #${order.tableNumber}`
                              : "Yetkazib berish"}
                            <span className="ml-2 text-xs text-muted-foreground">#{orderNumber}</span>
                          </CardTitle>
                          <Badge variant="outline" className={getStatusColor(order.status)}>
                            <Clock className="mr-1 h-3 w-3" />
                            {getStatusText(order.status)}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <ul className="space-y-1">
                          {order.items.map((item, index) => (
                            <li key={index} className="flex justify-between text-sm">
                              <span>
                                {item.name} x {item.quantity}
                              </span>
                              <span className="text-muted-foreground">
                                {formatCurrency(item.price * item.quantity)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 flex justify-between border-t pt-2">
                          <span className="font-medium">Jami:</span>
                          <span className="font-medium">{formatCurrency(order.total)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          {completedOrders.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
              <AlertTriangle className="mb-2 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Buyurtmalar tarixi bo'sh</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedOrders.map((order) => {
                const orderNumber = order.id ? order.id.substring(0, 6).toUpperCase() : ""

                return (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {order.orderType === "table"
                            ? order.roomNumber
                              ? `Xona #${order.roomNumber}`
                              : `Stol #${order.tableNumber}`
                            : "Yetkazib berish"}
                          <span className="ml-2 text-xs text-muted-foreground">#{orderNumber}</span>
                        </CardTitle>
                        <Badge variant="outline" className={getStatusColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <ul className="space-y-1">
                        {order.items.map((item, index) => (
                          <li key={index} className="flex justify-between text-sm">
                            <span>
                              {item.name} x {item.quantity}
                            </span>
                            <span className="text-muted-foreground">{formatCurrency(item.price * item.quantity)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex justify-between border-t pt-2">
                        <span className="font-medium">Jami:</span>
                        <span className="font-medium">{formatCurrency(order.total)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
