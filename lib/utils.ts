import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("uz-UZ", {
    style: "currency",
    currency: "UZS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return { icon: "Clock", color: "text-amber-500" }
    case "preparing":
      return { icon: "ChefHat", color: "text-blue-500" }
    case "ready":
      return { icon: "Utensils", color: "text-green-500" }
    case "completed":
      return { icon: "CheckCircle", color: "text-green-700" }
    default:
      return { icon: "Clock", color: "text-gray-500" }
  }
}

export const getStatusText = (status: string) => {
  switch (status) {
    case "pending":
      return "Kutilmoqda"
    case "preparing":
      return "Tayyorlanmoqda"
    case "ready":
      return "Tayyor"
    case "completed":
      return "Yakunlangan"
    default:
      return status
  }
}
