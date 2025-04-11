"use client"

import { Menu, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "./admin-sidebar"
import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

export function AdminHeader() {
  const { toggleMobileMenu, userName } = useSidebar()
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

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-4">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMobileMenu}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <h1 className="ml-2 text-xl font-semibold md:ml-0">Admin Panel</h1>
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
