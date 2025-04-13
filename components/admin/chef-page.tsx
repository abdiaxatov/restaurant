"use client"

import { useState, useEffect } from "react"
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSpinner } from "@/components/admin/loading-spinner"
import { formatCurrency } from "@/lib/utils"
import { Clock, CheckCircle2 } from "lucide-react"
import type { Order } from "@/types"

export function ChefPage() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [cookingOrders, setCookingOrders] = useState<Order[]>([])
  const [readyOrders, setReadyOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const ordersQuery = query(
      collection(db, "orders"),
      where("status", "in", ["pending", "cooking", "ready"]),
      orderBy("createdAt", "asc"),
    )

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const pendingOrdersData: Order[] = []
      const cookingOrdersData: Order[] = []
      const readyOrdersData: Order[] = []

      snapshot.forEach((doc) => {
        const orderData = { id: doc.id, ...doc.data() } as Order

        if (orderData.status === "pending") {
          pendingOrdersData.push(orderData)
        } else if (orderData.status === "cooking") {
          cookingOrdersData.push(orderData)
        } else if (orderData.status === "ready") {
          readyOrdersData.push(orderData)
        }
      })

      setPendingOrders(pendingOrdersData)
      setCookingOrders(cookingOrdersData)
      setReadyOrders(readyOrdersData)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleStartCooking = async (orderId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "cooking",
      })

      // Play cooking sound
      const audio = new Audio("/cooking.mp3")
      audio.play().catch((e) => console.error("Error playing sound:", e))
    } catch (error) {
      console.error("Error updating order status:", error)
    }
  }

  const handleOrderReady = async (orderId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "ready",
      })

      // Play ready sound
      const audio = new Audio("/ready.mp3")
      audio.play().catch((e) => console.error("Error playing sound:", e))
    } catch (error) {
      console.error("Error updating order status:", error)
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
      <h1 className="mb-6 text-2xl font-bold">Oshxona</h1>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4 grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="relative">
            Yangi
            {pendingOrders.length > 0 && <Badge className="ml-2 bg-primary">{pendingOrders.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="cooking" className="relative">
            Tayyorlanmoqda
            {cookingOrders.length > 0 && <Badge className="ml-2 bg-amber-500">{cookingOrders.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="ready" className="relative">
            Tayyor
            {readyOrders.length > 0 && <Badge className="ml-2 bg-green-500">{readyOrders.length}</Badge>}
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
                      <CardTitle className="text-base">Stol #{order.tableNumber}</CardTitle>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Yangi
                      </Badge>
                    </div>
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
                    <Button className="w-full" onClick={() => handleStartCooking(order.id)}>
                      Tayyorlashni boshlash
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cooking">
          {cookingOrders.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground">Tayyorlanayotgan buyurtmalar yo'q</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cookingOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-amber-50 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Stol #{order.tableNumber}</CardTitle>
                      <Badge variant="outline" className="bg-amber-100 text-amber-700">
                        Tayyorlanmoqda
                      </Badge>
                    </div>
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
                    <Button className="w-full" onClick={() => handleOrderReady(order.id)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Tayyor
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ready">
          {readyOrders.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground">Tayyor buyurtmalar yo'q</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {readyOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-green-50 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Stol #{order.tableNumber}</CardTitle>
                      <Badge variant="outline" className="bg-green-100 text-green-700">
                        Tayyor
                      </Badge>
                    </div>
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
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
