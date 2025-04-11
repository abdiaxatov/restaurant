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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          // Redirect to login if not authenticated and not already on login page
          if (pathname !== "/admin/login") {
            router.push("/admin/login")
          }
          setIsLoading(false)
          return
        }

        // Get user role from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid))

        if (userDoc.exists()) {
          const userData = userDoc.data()
          const role = userData.role
          setUserRole(role)

          // Redirect based on role and current path
          if (pathname === "/admin/login") {
            if (role === "chef" || role === "oshpaz") {
              router.push("/admin/chef")
            } else if (role === "waiter" || role === "ofitsiant") {
              router.push("/admin/waiter")
            } else {
              router.push("/admin/dashboard")
            }
          } else if (pathname.includes("/admin/chef") && role !== "chef" && role !== "oshpaz" && role !== "admin") {
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
            // Non-admin users can't access other admin pages
            if (role === "chef" || role === "oshpaz") {
              router.push("/admin/chef")
            } else if (role === "waiter" || role === "ofitsiant") {
              router.push("/admin/waiter")
            }
          }
        } else {
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
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router, pathname, toast])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
        <p>Yuklanmoqda...</p>
      </div>
    )
  }

  return <>{children}</>
}
