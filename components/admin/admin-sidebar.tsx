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
  BarChart,
  ChefHat,
  User,
  UserPlus,
  Table,
  LogOut,
  MenuIcon,
  X,
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
}

const SidebarContext = createContext<SidebarContextType>({
  isMobileMenuOpen: false,
  toggleMobileMenu: () => {},
  userRole: null,
  userName: null,
})

export const useSidebar = () => useContext(SidebarContext)

export function AdminSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

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

  return (
    <SidebarContext.Provider
      value={{
        isMobileMenuOpen,
        toggleMobileMenu,
        userRole,
        userName,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

// Navigation link component with memoization
const NavLink = memo(
  ({
    href,
    isActive,
    icon: Icon,
    label,
    onClick,
  }: {
    href: string
    isActive: boolean
    icon: React.ElementType
    label: string
    onClick?: () => void
  }) => (
    <Link
      href={href}
      className={`mb-1 flex items-center rounded-md px-3 py-2 transition-colors ${
        isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
      onClick={onClick}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Link>
  ),
)
NavLink.displayName = "NavLink"

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
    title: "Stollar",
    href: "/admin/tables",
    icon: Table,
  },
  {
    title: "Sozlamalar",
    href: "/admin/settings",
    icon: Settings,
  },
  {
    title: "Buyurtmalar tarixi",
    href: "/admin/order-history",
    icon: History,
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
]

// Memoized sidebar component
export const AdminSidebar = memo(({ children }: { children: React.ReactNode }) => {
  const { isMobileMenuOpen, toggleMobileMenu, userRole, userName } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  const isActive = (path: string) => {
    return pathname === path
  }

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

  // Render different navigation links based on user role
  const renderNavLinks = (isMobile = false) => {
    const onClick = isMobile ? toggleMobileMenu : undefined

    // Admin sees all pages
    if (userRole === "admin") {
      return (
        <>
          <NavLink
            href="/admin/dashboard"
            isActive={isActive("/admin/dashboard")}
            icon={LayoutDashboard}
            label="Boshqaruv paneli"
            onClick={onClick}
          />
          <NavLink
            href="/admin/menu"
            isActive={isActive("/admin/menu")}
            icon={Utensils}
            label="Menyu boshqaruvi"
            onClick={onClick}
          />
          <NavLink
            href="/admin/tables"
            isActive={isActive("/admin/tables")}
            icon={Table}
            label="Stollar boshqaruvi"
            onClick={onClick}
          />
          <NavLink
            href="/admin/stats"
            isActive={isActive("/admin/stats")}
            icon={BarChart}
            label="Statistika"
            onClick={onClick}
          />
          <NavLink
            href="/admin/settings"
            isActive={isActive("/admin/settings")}
            icon={Settings}
            label="Sozlamalar"
            onClick={onClick}
          />
          <NavLink
            href="/admin/register-staff"
            isActive={isActive("/admin/register-staff")}
            icon={UserPlus}
            label="Xodimlarni boshqarish"
            onClick={onClick}
          />
          <NavLink
            href="/admin/chef"
            isActive={isActive("/admin/chef")}
            icon={ChefHat}
            label="Oshpaz paneli"
            onClick={onClick}
          />
          <NavLink
            href="/admin/waiter"
            isActive={isActive("/admin/waiter")}
            icon={User}
            label="Ofitsiant paneli"
            onClick={onClick}
          />
        </>
      )
    }

    // Chef/Oshpaz only sees chef page
    if (userRole === "chef" || userRole === "oshpaz") {
      return (
        <NavLink
          href="/admin/chef"
          isActive={isActive("/admin/chef")}
          icon={ChefHat}
          label="Oshpaz paneli"
          onClick={onClick}
        />
      )
    }

    // Waiter/Ofitsiant only sees waiter page
    if (userRole === "waiter" || userRole === "ofitsiant") {
      return (
        <NavLink
          href="/admin/waiter"
          isActive={isActive("/admin/waiter")}
          icon={User}
          label="Ofitsiant paneli"
          onClick={onClick}
        />
      )
    }

    return null
  }

  // If no user is logged in or role is not determined yet, don't show sidebar
  if (!userRole) {
    return <div className="min-h-screen">{children}</div>
  }

  // If user is chef or waiter, show a simplified header
  if (userRole === "chef" || userRole === "oshpaz" || userRole === "waiter" || userRole === "ofitsiant") {
    return (
      <div className="flex h-screen flex-col">
        <header className="fixed top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-6">
          <div className="font-semibold">
            {userRole === "chef" || userRole === "oshpaz"
              ? "Oshpaz Panel"
              : userRole === "waiter" || userRole === "ofitsiant"
                ? "Ofitsiant Panel"
                : "Restaurant Admin"}
          </div>
          <div className="flex items-center gap-4">
            {userName && <span className="text-sm text-muted-foreground">{userName}</span>}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Chiqish
            </Button>
          </div>
        </header>
        <div className="mt-16 flex-1 overflow-auto p-6">{children}</div>
      </div>
    )
  }

  // Admin gets full sidebar and header
  return (
    <div className="flex h-screen flex-col">
      {/* Header for admin */}
      <header className="fixed top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <X /> : <MenuIcon />}
          </Button>
          <div className="font-semibold">Admin Panel</div>
        </div>
        <div className="flex items-center gap-4">
          {userName && <span className="hidden text-sm text-muted-foreground md:inline-block">{userName}</span>}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Chiqish
          </Button>
        </div>
      </header>

      <div className="mt-16 flex flex-1">
        {/* Desktop sidebar for admin - FIXED */}
        <aside className="fixed top-16 bottom-0 left-0 z-20 hidden h-[calc(100vh-4rem)] w-64 overflow-y-auto border-r bg-white md:block">
          <div className="flex h-full flex-col justify-between p-4">
            {/* <nav className="flex flex-col">{renderNavLinks()}</nav> */}
            <div className="flex h-full w-56 flex-col  bg-white">

              <div className="flex-1 py-2">
                <nav className="grid items-start px-2 text-sm">
                  {adminRoutes.map((route, index) => (
                    <Link
                      key={index}
                      href={route.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground",
                        pathname === route.href && "bg-muted text-foreground",
                      )}
                    >
                      <route.icon className="h-4 w-4" />
                      <span>{route.title}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content area with left margin for sidebar */}
        <main className="w-full  p-6 md:ml-64">{children}</main>

        {/* Mobile sidebar for admin */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={toggleMobileMenu}>
            <div
              className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 overflow-y-auto bg-white p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-full flex-col justify-between">
                {/* <nav className="flex flex-col">{renderNavLinks(true)}</nav> */}
                <div className="flex h-full w-52 flex-col  bg-white">

                  <div className="flex-1  py-2">
                    <nav className="grid items-start px-2 text-sm">
                      {adminRoutes.map((route, index) => (
                        <Link
                          key={index}
                          href={route.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground",
                            pathname === route.href && "bg-muted text-foreground",
                          )}
                        >
                          <route.icon className="h-4 w-4" />
                          <span>{route.title}</span>
                        </Link>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
AdminSidebar.displayName = "AdminSidebar"
