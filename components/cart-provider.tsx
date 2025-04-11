"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import type { MenuItem } from "@/types"

interface CartItem extends MenuItem {
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addToCart: (item: MenuItem, quantity?: number) => void
  removeFromCart: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  getItemQuantity: (itemId: string) => number
  getTotalItems: () => number
  getTotalPrice: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  // Load cart from localStorage on initial render
  useEffect(() => {
    const savedCart = localStorage.getItem("cart")
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart))
      } catch (e) {
        console.error("Failed to parse cart from localStorage", e)
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items))
  }, [items])

  const addToCart = (item: MenuItem, quantity = 1) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id)

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity

        if (newQuantity <= 0) {
          return prevItems.filter((i) => i.id !== item.id)
        }

        return prevItems.map((i) => (i.id === item.id ? { ...i, quantity: newQuantity } : i))
      } else {
        if (quantity <= 0) return prevItems
        return [...prevItems, { ...item, quantity }]
      }
    })
  }

  const removeFromCart = (itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }

    setItems((prevItems) => prevItems.map((item) => (item.id === itemId ? { ...item, quantity } : item)))
  }

  const clearCart = () => {
    setItems([])
  }

  const getItemQuantity = (itemId: string) => {
    const item = items.find((item) => item.id === itemId)
    return item ? item.quantity : 0
  }

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemQuantity,
        getTotalItems,
        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
