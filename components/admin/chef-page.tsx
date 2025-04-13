"use client"

import { useState, useEffect, useRef } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSpinner } from "@/components/admin/loading-spinner"
import { formatCurrency } from "@/lib/utils"
import { Clock, CheckCircle2, History, Bell, BellOff } from "lucide-react"
import type { Order } from "@/types"
import { getDocs } from "@/lib/getDocs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function ChefPage() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [preparingOrders, setPreparingOrders] = useState<Order[]>([])
  const [completedOrders, setCompletedOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null)
  const previousPendingCountRef = useRef(0)

  // Function to fetch orders
  const fetchOrders = async () => {
    try {
      // Get pending orders
      const pendingOrdersData = await getDocs("orders", [["status", "==", "pending"]])

      // Check for new orders and play notification if needed
      if (pendingOrdersData.length > previousPendingCountRef.current && soundEnabled) {
        notificationAudioRef.current?.play().catch((e) => console.error("Error playing notification:", e))
      }
      previousPendingCountRef.current = pendingOrdersData.length

      setPendingOrders(pendingOrdersData)

      // Get preparing orders
      const preparingOrdersData = await getDocs("orders", [["status", "==", "preparing"]])
      setPreparingOrders(preparingOrdersData)

      // Get completed orders (limit to last 20 for performance)
      const completedOrdersData = await getDocs("orders", [["status", "==", "completed"]])
      setCompletedOrders(completedOrdersData.slice(0, 20)) // Limit to last 20 orders

      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching orders:", error)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initialize audio elements
    audioRef.current = new Audio("/cooking.mp3")
    notificationAudioRef.current = new Audio("/notification.mp3")

    // Initial fetch
    fetchOrders()

    // Set up a simple interval to refresh data every 3 seconds
    const intervalId = setInterval(() => {
      fetchOrders()
    }, 3000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  const handleStartPreparing = async (orderId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "preparing",
        updatedAt: new Date(),
      })

      // Play cooking sound if enabled
      if (soundEnabled) {
        audioRef.current?.play().catch((e) => console.error("Error playing sound:", e))
      }

      // Refresh orders after update
      fetchOrders()
    } catch (error) {
      console.error("Error updating order status:", error)
    }
  }

  const handleOrderDelivered = async (orderId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "completed",
        updatedAt: new Date(),
      })

      // Play ready sound if enabled
      if (soundEnabled) {
        const audio = new Audio("/ready.mp3")
        audio.play().catch((e) => console.error("Error playing sound:", e))
      }

      // Refresh orders after update
      fetchOrders()
    } catch (error) {
      console.error("Error updating order status:", error)
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
        <h1 className="text-2xl font-bold">Oshxona</h1>
        <div className="flex items-center gap-2">
          {soundEnabled ? <Bell className="h-5 w-5 text-green-600" /> : <BellOff className="h-5 w-5 text-gray-400" />}
          <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} id="sound-mode" />
          <Label htmlFor="sound-mode" className="text-sm">
            Ovozli bildirishnoma
          </Label>
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="relative">
            Yangi
            {pendingOrders.length > 0 && <Badge className="ml-2 bg-primary">{pendingOrders.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="relative">
            <History className="mr-1 h-4 w-4" />
            Tarix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingOrders.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground">Yangi buyurtmalar yo'q</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {order.orderType === "table"
                          ? order.roomNumber
                            ? `Xona #${order.roomNumber}`
                            : `Stol #${order.tableNumber}`
                          : "Yetkazib berish"}
                      </CardTitle>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Yangi
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
                  <CardFooter className="bg-muted/30">
                    <Button className="w-full" onClick={() => handleStartPreparing(order.id)}>
                      Tayyorlashni boshlash
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preparing">
          {preparingOrders.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground">Tayyorlanayotgan buyurtmalar yo'q</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {preparingOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-amber-50 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {order.orderType === "table"
                          ? order.roomNumber
                            ? `Xona #${order.roomNumber}`
                            : `Stol #${order.tableNumber}`
                          : "Yetkazib berish"}
                      </CardTitle>
                      <Badge variant="outline" className="bg-amber-100 text-amber-700">
                        Tayyorlanmoqda
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
                  <CardFooter className="bg-muted/30">
                    <Button className="w-full" onClick={() => handleOrderDelivered(order.id)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Yetkazildi
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {completedOrders.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground">Yakunlangan buyurtmalar yo'q</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-green-50 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {order.orderType === "table"
                          ? order.roomNumber
                            ? `Xona #${order.roomNumber}`
                            : `Stol #${order.tableNumber}`
                          : "Yetkazib berish"}
                      </CardTitle>
                      <Badge variant="outline" className="bg-green-100 text-green-700">
                        Yakunlangan
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
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Yakunlangan vaqt:</span> {formatDate(order.updatedAt)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
