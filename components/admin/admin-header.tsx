"use client"

import { Menu, Bell, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "./admin-sidebar"
import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { cn } from "@/lib/utils"

export function AdminHeader() {
  const { toggleMobileMenu, userName, userRole, expanded, toggleSidebar } = useSidebar()
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    // If userName is already provided by context, use it
    if (userName) {
      setDisplayName(userName)
      return
    }

    // Otherwise fetch it directly
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setDisplayName(userData.name || user.displayName)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      }
    })

    return () => unsubscribe()
  }, [userName])

  // If user is chef or waiter, show a simplified header
  if (userRole === "chef" || userRole === "oshpaz" || userRole === "waiter" || userRole === "ofitsiant") {
    return (
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-white px-4 shadow-sm">
        <div className="flex items-center">
          <h1 className="ml-2 text-xl font-semibold md:ml-0">
            {userRole === "chef" || userRole === "oshpaz"
              ? "Oshpaz Panel"
              : userRole === "waiter" || userRole === "ofitsiant"
                ? "Ofitsiant Panel"
                : "Restaurant Admin"}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
          <div className="text-sm font-medium">{displayName ? `Salom, ${displayName}` : "Xush kelibsiz"}</div>
        </div>
      </header>
    )
  }

  // Admin gets full header with sidebar toggle
  return (
    <header className="fixed  top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-white px-4 shadow-sm">
      <div className="flex items-center gap-2">
        {/* Mobile menu toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMobileMenu}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        {/* Desktop sidebar toggle - new button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn("transition-all duration-300", expanded ? "rotate-0" : "rotate-180")}
          title={expanded ? "Yopish" : "Ochish"}
        >
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>

        <h1 className="text-xl font-semibold">Admin Panel</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm font-medium">{displayName ? `${displayName}` : "Xush kelibsiz"}</div>
      </div>
    </header>
  )
}
