"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/components/cart-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { CartItem } from "@/components/cart-item"
import { TableSelector } from "@/components/table-selector"
import { formatCurrency } from "@/lib/utils"
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ArrowLeft, Loader2, ShoppingCart } from "lucide-react"
import { motion } from "framer-motion"
import type { MenuItem } from "@/types"

export function CartPage() {
  const { items, getTotalPrice, clearCart } = useCart()
  const [orderType, setOrderType] = useState<"table" | "delivery">("table")
  const [tableNumber, setTableNumber] = useState<number | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [address, setAddress] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  // Add state for tracking validation errors
  const [validationErrors, setValidationErrors] = useState<{
    tableNumber?: boolean
    phoneNumber?: boolean
    address?: boolean
  }>({})

  // Modify the handlePlaceOrder function to add visual feedback for unfilled fields
  const handlePlaceOrder = async () => {
    // Reset validation errors
    setValidationErrors({})

    // Initialize a new validation errors object
    const newValidationErrors: {
      tableNumber?: boolean
      phoneNumber?: boolean
      address?: boolean
    } = {}

    let hasErrors = false

    if (items.length === 0) {
      toast({
        title: "Bo'sh savat",
        description: "Iltimos, buyurtma berish uchun savatingizga taomlar qo'shing.",
        variant: "destructive",
      })
      return
    }

    if (orderType === "table" && !tableNumber) {
      newValidationErrors.tableNumber = true
      hasErrors = true
    }

    if (orderType === "delivery") {
      if (!phoneNumber) {
        newValidationErrors.phoneNumber = true
        hasErrors = true
      }

      if (!address) {
        newValidationErrors.address = true
        hasErrors = true
      }
    }

    // Update validation errors state
    setValidationErrors(newValidationErrors)

    // If there are validation errors, show toast and return
    if (hasErrors) {
      toast({
        title: "To'ldirilmagan maydonlar",
        description: "Iltimos, barcha majburiy maydonlarni to'ldiring.",
        variant: "destructive",
      })
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
              title: "Yetarli porsiya yo'q",
              description: `Kechirasiz, ${item.name} taomidan faqat ${remainingServings} porsiya qolgan.`,
              variant: "destructive",
            })
            setIsSubmitting(false)
            return
          }
        }
      }

      // Prepare order data
      const orderData = {
        orderType,
        tableNumber: orderType === "table" ? tableNumber : null,
        phoneNumber: phoneNumber || null,
        address: orderType === "delivery" ? address : null,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        total: getTotalPrice(),
        status: "pending",
        createdAt: serverTimestamp(),
      }

      // Add order to Firestore
      const docRef = await addDoc(collection(db, "orders"), orderData)

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

      // Play success sound
      const audio = new Audio("/success.mp3")
      audio.play().catch((e) => console.error("Error playing sound:", e))

      toast({
        title: "Buyurtma qabul qilindi!",
        description: "Sizning buyurtmangiz muvaffaqiyatli qabul qilindi.",
      })

      // Store order ID in localStorage for "My Orders" page
      const myOrders = JSON.parse(localStorage.getItem("myOrders") || "[]")
      myOrders.push(docRef.id)
      localStorage.setItem("myOrders", JSON.stringify(myOrders))

      // Clear cart and redirect to confirmation page
      clearCart()
      router.push(`/confirmation?orderId=${docRef.id}`)
    } catch (error) {
      console.error("Error placing order:", error)
      toast({
        title: "Xatolik",
        description: "Buyurtmani joylashtirishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  }

  return (
    <div className="container mx-auto max-w-3xl p-4">
      <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.3 }}>
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Menyuga qaytish
        </Button>
      </motion.div>

      <motion.h1
        className="mb-6 text-2xl font-bold"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Sizning savatingiz
      </motion.h1>

      {items.length === 0 ? (
        <motion.div
          className="rounded-lg border border-dashed p-8 text-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">Sizning savatingiz bo'sh</p>
          <Button onClick={() => router.push("/")}>Menyuni ko'rish</Button>
        </motion.div>
      ) : (
        <>
          <motion.div className="mb-6 space-y-4" variants={containerVariants} initial="hidden" animate="visible">
            {items.map((item) => (
              <motion.div key={item.id} variants={itemVariants}>
                <CartItem item={item} />
              </motion.div>
            ))}
          </motion.div>

          <Separator className="my-6" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Tabs defaultValue="table" onValueChange={(value) => setOrderType(value as "table" | "delivery")}>
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="table">Stol buyurtmasi</TabsTrigger>
                <TabsTrigger value="delivery">Yetkazib berish</TabsTrigger>
              </TabsList>

              {/* Modify the TabsContent for table selection to add validation styling */}
              <TabsContent value="table" className="space-y-4">
                <div>
                  <Label htmlFor="table-number" className={validationErrors.tableNumber ? "text-destructive" : ""}>
                    Stol raqami
                    {validationErrors.tableNumber && <span className="ml-1 text-destructive">*</span>}
                  </Label>
                  <div className="mt-1">
                    <TableSelector
                      selectedTable={tableNumber}
                      onSelectTable={setTableNumber}
                      hasError={validationErrors.tableNumber}
                    />
                  </div>
                  {validationErrors.tableNumber && (
                    <p className="mt-1 text-xs text-destructive">Iltimos, stol raqamini tanlang</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone-number">Telefon raqami (ixtiyoriy)</Label>
                  <Input
                    id="phone-number"
                    type="tel"
                    placeholder="+998 XX XXX XX XX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </TabsContent>

              {/* Modify the TabsContent for delivery to add validation styling */}
              <TabsContent value="delivery" className="space-y-4">
                <div>
                  <Label
                    htmlFor="delivery-phone"
                    className={`required ${validationErrors.phoneNumber ? "text-destructive" : ""}`}
                  >
                    Telefon raqami
                    {validationErrors.phoneNumber && <span className="ml-1 text-destructive">*</span>}
                  </Label>
                  <Input
                    id="delivery-phone"
                    type="tel"
                    placeholder="+998 XX XXX XX XX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={`mt-1 ${validationErrors.phoneNumber ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    required
                  />
                  {validationErrors.phoneNumber && (
                    <p className="mt-1 text-xs text-destructive">Telefon raqami kiritilishi shart</p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="delivery-address"
                    className={`required ${validationErrors.address ? "text-destructive" : ""}`}
                  >
                    Yetkazib berish manzili
                    {validationErrors.address && <span className="ml-1 text-destructive">*</span>}
                  </Label>
                  <Textarea
                    id="delivery-address"
                    placeholder="To'liq manzilni kiriting"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`mt-1 ${validationErrors.address ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    required
                  />
                  {validationErrors.address && (
                    <p className="mt-1 text-xs text-destructive">Manzil kiritilishi shart</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>

          <motion.div
            className="mt-6 rounded-lg bg-amber-50 p-4 shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-amber-800">Jami</span>
              <span className="text-lg font-bold text-amber-900">{formatCurrency(getTotalPrice())}</span>
            </div>
            <Button
              className="w-full bg-amber-600 hover:bg-amber-700"
              size="lg"
              disabled={isSubmitting || items.length === 0}
              onClick={handlePlaceOrder}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buyurtma joylashtirilmoqda...
                </>
              ) : (
                "Buyurtma berish"
              )}
            </Button>
          </motion.div>
        </>
      )}
    </div>
  )
}
