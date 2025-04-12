export interface MenuItem {
  id: string
  name: string
  price: number
  categoryId: string
  description: string
  imageUrl?: string
  servesCount: number
  isAvailable: boolean
  remainingServings?: number // For tracking available portions
  quantity?: number // For inventory tracking
  createdAt?: any // Firestore timestamp
  updatedAt?: any // Firestore timestamp
}

export interface Category {
  id: string
  name: string
  createdAt?: any // Firestore timestamp
  updatedAt?: any // Firestore timestamp
}

export interface CartItem extends MenuItem {
  quantity: number
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
  }[]
  total: number
  status: string
  createdAt: any // Firestore timestamp
  updatedAt?: any // Firestore timestamp
}

export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "chef" | "oshpaz" | "waiter" | "ofitsiant"
  createdAt: any // Firestore timestamp
  updatedAt?: any // Firestore timestamp
}

export interface Table {
  id: string
  number: number
  seats: number
  status: "available" | "occupied" | "reserved"
  roomId?: string | null
  tableTypeId?: string | null
  createdAt: any // Firestore timestamp
  updatedAt?: any // Firestore timestamp
}

export interface Room {
  id: string
  name: string
  capacity: number
  createdAt: any // Firestore timestamp
  updatedAt?: any // Firestore timestamp
}

export interface TableType {
  id: string
  name: string
  seats: number
  createdAt: any // Firestore timestamp
  updatedAt?: any // Firestore timestamp
}
