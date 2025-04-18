"use client"

import { useState, useEffect } from "react"
import { doc, updateDoc, getDoc, collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, MapPin, Phone, User, Receipt } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Order } from "@/types"

interface OrderDetailsProps {
  order: Order
  onClose: () => void
  isDeleted?: boolean
}

export function OrderDetails({ order, onClose, isDeleted = false }: OrderDetailsProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [waiterName, setWaiterName] = useState<string | null>(null)
  const { toast } = useToast()
  const [waiters, setWaiters] = useState<{ id: string; name: string }[]>([])
  const router = useRouter()

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
    // Fetch waiter information if this is a table order
    const fetchWaiterInfo = async () => {
      if (order.orderType !== "table") return

      try {
        // First check if the order has a waiterId directly
        if (order.waiterId) {
          const waiterDoc = await getDoc(doc(db, "users", order.waiterId))
          if (waiterDoc.exists()) {
            setWaiterName(waiterDoc.data().name)
            return
          }
        }

        // Fallback to the old method for backward compatibility
        if (order.tableNumber) {
          const tablesQuery = await getDoc(doc(db, "tables", `table-${order.tableNumber}`))
          if (tablesQuery.exists() && tablesQuery.data().waiterId) {
            const waiterId = tablesQuery.data().waiterId
            const waiterDoc = await getDoc(doc(db, "users", waiterId))
            if (waiterDoc.exists()) {
              setWaiterName(waiterDoc.data().name)
            }
          }
        } else if (order.roomNumber) {
          const roomsQuery = await getDoc(doc(db, "rooms", `room-${order.roomNumber}`))
          if (roomsQuery.exists() && roomsQuery.data().waiterId) {
            const waiterId = roomsQuery.data().waiterId
            const waiterDoc = await getDoc(doc(db, "users", waiterId))
            if (waiterDoc.exists()) {
              setWaiterName(waiterDoc.data().name)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching waiter info:", error)
      }
    }

    fetchWaiterInfo()
  }, [order])

  const handleUpdateStatus = async (newStatus: string) => {
    if (isDeleted) return // Don't allow status updates for deleted orders

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

      // If status is "paid", redirect to receipt page
      if (newStatus === "paid") {
        router.push(`/receipt/${order.id}`)
      }
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

  const viewReceipt = () => {
    router.push(`/receipt/${order.id}`)
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return

    setIsUpdating(true)

    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: newStatus,
        updatedAt: new Date(),
      })

      // Play notification sound
      const audio = new Audio("/success.mp3")
      audio.play().catch((e) => console.error("Error playing sound:", e))

      toast({
        title: "Status yangilandi",
        description: `Buyurtma statusi "${newStatus}" ga o'zgartirildi`,
      })

      // If status is changed to "paid", redirect to receipt page
      if (newStatus === "paid") {
        router.push(`/receipt/${order.id}`)
      }

      onClose()
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Xatolik",
        description: "Statusni yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Order header */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {order.orderType === "table"
              ? order.roomNumber
                ? `${getSeatingTypeDisplay(order)} #${order.roomNumber}`
                : `${getSeatingTypeDisplay(order)} #${order.tableNumber}`
              : "Yetkazib berish"}
          </h3>
          <Badge variant="outline">{getStatusText(order.status)}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Buyurtma vaqti: {formatDate(order.createdAt)}</p>
        {order.deletedAt && (
          <p className="text-sm text-muted-foreground">O'chirilgan vaqti: {formatDate(order.deletedAt)}</p>
        )}

        {order.orderType === "table" && (
          <div className="mt-1 flex items-center text-sm">
            <User className="mr-1 h-4 w-4 text-primary" />
            <span className="font-medium">Ofitsiant:</span>
            <span className="ml-1">
              {waiterName || waiters.find((w) => w.id === order.waiterId)?.name || "Belgilanmagan"}
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Customer info for delivery orders */}
      {order.orderType === "delivery" && (
        <div className="rounded-md bg-muted p-3">
          <h4 className="mb-2 font-medium">Mijoz ma'lumotlari</h4>
          {order.phoneNumber && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{order.phoneNumber}</span>
            </div>
          )}
          {order.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span>{order.address}</span>
            </div>
          )}
        </div>
      )}

      {/* Order items */}
      <div>
        <h4 className="mb-2 font-medium">Buyurtma elementlari</h4>
        <div className="space-y-2 rounded-md border p-3">
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Order summary */}
      <div className="rounded-md bg-muted p-3">
        <h4 className="mb-2 font-medium">Buyurtma xulasasi</h4>
        <div className="space-y-1">
          {order.orderType === "delivery" && (
            <>
              <div className="flex justify-between text-sm">
                <span>Taomlar narxi:</span>
                <span>{formatCurrency(order.subtotal || 0)}</span>
              </div>
              {order.containerCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Idishlar narxi:</span>
                  <span>{formatCurrency(order.containerCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Yetkazib berish narxi:</span>
                <span>{formatCurrency(order.deliveryFee || 0)}</span>
              </div>
              <Separator className="my-1" />
            </>
          )}
          <div className="flex justify-between font-medium">
            <span>Jami:</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {order.orderType === "table" && (
        <div className="flex justify-between py-2 border-b">
          <span className="font-medium">Ofitsiant:</span>
          <span>{waiters.find((w) => w.id === order.waiterId)?.name || "Belgilanmagan"}</span>
        </div>
      )}

      {/* Status update buttons */}
      {!isDeleted && (
        <div className="space-y-2">
          <h4 className="font-medium">Buyurtma statusini yangilash</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={order.status === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => handleUpdateStatus("pending")}
              disabled={isUpdating || order.status === "pending"}
            >
              {isUpdating && order.status !== "pending" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Kutilmoqda
            </Button>
            <Button
              variant={order.status === "preparing" ? "default" : "outline"}
              size="sm"
              onClick={() => handleUpdateStatus("preparing")}
              disabled={isUpdating || order.status === "preparing"}
            >
              {isUpdating && order.status !== "preparing" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Tayyorlanmoqda
            </Button>
            <Button
              variant={order.status === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => handleUpdateStatus("completed")}
              disabled={isUpdating || order.status === "completed"}
            >
              {isUpdating && order.status !== "completed" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yakunlangan
            </Button>
            <Button
              variant={order.status === "paid" ? "default" : "outline"}
              className={
                order.status === "paid" ? "bg-green-600 hover:bg-green-700" : "text-green-600 hover:text-green-700"
              }
              size="sm"
              onClick={() => handleUpdateStatus("paid")}
              disabled={isUpdating || order.status === "paid"}
            >
              {isUpdating && order.status !== "paid" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              To'landi
            </Button>
          </div>
        </div>
      )}

      {/* View receipt button (only for paid orders) */}
      {order.status === "paid" && (
        <div className="pt-2">
          <Button variant="outline" className="w-full" onClick={viewReceipt}>
            <Receipt className="mr-2 h-4 w-4" />
            Chekni ko'rish
          </Button>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Yopish
        </Button>
      </div>
    </div>
  )
}
