"use client"

import { createContext, useContext } from "react"

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
