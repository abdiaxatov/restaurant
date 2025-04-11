"use client"

import { useState, useEffect, useRef } from "react"
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { MapPin, Phone, Loader2 } from "lucide-react"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import type { Order } from "@/types"

export function WaiterPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)
  const { toast } = useToast()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousOrderCountRef = useRef(0)
  const router = useRouter()

  useEffect(() => {
    // Check user role
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/admin/login")
        return
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setUserRole(userData.role)

          // If not admin or waiter, redirect
          if (userData.role !== "admin" && userData.role !== "waiter") {
            toast({
              title: "Ruxsat yo'q",
              description: "Sizda ushbu sahifaga kirish huquqi yo'q",
              variant: "destructive",
            })
            router.push("/admin/login")
          }
        }
      } catch (error) {
        console.error("Error checking user role:", error)
      }
    })

    // Initialize audio element
    audioRef.current = new Audio("/notification.mp3")

    // Get only ready orders
    // Using a simpler query to avoid index requirements
    const ordersQuery = query(collection(db, "orders"), where("status", "==", "ready"))

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const ordersList: Order[] = []
        snapshot.forEach((doc) => {
          ordersList.push({ id: doc.id, ...doc.data() } as Order)
        })

        // Sort orders by createdAt in JavaScript instead of in the query
        ordersList.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
          return dateA.getTime() - dateB.getTime()
        })

        setOrders(ordersList)
        setIsLoading(false)

        // Check for new orders and play sound
        if (ordersList.length > previousOrderCountRef.current) {
          audioRef.current?.play().catch((e) => console.error("Error playing notification sound:", e))
        }
        previousOrderCountRef.current = ordersList.length
      },
      (error) => {
        console.error("Error fetching orders:", error)
        toast({
          title: "Xatolik",
          description: "Buyurtmalarni yuklashda xatolik yuz berdi",
          variant: "destructive",
        })
        setIsLoading(false)
      },
    )

    return () => {
      unsubscribe()
      unsubscribeAuth()
    }
  }, [toast, router])

  const handleCompleteOrder = async (orderId: string) => {
    setProcessingOrderId(orderId)

    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "completed",
      })

      // Play delivery sound
      const audio = new Audio("/delivery.mp3")
      audio.play().catch((e) => console.error("Error playing sound:", e))

      toast({
        title: "Buyurtma yakunlandi",
        description: "Buyurtma muvaffaqiyatli yakunlandi",
      })
    } catch (error) {
      console.error("Error completing order:", error)
      toast({
        title: "Xatolik",
        description: "Buyurtmani yakunlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setProcessingOrderId(null)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat("uz-UZ", {
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).format(date)
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">Ofitsiant paneli</h1>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <Skeleton className="mt-2 h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="ml-auto h-9 w-32" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">Hozircha yetkazilishi kerak bo'lgan tayyor buyurtmalar yo'q</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <Card key={order.id} className="border-green-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {order.orderType === "table" ? `Stol #${order.tableNumber}` : "Yetkazib berish"}
                    </CardTitle>
                    <Badge className="bg-green-500">Tayyor</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Buyurtma vaqti: {formatDate(order.createdAt)}</p>
                </CardHeader>
                <CardContent>
                  {order.orderType === "delivery" && (
                    <div className="mb-3 space-y-1 rounded-md bg-muted p-3">
                      {order.phoneNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{order.phoneNumber}</span>
                        </div>
                      )}
                      {order.address && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{order.address}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <ul className="space-y-2">
                    {order.items.map((item, index) => (
                      <li key={index} className="flex justify-between">
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex justify-between border-t pt-2">
                    <span className="font-medium">Jami:</span>
                    <span className="font-medium">{formatCurrency(order.total)}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button
                    onClick={() => handleCompleteOrder(order.id!)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={processingOrderId === order.id}
                  >
                    {processingOrderId === order.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Jarayonda...
                      </>
                    ) : order.orderType === "table" ? (
                      "Yetkazildi"
                    ) : (
                      "Yetkazib berildi"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
