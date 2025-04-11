"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Edit, Plus, Trash2, X, Check } from "lucide-react"
import type { Category } from "@/types"

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editedName, setEditedName] = useState("")
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const categoriesQuery = collection(db, "categories")

    const unsubscribe = onSnapshot(
      categoriesQuery,
      (snapshot) => {
        const categoriesData: Category[] = []
        snapshot.forEach((doc) => {
          categoriesData.push({ id: doc.id, ...doc.data() } as Category)
        })
        // Sort alphabetically
        categoriesData.sort((a, b) => a.name.localeCompare(b.name))
        setCategories(categoriesData)
      },
      (error) => {
        console.error("Error fetching categories:", error)
        toast({
          title: "Xatolik",
          description: "Kategoriyalarni yuklashda xatolik yuz berdi.",
          variant: "destructive",
        })
      },
    )

    return () => unsubscribe()
  }, [toast])

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newCategory.trim()) {
      toast({
        title: "Xatolik",
        description: "Kategoriya nomi bo'sh bo'lishi mumkin emas",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await addDoc(collection(db, "categories"), {
        name: newCategory.trim(),
      })

      toast({
        title: "Kategoriya qo'shildi",
        description: `${newCategory} muvaffaqiyatli qo'shildi`,
      })

      setNewCategory("")
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: "Xatolik",
        description: "Kategoriyani qo'shishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditClick = (category: Category) => {
    setEditingCategory(category)
    setEditedName(category.name)
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setEditedName("")
  }

  const handleSaveEdit = async (categoryId: string) => {
    if (!editedName.trim()) {
      toast({
        title: "Xatolik",
        description: "Kategoriya nomi bo'sh bo'lishi mumkin emas",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await updateDoc(doc(db, "categories", categoryId), {
        name: editedName.trim(),
      })

      toast({
        title: "Kategoriya yangilandi",
        description: "Kategoriya muvaffaqiyatli yangilandi",
      })

      setEditingCategory(null)
      setEditedName("")
    } catch (error) {
      console.error("Error updating category:", error)
      toast({
        title: "Xatolik",
        description: "Kategoriyani yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (categoryId: string) => {
    setDeletingCategoryId(categoryId)
  }

  const handleDeleteCategory = async () => {
    if (!deletingCategoryId) return

    setIsSubmitting(true)

    try {
      await deleteDoc(doc(db, "categories", deletingCategoryId))

      toast({
        title: "Kategoriya o'chirildi",
        description: "Kategoriya muvaffaqiyatli o'chirildi",
      })
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Xatolik",
        description: "Kategoriyani o'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setDeletingCategoryId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Kategoriyalar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <Input
                placeholder="Yangi kategoriya nomi"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isSubmitting || !newCategory.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Qo'shish
              </Button>
            </form>
          </div>

          {categories.length === 0 ? (
            <p className="text-center text-muted-foreground">Hech qanday kategoriya topilmadi</p>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between rounded-md border p-2">
                  {editingCategory?.id === category.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSaveEdit(category.id)}
                        disabled={isSubmitting}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={isSubmitting}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">{category.name}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(category)}
                          disabled={isSubmitting}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteClick(category.id)}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingCategoryId} onOpenChange={(open) => !open && setDeletingCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kategoriyani o'chirishni tasdiqlaysizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu amal qaytarib bo'lmaydi. Bu kategoriyaga tegishli taomlar kategoriyasiz qolishi mumkin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "O'chirilmoqda..." : "O'chirish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
