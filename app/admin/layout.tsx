"use client"

import type React from "react"
import { AdminAuthProvider } from "@/components/admin/admin-auth-provider"
import { AdminSidebarProvider, AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { usePathname } from "next/navigation"

// Client component to conditionally render the sidebar
function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/admin/login"

  // Don't wrap login page with sidebar
  if (isLoginPage) {
    return <>{children}</>
  }

  // Wrap all other admin pages with sidebar and header
  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <div className="flex flex-1">
        <AdminSidebar>{children}</AdminSidebar>
      </div>
    </div>
  )
}

// Server component that provides the auth context
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminSidebarProvider>
        <AdminLayoutClient>{children}</AdminLayoutClient>
      </AdminSidebarProvider>
    </AdminAuthProvider>
  )
}
