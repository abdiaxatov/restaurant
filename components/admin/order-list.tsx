"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import type { Order } from "@/types"

interface OrderListProps {
  orders: Order[]
  selectedOrderId?: string
  onSelectOrder: (order: Order) => void
}

const OrderList = ({ orders, selectedOrderId, onSelectOrder }: OrderListProps) => {
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
    <div className="space-y-4">
      {orders.map((order) => (
        <Card
          key={order.id}
          className={`cursor-pointer p-4 transition-colors hover:bg-muted/50 ${
            selectedOrderId === order.id ? "border-primary" : ""
          }`}
          onClick={() => onSelectOrder(order)}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {order.roomNumber ? (
                  <h3 className="font-semibold">Xona #{order.roomNumber}</h3>
                ) : (
                  <h3 className="font-semibold">Stol #{order.tableNumber}</h3>
                )}
                <Badge className={getStatusColor(order.status)}>{getStatusText(order.status)}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
              {order.phoneNumber && <p className="mt-1 text-sm text-muted-foreground">Tel: {order.phoneNumber}</p>}
            </div>
            <div className="text-right">
              <p className="font-medium">{formatCurrency(order.total)}</p>
              <p className="text-sm text-muted-foreground">{order.items.length} ta taom</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export { OrderList }
