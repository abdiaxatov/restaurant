"use client"

import { useState } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { X } from "lucide-react"
import type { Order } from "@/types"

interface OrderDetailsProps {
  order: Order
  onClose: () => void
}

export function OrderDetails({ order, onClose }: OrderDetailsProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat("uz-UZ", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)
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

  const updateOrderStatus = async (newStatus: string) => {
    if (!order.id) return

    setIsUpdating(true)

    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: newStatus,
      })

      toast({
        title: "Status yangilandi",
        description: `Buyurtma statusi ${getStatusText(newStatus)} ga o'zgartirildi`,
      })
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Xatolik",
        description: "Buyurtma statusini yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="h-full">

      <div className="mb-6">
        <div className="mb-2 grid grid-cols-2 gap-2">
          <div>
            {order.roomNumber ? (
              <>
                <p className="text-sm text-muted-foreground">Xona raqami</p>
                <p className="font-medium">#{order.roomNumber}</p>
              </>
            ) : order.tableNumber ? (
              <>
                <p className="text-sm text-muted-foreground">Stol raqami</p>
                <p className="font-medium">#{order.tableNumber}</p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Buyurtma turi</p>
                <p className="font-medium">Yetkazib berish</p>
              </>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{getStatusText(order.status)}</p>
          </div>
        </div>
        <div className="mb-2">
          <p className="text-sm text-muted-foreground">Buyurtma vaqti</p>
          <p className="font-medium">{formatDate(order.createdAt)}</p>
        </div>
        {order.phoneNumber && (
          <div className="mb-2">
            <p className="text-sm text-muted-foreground">Telefon raqami</p>
            <p className="font-medium">{order.phoneNumber}</p>
          </div>
        )}
        {order.address && (
          <div className="mb-2">
            <p className="text-sm text-muted-foreground">Manzil</p>
            <p className="font-medium">{order.address}</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h3 className="mb-2 font-semibold">Taomlar</h3>
        <ul className="divide-y">
          {order.items.map((item, index) => (
            <li key={index} className="py-2">
              <div className="flex items-center justify-between">
                <div>
                  <p>{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(item.price)} × {item.quantity}
                  </p>
                </div>
                <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6">
        {order.orderType === "delivery" && (
          <>
            <div className="flex items-center justify-between border-t pt-2">
              <p>Taomlar narxi</p>
              <p>{formatCurrency(order.subtotal || order.total)}</p>
            </div>
            {order.containerCost > 0 && (
              <div className="flex items-center justify-between">
                <p>Idishlar narxi</p>
                <p>{formatCurrency(order.containerCost)}</p>
              </div>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex items-center justify-between">
                <p>Yetkazib berish narxi</p>
                <p>{formatCurrency(order.deliveryFee)}</p>
              </div>
            )}
          </>
        )}
        <div className="flex items-center justify-between border-t pt-2">
          <p className="font-semibold">Jami</p>
          <p className="font-semibold">{formatCurrency(order.total)}</p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Statusni yangilash</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={order.status === "pending" ? "default" : "outline"}
            size="sm"
            disabled={isUpdating || order.status === "pending"}
            onClick={() => updateOrderStatus("pending")}
          >
            Kutilmoqda
          </Button>
          <Button
            variant={order.status === "preparing" ? "default" : "outline"}
            size="sm"
            disabled={isUpdating || order.status === "preparing"}
            onClick={() => updateOrderStatus("preparing")}
          >
            Tayyorlanmoqda
          </Button>
          <Button
            variant={order.status === "ready" ? "default" : "outline"}
            size="sm"
            disabled={isUpdating || order.status === "ready"}
            onClick={() => updateOrderStatus("ready")}
          >
            Tayyor
          </Button>
          <Button
            variant={order.status === "completed" ? "default" : "outline"}
            size="sm"
            disabled={isUpdating || order.status === "completed"}
            onClick={() => updateOrderStatus("completed")}
          >
            Yakunlangan
          </Button>
        </div>
      </div>
    </div>
  )
}
