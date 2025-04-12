"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"
import { CheckCircle, ArrowLeft, Clock, Loader2, ChefHat, Utensils } from "lucide-react"
import { motion } from "framer-motion"
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Buyurtma ma'lumotlari yuklanmoqda...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto max-w-md p-4">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Menyuga qaytish
        </Button>

        <div className="rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">Buyurtma topilmadi</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Menyuga qaytish
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-md p-4">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Menyuga qaytish
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-lg border p-6"
      >
        <div className="mb-4 flex justify-center">
          {order.status === "completed" ? (
            <CheckCircle className="h-16 w-16 text-green-500" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              {getStatusIcon(order.status)}
            </div>
          )}
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold">
          {order.status === "completed" ? "Buyurtma yakunlandi!" : "Buyurtma qabul qilindi!"}
        </h1>
        <p className="mb-6 text-center text-muted-foreground">
          {order.status === "pending" && "Sizning buyurtmangiz qabul qilindi va tez orada tayyorlanadi."}
          {order.status === "preparing" && "Sizning buyurtmangiz hozirda tayyorlanmoqda."}
          {order.status === "ready" && "Sizning buyurtmangiz tayyor va yetkazib berilishi kutilmoqda."}
          {order.status === "completed" && "Sizning buyurtmangiz muvaffaqiyatli yakunlandi."}
        </p>

        <div className="mb-6 flex items-center justify-center gap-4">
          {order.orderType === "table" && (
            <>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Stol raqami</p>
                <p className="text-xl font-semibold">{order.tableNumber}</p>
              </div>

              <Separator orientation="vertical" className="h-10" />
            </>
          )}

          <div className="text-center">
            <p className="text-sm text-muted-foreground">Buyurtma holati</p>
            <div className="flex items-center justify-center gap-1">
              {getStatusIcon(order.status)}
              <p className="font-medium capitalize">{getStatusText(order.status)}</p>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="mb-4 space-y-2 text-left">
          <h2 className="font-semibold">Buyurtma tafsilotlari</h2>
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}

          <div className="flex justify-between pt-2 font-medium">
            <span>Jami</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => router.push("/my-orders")}>Buyurtmalarimni ko'rish</Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            Yana buyurtma berish
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
