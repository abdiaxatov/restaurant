"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { OrderDetails } from "@/components/admin/order-details"
import { formatCurrency } from "@/lib/utils"
import { playNotificationSound } from "@/lib/audio-player"
import { Clock, CheckCircle, ChefHat, Utensils, Trash2, User } from "lucide-react"
import { getWaiterNameById } from "@/lib/table-service"
import { markOrderAsPaid } from "@/lib/receipt-service"
import { toast } from "@/components/ui/use-toast"

export function OrderList() {
  const [orders, setOrders] = useState<any[]>([])
  const [selectedTab, setSelectedTab] = useState("pending")
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [waiterNames, setWaiterNames] = useState<Record<string, string | null>>({})

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData: any[] = []
      querySnapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() })
      })
      setOrders(ordersData)

      // Check for new pending orders and play sound
      const pendingOrders = ordersData.filter((order) => order.status === "pending")
      if (pendingOrders.length > 0) {
        const latestOrder = pendingOrders.reduce((latest, current) => {
          const latestDate = latest.createdAt?.toDate ? latest.createdAt.toDate() : new Date(latest.createdAt)
          const currentDate = current.createdAt?.toDate ? current.createdAt.toDate() : new Date(current.createdAt)
          return currentDate > latestDate ? current : latest
        }, pendingOrders[0])

        const latestOrderTime = latestOrder.createdAt?.toDate
          ? latestOrder.createdAt.toDate()
          : new Date(latestOrder.createdAt)
        const currentTime = new Date()
        const timeDifference = currentTime.getTime() - latestOrderTime.getTime()

        // Play sound only if the order is less than 10 seconds old
        if (timeDifference < 10000) {
          playNotificationSound()
        }
      }
    })

    return () => unsubscribe()
  }, [])

  // Fetch waiter names when orders change
  useEffect(() => {
    const fetchWaiterNames = async () => {
      const waiterIds = orders
        .filter((order) => order.waiterId)
        .map((order) => order.waiterId)
        .filter((id, index, self) => self.indexOf(id) === index) // Get unique IDs

      const namesMap: Record<string, string | null> = {}

      for (const id of waiterIds) {
        const name = await getWaiterNameById(id)
        namesMap[id] = name
      }

      setWaiterNames(namesMap)
    }

    if (orders.length > 0) {
      fetchWaiterNames()
    }
  }, [orders])

  const getSeatingTypeDisplay = (order: any) => {
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

  const getSeatingDisplay = (order: any) => {
    const type = getSeatingTypeDisplay(order)

    if (order.orderType === "delivery") {
      return type
    }

    const number = order.roomNumber || order.tableNumber
    return `${type} ${number}`
  }

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus,
        updatedAt: new Date(),
      })

      // Play sound based on status change
      if (newStatus === "preparing") {
        const audio = new Audio("/cooking.mp3")
        audio.play()
      } else if (newStatus === "ready") {
        const audio = new Audio("/ready.mp3")
        audio.play()
      } else if (newStatus === "completed") {
        const audio = new Audio("/delivery.mp3")
        audio.play()
      }
    } catch (error) {
      console.error("Error updating order status:", error)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    try {
      // Get the order data before deleting
      const orderDoc = await getDoc(doc(db, "orders", orderId))
      if (orderDoc.exists()) {
        const orderData = orderDoc.data()

        // Move to order history
        await updateDoc(doc(db, "orders", orderId), {
          deletedAt: new Date(),
          deletedBy: "admin", // You can replace with actual user ID if available
        })

        // Delete from active orders
        await deleteDoc(doc(db, "orders", orderId))
      }
    } catch (error) {
      console.error("Error deleting order:", error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-amber-500" />
      case "preparing":
        return <ChefHat className="h-5 w-5 text-blue-500" />
      case "ready":
        return <Utensils className="h-5 w-5 text-green-500" />
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-700" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Kutilmoqda"
      case "preparing":
        return "Tayyorlanmoqda"
      case "ready":
        return "Tayyor"
      case "completed":
        return "Yakunlangan"
      default:
        return status
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (selectedTab === "all") return true
    return order.status === selectedTab
  })

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat("uz-UZ", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pending" onValueChange={setSelectedTab}>
        <TabsList className="mb-4 w-full flex-wrap">
          <TabsTrigger value="all">Barchasi</TabsTrigger>
          <TabsTrigger value="pending">Kutilmoqda</TabsTrigger>
          <TabsTrigger value="preparing">Tayyorlanmoqda</TabsTrigger>
          <TabsTrigger value="ready">Tayyor</TabsTrigger>
          <TabsTrigger value="completed">Yakunlangan</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground">Hozircha buyurtmalar yo'q</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <Card
                key={order.id}
                className={`overflow-hidden ${order.status === "completed" && order.isPaid === false ? "border-2 border-amber-400" : ""}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>{getSeatingDisplay(order)}</span>
                    <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-base font-normal">
                      {getStatusIcon(order.status)}
                      <span className="capitalize">{getStatusText(order.status)}</span>
                    </div>
                  </CardTitle>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
                    {order.waiterId && waiterNames[order.waiterId] && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{waiterNames[order.waiterId]}</span>
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {order.items.slice(0, 3).map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="text-sm text-muted-foreground">+{order.items.length - 3} ta qo'shimcha taom</div>
                    )}
                    <div className="flex justify-between font-medium pt-2">
                      <span>Jami:</span>
                      <span>{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 justify-between">
                  <div className="flex gap-2">
                    {order.status === "pending" && (
                      <Button size="sm" onClick={() => handleUpdateStatus(order.id, "preparing")}>
                        Tayyorlashni boshlash
                      </Button>
                    )}
                    {order.status === "preparing" && (
                      <Button size="sm" onClick={() => handleUpdateStatus(order.id, "ready")}>
                        Tayyor qilish
                      </Button>
                    )}
                    {order.status === "ready" && (
                      <Button size="sm" onClick={() => handleUpdateStatus(order.id, "completed")}>
                        Yakunlash
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Dialog
                      open={isDetailsOpen && selectedOrder?.id === order.id}
                      onOpenChange={(open) => {
                        if (!open) setIsDetailsOpen(false)
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order)
                            setIsDetailsOpen(true)
                          }}
                        >
                          Batafsil
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Buyurtma tafsilotlari</DialogTitle>
                        </DialogHeader>
                        {selectedOrder && <OrderDetails order={selectedOrder} />}
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Buyurtmani o'chirish</AlertDialogTitle>
                          <AlertDialogDescription>
                            Haqiqatan ham bu buyurtmani o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteOrder(order.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            O'chirish
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {order.status === "completed" && !order.isPaid && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const success = await markOrderAsPaid(order.id)
                            if (success) {
                              toast({
                                title: "Muvaffaqiyatli",
                                description: "Buyurtma to'langan deb belgilandi",
                              })
                            } else {
                              toast({
                                title: "Xatolik",
                                description: "To'lovni qayd qilishda xatolik yuz berdi",
                                variant: "destructive",
                              })
                            }
                          } catch (error) {
                            console.error("Error marking order as paid:", error)
                            toast({
                              title: "Xatolik",
                              description: "To'lovni qayd qilishda xatolik yuz berdi",
                              variant: "destructive",
                            })
                          }
                        }}
                      >
                        To'langan deb belgilash
                      </Button>
                    )}

                    {order.isPaid && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-green-50 text-green-600 hover:bg-green-100"
                        onClick={() => {
                          window.open(`/receipt?orderId=${order.id}`, "_blank")
                        }}
                      >
                        Chekni ko'rish
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
