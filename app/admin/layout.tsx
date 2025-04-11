"use client"

import type React from "react"
import { AdminAuthProvider } from "@/components/admin/admin-auth-provider"
import { AdminSidebarProvider, AdminSidebar } from "@/components/admin/admin-sidebar"
import { usePathname } from "next/navigation"

// Client component to conditionally render the sidebar
function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/admin/login"

  // Don't wrap login page with sidebar
  if (isLoginPage) {
    return <>{children}</>
  }

  // Wrap all other admin pages with sidebar
  return <AdminSidebar>{children}</AdminSidebar>
}

// Server component that provides the auth context
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminSidebarProvider>
        {/* @ts-expect-error Server Component */}
        <AdminLayoutClient>{children}</AdminLayoutClient>
      </AdminSidebarProvider>
    </AdminAuthProvider>
  )
}
