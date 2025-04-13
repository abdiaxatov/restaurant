"use client"

import { useState, useEffect, useRef } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminLayout } from "@/components/admin/admin-layout"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { Loader2, CheckCircle, AlertTriangle, History, Bell, BellOff } from "lucide-react"
import type { Order } from "@/types"
import { getDocs } from "@/lib/getDocs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function WaiterPage() {
  const [preparingOrders, setPreparingOrders] = useState<Order[]>([])
  const [completedOrders, setCompletedOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const { toast } = useToast()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousOrderCountRef = useRef(0)

  // Function to fetch orders
  const fetchOrders = async () => {
    try {
      // Get preparing orders
      const preparingOrdersData = await getDocs("orders", [["status", "==", "preparing"]])

      // Check for new orders to play notification
      if (preparingOrdersData.length > previousOrderCountRef.current && soundEnabled) {
        audioRef.current?.play().catch((e) => console.error("Error playing notification sound:", e))
      }

      previousOrderCountRef.current = preparingOrdersData.length
      setPreparingOrders(preparingOrdersData)

      // Get completed orders (limit to last 20 for performance)
      const completedOrdersData = await getDocs("orders", [["status", "==", "completed"]])
      setCompletedOrders(completedOrdersData.slice(0, 20)) // Limit to last 20 orders

      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast({
        title: "Xatolik",
        description: "Buyurtmalarni yuklashda xatolik yuz berdi.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio("/notification.mp3")

    // Initial fetch
    fetchOrders()

    // Set up a simple interval to refresh data every 3 seconds
    const intervalId = setInterval(() => {
      fetchOrders()
    }, 3000)

    return () => {
      clearInterval(intervalId)
    }
  }, [toast])

  const handleStatusChange = async (orderId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "completed",
        updatedAt: new Date(),
      })

      // Play success sound if enabled
      if (soundEnabled) {
        const audio = new Audio("/success.mp3")
        audio.play().catch((e) => console.error("Error playing sound:", e))
      }

      toast({
        title: "Status yangilandi",
        description: "Buyurtma muvaffaqiyatli yakunlandi",
      })

      // Refresh orders after update
      fetchOrders()
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Xatolik",
        description: "Buyurtma statusini yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
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

  return (
    <AdminLayout>
      <div className="flex flex-1 flex-col">
        <div className="border-b bg-white p-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Ofitsiant paneli</h1>
          <div className="flex items-center gap-2">
            {soundEnabled ? <Bell className="h-5 w-5 text-green-600" /> : <BellOff className="h-5 w-5 text-gray-400" />}
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} id="sound-mode" />
            <Label htmlFor="sound-mode" className="text-sm">
              Ovozli bildirishnoma
            </Label>
          </div>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="preparing">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="preparing" className="relative">
                  Tayyorlanmoqda
                  {preparingOrders.length > 0 && <Badge className="ml-2 bg-amber-500">{preparingOrders.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="history" className="relative">
                  <History className="mr-1 h-4 w-4" />
                  Tarix
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preparing">
                {preparingOrders.length === 0 ? (
                  <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed">
                    <AlertTriangle className="mb-2 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">Tayyorlanayotgan buyurtmalar topilmadi</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {preparingOrders.map((order) => (
                      <div
                        key={order.id}
                        className="relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow"
                      >
                        {/* Status header */}
                        <div className="bg-amber-50 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-amber-600" />
                              <Badge variant="outline" className="bg-amber-100 text-amber-800">
                                Tayyorlanmoqda
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</div>
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="font-medium">
                              {order.orderType === "table"
                                ? order.roomNumber
                                  ? `Xona #${order.roomNumber}`
                                  : `Stol #${order.tableNumber || "?"}`
                                : order.orderType === "delivery"
                                  ? "Yetkazib berish"
                                  : "Buyurtma"}
                            </div>
                            <div className="font-semibold text-primary">{formatCurrency(order.total)}</div>
                          </div>

                          <div className="mb-3 text-sm text-muted-foreground">
                            {order.orderType === "delivery" && (
                              <div className="mb-1">
                                <span className="font-medium">Manzil:</span> {order.address}
                              </div>
                            )}
                            {order.phoneNumber && (
                              <div className="mb-1">
                                <span className="font-medium">Tel:</span> {order.phoneNumber}
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
                                  <span className="text-muted-foreground">
                                    {formatCurrency(item.price * item.quantity)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => handleStatusChange(order.id!)}>
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Yetkazildi
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history">
                {completedOrders.length === 0 ? (
                  <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed">
                    <AlertTriangle className="mb-2 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">Yakunlangan buyurtmalar topilmadi</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {completedOrders.map((order) => (
                      <div
                        key={order.id}
                        className="relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow"
                      >
                        {/* Status header */}
                        <div className="bg-green-50 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                Yakunlangan
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</div>
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="font-medium">
                              {order.orderType === "table"
                                ? order.roomNumber
                                  ? `Xona #${order.roomNumber}`
                                  : `Stol #${order.tableNumber || "?"}`
                                : order.orderType === "delivery"
                                  ? "Yetkazib berish"
                                  : "Buyurtma"}
                            </div>
                            <div className="font-semibold text-primary">{formatCurrency(order.total)}</div>
                          </div>

                          <div className="mb-3">
                            <div className="mb-1 text-sm font-medium">Buyurtma tarkibi:</div>
                            <ul className="space-y-1 text-sm">
                              {order.items.map((item, index) => (
                                <li key={index} className="flex justify-between">
                                  <span>
                                    {item.quantity} × {item.name}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {formatCurrency(item.price * item.quantity)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="font-medium">Yakunlangan vaqt:</span> {formatDate(order.updatedAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
