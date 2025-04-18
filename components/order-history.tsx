"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { doc, onSnapshot, collection, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { Clock, CheckCircle, ChefHat, Utensils, MapPin, Phone, User, Receipt, Calendar } from "lucide-react"
import type { Order } from "@/types"
import { useRouter } from "next/navigation"
import { getWaiterNameById } from "@/lib/table-service"
import { Badge } from "@/components/ui/badge"

export function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [waiterNames, setWaiterNames] = useState<Record<string, string | null>>({})
  const router = useRouter()

  const getSeatingTypeDisplay = (order: Order) => {
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

  const getSeatingDisplay = (order: Order) => {
    const type = getSeatingTypeDisplay(order)

    if (order.orderType === "delivery") {
      return type
    }

    const number = order.roomNumber || order.tableNumber
    return `${type} ${number}`
  }

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Get order IDs from localStorage
        const orderIds = JSON.parse(localStorage.getItem("myOrders") || "[]")
        // Ensure we have string IDs, not objects
        const orderIdStrings = Array.isArray(orderIds)
          ? orderIds.map((id) => (typeof id === "object" && id.id ? id.id : String(id)))
          : []

        if (orderIdStrings.length === 0) {
          setIsLoading(false)
          return
        }

        // Set up real-time listeners for each order
        const unsubscribes = orderIdStrings.map((id: string) => {
          // First check active orders
          const activeOrderUnsubscribe = onSnapshot(
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
              } else {
                // If not found in active orders, check orderHistory
                const historyOrderUnsubscribe = onSnapshot(
                  query(collection(db, "orderHistory"), where("id", "==", id)),
                  (snapshot) => {
                    if (!snapshot.empty) {
                      const historyDoc = snapshot.docs[0]
                      setOrders((prevOrders) => {
                        const newOrder = { id: historyDoc.id, ...historyDoc.data() } as Order
                        const existingOrderIndex = prevOrders.findIndex((o) => o.id === id)

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
                    }
                    setIsLoading(false)
                  },
                  (error) => {
                    console.error("Error fetching history order:", error)
                    setIsLoading(false)
                  },
                )
                return historyOrderUnsubscribe
              }
            },
            (error) => {
              console.error("Error fetching order:", error)
              setIsLoading(false)
            },
          )

          return activeOrderUnsubscribe
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

  // Fetch waiter names when orders change
  useEffect(() => {
    const fetchWaiterNames = async () => {
      const waiterIds = orders
        .filter((order) => order.waiterId)
        .map((order) => order.waiterId as string)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-amber-500" />
      case "preparing":
        return <ChefHat className="h-5 w-5 text-blue-500" />
      case "ready":
        return <Utensils className="h-5 w-5 text-green-500" />
      case "completed":
        return <CheckCircle className="h-5 w-5 text-blue-500" />
      case "paid":
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
      case "paid":
        return "To'langan"
      default:
        return status
    }
  }

  const getStatusColors = (status: string, isPaid: boolean) => {
    if (!isPaid) {
      return {
        bg: "bg-red-50",
        border: "border-red-300",
        header: "bg-red-100",
        statusBg: "bg-red-100",
        statusText: "text-red-700",
      }
    }

    switch (status) {
      case "pending":
        return {
          bg: "bg-amber-50",
          border: "border-amber-200",
          header: "bg-amber-100",
          statusBg: "bg-amber-100",
          statusText: "text-amber-700",
        }
      case "preparing":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          header: "bg-blue-100",
          statusBg: "bg-blue-100",
          statusText: "text-blue-700",
        }
      case "ready":
        return {
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          header: "bg-emerald-100",
          statusBg: "bg-emerald-100",
          statusText: "text-emerald-700",
        }
      case "completed":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          header: "bg-blue-100",
          statusBg: "bg-blue-100",
          statusText: "text-blue-700",
        }
      case "paid":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          header: "bg-green-100",
          statusBg: "bg-green-100",
          statusText: "text-green-700",
        }
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          header: "bg-gray-100",
          statusBg: "bg-gray-100",
          statusText: "text-gray-700",
        }
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

  // Navigate to receipt page
  const handleViewReceipt = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation() // Prevent the card click from triggering
    router.push(`/receipt/${orderId}`)
  }

  // Sort orders by date (newest first)
  const sortedOrders = [...orders].sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
    return dateB.getTime() - dateA.getTime()
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="overflow-hidden">
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
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold">Mening buyurtmalarim</h2>
        <p className="text-muted-foreground">Barcha buyurtmalaringiz va ularning holati</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sortedOrders.map((order) => {
          const isPaid = order.isPaid !== false
          const status = order.status || "pending"
          const colors = getStatusColors(status, isPaid)
          // Only show receipt button when status is specifically "paid"
          const showReceiptButton = status === "paid"

          return (
            <Card
              key={order.id}
              className={`overflow-hidden cursor-pointer transition-all hover:shadow-md border ${colors.border} ${colors.bg}`}
              onClick={() => router.push(`/confirmation?orderId=${order.id}`)}
            >
              <CardHeader className={`pb-2 ${colors.header}`}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>{getSeatingDisplay(order)}</span>
                    {!isPaid && (
                      <Badge variant="destructive" className="text-xs">
                        To'lanmagan
                      </Badge>
                    )}
                  </CardTitle>
                  <Badge
                    className={`${colors.statusBg} ${colors.statusText} border-0 flex items-center gap-1 px-3 py-1`}
                  >
                    {getStatusIcon(status)}
                    <span>{getStatusText(status)}</span>
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{formatDate(order.createdAt)}</span>
                  {order.waiterId && waiterNames[order.waiterId] && (
                    <Badge variant="outline" className="ml-auto flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{waiterNames[order.waiterId]}</span>
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {order.orderType === "delivery" && (
                  <div className="mb-3 space-y-1 rounded-md bg-background/80 p-3">
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
                  {order.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="font-medium">
                        {item.name} × {item.quantity}
                      </span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}

                  {order.items.length > 3 && (
                    <div className="text-sm text-muted-foreground italic">
                      +{order.items.length - 3} ta qo'shimcha taom
                    </div>
                  )}

                  <Separator className="my-2" />

                  <div className="flex justify-between font-medium text-base">
                    <span>Jami</span>
                    <span className="font-bold">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </CardContent>
              {showReceiptButton && (
                <CardFooter className="pt-0 flex justify-end">
                  <Button
                    variant="default"
                    size="sm"
                    className={`flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white`}
                    onClick={(e) => handleViewReceipt(e, order.id)}
                  >
                    <Receipt className="h-4 w-4" />
                    <span>Chek</span>
                  </Button>
                </CardFooter>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
