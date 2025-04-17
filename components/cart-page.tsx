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
  const [seatingType, setSeatingType] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [address, setAddress] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasAvailableSeatingItems, setHasAvailableSeatingItems] = useState(true)
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [deliveryFee, setDeliveryFee] = useState(15000)
  const [containerCost, setContainerCost] = useState(0)
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem>>({})
  const [seatingTypes, setSeatingTypes] = useState<string[]>([])
  const router = useRouter()
  const { toast } = useToast()
  // Add state for tracking validation errors
  const [validationErrors, setValidationErrors] = useState<{
    tableOrRoom?: boolean
    phoneNumber?: boolean
    address?: boolean
  }>({})
  const [waiterId, setWaiterId] = useState<string | null>(null)
  const [orderData, setOrderData] = useState<any>({})
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null)
  const [selectedTableType, setSelectedTableType] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState<string>("")
  const [customerPhone, setCustomerPhone] = useState<string>("")
  const [customerAddress, setCustomerAddress] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [notes, setNotes] = useState<string>("")

  // Check if there's a recent order and set the table/room automatically
  useEffect(() => {
    try {
      const lastOrderInfoStr = localStorage.getItem("lastOrderInfo")
      if (lastOrderInfoStr) {
        const lastOrderInfo = JSON.parse(lastOrderInfoStr)
        const lastOrderTime = new Date(lastOrderInfo.timestamp)
        const currentTime = new Date()

        // Calculate the difference in minutes
        const diffInMinutes = (currentTime.getTime() - lastOrderTime.getTime()) / (1000 * 60)

        // If the last order was within 20 minutes, automatically select that table/room
        if (diffInMinutes <= 20) {
          if (lastOrderInfo.tableNumber) {
            setTableNumber(lastOrderInfo.tableNumber)
            setSeatingType(lastOrderInfo.seatingType || "Stol")
            toast({
              title: "Joy avtomatik tanlandi",
              description: `Oxirgi buyurtmangiz asosida ${lastOrderInfo.tableNumber}-${lastOrderInfo.seatingType || "Stol"} avtomatik tanlandi.`,
            })
          } else if (lastOrderInfo.roomNumber) {
            setRoomNumber(lastOrderInfo.roomNumber)
            setSeatingType("Xona")
            toast({
              title: "Xona avtomatik tanlandi",
              description: `Oxirgi buyurtmangiz asosida ${lastOrderInfo.roomNumber}-Xona avtomatik tanlandi.`,
            })
          }
        }
      }
    } catch (error) {
      console.error("Error checking last order info:", error)
    }
  }, [toast])

  // Check if there are available seating items and if delivery is available
  useEffect(() => {
    setIsLoading(true)

    // Initialize empty unsubscribe functions
    let seatingItemsUnsubscribe = () => {}
    let settingsUnsubscribe = () => {}
    let menuItemsUnsubscribe = () => {}
    let seatingTypesUnsubscribe = () => {}

    try {
      // Fetch seating types
      seatingTypesUnsubscribe = onSnapshot(
        collection(db, "seatingTypes"),
        (snapshot) => {
          const types: string[] = []
          snapshot.forEach((doc) => {
            const typeData = doc.data()
            if (typeData.name) {
              types.push(typeData.name)
            }
          })
          setSeatingTypes(types)
        },
        (error) => {
          console.error("Error fetching seating types:", error)
        },
      )

      // Check for available seating items
      seatingItemsUnsubscribe = onSnapshot(
        query(collection(db, "seatingItems"), where("status", "==", "available")),
        (snapshot) => {
          setHasAvailableSeatingItems(!snapshot.empty)

          // If no available seating items, default to delivery if it's available
          if (snapshot.empty && isDeliveryAvailable) {
            setOrderType("delivery")
          }

          setIsLoading(false)
        },
        (error) => {
          console.error("Error checking available seating items:", error)
          setHasAvailableSeatingItems(false)
          if (isDeliveryAvailable) {
            setOrderType("delivery")
          }
          setIsLoading(false)
        },
      )

      // Check if delivery is available from settings and get delivery fee
      settingsUnsubscribe = onSnapshot(
        doc(db, "settings", "orderSettings"),
        (doc) => {
          if (doc.exists()) {
            const data = doc.data()
            setIsDeliveryAvailable(data.deliveryAvailable !== false)
            setDeliveryFee(data.deliveryFee || 15000)

            // If delivery is not available and there are no available seating items, show warning
            if (data.deliveryAvailable === false && !hasAvailableSeatingItems) {
              toast({
                title: "Buyurtma berish imkoni yo'q",
                description: "Hozirda na joylar, na yetkazib berish xizmati mavjud emas.",
                variant: "destructive",
              })
            }

            // If delivery is not available and current order type is delivery, switch to table
            if (data.deliveryAvailable === false && orderType === "delivery" && hasAvailableSeatingItems) {
              setOrderType("table")
            }
          }
          setIsLoading(false)
        },
        (error) => {
          console.error("Error checking delivery availability:", error)
          setIsDeliveryAvailable(true)
          setIsLoading(false)
        },
      )

      // Get all menu items to access their container prices
      menuItemsUnsubscribe = onSnapshot(
        collection(db, "menuItems"),
        (snapshot) => {
          const menuItemsData: Record<string, MenuItem> = {}
          snapshot.forEach((doc) => {
            menuItemsData[doc.id] = { id: doc.id, ...doc.data() } as MenuItem
          })
          setMenuItems(menuItemsData)
        },
        (error) => {
          console.error("Error fetching menu items:", error)
        },
      )
    } catch (error) {
      console.error("Error setting up listeners:", error)
      setIsLoading(false)
    }

    return () => {
      try {
        // Safely unsubscribe
        if (typeof seatingItemsUnsubscribe === "function") {
          seatingItemsUnsubscribe()
        }
        if (typeof settingsUnsubscribe === "function") {
          settingsUnsubscribe()
        }
        if (typeof menuItemsUnsubscribe === "function") {
          menuItemsUnsubscribe()
        }
        if (typeof seatingTypesUnsubscribe === "function") {
          seatingTypesUnsubscribe()
        }
      } catch (error) {
        console.error("Error unsubscribing:", error)
      }
    }
  }, [toast, orderType, hasAvailableSeatingItems, isDeliveryAvailable])

  // Calculate container costs based on items
  useEffect(() => {
    if (orderType === "delivery") {
      // Calculate container cost based on items that need containers
      let calculatedContainerCost = 0
      for (const item of items) {
        // Get the latest menu item data from Firestore
        const menuItem = menuItems[item.id]
        if (menuItem && menuItem.needsContainer) {
          calculatedContainerCost += item.quantity * (menuItem.containerPrice || 2000)
        }
      }
      setContainerCost(calculatedContainerCost)
    } else {
      setContainerCost(0)
    }
  }, [items, orderType, menuItems])

  // Handle table or room selection
  const handleSelectTableOrRoom = (
    table: number | null,
    room: number | null,
    type: string | null = null,
    waiterId: string | null = null,
  ) => {
    setTableNumber(table)
    setRoomNumber(room)
    setSeatingType(type)
    // Store the waiterId in state
    setWaiterId(waiterId)
    console.log("Selected waiterId:", waiterId) // Add this for debugging
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
    if (orderType === "table" && !hasAvailableSeatingItems) {
      toast({
        title: "Bo'sh joylar mavjud emas",
        description: "Hozirda bo'sh joylar mavjud emas. Iltimos, yetkazib berish xizmatidan foydalaning.",
        variant: "destructive",
      })
      return
    }

    if (orderType === "delivery" && !isDeliveryAvailable) {
      toast({
        title: "Yetkazib berish mavjud emas",
        description: "Hozirda yetkazib berish xizmati mavjud emas. Iltimos, joy buyurtmasidan foydalaning.",
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

      // If seating item is selected, mark it as occupied
      if (orderType === "table") {
        let success = false

        // Check if this is a recent order for the same table/room (within 30 minutes)
        const lastOrderInfoStr = localStorage.getItem("lastOrderInfo")
        let isRecentOrder = false

        if (lastOrderInfoStr) {
          const lastOrderInfo = JSON.parse(lastOrderInfoStr)
          const lastOrderTime = new Date(lastOrderInfo.timestamp)
          const currentTime = new Date()
          const diffInMinutes = (currentTime.getTime() - lastOrderTime.getTime()) / (1000 * 60)

          // If this is the same table/room as the recent order and within 30 minutes
          if (diffInMinutes <= 30) {
            if (
              (roomNumber && lastOrderInfo.roomNumber === roomNumber) ||
              (tableNumber && lastOrderInfo.tableNumber === tableNumber)
            ) {
              isRecentOrder = true
              success = true
            }
          }
        }

        // If it's not a recent order for the same table, mark it as occupied
        if (!isRecentOrder) {
          if (roomNumber) {
            // For rooms, always use "Xona" as the type
            success = await markSeatingItemAsOccupied(roomNumber, "Xona")
          } else if (tableNumber && seatingType) {
            success = await markSeatingItemAsOccupied(tableNumber, seatingType)
          }
        }

        if (!success) {
          toast({
            title: "Xatolik",
            description: "Joy statusini yangilashda xatolik yuz berdi.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
      }

      // Prepare order data with updated container information
      const subtotal = getTotalPrice()
      const totalWithDelivery = orderType === "delivery" ? subtotal + deliveryFee + containerCost : subtotal

      // Map items with their current container information from the database
      const orderItems = items.map((item) => {
        const menuItem = menuItems[item.id]
        return {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          needsContainer: menuItem?.needsContainer || false,
          containerPrice: menuItem?.containerPrice || 0,
        }
      })

      const orderData = {
        orderType,
        tableNumber: orderType === "table" && tableNumber ? tableNumber : null,
        roomNumber: orderType === "table" && roomNumber ? roomNumber : null,
        seatingType: orderType === "table" ? seatingType : null,
        phoneNumber: phoneNumber || null,
        address: orderType === "delivery" ? address : null,
        items: orderItems,
        subtotal: subtotal,
        deliveryFee: orderType === "delivery" ? deliveryFee : 0,
        containerCost: orderType === "delivery" ? containerCost : 0,
        total: totalWithDelivery,
        status: "pending",
        createdAt: serverTimestamp(),
        // Include waiterId if available
        ...(waiterId ? { waiterId } : {}),
      }

      // Also add a debug log to check the final order data
      console.log("Order data being submitted:", orderData)

      // Add code to get the waiterId from the seating item and include it in the order
      if (orderType === "table") {
        try {
          let seatingItemQuery
          if (roomNumber) {
            // For rooms
            seatingItemQuery = query(
              collection(db, "seatingItems"),
              where("number", "==", roomNumber),
              where("type", "==", "Xona"),
            )
          } else if (tableNumber && seatingType) {
            // For tables and other seating types
            seatingItemQuery = query(
              collection(db, "seatingItems"),
              where("number", "==", tableNumber),
              where("type", "==", seatingType),
            )
          }

          if (seatingItemQuery) {
            const seatingItemSnapshot = await getDocs(seatingItemQuery)
            if (!seatingItemSnapshot.empty) {
              const seatingItemData = seatingItemSnapshot.docs[0].data()
              if (seatingItemData.waiterId) {
                orderData.waiterId = seatingItemData.waiterId
              }
            }
          }
        } catch (error) {
          console.error("Error getting waiter ID from seating item:", error)
        }
      }

      if (waiterId) {
        orderData.waiterId = waiterId
      }

      // Add order to Firestore
      const docRef = await addDoc(collection(db, "orders"), orderData)

      // Oxirgi tanlangan joy ma'lumotlarini saqlash
      if (orderType === "table") {
        const lastOrderInfo = {
          tableNumber: tableNumber,
          roomNumber: roomNumber,
          seatingType: seatingType,
          timestamp: new Date().toISOString(),
        }
        localStorage.setItem("lastOrderInfo", JSON.stringify(lastOrderInfo))
      }

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

  // Function to mark a seating item as occupied
  const markSeatingItemAsOccupied = async (itemNumber: number, itemType: string): Promise<boolean> => {
    try {
      // Make the query case-insensitive by using a more flexible approach
      const seatingItemsQuery = query(
        collection(db, "seatingItems"),
        where("number", "==", itemNumber),
        where("status", "==", "available"),
      )

      const seatingItemsSnapshot = await getDocs(seatingItemsQuery)
      let seatingItemId: string | null = null

      // Find the item with matching type (case-insensitive)
      seatingItemsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.type && data.type.toLowerCase() === itemType.toLowerCase()) {
          seatingItemId = doc.id
        }
      })

      if (seatingItemId) {
        // Update seating item status to occupied
        await updateDoc(doc(db, "seatingItems", seatingItemId), {
          status: "occupied",
          updatedAt: new Date(),
        })
        return true
      } else {
        // Check if we're in a recent order window (30 minutes)
        const lastOrderInfoStr = localStorage.getItem("lastOrderInfo")
        if (lastOrderInfoStr) {
          const lastOrderInfo = JSON.parse(lastOrderInfoStr)
          const lastOrderTime = new Date(lastOrderInfo.timestamp)
          const currentTime = new Date()
          const diffInMinutes = (currentTime.getTime() - lastOrderTime.getTime()) / (1000 * 60)

          // If this is the same table/room as the recent order and within 30 minutes
          if (
            diffInMinutes <= 30 &&
            ((itemType.toLowerCase() === "stol" && lastOrderInfo.tableNumber === itemNumber) ||
              (itemType.toLowerCase() === "xona" && lastOrderInfo.roomNumber === itemNumber))
          ) {
            // Allow the order to proceed even if the item appears occupied
            return true
          }
        }

        console.error(`${itemType} #${itemNumber} not found or not available`)
        toast({
          title: "Xatolik",
          description: `Tanlangan ${itemType.toLowerCase()} topilmadi yoki band`,
          variant: "destructive",
        })
        return false
      }
    } catch (error: any) {
      console.error("Error updating seating item status:", error)

      // If it's an offline error, allow the order to proceed
      if (error.message && error.message.includes("offline")) {
        toast({
          title: "Offline rejim",
          description: "Siz offline rejimidasiz. Buyurtma saqlandi va internet ulanishi tiklanganida yuboriladi.",
        })
        return true
      }

      return false
    }
  }

  // Check if any ordering option is available
  const isOrderingAvailable = hasAvailableSeatingItems || isDeliveryAvailable

  const calculateTotal = () => {
    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0)
    return subtotal + (orderType === "delivery" ? deliveryFee : 0)
  }

  const handleTableSelect = (tableNumber: number, tableType: string) => {
    setSelectedTable(tableNumber)
    setSelectedTableType(tableType)
    setSelectedRoom(null)
  }

  const handleRoomSelect = (roomNumber: number) => {
    setSelectedRoom(roomNumber)
    setSelectedTable(null)
    setSelectedTableType(null)
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

      {!isOrderingAvailable && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Buyurtma berish imkoni yo'q</AlertTitle>
          <AlertDescription>
            Hozirda na joylar, na yetkazib berish xizmati mavjud emas. Iltimos, keyinroq qayta urinib ko'ring.
          </AlertDescription>
        </Alert>
      )}

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
                  onClick={() => {
                    // Play delete sound
                    const audio = new Audio("/click.mp3")
                    audio.play().catch((e) => console.error("Error playing sound:", e))
                    clearCart()
                  }}
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
                      defaultValue={hasAvailableSeatingItems ? "table" : "delivery"}
                      value={orderType}
                      onValueChange={(value) => setOrderType(value as "table" | "delivery")}
                    >
                      <TabsList className="mb-4 grid w-full grid-cols-2">
                        <TabsTrigger value="table" disabled={!hasAvailableSeatingItems}>
                          Joy buyurtmasi
                        </TabsTrigger>
                        <TabsTrigger value="delivery" disabled={!isDeliveryAvailable}>
                          Yetkazib berish
                        </TabsTrigger>
                      </TabsList>

                      {/* Table selection tab content */}
                      <TabsContent value="table" className="space-y-4">
                        {!hasAvailableSeatingItems ? (
                          <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Bo'sh joylar mavjud emas</AlertTitle>
                            <AlertDescription>
                              Hozirda bo'sh joylar mavjud emas. Iltimos, yetkazib berish xizmatidan foydalaning.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <>
                            <div>
                              <Label
                                htmlFor="table-number"
                                className={validationErrors.tableOrRoom ? "text-destructive" : ""}
                              >
                                Joy tanlash
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
                                <p className="mt-1 text-xs text-destructive">Iltimos, joy tanlang</p>
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
                              Hozirda yetkazib berish xizmati mavjud emas. Iltimos, joy buyurtmasidan foydalaning.
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

                    {orderType === "delivery" && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span>Taomlar narxi:</span>
                          <span>{formatCurrency(getTotalPrice())}</span>
                        </div>
                        {containerCost > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span>Idishlar narxi:</span>
                            <span>{formatCurrency(containerCost)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span>Yetkazib berish narxi:</span>
                          <span>{formatCurrency(deliveryFee)}</span>
                        </div>
                        <Separator className="my-2" />
                      </>
                    )}

                    <div className="flex items-center justify-between font-medium">
                      <span>Jami summa:</span>
                      <span className="text-lg text-primary">
                        {formatCurrency(
                          orderType === "delivery" ? getTotalPrice() + deliveryFee + containerCost : getTotalPrice(),
                        )}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={
                      isSubmitting ||
                      items.length === 0 ||
                      (orderType === "table" && !hasAvailableSeatingItems) ||
                      (orderType === "delivery" && !isDeliveryAvailable) ||
                      !isOrderingAvailable
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
