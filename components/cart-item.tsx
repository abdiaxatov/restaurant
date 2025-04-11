"use client"

import Image from "next/image"
import { useState } from "react"
import { useCart } from "@/components/cart-provider"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { Minus, Plus, Trash2, ImageOff } from "lucide-react"
import { motion } from "framer-motion"
import type { MenuItem } from "@/types"

interface CartItemProps {
  item: MenuItem & { quantity: number }
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeFromCart } = useCart()
  const [imageError, setImageError] = useState(false)

  const handleIncrement = () => {
    updateQuantity(item.id, item.quantity + 1)
  }

  const handleDecrement = () => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1)
    } else {
      removeFromCart(item.id)
    }
  }

  return (
    <motion.div
      className="flex items-center gap-4 rounded-lg border p-3 shadow-sm transition-all hover:shadow-md"
      whileHover={{ scale: 1.01 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
    >
      <div className="relative h-16 w-16 overflow-hidden rounded-md flex-shrink-0">
        {!imageError ? (
          <Image
            src={item.imageUrl || "/placeholder.svg?height=64&width=64"}
            alt={item.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <ImageOff className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1">
        <h3 className="font-medium">{item.name}</h3>
        <p className="text-sm text-muted-foreground">{formatCurrency(item.price)}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={handleDecrement}>
          {item.quantity === 1 ? <Trash2 className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4" />}
        </Button>
        <span className="w-6 text-center font-medium">{item.quantity}</span>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={handleIncrement}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="w-20 text-right font-medium text-amber-700">{formatCurrency(item.price * item.quantity)}</div>
    </motion.div>
  )
}
