"use client"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { MapPin, Phone, Clock, ShoppingBag, User } from "lucide-react"
import type { Order } from "@/types"

interface OrderListProps {
  orders: Order[]
  selectedOrderId?: string
  onSelectOrder: (order: Order) => void
}

export const OrderList = ({ orders, selectedOrderId, onSelectOrder }: OrderListProps) => {
  if (orders.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">Buyurtmalar topilmadi</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500 text-white"
      case "preparing":
        return "bg-blue-500 text-white"
      case "ready":
        return "bg-green-500 text-white"
      case "completed":
        return "bg-gray-500 text-white"
      default:
        return "bg-muted text-muted-foreground"
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
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      day: "numeric",
      month: "short",
    }).format(date)
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {orders.map((order) => (
        <Card
          key={order.id}
          className={`cursor-pointer overflow-hidden transition-all hover:shadow-md ${
            selectedOrderId === order.id ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => onSelectOrder(order)}
        >
          {/* Status header */}
          <div className={`${getStatusColor(order.status)} px-4 py-2`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">{getStatusText(order.status)}</span>
              <span className="text-sm">{formatDate(order.createdAt)}</span>
            </div>
          </div>

          {/* Order content */}
          <div className="p-4">
            {/* Order type and number */}
            <div className="mb-3 flex items-center">
              {order.orderType === "delivery" ? (
                <div className="flex items-center text-lg font-semibold">
                  <MapPin className="mr-2 h-5 w-5 text-primary" />
                  Yetkazib berish
                </div>
              ) : order.roomNumber ? (
                <div className="flex items-center text-lg font-semibold">
                  <User className="mr-2 h-5 w-5 text-primary" />
                  Xona #{order.roomNumber}
                </div>
              ) : (
                <div className="flex items-center text-lg font-semibold">
                  <User className="mr-2 h-5 w-5 text-primary" />
                  Stol #{order.tableNumber}
                </div>
              )}
            </div>

            {/* Order details */}
            <div className="space-y-2">
              {/* Items count */}
              <div className="flex items-center text-sm text-muted-foreground">
                <ShoppingBag className="mr-2 h-4 w-4" />
                {order.items.length} ta taom
              </div>

              {/* Phone number if available */}
              {order.phoneNumber && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="mr-2 h-4 w-4" />
                  {order.phoneNumber}
                </div>
              )}

              {/* Address for delivery orders */}
              {order.orderType === "delivery" && order.address && (
                <div className="flex items-start text-sm text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{order.address}</span>
                </div>
              )}

              {/* Order time */}
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-2 h-4 w-4" />
                {formatDate(order.createdAt)}
              </div>
            </div>

            {/* Total price */}
            <div className="mt-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Jami:</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
