"use client"

import { useState, useEffect } from "react"
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
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ArrowLeft, Loader2, ShoppingCart, Trash2, AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { MenuItem } from "@/types"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function CartPage() {
  const { items, getTotalPrice, clearCart } = useCart()
  const [orderType, setOrderType] = useState<"table" | "delivery">("table")
  const [tableNumber, setTableNumber] = useState<number | null>(null)
  const [roomNumber, setRoomNumber] = useState<number | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [address, setAddress] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasAvailableTables, setHasAvailableTables] = useState(true)
  const [hasAvailableRooms, setHasAvailableRooms] = useState(true)
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  // Add state for tracking validation errors
  const [validationErrors, setValidationErrors] = useState<{
    tableOrRoom?: boolean
    phoneNumber?: boolean
    address?: boolean
  }>({})

  // Check if there are available tables, rooms and if delivery is available
  useEffect(() => {
    setIsLoading(true)

    // Initialize empty unsubscribe functions
    let tablesUnsubscribe = () => {}
    let roomsUnsubscribe = () => {}
    let settingsUnsubscribe = () => {}

    try {
      // Check for available tables
      tablesUnsubscribe = onSnapshot(
        query(collection(db, "tables"), where("status", "==", "available")),
        (snapshot) => {
          setHasAvailableTables(!snapshot.empty)

          // If no tables are available, check if rooms are available
          if (snapshot.empty) {
            roomsUnsubscribe = onSnapshot(
              query(collection(db, "rooms"), where("status", "!=", "occupied")),
              (roomsSnapshot) => {
                setHasAvailableRooms(!roomsSnapshot.empty)

                // If no tables and no rooms are available, default to delivery
                if (roomsSnapshot.empty) {
                  setOrderType("delivery")
                }

                setIsLoading(false)
              },
              (error) => {
                console.error("Error checking available rooms:", error)
                setHasAvailableRooms(false)
                setOrderType("delivery")
                setIsLoading(false)
              },
            )
          } else {
            setIsLoading(false)
          }
        },
        (error) => {
          console.error("Error checking available tables:", error)
          setHasAvailableTables(false)
          setOrderType("delivery")
          setIsLoading(false)
        },
      )

      // Check if delivery is available from settings
      settingsUnsubscribe = onSnapshot(
        doc(db, "settings", "orderSettings"),
        (doc) => {
          if (doc.exists()) {
            const data = doc.data()
            setIsDeliveryAvailable(data.deliveryAvailable !== false)
          }
          setIsLoading(false)
        },
        (error) => {
          console.error("Error checking delivery availability:", error)
          setIsDeliveryAvailable(true)
          setIsLoading(false)
        },
      )
    } catch (error) {
      console.error("Error setting up listeners:", error)
      setIsLoading(false)
    }

    return () => {
      try {
        // Safely unsubscribe
        if (typeof tablesUnsubscribe === "function") {
          tablesUnsubscribe()
        }
        if (typeof roomsUnsubscribe === "function") {
          roomsUnsubscribe()
        }
        if (typeof settingsUnsubscribe === "function") {
          settingsUnsubscribe()
        }
      } catch (error) {
        console.error("Error unsubscribing:", error)
      }
    }
  }, [])

  // Handle table or room selection
  const handleSelectTableOrRoom = (table: number | null, room: number | null) => {
    setTableNumber(table)
    setRoomNumber(room)
  }

  // Modify the handlePlaceOrder function to add visual feedback for unfilled fields
  const handlePlaceOrder = async () => {
    // Reset validation errors
    setValidationErrors({})

    // Initialize a new validation errors object
    const newValidationErrors: {
      tableOrRoom?: boolean
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

    if (orderType === "table" && !tableNumber && !roomNumber) {
      newValidationErrors.tableOrRoom = true
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

    // Check if the selected order type is available
    if (orderType === "table" && !hasAvailableTables && !hasAvailableRooms) {
      toast({
        title: "Stollar va xonalar mavjud emas",
        description: "Hozirda bo'sh stollar va xonalar mavjud emas. Iltimos, yetkazib berish xizmatidan foydalaning.",
        variant: "destructive",
      })
      return
    }

    if (orderType === "delivery" && !isDeliveryAvailable) {
      toast({
        title: "Yetkazib berish mavjud emas",
        description: "Hozirda yetkazib berish xizmati mavjud emas. Iltimos, stol buyurtmasidan foydalaning.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Check if items have enough servings
      for (const item of items) {
        try {
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
        } catch (error) {
          console.error(`Error checking item ${item.id}:`, error)
          toast({
            title: "Xatolik",
            description: "Taom ma'lumotlarini tekshirishda xatolik yuz berdi.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
      }

      // If table is selected, mark it as occupied
      if (orderType === "table" && tableNumber) {
        const success = await markTableAsOccupied(tableNumber)
        if (!success) {
          toast({
            title: "Xatolik",
            description: "Stol statusini yangilashda xatolik yuz berdi.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
      }

      // If room is selected, mark it as occupied
      if (orderType === "table" && roomNumber) {
        const success = await markRoomAsOccupied(roomNumber)
        if (!success) {
          toast({
            title: "Xatolik",
            description: "Xona statusini yangilashda xatolik yuz berdi.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
      }

      // Prepare order data
      const orderData = {
        orderType,
        tableNumber: orderType === "table" && tableNumber ? tableNumber : null,
        roomNumber: orderType === "table" && roomNumber ? roomNumber : null,
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
        try {
          const menuItemRef = doc(db, "menuItems", item.id)
          const menuItemSnap = await getDoc(menuItemRef)

          if (menuItemSnap.exists()) {
            const menuItemData = menuItemSnap.data() as MenuItem
            const remainingServings = (menuItemData.remainingServings || menuItemData.servesCount) - item.quantity

            await updateDoc(menuItemRef, {
              remainingServings: remainingServings > 0 ? remainingServings : 0,
            })
          }
        } catch (error) {
          console.error(`Error updating item ${item.id}:`, error)
          // Continue with the order even if updating an item fails
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

  // Function to mark a table as occupied
  const markTableAsOccupied = async (tableNumber: number): Promise<boolean> => {
    try {
      // Find the table by number
      const tablesQuery = query(collection(db, "tables"), where("number", "==", tableNumber))
      const tablesSnapshot = await getDocs(tablesQuery)
      let tableId: string | null = null

      tablesSnapshot.forEach((doc) => {
        tableId = doc.id
      })

      if (tableId) {
        // Update table status to occupied
        await updateDoc(doc(db, "tables", tableId), {
          status: "occupied",
          updatedAt: new Date(),
        })
        return true
      } else {
        console.error("Table not found")
        return false
      }
    } catch (error) {
      console.error("Error updating table status:", error)
      return false
    }
  }

  // Function to mark a room as occupied
  const markRoomAsOccupied = async (roomNumber: number): Promise<boolean> => {
    try {
      // Find the room by number
      const roomsQuery = query(collection(db, "rooms"), where("number", "==", roomNumber))
      const roomsSnapshot = await getDocs(roomsQuery)
      let roomId: string | null = null

      roomsSnapshot.forEach((doc) => {
        roomId = doc.id
      })

      if (roomId) {
        // Update room status to occupied
        await updateDoc(doc(db, "rooms", roomId), {
          status: "occupied",
          updatedAt: new Date(),
        })
        return true
      } else {
        console.error("Room not found")
        return false
      }
    } catch (error) {
      console.error("Error updating room status:", error)
      return false
    }
  }

  return (
    <div className="container mx-auto max-w-4xl p-4">
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
        <div className="grid gap-6 md:grid-cols-5">
          <div className="md:col-span-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Buyurtma elementlari</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={clearCart}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Tozalash
                </Button>
              </CardHeader>
              <CardContent>
                <AnimatePresence>
                  <motion.div className="space-y-3" variants={containerVariants} initial="hidden" animate="visible">
                    {items.map((item) => (
                      <motion.div key={item.id} variants={itemVariants}>
                        <CartItem item={item} />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Buyurtma ma'lumotlari</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex h-40 items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Tabs
                      defaultValue={hasAvailableTables || hasAvailableRooms ? "table" : "delivery"}
                      value={orderType}
                      onValueChange={(value) => setOrderType(value as "table" | "delivery")}
                    >
                      <TabsList className="mb-4 grid w-full grid-cols-2">
                        <TabsTrigger
                          value="table"
                          disabled={!hasAvailableTables && !hasAvailableRooms && !isDeliveryAvailable}
                        >
                          Stol/Xona buyurtmasi
                        </TabsTrigger>
                        <TabsTrigger
                          value="delivery"
                          disabled={!isDeliveryAvailable && !hasAvailableTables && !hasAvailableRooms}
                        >
                          Yetkazib berish
                        </TabsTrigger>
                      </TabsList>

                      {/* Table selection tab content */}
                      <TabsContent value="table" className="space-y-4">
                        {!hasAvailableTables && !hasAvailableRooms ? (
                          <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Stollar va xonalar mavjud emas</AlertTitle>
                            <AlertDescription>
                              Hozirda bo'sh stollar va xonalar mavjud emas. Iltimos, yetkazib berish xizmatidan
                              foydalaning.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <>
                            <div>
                              <Label
                                htmlFor="table-number"
                                className={validationErrors.tableOrRoom ? "text-destructive" : ""}
                              >
                                Stol yoki xona
                                {validationErrors.tableOrRoom && <span className="ml-1 text-destructive">*</span>}
                              </Label>
                              <div className="mt-1">
                                <TableSelector
                                  selectedTable={tableNumber}
                                  selectedRoom={roomNumber}
                                  onSelectTable={handleSelectTableOrRoom}
                                  hasError={validationErrors.tableOrRoom}
                                />
                              </div>
                              {validationErrors.tableOrRoom && (
                                <p className="mt-1 text-xs text-destructive">Iltimos, stol yoki xona tanlang</p>
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
                          </>
                        )}
                      </TabsContent>

                      {/* Delivery tab content */}
                      <TabsContent value="delivery" className="space-y-4">
                        {!isDeliveryAvailable ? (
                          <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Yetkazib berish mavjud emas</AlertTitle>
                            <AlertDescription>
                              Hozirda yetkazib berish xizmati mavjud emas. Iltimos, stol buyurtmasidan foydalaning.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <>
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
                          </>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col">
                  <div className="mb-4 w-full rounded-lg bg-muted p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Jami elementlar:</span>
                      <span>{items.reduce((sum, item) => sum + item.quantity, 0)} ta</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between font-medium">
                      <span>Jami summa:</span>
                      <span className="text-lg text-primary">{formatCurrency(getTotalPrice())}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={
                      isSubmitting ||
                      items.length === 0 ||
                      (orderType === "table" && !hasAvailableTables && !hasAvailableRooms) ||
                      (orderType === "delivery" && !isDeliveryAvailable)
                    }
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
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  )
}
