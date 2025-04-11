"use client"

import { MenuItem as MenuItemComponent } from "@/components/menu-item"
import type { MenuItem } from "@/types"

interface MenuGridProps {
  items: MenuItem[]
}

export function MenuGrid({ items }: MenuGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-center text-muted-foreground">No items found. Try a different search or category.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <MenuItemComponent key={item.id} item={item} />
      ))}
    </div>
  )
}
