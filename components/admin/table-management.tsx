"use client"

import { useState, useEffect, useMemo } from "react"
import {
  collection,
  doc,
  deleteDoc,
  writeBatch,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import {
  Pencil,
  Trash2,
  Plus,
  Loader2,
  LayoutGrid,
  Home,
  RefreshCw,
  Search,
  Filter,
  Download,
  TableIcon,
  Sofa,
  Armchair,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"

// Define types for seating items
type SeatingItem = {
  id: string
  number: number
  seats: number
  status: "available" | "occupied" | "reserved"
  roomId?: string | null
  createdAt?: any
  updatedAt?: any
  waiterId?: string | null
  type: string // Type of seating (Stol, Xona, Divan, Kreslo, etc.)
}

// Define type for seating type configuration
type SeatingType = {
  id: string
  name: string
  defaultCapacity: number
  count: number
  icon?: string
}

type Order = {
  id: string
  orderType: "table" | "delivery"
  tableNumber?: number | null
  roomNumber?: number | null
  status: string
  createdAt: any
  items: any[]
  total: number
  seatingType?: string
}

export function TableManagement() {
  const [seatingItems, setSeatingItems] = useState<SeatingItem[]>([])
  const [seatingTypes, setSeatingTypes] = useState<SeatingType[]>([])
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("table-view")
  const [activeTypeTab, setActiveTypeTab] = useState<string | null>(null)

  // Seating item state
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [isEditingItem, setIsEditingItem] = useState(false)
  const [selectedItem, setSelectedItem] = useState<SeatingItem | null>(null)
  const [newItemNumber, setNewItemNumber] = useState<number>(0)
  const [newItemSeats, setNewItemSeats] = useState<number>(4)
  const [newItemType, setNewItemType] = useState<string>("Stol")
  const [newItemStatus, setNewItemStatus] = useState<"available" | "occupied" | "reserved">("available")
  const [showOccupiedItems, setShowOccupiedItems] = useState(true)
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string | null>(null)

  // Batch item creation
  const [isBatchAddingItems, setIsBatchAddingItems] = useState(false)
  const [batchItemCount, setBatchItemCount] = useState<number>(10)
  const [batchItemStartNumber, setBatchItemStartNumber] = useState<number>(1)
  const [batchItemSeats, setBatchItemSeats] = useState<number>(4)
  const [batchItemType, setBatchItemType] = useState<string>("Stol")

  // Seating type management
  const [isAddingType, setIsAddingType] = useState(false)
  const [isEditingType, setIsEditingType] = useState(false)
  const [selectedType, setSelectedType] = useState<SeatingType | null>(null)
  const [newTypeName, setNewTypeName] = useState<string>("")
  const [newTypeCapacity, setNewTypeCapacity] = useState<number>(4)
  const [newTypeCount, setNewTypeCount] = useState<number>(0)

  // Search and filter
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [capacityFilter, setCapacityFilter] = useState<number | null>(null)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)

  // Add a new state for waiters list
  const [waiters, setWaiters] = useState<any[]>([])
  const [newItemWaiterId, setNewItemWaiterId] = useState<string | null>(null)
  const [batchItemWaiterId, setBatchItemWaiterId] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ", {
      style: "currency",
      currency: "UZS",
    }).format(amount)
  }

  // Fetch seating items, types, and active orders
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Seating items listener
        const itemsUnsubscribe = onSnapshot(
          collection(db, "seatingItems"),
          (snapshot) => {
            const itemsData: SeatingItem[] = []
            snapshot.forEach((doc) => {
              itemsData.push({ id: doc.id, ...doc.data() } as SeatingItem)
            })

            // Sort items by type and number
            itemsData.sort((a, b) => {
              if (a.type !== b.type) {
                return a.type.localeCompare(b.type)
              }
              return a.number - b.number
            })

            setSeatingItems(itemsData)

            // Set next item number suggestion
            if (itemsData.length > 0) {
              const maxItemNumber = Math.max(...itemsData.map((t) => t.number))
              setNewItemNumber(maxItemNumber + 1)
              setBatchItemStartNumber(maxItemNumber + 1)
            }
          },
          (error) => {
            console.error("Error fetching seating items:", error)
            toast({
              title: "Xatolik",
              description: "Joy elementlarini yuklashda xatolik yuz berdi",
              variant: "destructive",
            })
          },
        )

        // Seating types listener
        const typesUnsubscribe = onSnapshot(
          collection(db, "seatingTypes"),
          (snapshot) => {
            const typesData: SeatingType[] = []
            snapshot.forEach((doc) => {
              typesData.push({ id: doc.id, ...doc.data() } as SeatingType)
            })

            // Sort types alphabetically
            typesData.sort((a, b) => a.name.localeCompare(b.name))
            setSeatingTypes(typesData)

            // Set default item type if not set
            if (typesData.length > 0 && !newItemType) {
              setNewItemType(typesData[0].name)
              setBatchItemType(typesData[0].name)
            }

            // Set active type tab if not set
            if (!activeTypeTab && typesData.length > 0) {
              setActiveTypeTab(typesData[0].name)
            }

            // If no types exist, create default types
            if (typesData.length === 0) {
              createDefaultSeatingTypes()
            }

            setIsLoading(false)
          },
          (error) => {
            console.error("Error fetching seating types:", error)
            toast({
              title: "Xatolik",
              description: "Joy turlarini yuklashda xatolik yuz berdi",
              variant: "destructive",
            })
            setIsLoading(false)
          },
        )

        // Inside the fetchData function, after the typesUnsubscribe setup
        const waitersUnsubscribe = onSnapshot(
          query(collection(db, "users"), where("role", "==", "waiter")),
          (snapshot) => {
            const waitersData: any[] = []
            snapshot.forEach((doc) => {
              waitersData.push({ id: doc.id, ...doc.data() })
            })
            setWaiters(waitersData)
          },
          (error) => {
            console.error("Error fetching waiters:", error)
          },
        )

        // Active orders listener (pending, preparing, ready)
        const ordersUnsubscribe = onSnapshot(
          query(collection(db, "orders"), where("status", "in", ["pending", "preparing", "ready"])),
          (snapshot) => {
            const ordersData: Order[] = []
            snapshot.forEach((doc) => {
              ordersData.push({ id: doc.id, ...doc.data() } as Order)
            })
            setActiveOrders(ordersData)
          },
          (error) => {
            console.error("Error fetching active orders:", error)
          },
        )

        return () => {
          itemsUnsubscribe()
          typesUnsubscribe()
          // Add this to the return cleanup function
          if (typeof waitersUnsubscribe === "function") {
            waitersUnsubscribe()
          }
          ordersUnsubscribe()
        }
      } catch (error) {
        console.error("Error setting up listeners:", error)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast, activeTypeTab, newItemType])

  // Create default seating types if none exist
  const createDefaultSeatingTypes = async () => {
    try {
      // First check if there are any existing types to avoid duplication
      const typesSnapshot = await getDocs(collection(db, "seatingTypes"))
      if (!typesSnapshot.empty) {
        console.log("Seating types already exist, skipping default creation")
        return
      }

      const batch = writeBatch(db)

      const defaultTypes = [
        { name: "Stol", defaultCapacity: 1, count: 0 },
        { name: "Xona", defaultCapacity: 1, count: 0 },
        { name: "Divan", defaultCapacity: 1, count: 0 },
        { name: "Kreslo", defaultCapacity: 1, count: 0 },
      ]

      for (const type of defaultTypes) {
        const typeRef = doc(collection(db, "seatingTypes"))
        batch.set(typeRef, {
          ...type,
          createdAt: new Date(),
        })
      }

      await batch.commit()

      toast({
        title: "Standart turlar yaratildi",
        description: "Standart joy turlari muvaffaqiyatli yaratildi",
      })
    } catch (error) {
      console.error("Error creating default seating types:", error)
      toast({
        title: "Xatolik",
        description: "Standart joy turlarini yaratishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  // Filter seating items based on selected filters
  const filteredItems = useMemo(() => {
    return seatingItems.filter((item) => {
      const statusMatch = showOccupiedItems ? true : item.status === "available"
      const typeMatch = !selectedTypeFilter || selectedTypeFilter === "all" ? true : item.type === selectedTypeFilter
      const searchMatch = !searchTerm
        ? true
        : item.number.toString().includes(searchTerm) || item.type.toLowerCase().includes(searchTerm.toLowerCase())
      const capacityMatch = !capacityFilter ? true : item.seats >= capacityFilter
      const statusFilterMatch = !statusFilter ? true : item.status === statusFilter

      return statusMatch && typeMatch && searchMatch && capacityMatch && statusFilterMatch
    })
  }, [seatingItems, showOccupiedItems, selectedTypeFilter, searchTerm, capacityFilter, statusFilter])

  // Group items by type for statistics
  const itemsByType = useMemo(() => {
    const result: Record<string, { total: number; available: number; occupied: number; reserved: number }> = {}

    seatingItems.forEach((item) => {
      if (!result[item.type]) {
        result[item.type] = { total: 0, available: 0, occupied: 0, reserved: 0 }
      }

      result[item.type].total++

      if (item.status === "available") {
        result[item.type].available++
      } else if (item.status === "occupied") {
        result[item.type].occupied++
      } else if (item.status === "reserved") {
        result[item.type].reserved++
      }
    })

    return result
  }, [seatingItems])

  // Update seating type counts based on actual items
  useEffect(() => {
    const updateTypeCounts = async () => {
      try {
        // Skip if types or items aren't loaded yet
        if (isLoading || seatingTypes.length === 0) return

        const batch = writeBatch(db)
        let updatesNeeded = false

        // Calculate actual counts for each type
        const actualCounts: Record<string, number> = {}
        seatingItems.forEach((item) => {
          if (!actualCounts[item.type]) {
            actualCounts[item.type] = 0
          }
          actualCounts[item.type]++
        })

        // Update types where count doesn’t match
        for (const type of seatingTypes) {
          const actualCount = actualCounts[type.name] || 0
          if (type.count !== actualCount) {
            updatesNeeded = true
            const typeRef = doc(db, "seatingTypes", type.id)
            batch.update(typeRef, {
              count: actualCount,
              updatedAt: new Date(),
            })
          }
        }

        // Only commit if there are updates needed
        if (updatesNeeded) {
          await batch.commit()
          console.log("Updated seating type counts to match actual items")
        }
      } catch (error) {
        console.error("Error updating type counts:", error)
      }
    }

    updateTypeCounts()
  }, [seatingItems, seatingTypes, isLoading])

  // Check if an item has an active order
  const hasActiveOrder = (itemNumber: number, type: string) => {
    if (type.toLowerCase() === "xona") {
      return activeOrders.some((order) => order.roomNumber === itemNumber)
    } else {
      return activeOrders.some((order) => order.tableNumber === itemNumber && order.seatingType === type)
    }
  }

  // Get active orders for an item
  const getActiveOrdersForItem = (itemNumber: number, type: string) => {
    if (type.toLowerCase() === "xona") {
      return activeOrders.filter((order) => order.roomNumber === itemNumber)
    } else {
      return activeOrders.filter((order) => order.tableNumber === itemNumber && order.seatingType === type)
    }
  }

  // Add a single seating item
  const handleAddItem = async () => {
    setIsSubmitting(true)

    try {
      // Get the default capacity from the selected type
      const selectedTypeData = seatingTypes.find((t) => t.name === newItemType)
      const defaultCapacity = selectedTypeData ? selectedTypeData.defaultCapacity : 4

      // Check if an item with this number and type already exists
      const existingItemsQuery = query(
        collection(db, "seatingItems"),
        where("number", "==", newItemNumber),
        where("type", "==", newItemType),
      )

      const existingItemsSnapshot = await getDocs(existingItemsQuery)

      if (!existingItemsSnapshot.empty) {
        toast({
          title: "Xatolik",
          description: `${newItemType} #${newItemNumber} allaqachon mavjud. Boshqa raqam tanlang.`,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const itemData = {
        number: newItemNumber,
        seats: newItemSeats || defaultCapacity,
        status: newItemStatus,
        type: newItemType,
        waiterId: newItemWaiterId === "none" ? null : newItemWaiterId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await addDoc(collection(db, "seatingItems"), itemData)

      // Update the count for this type
      if (selectedTypeData) {
        await updateDoc(doc(db, "seatingTypes", selectedTypeData.id), {
          count: (selectedTypeData.count || 0) + 1,
          updatedAt: new Date(),
        })
      }

      setIsAddingItem(false)
      setNewItemNumber((prev) => prev + 1)
      setNewItemSeats(defaultCapacity)
      setNewItemStatus("available")
      setNewItemWaiterId(null)

      toast({
        title: "Muvaffaqiyatli",
        description: `${newItemType} #${newItemNumber} muvaffaqiyatli qo'shildi`,
      })
    } catch (error) {
      console.error("Error adding seating item:", error)
      toast({
        title: "Xatolik",
        description: "Joy elementini qo'shishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add multiple seating items at once
  const handleBatchAddItems = async () => {
    setIsSubmitting(true)

    try {
      // Check if any items with these numbers and type already exist
      const startNumber = batchItemStartNumber
      const endNumber = batchItemStartNumber + batchItemCount - 1

      // Get existing items in the range
      const existingItemsQuery = query(
        collection(db, "seatingItems"),
        where("type", "==", batchItemType),
        where("number", ">=", startNumber),
        where("number", "<=", endNumber),
      )

      const existingItemsSnapshot = await getDocs(existingItemsQuery)

      if (!existingItemsSnapshot.empty) {
        const existingNumbers = existingItemsSnapshot.docs.map((doc) => doc.data().number)
        toast({
          title: "Xatolik",
          description: `Ba'zi raqamlar allaqachon mavjud: ${existingNumbers.join(", ")}. Boshqa boshlang'ich raqam tanlang.`,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const batch = writeBatch(db)

      // Get the default capacity from the selected type
      const selectedTypeData = seatingTypes.find((t) => t.name === batchItemType)
      const defaultCapacity = selectedTypeData ? selectedTypeData.defaultCapacity : 4

      for (let i = 0; i < batchItemCount; i++) {
        const itemData = {
          number: batchItemStartNumber + i,
          seats: batchItemSeats || defaultCapacity,
          status: "available",
          type: batchItemType,
          waiterId: batchItemWaiterId === "none" ? null : batchItemWaiterId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const newItemRef = doc(collection(db, "seatingItems"))
        batch.set(newItemRef, itemData)
      }

      await batch.commit()

      // Update the count for this type
      if (selectedTypeData) {
        await updateDoc(doc(db, "seatingTypes", selectedTypeData.id), {
          count: (selectedTypeData.count || 0) + batchItemCount,
          updatedAt: new Date(),
        })
      }

      setIsBatchAddingItems(false)
      setBatchItemStartNumber((prev) => prev + batchItemCount)
      setBatchItemWaiterId(null)

      toast({
        title: "Muvaffaqiyatli",
        description: `${batchItemCount} ta ${batchItemType} muvaffaqiyatli qo'shildi`,
      })
    } catch (error) {
      console.error("Error batch adding seating items:", error)
      toast({
        title: "Xatolik",
        description: "Joy elementlarini qo'shishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Edit a seating item
  const handleUpdateItem = async () => {
    if (!selectedItem) return
    setIsSubmitting(true)

    try {
      // Check if type has changed
      const oldType = selectedItem.type
      const newType = newItemType
      const typeChanged = oldType !== newType

      const itemData = {
        number: newItemNumber,
        seats: newItemSeats,
        status: newItemStatus,
        type: newItemType,
        waiterId: newItemWaiterId === "none" ? null : newItemWaiterId,
        updatedAt: new Date(),
      }

      await updateDoc(doc(db, "seatingItems", selectedItem.id), itemData)

      // If type has changed, update counts for both old and new types
      if (typeChanged) {
        const batch = writeBatch(db)

        // Decrease count for old type
        const oldTypeData = seatingTypes.find((t) => t.name === oldType)
        if (oldTypeData && oldTypeData.count > 0) {
          const oldTypeRef = doc(db, "seatingTypes", oldTypeData.id)
          batch.update(oldTypeRef, {
            count: oldTypeData.count - 1,
            updatedAt: new Date(),
          })
        }

        // Increase count for new type
        const newTypeData = seatingTypes.find((t) => t.name === newType)
        if (newTypeData) {
          const newTypeRef = doc(db, "seatingTypes", newTypeData.id)
          batch.update(newTypeRef, {
            count: (newTypeData.count || 0) + 1,
            updatedAt: new Date(),
          })
        }

        await batch.commit()
      }

      setIsEditingItem(false)
      setSelectedItem(null)

      toast({
        title: "Muvaffaqiyatli",
        description: `${newItemType} muvaffaqiyatli tahrirlandi`,
      })
    } catch (error) {
      console.error("Error editing seating item:", error)
      toast({
        title: "Xatolik",
        description: "Joy elementini tahrirlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete a seating item
  const handleDeleteItem = async (itemId: string, type: string) => {
    try {
      await deleteDoc(doc(db, "seatingItems", itemId))

      // Update the count for this type
      const selectedTypeData = seatingTypes.find((t) => t.name === type)
      if (selectedTypeData && selectedTypeData.count > 0) {
        await updateDoc(doc(db, "seatingTypes", selectedTypeData.id), {
          count: selectedTypeData.count - 1,
          updatedAt: new Date(),
        })
      }

      toast({
        title: "Muvaffaqiyatli",
        description: `${type} muvaffaqiyatli o'chirildi`,
      })
    } catch (error) {
      console.error("Error deleting seating item:", error)
      toast({
        title: "Xatolik",
        description: "Joy elementini o'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  // Toggle item status
  const handleToggleItemStatus = async (item: SeatingItem) => {
    try {
      const newStatus = item.status === "available" ? "occupied" : "available"

      await updateDoc(doc(db, "seatingItems", item.id), {
        status: newStatus,
        updatedAt: new Date(),
      })

      toast({
        title: "Status yangilandi",
        description: `${item.type} statusi ${newStatus === "available" ? "bo'sh" : "band"} qilindi`,
      })
    } catch (error) {
      console.error("Error toggling item status:", error)
      toast({
        title: "Xatolik",
        description: "Joy elementi statusini yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  // Add a seating type
  const handleAddType = async () => {
    setIsSubmitting(true)

    try {
      // Check if type with this name already exists
      const existingType = seatingTypes.find((t) => t.name.toLowerCase() === newTypeName.toLowerCase())
      if (existingType) {
        toast({
          title: "Xatolik",
          description: `"${newTypeName}" nomli joy turi allaqachon mavjud`,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const typeData = {
        name: newTypeName,
        defaultCapacity: newTypeCapacity,
        count: 0,
        createdAt: new Date(),
      }

      await addDoc(collection(db, "seatingTypes"), typeData)

      setIsAddingType(false)
      setNewTypeName("")
      setNewTypeCapacity(4)

      toast({
        title: "Muvaffaqiyatli",
        description: "Joy turi muvaffaqiyatli qo'shildi",
      })
    } catch (error) {
      console.error("Error adding seating type:", error)
      toast({
        title: "Xatolik",
        description: "Joy turini qo'shishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Edit a seating type
  const handleEditType = async () => {
    if (!selectedType) return
    setIsSubmitting(true)

    try {
      // Check if another type with this name already exists
      const existingType = seatingTypes.find(
        (t) => t.name.toLowerCase() === newTypeName.toLowerCase() && t.id !== selectedType.id,
      )

      if (existingType) {
        toast({
          title: "Xatolik",
          description: `"${newTypeName}" nomli joy turi allaqachon mavjud`,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const typeData = {
        name: newTypeName,
        defaultCapacity: newTypeCapacity,
        updatedAt: new Date(),
      }

      await updateDoc(doc(db, "seatingTypes", selectedType.id), typeData)

      // Update all items of this type with the new name
      const itemsToUpdate = seatingItems.filter((item) => item.type === selectedType.name)

      if (itemsToUpdate.length > 0) {
        const batch = writeBatch(db)

        itemsToUpdate.forEach((item) => {
          const itemRef = doc(db, "seatingItems", item.id)
          batch.update(itemRef, { type: newTypeName })
        })

        await batch.commit()
      }

      setIsEditingType(false)
      setSelectedType(null)

      toast({
        title: "Muvaffaqiyatli",
        description: "Joy turi muvaffaqiyatli tahrirlandi",
      })
    } catch (error) {
      console.error("Error editing seating type:", error)
      toast({
        title: "Xatolik",
        description: "Joy turini tahrirlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete a seating type
  const handleDeleteType = async (typeId: string, typeName: string) => {
    try {
      // Check if there are items of this type
      const itemsOfType = seatingItems.filter((item) => item.type === typeName)

      if (itemsOfType.length > 0) {
        toast({
          title: "Xatolik",
          description: `Bu turda ${itemsOfType.length} ta element mavjud. Avval elementlarni o'chiring yoki boshqa turga o'tkazing.`,
          variant: "destructive",
        })
        return
      }

      await deleteDoc(doc(db, "seatingTypes", typeId))

      toast({
        title: "Muvaffaqiyatli",
        description: "Joy turi muvaffaqiyatli o'chirildi",
      })
    } catch (error) {
      console.error("Error deleting seating type:", error)
      toast({
        title: "Xatolik",
        description: "Joy turini o'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  // Reset all items to available
  const handleResetAllItems = async () => {
    setIsSubmitting(true)

    try {
      const batch = writeBatch(db)

      seatingItems.forEach((item) => {
        if (item.status !== "available") {
          const itemRef = doc(db, "seatingItems", item.id)
          batch.update(itemRef, {
            status: "available",
            updatedAt: new Date(),
          })
        }
      })

      await batch.commit()

      toast({
        title: "Muvaffaqiyatli",
        description: "Barcha joy elementlari bo'sh holatga o'tkazildi",
      })
    } catch (error) {
      console.error("Error resetting items:", error)
      toast({
        title: "Xatolik",
        description: "Joy elementlarini qayta o'rnatishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format date for order display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat("uz-UZ", {
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).format(date)
  }

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Kutilmoqda"
      case "preparing":
        return "Tayyorlanmoqda"
      case "ready":
        return "Tayyor"
      default:
        return status
    }
  }

  // Add a function to get waiter name by ID
  const getWaiterName = (waiterId: string | null | undefined) => {
    if (!waiterId) return "Belgilanmagan"
    const waiter = waiters.find((w) => w.id === waiterId)
    return waiter ? waiter.name : "Belgilanmagan"
  }

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredItems.map((item) => item.id))
    }
    setSelectAll(!selectAll)
  }

  // Handle individual item selection
  const handleSelectItem = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter((id) => id !== itemId))
    } else {
      setSelectedItems([...selectedItems, itemId])
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return

    try {
      const batch = writeBatch(db)

      // Group items by type to update type counts
      const typeCountsToUpdate: Record<string, number> = {}

      selectedItems.forEach((itemId) => {
        const item = seatingItems.find((i) => i.id === itemId)
        if (item) {
          // Add to type counts
          if (!typeCountsToUpdate[item.type]) {
            typeCountsToUpdate[item.type] = 0
          }
          typeCountsToUpdate[item.type]++

          // Delete the item
          const itemRef = doc(db, "seatingItems", itemId)
          batch.delete(itemRef)
        }
      })

      // Update type counts
      for (const [typeName, count] of Object.entries(typeCountsToUpdate)) {
        const typeDoc = seatingTypes.find((t) => t.name === typeName)
        if (typeDoc && typeDoc.count >= count) {
          const typeRef = doc(db, "seatingTypes", typeDoc.id)
          batch.update(typeRef, {
            count: typeDoc.count - count,
            updatedAt: new Date(),
          })
        }
      }

      await batch.commit()

      toast({
        title: "Muvaffaqiyatli",
        description: `${selectedItems.length} ta element muvaffaqiyatli o'chirildi`,
      })

      setSelectedItems([])
      setSelectAll(false)
    } catch (error) {
      console.error("Error bulk deleting items:", error)
      toast({
        title: "Xatolik",
        description: "Elementlarni o'chirishda xatolik yuz berdi",
      })
    }
  }

  // Export data to CSV
  const handleExportData = () => {
    try {
      // Create CSV content
      let csvContent = "Type,Number,Seats,Status,Waiter\n"

      filteredItems.forEach((item) => {
        csvContent += `${item.type},${item.number},${item.seats},${item.status},${getWaiterName(item.waiterId)}\n`
      })

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `seating-items-${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Muvaffaqiyatli",
        description: "Ma'lumotlar CSV formatida yuklab olindi",
      })
    } catch (error) {
      console.error("Error exporting data:", error)
      toast({
        title: "Xatolik",
        description: "Ma'lumotlarni eksport qilishda xatolik yuz berdi",
      })
    }
  }

  // Get icon for seating type
  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "stol":
        return <TableIcon className="h-4 w-4" />
      case "xona":
        return <Home className="h-4 w-4" />
      case "divan":
        return <Sofa className="h-4 w-4" />
      case "kreslo":
        return <Armchair className="h-4 w-4" />
      default:
        return <LayoutGrid className="h-4 w-4" />
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter(null)
    setCapacityFilter(null)
    setSelectedTypeFilter(null)
  }

  // Fix the table editing issue in the admin/tables page
  // Find the handleEditItem function and update it

  // Update the handleEditItem function to correctly set the initial values
  const handleEditItem = (item: SeatingItem) => {
    // Set the form values with the current item data
    setSelectedItem(item)
    setNewItemNumber(item.number)
    setNewItemSeats(item.seats)
    setNewItemStatus(item.status)
    setNewItemType(item.type)
    setNewItemWaiterId(item.waiterId || null)
    setIsEditingItem(true)
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Joy elementlari boshqaruvi</h1>

        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Qayta o'rnatish
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Barcha joy elementlarini qayta o'rnatish</AlertDialogTitle>
                <AlertDialogDescription>
                  Bu amal barcha joy elementlarini bo'sh holatga o'tkazadi. Bu amalni qaytarib bo'lmaydi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetAllItems}>Qayta o'rnatish</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="table-view" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            Jadval ko'rinishi
          </TabsTrigger>
          <TabsTrigger value="types" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Joy turlari
          </TabsTrigger>
        </TabsList>

        {/* Table View Tab */}

        <TabsContent value="table-view">
          <div className="mb-6 space-y-4">
            {/* Search and filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select
                value={statusFilter || "all"}
                onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha statuslar</SelectItem>
                  <SelectItem value="available">Bo'sh</SelectItem>
                  <SelectItem value="occupied">Band</SelectItem>
                  <SelectItem value="reserved">Rezerv qilingan</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={capacityFilter ? capacityFilter.toString() : "all"}
                onValueChange={(value) => setCapacityFilter(value === "all" ? null : Number.parseInt(value))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sig'imi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha sig'imlar</SelectItem>
                  <SelectItem value="1">1+ kishi</SelectItem>
                  <SelectItem value="2">2+ kishi</SelectItem>
                  <SelectItem value="4">4+ kishi</SelectItem>
                  <SelectItem value="6">6+ kishi</SelectItem>
                  <SelectItem value="10">10+ kishi</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" size="icon" onClick={clearFilters} title="Filtrlarni tozalash">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Actions toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2">
                  <Switch id="show-occupied" checked={showOccupiedItems} onCheckedChange={setShowOccupiedItems} />
                  <Label htmlFor="show-occupied">Band joylarni ko'rsatish</Label>
                </div>

                {selectedItems.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="ml-4">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {selectedItems.length} ta elementni o'chirish
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Amallar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ma'lumotlar</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handleExportData}>
                      <Download className="mr-2 h-4 w-4" />
                      CSV formatida yuklab olish
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Boshqarish</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setIsAddingItem(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Yangi element qo'shish
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsBatchAddingItems(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Ko'p elementlar qo'shish
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={() => setIsAddingItem(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Element qo'shish
                </Button>
              </div>
            </div>

            {/* Statistics cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(itemsByType).map(([type, stats]) => (
                <Card key={type}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{type}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="mt-1 flex items-center text-xs text-muted-foreground">
                      <span className="text-green-500 mr-1">{stats.available} bo'sh</span> •
                      <span className="text-red-500 mx-1">{stats.occupied} band</span> •
                      <span className="text-amber-500 ml-1">{stats.reserved} rezerv</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue={seatingTypes.length > 0 ? seatingTypes[0].name.toLowerCase() : "all"}>
              <TabsList className="mb-4">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Barcha turlar
                </TabsTrigger>
                {seatingTypes.map((type) => (
                  <TabsTrigger key={type.id} value={type.name.toLowerCase()} className="flex items-center gap-2">
                    {getTypeIcon(type.name)}
                    {type.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="all">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectAll}
                            onCheckedChange={handleSelectAll}
                            aria-label="Barchasini tanlash"
                          />
                        </TableHead>
                        <TableHead>Turi</TableHead>
                        <TableHead>Raqami</TableHead>
                        <TableHead>Sig'imi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ofitsiant</TableHead>
                        <TableHead className="text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            Elementlar topilmadi
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedItems.includes(item.id)}
                                onCheckedChange={() => handleSelectItem(item.id)}
                                aria-label={`${item.type} #${item.number} tanlash`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {getTypeIcon(item.type)}
                                {item.type}
                              </div>
                            </TableCell>
                            <TableCell>{item.number}</TableCell>
                            <TableCell>{item.seats} kishi</TableCell>
                            <TableCell>
                              <Badge
                                className={`${
                                  item.status === "available"
                                    ? "bg-green-100 text-green-800"
                                    : item.status === "occupied"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {item.status === "available"
                                  ? "Bo'sh"
                                  : item.status === "occupied"
                                    ? "Band"
                                    : "Rezerv qilingan"}
                              </Badge>
                              {hasActiveOrder(item.number, item.type) && (
                                <Badge className="ml-2 bg-blue-100 text-blue-800">Faol buyurtma</Badge>
                              )}
                            </TableCell>
                            <TableCell>{getWaiterName(item.waiterId)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    handleEditItem(item)
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleToggleItemStatus(item)}>
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteItem(item.id, item.type)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {seatingTypes.map((type) => {
                const typeItems = filteredItems.filter((item) => item.type === type.name)
                return (
                  <TabsContent key={type.id} value={type.name.toLowerCase()}>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">
                              <Checkbox
                                checked={
                                  typeItems.length > 0 && typeItems.every((item) => selectedItems.includes(item.id))
                                }
                                onCheckedChange={() => {
                                  const allSelected = typeItems.every((item) => selectedItems.includes(item.id))
                                  if (allSelected) {
                                    setSelectedItems(
                                      selectedItems.filter((id) => !typeItems.some((item) => item.id === id)),
                                    )
                                  } else {
                                    setSelectedItems([...selectedItems, ...typeItems.map((item) => item.id)])
                                  }
                                }}
                                aria-label={`Barcha ${type.name}larni tanlash`}
                              />
                            </TableHead>
                            <TableHead>Raqami</TableHead>
                            <TableHead>Sig'imi</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ofitsiant</TableHead>
                            <TableHead className="text-right">Amallar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {typeItems.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="h-24 text-center">
                                {type.name} elementlari topilmadi
                              </TableCell>
                            </TableRow>
                          ) : (
                            typeItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedItems.includes(item.id)}
                                    onCheckedChange={() => handleSelectItem(item.id)}
                                    aria-label={`${item.type} #${item.number} tanlash`}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{item.number}</TableCell>
                                <TableCell>{item.seats} kishi</TableCell>
                                <TableCell>
                                  <Badge
                                    className={`${
                                      item.status === "available"
                                        ? "bg-green-100 text-green-800"
                                        : item.status === "occupied"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {item.status === "available"
                                      ? "Bo'sh"
                                      : item.status === "occupied"
                                        ? "Band"
                                        : "Rezerv qilingan"}
                                  </Badge>
                                  {hasActiveOrder(item.number, item.type) && (
                                    <Badge className="ml-2 bg-blue-100 text-blue-800">Faol buyurtma</Badge>
                                  )}
                                </TableCell>
                                <TableCell>{getWaiterName(item.waiterId)}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        handleEditItem(item)
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleToggleItemStatus(item)}>
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteItem(item.id, item.type)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                )
              })}
            </Tabs>
          )}
        </TabsContent>

        {/* Seating Types Tab */}
        <TabsContent value="types">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Joy turlari</h2>
            <Button onClick={() => setIsAddingType(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Yangi tur qo'shish
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {seatingTypes.length === 0 ? (
              <div className="col-span-full rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">Joy turlari topilmadi</p>
              </div>
            ) : (
              seatingTypes.map((type) => (
                <Card key={type.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(type.name)}
                        {type.name}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedType(type)
                            setNewTypeName(type.name)
                            setNewTypeCapacity(type.defaultCapacity)
                            setIsEditingType(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteType(type.id, type.name)}
                          disabled={type.count > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {type.count} ta element • {type.defaultCapacity} kishilik
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-md bg-green-50 p-2 text-center">
                        <div className="font-medium text-green-700">{itemsByType[type.name]?.available || 0}</div>
                        <div className="text-xs text-green-600">Bo'sh</div>
                      </div>
                      <div className="rounded-md bg-red-50 p-2 text-center">
                        <div className="font-medium text-red-700">{itemsByType[type.name]?.occupied || 0}</div>
                        <div className="text-xs text-red-600">Band</div>
                      </div>
                      <div className="rounded-md bg-amber-50 p-2 text-center">
                        <div className="font-medium text-amber-700">{itemsByType[type.name]?.reserved || 0}</div>
                        <div className="text-xs text-amber-600">Rezerv</div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setNewItemType(type.name)
                        setNewItemSeats(type.defaultCapacity)
                        setIsAddingItem(true)
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {type.name} qo'shish
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>

          {/* Add Type Dialog */}
          <Dialog open={isAddingType} onOpenChange={setIsAddingType}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yangi joy turi qo'shish</DialogTitle>
                <DialogDescription>Joy turi ma'lumotlarini kiriting</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="typeName">Tur nomi</Label>
                  <Input
                    id="typeName"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="Masalan: Stol, Xona, Divan, Kreslo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typeCapacity">Standart sig'imi (kishi)</Label>
                  <Input
                    id="typeCapacity"
                    type="number"
                    value={newTypeCapacity}
                    onChange={(e) => setNewTypeCapacity(Number.parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingType(false)} disabled={isSubmitting}>
                  Bekor qilish
                </Button>
                <Button onClick={handleAddType} disabled={isSubmitting || !newTypeName.trim()}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Qo'shilmoqda...
                    </>
                  ) : (
                    "Qo'shish"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Type Dialog */}
          <Dialog open={isEditingType} onOpenChange={setIsEditingType}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Joy turini tahrirlash</DialogTitle>
                <DialogDescription>Joy turi ma'lumotlarini o'zgartiring</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editTypeName">Tur nomi</Label>
                  <Input id="editTypeName" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editTypeCapacity">Standart sig'imi (kishi)</Label>
                  <Input
                    id="editTypeCapacity"
                    type="number"
                    value={newTypeCapacity}
                    onChange={(e) => setNewTypeCapacity(Number.parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditingType(false)} disabled={isSubmitting}>
                  Bekor qilish
                </Button>
                <Button onClick={handleEditType} disabled={isSubmitting || !newTypeName.trim()}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saqlanmoqda...
                    </>
                  ) : (
                    "Saqlash"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {/* Add Item Dialog */}
      <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi joy elementi qo'shish</DialogTitle>
            <DialogDescription>Joy elementi ma'lumotlarini kiriting</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="itemType">Turi</Label>
                <Select value={newItemType} onValueChange={setNewItemType}>
                  <SelectTrigger id="itemType">
                    <SelectValue placeholder="Turni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {seatingTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemNumber">Raqami</Label>
                <Input
                  id="itemNumber"
                  type="number"
                  value={newItemNumber}
                  onChange={(e) => setNewItemNumber(Number.parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="itemSeats">Sig'imi (kishi)</Label>
                <Input
                  id="itemSeats"
                  type="number"
                  value={newItemSeats}
                  onChange={(e) => setNewItemSeats(Number.parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemStatus">Status</Label>
                <Select
                  value={newItemStatus}
                  onValueChange={(value) => setNewItemStatus(value as "available" | "occupied" | "reserved")}
                >
                  <SelectTrigger id="itemStatus">
                    <SelectValue placeholder="Status tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Bo'sh</SelectItem>
                    <SelectItem value="occupied">Band</SelectItem>
                    <SelectItem value="reserved">Rezerv qilingan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemWaiter">Ofitsiant</Label>
              <Select value={newItemWaiterId || "none"} onValueChange={setNewItemWaiterId}>
                <SelectTrigger id="itemWaiter">
                  <SelectValue placeholder="Ofitsiantni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belgilanmagan</SelectItem>
                  {waiters.map((waiter) => (
                    <SelectItem key={waiter.id} value={waiter.id}>
                      {waiter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingItem(false)} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button onClick={handleAddItem} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Qo'shilmoqda...
                </>
              ) : (
                "Qo'shish"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Add Items Dialog */}
      <Dialog open={isBatchAddingItems} onOpenChange={setIsBatchAddingItems}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ko'p joy elementlari qo'shish</DialogTitle>
            <DialogDescription>Bir vaqtda bir nechta joy elementi qo'shish</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batchItemType">Turi</Label>
                <Select value={batchItemType} onValueChange={setBatchItemType}>
                  <SelectTrigger id="batchItemType">
                    <SelectValue placeholder="Turni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {seatingTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="batchStartNumber">Boshlang'ich raqam</Label>
                <Input
                  id="batchStartNumber"
                  type="number"
                  value={batchItemStartNumber}
                  onChange={(e) => setBatchItemStartNumber(Number.parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batchCount">Elementlar soni</Label>
                <Input
                  id="batchCount"
                  type="number"
                  value={batchItemCount}
                  onChange={(e) => setBatchItemCount(Number.parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batchSeats">Sig'imi (kishi)</Label>
                <Input
                  id="batchSeats"
                  type="number"
                  value={batchItemSeats}
                  onChange={(e) => setBatchItemSeats(Number.parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchWaiter">Ofitsiant</Label>
              <Select value={batchItemWaiterId || "none"} onValueChange={setBatchItemWaiterId}>
                <SelectTrigger id="batchWaiter">
                  <SelectValue placeholder="Ofitsiantni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belgilanmagan</SelectItem>
                  {waiters.map((waiter) => (
                    <SelectItem key={waiter.id} value={waiter.id}>
                      {waiter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchAddingItems(false)} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button onClick={handleBatchAddItems} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Qo'shilmoqda...
                </>
              ) : (
                "Qo'shish"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditingItem} onOpenChange={setIsEditingItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Joy elementini tahrirlash</DialogTitle>
            <DialogDescription>Joy elementi ma'lumotlarini o'zgartiring</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editItemType">Turi</Label>
                <Select value={newItemType} onValueChange={setNewItemType}>
                  <SelectTrigger id="editItemType">
                    <SelectValue placeholder="Turni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {seatingTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editItemNumber">Raqami</Label>
                <Input
                  id="editItemNumber"
                  type="number"
                  value={newItemNumber}
                  onChange={(e) => setNewItemNumber(Number.parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editItemSeats">Sig'imi (kishi)</Label>
                <Input
                  id="editItemSeats"
                  type="number"
                  value={newItemSeats}
                  onChange={(e) => setNewItemSeats(Number.parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editItemStatus">Status</Label>
                <Select
                  value={newItemStatus}
                  onValueChange={(value) => setNewItemStatus(value as "available" | "occupied" | "reserved")}
                >
                  <SelectTrigger id="editItemStatus">
                    <SelectValue placeholder="Status tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Bo'sh</SelectItem>
                    <SelectItem value="occupied">Band</SelectItem>
                    <SelectItem value="reserved">Rezerv qilingan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editItemWaiter">Ofitsiant</Label>
              <Select value={newItemWaiterId || "none"} onValueChange={setNewItemWaiterId}>
                <SelectTrigger id="editItemWaiter">
                  <SelectValue placeholder="Ofitsiantni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belgilanmagan</SelectItem>
                  {waiters.map((waiter) => (
                    <SelectItem key={waiter.id} value={waiter.id}>
                      {waiter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingItem(false)} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button onClick={handleUpdateItem} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                "Saqlash"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
