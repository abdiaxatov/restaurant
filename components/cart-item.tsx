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
      className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md"
      whileHover={{ scale: 1.01 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
    >
      <div className="relative h-20 w-20 overflow-hidden rounded-md flex-shrink-0">
        {!imageError ? (
          <Image
            src={item.imageUrl || "/placeholder.svg?height=80&width=80"}
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

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium line-clamp-1">{item.name}</h3>
            <p className="text-sm text-muted-foreground">{formatCurrency(item.price)}</p>
          </div>
          <div className="text-right font-medium text-primary">{formatCurrency(item.price * item.quantity)}</div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center rounded-full border bg-background p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={handleDecrement}>
              {item.quantity === 1 ? (
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
            </Button>
            <span className="w-8 text-center font-medium">{item.quantity}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={handleIncrement}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-muted-foreground hover:text-destructive"
            onClick={() => removeFromCart(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="ml-1 hidden sm:inline-block">O'chirish</span>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
