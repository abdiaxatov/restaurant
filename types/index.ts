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

export interface Table {
  id: string
  number: number
  seats: number
  status: "available" | "occupied" | "reserved"
  roomId?: string
}

export interface Room {
  id: string
  number: number
  status: "available" | "occupied" | "reserved"
  description?: string
}

export interface Order {
  id?: string
  orderType: "table" | "delivery"
  tableNumber?: number | null
  roomNumber?: number | null
  phoneNumber?: string | null
  address?: string | null
  items: {
    id: string
    name: string
    price: number
    quantity: number
    needsContainer?: boolean
    containerPrice?: number
  }[]
  subtotal?: number
  deliveryFee?: number
  containerCost?: number
  total: number
  status: "pending" | "preparing" | "ready" | "delivering" | "completed"
  createdAt: any
  updatedAt?: any
  deletedAt?: any
  deletedBy?: string
  tableInfo?: {
    status: string
    seats: number
    roomId?: string
  }
}

export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "chef" | "waiter"
  createdAt: any
}
