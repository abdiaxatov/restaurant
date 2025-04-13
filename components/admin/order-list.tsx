"use client"
import { formatCurrency } from "@/lib/utils"
import { Trash2 } from "lucide-react"
import type { Order } from "@/types"
import { Button } from "@/components/ui/button"

interface OrderListProps {
  orders: Order[]
  selectedOrderId?: string
  onSelectOrder: (order: Order) => void
  onDeleteOrder?: (order: Order) => void
}

export function OrderList({ orders, selectedOrderId, onSelectOrder, onDeleteOrder }: OrderListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500 text-white"
      case "preparing":
        return "bg-blue-500 text-white"
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
    <div className="rounded-md border">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 border-b bg-muted p-4 font-medium">
        <div>Buyurtma</div>
        <div>Status</div>
        <div>Summa</div>
        <div>Amallar</div>
      </div>
      <div className="divide-y">
        {orders.map((order) => (
          <div
            key={order.id}
            className={`grid grid-cols-[1fr_1fr_1fr_auto] gap-4 p-4 hover:bg-muted/50 ${
              selectedOrderId === order.id ? "bg-muted" : ""
            }`}
          >
            <div>
              <div className="font-medium">
                {order.orderType === "table"
                  ? order.roomNumber
                    ? `Xona #${order.roomNumber}`
                    : `Stol #${order.tableNumber}`
                  : "Yetkazib berish"}
              </div>
              <div className="text-sm text-muted-foreground">
                {order.createdAt?.toDate
                  ? new Date(order.createdAt.toDate()).toLocaleString("uz-UZ", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : ""}
              </div>
            </div>
            <div>
              <div
                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                  order.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : order.status === "preparing"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {order.status === "pending"
                  ? "Kutilmoqda"
                  : order.status === "preparing"
                    ? "Tayyorlanmoqda"
                    : "Yakunlangan"}
              </div>
            </div>
            <div className="font-medium">{formatCurrency(order.total)}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onSelectOrder(order)}>
                Batafsil
              </Button>
              {onDeleteOrder && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => onDeleteOrder(order)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
