"use client"

import { useState, useEffect, useRef } from "react"
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminLayout } from "@/components/admin/admin-layout"
import { OrderDetails } from "@/components/admin/order-details"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react"
import type { Order } from "@/types"

export function WaiterPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("ready")
  const { toast } = useToast()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousOrderCountRef = useRef(0)

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio("/notification.mp3")

    // Only get ready orders
    const ordersQuery = query(collection(db, "orders"), where("status", "==", "ready"), orderBy("createdAt", "desc"))

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const ordersList: Order[] = []
        snapshot.forEach((doc) => {
          ordersList.push({ id: doc.id, ...doc.data() } as Order)
        })
        setOrders(ordersList)
        setIsLoading(false)

        // Check for new ready orders
        if (ordersList.length > previousOrderCountRef.current) {
          // Play notification sound
          audioRef.current?.play().catch((e) => console.error("Error playing notification sound:", e))
        }
        previousOrderCountRef.current = ordersList.length
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

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order)
    setIsOrderDetailsOpen(true)
  }

  const handleOrderDetailsClose = () => {
    setIsOrderDetailsOpen(false)
    setSelectedOrder(null)
  }

  const handleStatusChange = async (orderId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "completed",
        updatedAt: new Date(),
      })

      // Play success sound
      const audio = new Audio("/success.mp3")
      audio.play().catch((e) => console.error("Error playing sound:", e))

      toast({
        title: "Status yangilandi",
        description: "Buyurtma muvaffaqiyatli yakunlandi",
      })
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Xatolik",
        description: "Buyurtma statusini yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-1 flex-col">
        <div className="border-b bg-white p-4">
          <h1 className="text-2xl font-bold">Ofitsiant paneli</h1>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed">
              <AlertTriangle className="mb-2 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Tayyor buyurtmalar topilmadi</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {orders.map((order) => (
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
                          Tayyor
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.createdAt?.toDate
                          ? new Date(order.createdAt.toDate()).toLocaleTimeString("uz-UZ", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">
                        {order.orderType === "table"
                          ? `Stol #${order.tableNumber || "?"}`
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
                            <span className="text-muted-foreground">{formatCurrency(item.price * item.quantity)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleSelectOrder(order)}>
                        Batafsil
                      </Button>

                      <Button size="sm" onClick={() => handleStatusChange(order.id!)}>
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Yakunlash
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogTitle className="text-lg font-semibold">{selectedOrder ? "Buyurtma tafsilotlari" : ""}</DialogTitle>
          {selectedOrder && <OrderDetails order={selectedOrder} onClose={handleOrderDetailsClose} />}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
