"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"
import { SearchBar } from "@/components/search-bar"
import { CategoryFilter } from "@/components/category-filter"
import { MenuGrid } from "@/components/menu-grid"
import { CartButton } from "@/components/cart-button"
import { ViewMyOrdersButton } from "@/components/view-my-orders-button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { OrderHistory } from "@/components/order-history"
import type { MenuItem, Category } from "@/types"

export function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"menu" | "orders">("menu")
  const { toast } = useToast()

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        // Fetch categories
        const categoriesSnapshot = await getDocs(collection(db, "categories"))
        const categoriesData: Category[] = []
        categoriesSnapshot.forEach((doc) => {
          categoriesData.push({ id: doc.id, ...doc.data() } as Category)
        })
        setCategories(categoriesData)

        // Fetch menu items
        const menuItemsQuery = query(collection(db, "menuItems"), where("isAvailable", "==", true))
        const menuSnapshot = await getDocs(menuItemsQuery)
        const menuData: MenuItem[] = []
        menuSnapshot.forEach((doc) => {
          menuData.push({ id: doc.id, ...doc.data() } as MenuItem)
        })
        setMenuItems(menuData)
        setFilteredItems(menuData)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Xatolik",
          description: "Menyu elementlarini yuklashda xatolik yuz berdi.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    fetchMenuItems()
  }, [toast])

  useEffect(() => {
    // Filter items based on search query and selected category
    let filtered = menuItems

    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter((item) => item.categoryId === selectedCategory)
    }

    setFilteredItems(filtered)
  }, [searchQuery, selectedCategory, menuItems])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId)
  }

  // Fallback for when localStorage might not work properly
  const hasOrders =
    typeof localStorage !== "undefined" &&
    (() => {
      try {
        const orders = JSON.parse(localStorage.getItem("myOrders") || "[]")
        return orders.length > 0
      } catch {
        return false
      }
    })()

  return (
    <div className="flex min-h-screen flex-col pb-20">
      {/* Header with search and tabs */}
      <header className="sticky top-0 z-10 bg-white p-4 ">
        <div className="mb-4">
          <SearchBar onSearch={handleSearch} />
        </div>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "menu" | "orders")}>
          <TabsList className="w-full">
            <TabsTrigger value="menu" className="flex-1">
              Menyu
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1">
              Buyurtmalarim
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu">
            {isLoading ? <MenuLoadingSkeleton /> : <MenuGrid items={filteredItems} />}
          </TabsContent>

          <TabsContent value="orders">
            {isLoading ? <MenuLoadingSkeleton /> : <OrderHistory />}
          </TabsContent>
        </Tabs>
      </header>

      {/* Bottom category filter - only show in menu tab */}
      {activeTab === "menu" && (
        <>
          <div className="fixed bottom-0 left-0 right-0 z-10 bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
            <div className="overflow-x-auto pb-1">
              <CategoryFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={handleCategorySelect}
              />
            </div>
          </div>
          <div className="fixed bottom-16 pb-10 right-4 z-50">
            <CartButton />
          </div>
        </>
      )}

      {/* View my orders button */}
      {!hasOrders && <ViewMyOrdersButton />}
    </div>
  )
}

function MenuLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}