"use client"

import { useRouter } from "next/navigation"
import { useCart } from "@/components/cart-provider"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { ShoppingCart } from "lucide-react"

export function CartButton() {
  const { items, getTotalPrice, getTotalItems } = useCart()
  const router = useRouter()
  const totalItems = getTotalItems()

  if (totalItems === 0) {
    return null
  }

  return (
    <div className="fixed bottom-20 pb-5 right-4 z-20">
      <Button onClick={() => router.push("/cart")} className="flex items-center gap-2 rounded-full px-4 py-6 shadow-lg">
        <div className="relative">
          <ShoppingCart className="h-6 w-6" />
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-primary">
            {totalItems}
          </span>
        </div>
        <span className="font-semibold">{formatCurrency(getTotalPrice())}</span>
      </Button>
    </div>
  )
}
