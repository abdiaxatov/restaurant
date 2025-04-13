"use client"

import { useState, useEffect, useRef } from "react"
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"
import { Clock, CheckCircle, MapPin, Home } from "lucide-react"
import type { Order } from "@/types"

export function ChefPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState("pending")
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousOrderCountRef = useRef(0)

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio("/notification.mp3")

    // Query orders that are pending or preparing (chef needs to see these)
    // Note: We're not using orderBy to avoid index requirements
    const ordersQuery = query(collection(db, "orders"), where("status", "in", ["pending", "preparing"]))

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

        // Sort orders by createdAt manually
        ordersList.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
          return dateA.getTime() - dateB.getTime()
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

  const handleUpdateStatus = async (orderId: string | undefined, newStatus: string) => {
    if (!orderId) return

    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      })

      // Play sound for status change
      const audio = new Audio(newStatus === "preparing" ? "/cooking.mp3" : "/ready.mp3")
      audio.play().catch((e) => console.error("Error playing sound:", e))

      toast({
        title: "Status yangilandi",
        description: `Buyurtma statusi ${newStatus === "preparing" ? "Tayyorlanmoqda" : "Tayyor"} ga o'zgartirildi.`,
      })
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Xatolik",
        description: "Buyurtma statusini yangilashda xatolik yuz berdi.",
        variant: "destructive",
      })
    }
  }

  const pendingOrders = orders.filter((order) => order.status === "pending")
  const preparingOrders = orders.filter((order) => order.status === "preparing")

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat("uz-UZ", {
      hour: "numeric",
      minute: "numeric",
    }).format(date)
  }

  return (
    <AdminLayout>
      <div className="flex flex-1 flex-col">
        <div className="border-b bg-white p-4">
          <h1 className="text-2xl font-bold">Oshxona</h1>
        </div>

        <div className="p-4">
          <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">
                Kutilmoqda{" "}
                <Badge variant="secondary" className="ml-1">
                  {pendingOrders.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="preparing">
                Tayyorlanmoqda{" "}
                <Badge variant="secondary" className="ml-1">
                  {preparingOrders.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-0">
              {isLoading ? (
                <p>Buyurtmalar yuklanmoqda...</p>
              ) : pendingOrders.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">Hozirda kutilayotgan buyurtmalar yo'q</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendingOrders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="bg-yellow-50 p-4 border-b border-yellow-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {order.orderType === "delivery" ? (
                              <CardTitle className="text-base flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                Yetkazib berish
                              </CardTitle>
                            ) : order.roomNumber ? (
                              <CardTitle className="text-base flex items-center">
                                <Home className="h-4 w-4 mr-1" />
                                Xona #{order.roomNumber}
                              </CardTitle>
                            ) : (
                              <CardTitle className="text-base flex items-center">
                                <Home className="h-4 w-4 mr-1" />
                                Stol #{order.tableNumber}
                              </CardTitle>
                            )}
                            <Badge variant="outline">{formatDate(order.createdAt)}</Badge>
                          </div>
                          <Badge variant="secondary">#{order.id?.slice(-4)}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <ul className="mb-4 space-y-2">
                          {order.items.map((item, index) => (
                            <li key={index} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center">
                                  {item.quantity}
                                </Badge>
                                <span>{item.name}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">{formatCurrency(item.price)}</span>
                            </li>
                          ))}
                        </ul>
                        <Button className="w-full" onClick={() => handleUpdateStatus(order.id, "preparing")}>
                          Tayyorlashni boshlash
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="preparing" className="mt-0">
              {isLoading ? (
                <p>Buyurtmalar yuklanmoqda...</p>
              ) : preparingOrders.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">Hozirda tayyorlanayotgan buyurtmalar yo'q</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {preparingOrders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="bg-blue-50 p-4 border-b border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {order.orderType === "delivery" ? (
                              <CardTitle className="text-base flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                Yetkazib berish
                              </CardTitle>
                            ) : order.roomNumber ? (
                              <CardTitle className="text-base flex items-center">
                                <Home className="h-4 w-4 mr-1" />
                                Xona #{order.roomNumber}
                              </CardTitle>
                            ) : (
                              <CardTitle className="text-base flex items-center">
                                <Home className="h-4 w-4 mr-1" />
                                Stol #{order.tableNumber}
                              </CardTitle>
                            )}
                            <Badge variant="outline">{formatDate(order.createdAt)}</Badge>
                          </div>
                          <Badge variant="secondary">#{order.id?.slice(-4)}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <ul className="mb-4 space-y-2">
                          {order.items.map((item, index) => (
                            <li key={index} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center">
                                  {item.quantity}
                                </Badge>
                                <span>{item.name}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">{formatCurrency(item.price)}</span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="w-full"
                          variant="default"
                          onClick={() => handleUpdateStatus(order.id, "ready")}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Tayyor
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminLayout>
  )
}
