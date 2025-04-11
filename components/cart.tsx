"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import type { CartItem, MenuItem } from "@/types"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Trash2 } from "lucide-react"

interface CartProps {
  items: CartItem[]
  updateQuantity: (id: string, quantity: number) => void
}

export function Cart({ items, updateQuantity }: CartProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const tableNumber = typeof window !== "undefined" ? sessionStorage.getItem("tableNumber") : null

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add items to your cart before placing an order.",
        variant: "destructive",
      })
      return
    }

    if (!tableNumber) {
      toast({
        title: "Table number missing",
        description: "Please go back and enter your table number.",
        variant: "destructive",
      })
      router.push("/")
      return
    }

    setIsSubmitting(true)

    try {
      // Check if items have enough servings
      for (const item of items) {
        const menuItemRef = doc(db, "menuItems", item.id)
        const menuItemSnap = await getDoc(menuItemRef)

        if (menuItemSnap.exists()) {
          const menuItemData = menuItemSnap.data() as MenuItem
          const remainingServings = menuItemData.remainingServings || menuItemData.servesCount

          if (remainingServings < item.quantity) {
            toast({
              title: "Not enough servings",
              description: `Sorry, only ${remainingServings} servings of ${item.name} are available.`,
              variant: "destructive",
            })
            setIsSubmitting(false)
            return
          }
        }
      }

      // Prepare order data
      const orderData = {
        tableNumber: Number.parseInt(tableNumber),
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        total,
        status: "pending",
        createdAt: serverTimestamp(),
        orderType: "table",
      }

      // Add order to Firestore
      const orderRef = await addDoc(collection(db, "orders"), orderData)

      // Update remaining servings for each item
      for (const item of items) {
        const menuItemRef = doc(db, "menuItems", item.id)
        const menuItemSnap = await getDoc(menuItemRef)

        if (menuItemSnap.exists()) {
          const menuItemData = menuItemSnap.data() as MenuItem
          const remainingServings = (menuItemData.remainingServings || menuItemData.servesCount) - item.quantity

          await updateDoc(menuItemRef, {
            remainingServings: remainingServings > 0 ? remainingServings : 0,
          })
        }
      }

      // Store order ID in localStorage for "My Orders" page
      const myOrders = JSON.parse(localStorage.getItem("myOrders") || "[]")
      myOrders.push(orderRef.id)
      localStorage.setItem("myOrders", JSON.stringify(myOrders))

      toast({
        title: "Order placed successfully!",
        description: "Your order has been sent to the kitchen.",
      })

      // Clear cart and redirect to confirmation page
      setTimeout(() => {
        router.push(`/confirmation?orderId=${orderRef.id}`)
      }, 1000)
    } catch (error) {
      console.error("Error placing order:", error)
      toast({
        title: "Error",
        description: "Failed to place your order. Please try again.",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 md:p-6">
        <h2 className="mb-4 text-xl font-bold">Your Order</h2>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Table #{tableNumber}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 pt-0">
        {items.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Your cart is empty</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      -
                    </Button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => updateQuantity(item.id, 0)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between font-semibold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <Button className="w-full" size="lg" disabled={items.length === 0 || isSubmitting} onClick={handlePlaceOrder}>
          {isSubmitting ? "Placing Order..." : "Place Order"}
        </Button>
      </div>
    </div>
  )
}
