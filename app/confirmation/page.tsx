"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"
import { CheckCircle, ArrowLeft, Clock } from "lucide-react"
import type { Order } from "@/types"

export default function ConfirmationPage() {
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")

  useEffect(() => {
    if (!orderId) {
      router.push("/")
      return
    }

    const fetchOrder = async () => {
      try {
        const orderDoc = await getDoc(doc(db, "orders", orderId))

        if (orderDoc.exists()) {
          setOrder({ id: orderDoc.id, ...orderDoc.data() } as Order)
        } else {
          router.push("/")
        }
      } catch (error) {
        console.error("Error fetching order:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, router])

  if (isLoading || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading order details...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-md p-4">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Menu
      </Button>

      <div className="rounded-lg border p-6 text-center">
        <div className="mb-4 flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>

        <h1 className="mb-2 text-2xl font-bold">Order Confirmed!</h1>
        <p className="mb-6 text-muted-foreground">Your order has been received and is being prepared.</p>

        <div className="mb-6 flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Table Number</p>
            <p className="text-xl font-semibold">{order.tableNumber}</p>
          </div>

          <Separator orientation="vertical" className="h-10" />

          <div className="text-center">
            <p className="text-sm text-muted-foreground">Order Status</p>
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="font-medium capitalize">{order.status}</p>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="mb-4 space-y-2 text-left">
          <h2 className="font-semibold">Order Summary</h2>
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}

          <div className="flex justify-between pt-2 font-medium">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        <div className="mt-6 space-x-2">
          <Button onClick={() => router.push("/my-orders")}>View My Orders</Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            Order More
          </Button>
        </div>
      </div>
    </div>
  )
}
