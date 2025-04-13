"use client"

import type React from "react"

import { useState, useEffect, memo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import {
  LayoutDashboard,
  Utensils,
  ChefHat,
  User,
  UserPlus,
  Table,
  LogOut,
  Settings,
  BarChart3,
  History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "firebase/auth"
import { useToast } from "@/components/ui/use-toast"

// Create a context for sidebar state
import { createContext, useContext } from "react"
import { cn } from "@/lib/utils"

type SidebarContextType = {
  isMobileMenuOpen: boolean
  toggleMobileMenu: () => void
  userRole: string | null
  userName: string | null
  expanded: boolean
  toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarContextType>({
  isMobileMenuOpen: false,
  toggleMobileMenu: () => {},
  userRole: null,
  userName: null,
  expanded: true,
  toggleSidebar: () => {},
})

export const useSidebar = () => useContext(SidebarContext)

export function AdminSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserRole(userData.role)
            setUserName(userData.name || user.displayName)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      } else {
        setUserRole(null)
        setUserName(null)
      }
    })

    return () => unsubscribe()
  }, [])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const toggleSidebar = () => {
    setExpanded(!expanded)
  }

  return (
    <SidebarContext.Provider
      value={{
        isMobileMenuOpen,
        toggleMobileMenu,
        userRole,
        userName,
        expanded,
        toggleSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

const adminRoutes = [
  {
    title: "Boshqaruv paneli",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Menyu",
    href: "/admin/menu",
    icon: Utensils,
  },
  {
    title: "Stollar",
    href: "/admin/tables",
    icon: Table,
  },
  {
    title: "Statistika",
    href: "/admin/stats",
    icon: BarChart3,
  },
  {
    title: "Xodim qo'shish",
    href: "/admin/register-staff",
    icon: UserPlus,
  },
  {
    title: "Sozlamalar",
    href: "/admin/settings",
    icon: Settings,
  },
  {
    title: "Oshpaz",
    href: "/admin/chef",
    icon: ChefHat,
  },
  {
    title: "Ofitsiant",
    href: "/admin/waiter",
    icon: User,
  },
  {
    title: "Buyurtmalar tarixi",
    href: "/admin/order-history",
    icon: History,
  },
]

// Memoized sidebar component
export const AdminSidebar = memo(({ children }: { children: React.ReactNode }) => {
  const { isMobileMenuOpen, toggleMobileMenu, userRole, userName, expanded } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      toast({
        title: "Chiqish muvaffaqiyatli",
        description: "Siz tizimdan chiqib ketdingiz",
      })
      router.push("/admin/login")
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        title: "Xatolik yuz berdi",
        description: "Tizimdan chiqishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  // If no user is logged in or role is not determined yet, don't show sidebar
  if (!userRole) {
    return <div className="min-h-screen">{children}</div>
  }

  // If user is chef or waiter, show a simplified layout without sidebar
  if (userRole === "chef" || userRole === "oshpaz" || userRole === "waiter" || userRole === "ofitsiant") {
    return (
      <div className="flex-1 p-6">
        {children}
        <Button variant="outline" size="sm" className="fixed bottom-4 right-4 shadow-md" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Chiqish
        </Button>
      </div>
    )
  }

  // Admin gets full sidebar
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r bg-white shadow-sm transition-all duration-300 ease-in-out",
          expanded ? "w-64" : "w-20",
          "hidden md:block",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="grid gap-1 px-2">
              {adminRoutes.map((route, index) => (
                <Link
                  key={index}
                  href={route.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
                    pathname === route.href && "bg-muted text-foreground",
                    !expanded && "justify-center px-0",
                  )}
                  title={!expanded ? route.title : undefined}
                >
                  <route.icon className="h-5 w-5" />
                  {expanded && <span>{route.title}</span>}
                </Link>
              ))}
            </nav>
          </div>
          <div className="border-t p-4">
            <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {expanded && "Chiqish"}
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={toggleMobileMenu}>
          <aside
            className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 overflow-y-auto bg-white p-4 shadow-lg transition-transform duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="grid gap-1">
              {adminRoutes.map((route, index) => (
                <Link
                  key={index}
                  href={route.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
                    pathname === route.href && "bg-muted text-foreground",
                  )}
                  onClick={toggleMobileMenu}
                >
                  <route.icon className="h-5 w-5" />
                  <span>{route.title}</span>
                </Link>
              ))}
            </nav>
            <div className="mt-4 border-t pt-4">
              <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Chiqish
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className={cn("flex-1 p-6 transition-all pt-16 duration-300 ease-in-out", expanded ? "md:ml-64" : "md:ml-20")}>
        {children}
      </main>
    </>
  )
})
AdminSidebar.displayName = "AdminSidebar"
