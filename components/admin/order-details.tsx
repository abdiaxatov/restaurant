"use client"

import { useState, useEffect } from "react"
import { doc, updateDoc, getDoc, collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { X } from "lucide-react"
import type { Order } from "@/types"

interface OrderDetailsProps {
  order: Order
  onClose: () => void
  isDeleted?: boolean
}

// Update the order details component to display waiter information
const OrderDetails = ({ order, onClose }: { order: Order; onClose: () => void }) => {
  const [waiterName, setWaiterName] = useState<string>("Belgilanmagan")
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()
  const [waiters, setWaiters] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const fetchWaiters = async () => {
      try {
        const waitersQuery = query(collection(db, "users"), where("role", "==", "waiter"))
        const waitersSnapshot = await getDocs(waitersQuery)
        const waitersList: { id: string; name: string }[] = []

        waitersSnapshot.forEach((doc) => {
          waitersList.push({ id: doc.id, name: doc.data().name })
        })

        setWaiters(waitersList)
      } catch (error) {
        console.error("Error fetching waiters:", error)
      }
    }

    fetchWaiters()
  }, [])

  useEffect(() => {
    // Fetch waiter name if waiterId is available
    const fetchWaiterName = async () => {
      if (order.waiterId) {
        try {
          const waiterDoc = await getDoc(doc(db, "users", order.waiterId))
          if (waiterDoc.exists()) {
            setWaiterName(waiterDoc.data().name || "Belgilanmagan")
          }
        } catch (error) {
          console.error("Error fetching waiter:", error)
        }
      }
    }

    fetchWaiterName()
  }, [order.waiterId])

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: newStatus,
        updatedAt: new Date(),
        // Add paid flag if the status is "paid"
        ...(newStatus === "paid" ? { isPaid: true, paidAt: new Date() } : {}),
      })

      // Play appropriate sound based on status
      let soundFile = ""
      switch (newStatus) {
        case "preparing":
          soundFile = "/cooking.mp3"
          break
        case "completed":
        case "paid":
          soundFile = "/success.mp3"
          break
      }

      if (soundFile) {
        const audio = new Audio(soundFile)
        audio.play().catch((e) => console.error("Error playing sound:", e))
      }

      toast({
        title: "Status yangilandi",
        description: `Buyurtma statusi "${newStatus === "paid" ? "To'landi" : newStatus}" ga o'zgartirildi`,
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
      case "completed":
        return "Yakunlangan"
      case "paid":
        return "To'landi"
      default:
        return status
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Buyurtma #{order.id.slice(-6)}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Buyurtma turi:</span>
          <span>
            {order.orderType === "table"
              ? order.roomNumber
                ? `Xona #${order.roomNumber}`
                : `${order.seatingType || order.tableType || "Stol"} #${order.tableNumber}`
              : "Yetkazib berish"}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Ofitsiant:</span>
          <span>{waiterName}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Status:</span>
          <Badge
            variant="outline"
            className={
              order.status === "pending"
                ? "bg-blue-50 text-blue-700"
                : order.status === "preparing"
                  ? "bg-amber-50 text-amber-700"
                  : order.status === "ready"
                    ? "bg-green-50 text-green-700"
                    : order.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : order.status === "cancelled"
                        ? "bg-red-50 text-red-700"
                        : ""
            }
          >
            {order.status === "pending"
              ? "Kutilmoqda"
              : order.status === "preparing"
                ? "Tayyorlanmoqda"
                : order.status === "ready"
                  ? "Tayyor"
                  : order.status === "completed"
                    ? "Yakunlangan"
                    : order.status === "cancelled"
                      ? "Bekor qilingan"
                      : order.status}
          </Badge>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Vaqt:</span>
          <span>{formatDate(order.createdAt)}</span>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="mb-2 font-medium">Buyurtma elementlari:</h4>
        <ul className="space-y-2">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between text-sm">
              <span>
                {item.name} x {item.quantity}
              </span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
      </div>

      <Separator />

      <div className="flex justify-between font-medium">
        <span>Jami summa:</span>
        <span>{formatCurrency(order.total)}</span>
      </div>

      {order.notes && (
        <>
          <Separator />
          <div>
            <h4 className="mb-1 font-medium">Izohlar:</h4>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </div>
        </>
      )}

      {order.orderType === "delivery" && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-medium">Yetkazib berish ma'lumotlari:</h4>
            <div className="grid gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mijoz:</span>
                <span>{order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefon:</span>
                <span>{order.customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Manzil:</span>
                <span>{order.customerAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Yetkazib berish narxi:</span>
                <span>{formatCurrency(order.deliveryFee || 0)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export { OrderDetails }
