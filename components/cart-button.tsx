"use client"

import { useRouter } from "next/navigation"
import { useCart } from "@/components/cart-provider"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { ShoppingCart } from "lucide-react"
import { motion } from "framer-motion"

export function CartButton() {
  const { items, getTotalPrice, getTotalItems } = useCart()
  const router = useRouter()
  const totalItems = getTotalItems()

  if (totalItems === 0) {
    return null
  }

  return (
    <motion.div
      className="fixed bottom-20 right-4 z-50 pb-6"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button onClick={() => router.push("/cart")} className="flex items-center gap-2 rounded-full px-4 py-6 shadow-lg">
        <div className="relative">
          <ShoppingCart className="h-6 w-6" />
          <motion.span
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-primary"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.1 }}
          >
            {totalItems}
          </motion.span>
        </div>
        <span className="font-semibold">{formatCurrency(getTotalPrice())}</span>
      </Button>
    </motion.div>
  )
}
