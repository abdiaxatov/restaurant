"use client"

import type React from "react"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen ">
      <div className="flex-1">{children}</div>
    </div>
  )
}
