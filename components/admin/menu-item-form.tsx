"use client"

import type React from "react"

import { useState } from "react"
import { collection, doc, addDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { X } from "lucide-react"
import type { MenuItem, Category } from "@/types"

interface MenuItemFormProps {
  item?: MenuItem | null
  categories: Category[]
  onClose: () => void
}

export function MenuItemForm({ item, categories, onClose }: MenuItemFormProps) {
  const [formData, setFormData] = useState({
    name: item?.name || "",
    price: item?.price ? item.price.toString() : "",
    categoryId: item?.categoryId || "",
    description: item?.description || "",
    imageUrl: item?.imageUrl || "",
    servesCount: item?.servesCount ? item.servesCount.toString() : "1",
    isAvailable: item?.isAvailable !== false, // Default to true if not specified
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.price || !formData.categoryId) {
      toast({
        title: "To'ldirilmagan maydonlar",
        description: "Iltimos, barcha majburiy maydonlarni to'ldiring",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const menuItemData = {
        name: formData.name,
        price: Number(formData.price),
        categoryId: formData.categoryId,
        description: formData.description,
        imageUrl: formData.imageUrl || null,
        servesCount: Number(formData.servesCount) || 1,
        isAvailable: formData.isAvailable,
      }

      if (item?.id) {
        // Update existing item
        await updateDoc(doc(db, "menuItems", item.id), menuItemData)
        toast({
          title: "Taom yangilandi",
          description: `${formData.name} muvaffaqiyatli yangilandi`,
        })
      } else {
        // Add new item
        await addDoc(collection(db, "menuItems"), menuItemData)
        toast({
          title: "Taom qo'shildi",
          description: `${formData.name} menyuga qo'shildi`,
        })
      }

      onClose()
    } catch (error) {
      console.error("Error saving menu item:", error)
      toast({
        title: "Xatolik",
        description: "Taomni saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">{item ? "Taomni tahrirlash" : "Yangi taom qo'shish"}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nomi *</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Narxi (so'm) *</Label>
          <Input id="price" name="price" type="number" value={formData.price} onChange={handleChange} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="categoryId">Kategoriya *</Label>
          <Select value={formData.categoryId} onValueChange={(value) => handleSelectChange("categoryId", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Kategoriyani tanlang" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="servesCount">Porsiya (necha kishi uchun)</Label>
          <Input
            id="servesCount"
            name="servesCount"
            type="number"
            min="1"
            value={formData.servesCount}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Tavsif</Label>
          <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="imageUrl">Rasm URL manzili</Label>
          <Input
            id="imageUrl"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleChange}
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isAvailable"
            checked={formData.isAvailable}
            onCheckedChange={(checked) => handleSwitchChange("isAvailable", checked)}
          />
          <Label htmlFor="isAvailable">Mavjud (mijozlar ko'rishi mumkin)</Label>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saqlanmoqda..." : item ? "Yangilash" : "Qo'shish"}
          </Button>
        </div>
      </form>
    </div>
  )
}
