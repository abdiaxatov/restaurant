"use client"
import { formatCurrency, getStatusColor, getStatusText } from "@/lib/utils"
import { Trash2, CreditCard } from "lucide-react"
import type { Order } from "@/types"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface OrderListProps {
  orders: Order[]
  selectedOrderId?: string
  onSelectOrder: (order: Order) => void
  onDeleteOrder?: (order: Order) => void
}

export function OrderList({ orders, selectedOrderId, onSelectOrder, onDeleteOrder }: OrderListProps) {
  const [waiterNames, setWaiterNames] = useState<Record<string, string>>({})
  const [tableWaiters, setTableWaiters] = useState<Record<number, string>>({})
  const [roomWaiters, setRoomWaiters] = useState<Record<number, string>>({})

  useEffect(() => {
    // Fetch all waiters
    const fetchWaiters = async () => {
      try {
        const waitersQuery = query(collection(db, "users"), where("role", "==", "waiter"))
        const waitersSnapshot = await getDocs(waitersQuery)
        const waiterData: Record<string, string> = {}

        waitersSnapshot.forEach((doc) => {
          const data = doc.data()
          waiterData[doc.id] = data.name
        })

        setWaiterNames(waiterData)
      } catch (error) {
        console.error("Error fetching waiters:", error)
      }
    }

    // Fetch tables with their assigned waiters
    const fetchTableWaiters = async () => {
      try {
        const tablesQuery = query(collection(db, "tables"))
        const tablesSnapshot = await getDocs(tablesQuery)
        const tableData: Record<number, string> = {}

        tablesSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.waiterId) {
            tableData[data.number] = data.waiterId
          }
        })

        setTableWaiters(tableData)
      } catch (error) {
        console.error("Error fetching table waiters:", error)
      }
    }

    // Fetch rooms with their assigned waiters
    const fetchRoomWaiters = async () => {
      try {
        const roomsQuery = query(collection(db, "rooms"))
        const roomsSnapshot = await getDocs(roomsQuery)
        const roomData: Record<number, string> = {}

        roomsSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.waiterId) {
            roomData[data.number] = data.waiterId
          }
        })

        setRoomWaiters(roomData)
      } catch (error) {
        console.error("Error fetching room waiters:", error)
      }
    }

    fetchWaiters()
    fetchTableWaiters()
    fetchRoomWaiters()
  }, [])

  const getWaiterName = (order: Order) => {
    if (order.orderType === "table") {
      if (order.tableNumber && tableWaiters[order.tableNumber]) {
        const waiterId = tableWaiters[order.tableNumber]
        return waiterNames[waiterId] || "Belgilanmagan"
      } else if (order.roomNumber && roomWaiters[order.roomNumber]) {
        const waiterId = roomWaiters[order.roomNumber]
        return waiterNames[waiterId] || "Belgilanmagan"
      }
    }
    return "Belgilanmagan"
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
    <div className="overflow-hidden rounded-md border">
      <div className="grid grid-cols-[1.5fr_1fr_1fr_auto] gap-4 border-b bg-muted p-4 font-medium">
        <div>Buyurtma</div>
        <div>Status</div>
        <div>Summa</div>
        <div>Amallar</div>
      </div>
      <div className="divide-y">
        {orders.map((order) => (
          <div
            key={order.id}
            className={`grid grid-cols-[1.5fr_1fr_1fr_auto] gap-4 p-4 hover:bg-muted/50 ${
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
                {order.orderType === "table" && (
                  <span className="ml-1 text-sm text-muted-foreground">- {getWaiterName(order)}</span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {order.createdAt?.toDate
                  ? new Date(order.createdAt.toDate()).toLocaleString("uz-UZ", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : ""}
              </div>
              {order.isPaid && (
                <div className="mt-1 flex items-center text-xs text-green-600">
                  <CreditCard className="mr-1 h-3 w-3" />
                  To'langan: {order.paidAt?.toDate ? formatDate(order.paidAt) : ""}
                </div>
              )}
            </div>
            <div>
              <div
                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(order.status)}`}
              >
                {getStatusText(order.status)}
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
