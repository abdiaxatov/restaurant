import type React from "react"
import { AdminAuthProvider } from "@/components/admin/admin-auth-provider"
import { AdminSidebarProvider, AdminSidebar } from "@/components/admin/admin-sidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminSidebarProvider>
        <AdminSidebar>{children}</AdminSidebar>
      </AdminSidebarProvider>
    </AdminAuthProvider>
  )
}
