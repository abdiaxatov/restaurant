"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  useEffect(() => {
    console.log("AdminAuthProvider mounted, pathname:", pathname)

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed, user:", user?.uid)

      if (!user) {
        console.log("No user, redirecting to login")
        // Redirect to login if not authenticated
        if (pathname !== "/admin/login") {
          router.push("/admin/login")
        }
        setIsLoading(false)
        return
      }

      try {
        // Get user role from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid))
        console.log("User document exists:", userDoc.exists())

        if (userDoc.exists()) {
          const userData = userDoc.data()
          const role = userData.role
          console.log("User role:", role)
          setUserRole(role)

          // Redirect based on role
          if (pathname === "/admin/login") {
            console.log("On login page, redirecting based on role")
            if (role === "chef" || role === "oshpaz") {
              router.push("/admin/chef")
            } else if (role === "waiter" || role === "ofitsiant") {
              router.push("/admin/waiter")
            } else if (role === "admin") {
              router.push("/admin/dashboard")
            }
          } else if (pathname.includes("/admin/chef") && role !== "chef" && role !== "oshpaz" && role !== "admin") {
            console.log("Unauthorized access to chef page")
            toast({
              title: "Ruxsat yo'q",
              description: "Sizda oshpaz sahifasiga kirish huquqi yo'q",
              variant: "destructive",
            })
            router.push("/admin/login")
          } else if (
            pathname.includes("/admin/waiter") &&
            role !== "waiter" &&
            role !== "ofitsiant" &&
            role !== "admin"
          ) {
            console.log("Unauthorized access to waiter page")
            toast({
              title: "Ruxsat yo'q",
              description: "Sizda ofitsiant sahifasiga kirish huquqi yo'q",
              variant: "destructive",
            })
            router.push("/admin/login")
          } else if (
            !pathname.includes("/admin/chef") &&
            !pathname.includes("/admin/waiter") &&
            role !== "admin" &&
            pathname !== "/admin/login"
          ) {
            console.log("Non-admin trying to access admin page")
            // Non-admin users can't access other admin pages
            if (role === "chef" || role === "oshpaz") {
              router.push("/admin/chef")
            } else if (role === "waiter" || role === "ofitsiant") {
              router.push("/admin/waiter")
            }
          }
        } else {
          console.log("User document doesn't exist")
          // User document doesn't exist
          if (pathname !== "/admin/login") {
            router.push("/admin/login")
          }
        }
      } catch (error) {
        console.error("Error checking user role:", error)
        if (pathname !== "/admin/login") {
          router.push("/admin/login")
        }
      }

      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [router, pathname, toast])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
        <p>Yuklanmoqda...</p>
      </div>
    )
  }

  return <>{children}</>
}
