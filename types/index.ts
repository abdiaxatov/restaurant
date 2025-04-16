export interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  category: string
  imageUrl?: string
  servesCount?: number
  remainingServings?: number
  needsContainer?: boolean
  containerPrice?: number
}

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
}

export interface Category {
  id: string
  name: string
  description?: string
  imageUrl?: string
}

// Update the Table interface to include waiterId
export interface Table {
  id: string
  number: number
  seats: number
  status: "available" | "occupied" | "reserved"
  roomId?: string
  waiterId?: string
}

// Update the Room interface to include waiterId
export interface Room {
  id: string
  number: number
  status: "available" | "occupied" | "reserved"
  description?: string
  waiterId?: string
}

// Update the Order type to include waiterId
export type Order = {
  id: string
  orderType: "table" | "delivery"
  tableNumber?: number | null
  roomNumber?: number | null
  status: string
  createdAt: any
  updatedAt?: any
  items: CartItem[]
  total: number
  customerName?: string
  customerPhone?: string
  customerAddress?: string
  deliveryFee?: number
  paymentMethod?: string
  notes?: string
  tableType?: string
  seatingType?: string
  waiterId?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "chef" | "waiter"
  createdAt: any
}
