"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import type { MenuItem } from "@/types"
import { formatCurrency } from "@/lib/utils"

interface MenuItemCardProps {
  item: MenuItem
  onAddToCart: (item: MenuItem) => void
}

export function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  return (
    <Card className="overflow-hidden">
      {item.image ? (
        <div className="relative h-48 w-full">
          <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
        </div>
      ) : (
        <div className="flex h-48 w-full items-center justify-center bg-muted">
          <span className="text-muted-foreground">No image</span>
        </div>
      )}
      <CardContent className="p-4">
        <h3 className="font-semibold">{item.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
        <p className="mt-2 font-medium">{formatCurrency(item.price)}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button onClick={() => onAddToCart(item)} className="w-full">
          Add to Order
        </Button>
      </CardFooter>
    </Card>
  )
}
