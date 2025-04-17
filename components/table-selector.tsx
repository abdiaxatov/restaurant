"use client"

import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TableIcon, Home, Sofa, Armchair, User } from "lucide-react"

interface TableSelectorProps {
  selectedTable: number | null
  selectedRoom: number | null
  onSelectTable: (table: number | null, room: number | null, type: string | null, waiterId: string | null) => void
  hasError?: boolean
}

export function TableSelector({ selectedTable, selectedRoom, onSelectTable, hasError = false }: TableSelectorProps) {
  const [tables, setTables] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [divans, setDivans] = useState<any[]>([])
  const [kreslos, setKreslos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("tables")
  const [waiters, setWaiters] = useState<any[]>([])
  const [recentOrderInfo, setRecentOrderInfo] = useState<any>(null)

  const handleFirebaseError = (error: any, context: string) => {
    console.error(`Error ${context}:`, error)
    // Check if it's an offline error
    if (error.message && error.message.includes("offline")) {
      // Handle offline scenario gracefully
      return true // Return true to indicate it was an offline error
    }
    return false // Not an offline error
  }

  useEffect(() => {
    // Check for recent order info in localStorage
    try {
      const lastOrderInfoStr = localStorage.getItem("lastOrderInfo")
      if (lastOrderInfoStr) {
        const lastOrderInfo = JSON.parse(lastOrderInfoStr)
        const lastOrderTime = new Date(lastOrderInfo.timestamp)
        const currentTime = new Date()

        // Calculate the difference in minutes
        const diffInMinutes = (currentTime.getTime() - lastOrderTime.getTime()) / (1000 * 60)

        // If the last order was within 30 minutes, store the info
        if (diffInMinutes <= 30) {
          setRecentOrderInfo(lastOrderInfo)
        }
      }
    } catch (error) {
      console.error("Error checking last order info:", error)
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)

    // Fetch waiters
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
        if (!handleFirebaseError(error, "fetching waiters")) {
          console.error("Error fetching waiters:", error)
        }
      },
    )

    // Fetch all seating items without complex queries that require indexes
    const seatingItemsUnsubscribe = onSnapshot(
      collection(db, "seatingItems"),
      (snapshot) => {
        const tablesData: any[] = []
        const roomsData: any[] = []
        const divansData: any[] = []
        const kreslosData: any[] = []

        snapshot.forEach((doc) => {
          const item = { id: doc.id, ...doc.data() }

          // If this is a recent order item and it's occupied, still show it to the same user
          const isRecentOrderItem =
            recentOrderInfo &&
            ((item.type === "Stol" && item.number === recentOrderInfo.tableNumber) ||
              (item.type === "Xona" && item.number === recentOrderInfo.roomNumber))

          // Only show available items or the user's recent order item
          if (item.status === "available" || isRecentOrderItem) {
            switch (item.type?.toLowerCase()) {
              case "stol":
                tablesData.push(item)
                break
              case "xona":
                roomsData.push(item)
                break
              case "divan":
                divansData.push(item)
                break
              case "kreslo":
                kreslosData.push(item)
                break
            }
          }
        })

        // Sort by number
        tablesData.sort((a, b) => a.number - b.number)
        roomsData.sort((a, b) => a.number - b.number)
        divansData.sort((a, b) => a.number - b.number)
        kreslosData.sort((a, b) => a.number - b.number)

        setTables(tablesData)
        setRooms(roomsData)
        setDivans(divansData)
        setKreslos(kreslosData)
        setIsLoading(false)
      },
      (error) => {
        if (!handleFirebaseError(error, "fetching seating items")) {
          console.error("Error fetching seating items:", error)
        }
        setIsLoading(false)
      },
    )

    return () => {
      try {
        seatingItemsUnsubscribe()
        waitersUnsubscribe()
      } catch (error) {
        console.error("Error unsubscribing:", error)
      }
    }
  }, [recentOrderInfo])

  const getWaiterName = (waiterId: string | null | undefined) => {
    if (!waiterId) return null
    const waiter = waiters.find((w) => w.id === waiterId)
    return waiter ? waiter.name : null
  }

  const handleSelectItem = (number: number, type: string, waiterId: string | null) => {
    if (type.toLowerCase() === "xona") {
      onSelectTable(null, number, type, waiterId)
    } else {
      onSelectTable(number, null, type, waiterId)
    }
  }

  return (
    <div className={`rounded-md border ${hasError ? "border-destructive" : "border-input"} p-1`}>
      <Tabs defaultValue="tables" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tables" className="flex items-center gap-1">
            <TableIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Stollar</span>
          </TabsTrigger>
          <TabsTrigger value="rooms" className="flex items-center gap-1">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Xonalar</span>
          </TabsTrigger>
          <TabsTrigger value="divans" className="flex items-center gap-1">
            <Sofa className="h-4 w-4" />
            <span className="hidden sm:inline">Divanlar</span>
          </TabsTrigger>
          <TabsTrigger value="kreslos" className="flex items-center gap-1">
            <Armchair className="h-4 w-4" />
            <span className="hidden sm:inline">Kreslolar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="mt-2">
          {isLoading ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : tables.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">Bo'sh stollar mavjud emas</p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-4 gap-2 p-1 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                {tables.map((table) => {
                  const isSelected = selectedTable === table.number && !selectedRoom
                  const waiterName = getWaiterName(table.waiterId)
                  const isRecentOrderItem =
                    recentOrderInfo &&
                    table.number === recentOrderInfo.tableNumber &&
                    recentOrderInfo.seatingType === "Stol"

                  return (
                    <Button
                      key={table.id}
                      variant={isSelected ? "default" : "outline"}
                      className={`relative h-auto min-h-12 w-full flex-col items-center justify-center p-2 ${
                        isRecentOrderItem && table.status !== "available" ? "border-amber-500 bg-amber-50" : ""
                      }`}
                      onClick={() => handleSelectItem(table.number, "Stol", table.waiterId)}
                    >
                      <span className="text-base font-medium">{table.number}</span>
                      {table.seats && <span className="text-xs text-muted-foreground">{table.seats} kishi</span>}
                      {waiterName && (
                        <div className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">{waiterName}</span>
                        </div>
                      )}
                      {isRecentOrderItem && table.status !== "available" && (
                        <Badge className="absolute -right-1 -top-1 bg-amber-500">Sizning</Badge>
                      )}
                    </Button>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="rooms" className="mt-2">
          {isLoading ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">Bo'sh xonalar mavjud emas</p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-4 gap-2 p-1 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                {rooms.map((room) => {
                  const isSelected = selectedRoom === room.number && !selectedTable
                  const waiterName = getWaiterName(room.waiterId)
                  const isRecentOrderItem =
                    recentOrderInfo &&
                    room.number === recentOrderInfo.roomNumber &&
                    recentOrderInfo.seatingType === "Xona"

                  return (
                    <Button
                      key={room.id}
                      variant={isSelected ? "default" : "outline"}
                      className={`relative h-auto min-h-12 w-full flex-col items-center justify-center p-2 ${
                        isRecentOrderItem && room.status !== "available" ? "border-amber-500 bg-amber-50" : ""
                      }`}
                      onClick={() => handleSelectItem(room.number, "Xona", room.waiterId)}
                    >
                      <span className="text-base font-medium">{room.number}</span>
                      {room.seats && <span className="text-xs text-muted-foreground">{room.seats} kishi</span>}
                      {waiterName && (
                        <div className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">{waiterName}</span>
                        </div>
                      )}
                      {isRecentOrderItem && room.status !== "available" && (
                        <Badge className="absolute -right-1 -top-1 bg-amber-500">Sizning</Badge>
                      )}
                    </Button>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="divans" className="mt-2">
          {isLoading ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : divans.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">Bo'sh divanlar mavjud emas</p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-4 gap-2 p-1 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                {divans.map((divan) => {
                  const isSelected = selectedTable === divan.number && !selectedRoom
                  const waiterName = getWaiterName(divan.waiterId)
                  const isRecentOrderItem =
                    recentOrderInfo &&
                    divan.number === recentOrderInfo.tableNumber &&
                    recentOrderInfo.seatingType === "Divan"

                  return (
                    <Button
                      key={divan.id}
                      variant={isSelected ? "default" : "outline"}
                      className={`relative h-auto min-h-12 w-full flex-col items-center justify-center p-2 ${
                        isRecentOrderItem && divan.status !== "available" ? "border-amber-500 bg-amber-50" : ""
                      }`}
                      onClick={() => handleSelectItem(divan.number, "Divan", divan.waiterId)}
                    >
                      <span className="text-base font-medium">{divan.number}</span>
                      {divan.seats && <span className="text-xs text-muted-foreground">{divan.seats} kishi</span>}
                      {waiterName && (
                        <div className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">{waiterName}</span>
                        </div>
                      )}
                      {isRecentOrderItem && divan.status !== "available" && (
                        <Badge className="absolute -right-1 -top-1 bg-amber-500">Sizning</Badge>
                      )}
                    </Button>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="kreslos" className="mt-2">
          {isLoading ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : kreslos.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">Bo'sh kreslolar mavjud emas</p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-4 gap-2 p-1 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                {kreslos.map((kreslo) => {
                  const isSelected = selectedTable === kreslo.number && !selectedRoom
                  const waiterName = getWaiterName(kreslo.waiterId)
                  const isRecentOrderItem =
                    recentOrderInfo &&
                    kreslo.number === recentOrderInfo.tableNumber &&
                    recentOrderInfo.seatingType === "Kreslo"

                  return (
                    <Button
                      key={kreslo.id}
                      variant={isSelected ? "default" : "outline"}
                      className={`relative h-auto min-h-12 w-full flex-col items-center justify-center p-2 ${
                        isRecentOrderItem && kreslo.status !== "available" ? "border-amber-500 bg-amber-50" : ""
                      }`}
                      onClick={() => handleSelectItem(kreslo.number, "Kreslo", kreslo.waiterId)}
                    >
                      <span className="text-base font-medium">{kreslo.number}</span>
                      {kreslo.seats && <span className="text-xs text-muted-foreground">{kreslo.seats} kishi</span>}
                      {waiterName && (
                        <div className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">{waiterName}</span>
                        </div>
                      )}
                      {isRecentOrderItem && kreslo.status !== "available" && (
                        <Badge className="absolute -right-1 -top-1 bg-amber-500">Sizning</Badge>
                      )}
                    </Button>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
