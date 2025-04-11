"use client"

import Image from "next/image"
import { useState } from "react"
import { useCart } from "@/components/cart-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Minus, Plus, Loader2 } from "lucide-react"
import type { MenuItem as MenuItemType } from "@/types"

interface MenuItemProps {
  item: MenuItemType
}

export function MenuItem({ item }: MenuItemProps) {
  const { addToCart, getItemQuantity } = useCart()
  const [quantity, setQuantity] = useState(getItemQuantity(item.id))
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  const handleAddToCart = () => {
    addToCart(item)
    setQuantity(quantity + 1)

    // Play sound notification
    const audio = new Audio("/click.mp3")
    audio.play().catch((e) => console.error("Error playing sound:", e))
  }

  const handleRemoveFromCart = () => {
    if (quantity > 0) {
      addToCart(item, -1)
      setQuantity(quantity - 1)
    }
  }

  const remainingServings = item.remainingServings !== undefined ? item.remainingServings : item.servesCount
  const isOutOfStock = remainingServings <= 0

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${isOutOfStock ? "opacity-60" : ""}`}>
      <div className="relative aspect-square overflow-hidden">
        {isImageLoading && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        <Image
          src={item.imageUrl || "/placeholder.svg?height=200&width=200"}
          alt={item.name}
          fill
          className={`object-cover transition-transform hover:scale-105 ${imageError ? "hidden" : ""}`}
          onLoad={() => setIsImageLoading(false)}
          onError={() => {
            setIsImageLoading(false)
            setImageError(true)
          }}
        />

        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <span className="text-muted-foreground">Rasm topilmadi</span>
          </div>
        )}

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
        ) : quantity === 0 ? (
          <Button onClick={handleAddToCart} className="w-full" size="sm">
            Add to Cart
          </Button>
        ) : (
          <div className="flex w-full items-center justify-between rounded-md border p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={handleRemoveFromCart}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-medium">{quantity}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={handleAddToCart}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
