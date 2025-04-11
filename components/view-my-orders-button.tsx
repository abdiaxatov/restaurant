"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ClipboardList } from "lucide-react"

export function ViewMyOrdersButton() {
  const router = useRouter()
  const [hasOrders, setHasOrders] = useState(false)

  useEffect(() => {
    // Check if user has any orders on the client side
    const orders = JSON.parse(localStorage.getItem("myOrders") || "[]")
    setHasOrders(orders.length > 0)
  }, [])

  if (!hasOrders) return null

  return (
    <Button
      onClick={() => router.push("/my-orders")}
      variant="outline"
      className="fixed bottom-20 right-4 z-20 flex items-center gap-2 rounded-full px-4 py-2 shadow-md"
    >
      <ClipboardList className="h-4 w-4" />
      <span>Buyurtmalarim</span>
    </Button>
  )
}
