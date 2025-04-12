"use client"

import { useEffect, useState } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"
import { Clock, CheckCircle, ChefHat, Utensils, MapPin, Phone } from "lucide-react"
import type { Order } from "@/types"
import { useRouter } from "next/navigation"

export function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const router = useRouter()

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Get order IDs from localStorage
        const orderIds = JSON.parse(localStorage.getItem("myOrders") || "[]")

        if (orderIds.length === 0) {
          setIsLoading(false)
          return
        }

        // Set up real-time listeners for each order
        const unsubscribes = orderIds.map((id: string) => {
          return onSnapshot(
            doc(db, "orders", id),
            (doc) => {
              if (doc.exists()) {
                setOrders((prevOrders) => {
                  const newOrder = { id: doc.id, ...doc.data() } as Order
                  const existingOrderIndex = prevOrders.findIndex((o) => o.id === doc.id)

                  if (existingOrderIndex >= 0) {
                    // Update existing order
                    const updatedOrders = [...prevOrders]
                    updatedOrders[existingOrderIndex] = newOrder
                    return updatedOrders
                  } else {
                    // Add new order
                    return [...prevOrders, newOrder]
                  }
                })
                setIsLoading(false)
              }
            },
            (error) => {
              console.error("Error fetching order:", error)
              setIsLoading(false)
            },
          )
        })

        return () => {
          unsubscribes.forEach((unsubscribe) => unsubscribe())
        }
      } catch (error) {
        console.error("Error setting up order listeners:", error)
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [])

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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat("uz-UZ", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)
  }

  // Filter orders based on status
  const filteredOrders = statusFilter === "all" ? orders : orders.filter((order) => order.status === statusFilter)

  // Sort orders by date (newest first)
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
    return dateB.getTime() - dateA.getTime()
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="mt-2 h-4 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">Sizda hali buyurtmalar yo'q</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* <Tabs defaultValue="all" onValueChange={setStatusFilter}>
        <TabsList className="mb-4 w-full flex-wrap">
          <TabsTrigger value="all">Barchasi</TabsTrigger>
          <TabsTrigger value="pending">Kutilmoqda</TabsTrigger>
          <TabsTrigger value="preparing">Tayyorlanmoqda</TabsTrigger>
          <TabsTrigger value="ready">Tayyor</TabsTrigger>
          <TabsTrigger value="completed">Yakunlangan</TabsTrigger>
        </TabsList>
      </Tabs> */}

      <div className="space-y-4">
        {sortedOrders.map((order) => (
          <Card
            key={order.id}
            className="overflow-hidden cursor-pointer transition-all hover:shadow-md"
            onClick={() => router.push(`/confirmation?orderId=${order.id}`)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg">
                {order.roomNumber ? (
                  <span>Xona #{order.roomNumber}</span>
                ) : order.orderType === "table" ? (
                  <span>Stol #{order.tableNumber}</span>
                ) : (
                  <span>Yetkazib berish</span>
                )}
                <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-base font-normal">
                  {getStatusIcon(order.status)}
                  <span className="capitalize">{getStatusText(order.status)}</span>
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
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

              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}

                {order.orderType === "delivery" && (
                  <>
                    {order.subtotal && (
                      <div className="flex justify-between text-sm">
                        <span>Taomlar narxi</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                      </div>
                    )}
                    {order.containerCost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Idishlar narxi</span>
                        <span>{formatCurrency(order.containerCost)}</span>
                      </div>
                    )}
                    {order.deliveryFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Yetkazib berish narxi</span>
                        <span>{formatCurrency(order.deliveryFee)}</span>
                      </div>
                    )}
                  </>
                )}

                <Separator className="my-2" />

                <div className="flex justify-between font-medium">
                  <span>Jami</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
