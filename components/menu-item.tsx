"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useCart } from "@/components/cart-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react"
import type { MenuItem as MenuItemType } from "@/types"
import { motion, AnimatePresence } from "framer-motion"

interface MenuItemProps {
  item: MenuItemType
}

export function MenuItem({ item }: MenuItemProps) {
  const { addToCart, getItemQuantity, removeItem } = useCart()
  const [quantity, setQuantity] = useState(0)
  const [isInCart, setIsInCart] = useState(false)
  const cartQuantity = getItemQuantity(item.id)

  useEffect(() => {
    setIsInCart(cartQuantity > 0)
    if (cartQuantity > 0) {
      setQuantity(cartQuantity)
    }
  }, [cartQuantity])

  const handleAddToCart = () => {
    // Play sound notification
    const audio = new Audio("/success.mp3")
    audio.play().catch((e) => console.error("Error playing sound:", e))

    addToCart(item, 1)
    setQuantity(1)
    setIsInCart(true)
  }

  const handleIncrement = () => {
    // Play sound notification
    const audio = new Audio("/click.mp3")
    audio.play().catch((e) => console.error("Error playing sound:", e))

    addToCart(item, 1)
    setQuantity((prev) => prev + 1)
  }

  const handleDecrement = () => {
    // Play sound notification
    const audio = new Audio("/click.mp3")
    audio.play().catch((e) => console.error("Error playing sound:", e))

    if (quantity <= 1) {
      removeItem(item.id)
      setIsInCart(false)
      setQuantity(0)
    } else {
      addToCart(item, -1)
      setQuantity((prev) => prev - 1)
    }
  }

  const handleRemove = () => {
    // Play sound notification
    const audio = new Audio("/notification.mp3")
    audio.play().catch((e) => console.error("Error playing sound:", e))

    removeItem(item.id)
    setIsInCart(false)
    setQuantity(0)
  }

  const remainingServings = item.remainingServings !== undefined ? item.remainingServings : item.servesCount
  const isOutOfStock = remainingServings <= 0

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${isOutOfStock ? "opacity-60" : ""}`}>
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={item.imageUrl || "/placeholder.svg?height=200&width=200"}
          alt={item.name}
          fill
          className="object-cover transition-transform hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg?height=200&width=200"
          }}
        />

        {remainingServings > 0 && remainingServings < item.servesCount && (
          <Badge className="absolute left-2 top-2 bg-amber-500 text-white">{remainingServings} porsiya qoldi</Badge>
        )}

        {isOutOfStock && <Badge className="absolute left-2 top-2 bg-red-500 text-white">Tugadi</Badge>}
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium">{item.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        <p className="mt-2 font-semibold text-primary">{formatCurrency(item.price)}</p>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        {isOutOfStock ? (
          <Button disabled className="w-full" size="sm">
            Tugadi
          </Button>
        ) : (
          <AnimatePresence mode="wait">
            {!isInCart ? (
              <motion.div
                key="order-button"
                className="w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Button onClick={handleAddToCart} className="w-full" size="sm">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Buyurtma berish
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="quantity-controls"
                className="flex w-full items-center justify-between rounded-md border p-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={handleDecrement}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="font-medium">{quantity}</span>
                <div className="flex">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={handleIncrement}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md text-red-500"
                    onClick={handleRemove}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </CardFooter>
    </Card>
  )
}
