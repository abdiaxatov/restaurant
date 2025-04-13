"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, UserPlus, Trash2, Edit, Search, UserCheck, UserX } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function RegisterStaffPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("waiter")
  const [isLoading, setIsLoading] = useState(false)
  const [staffList, setStaffList] = useState<any[]>([])
  const [isLoadingStaff, setIsLoadingStaff] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchStaffList()
  }, [])

  const fetchStaffList = async () => {
    setIsLoadingStaff(true)
    try {
      const staffQuery = query(collection(db, "users"), where("role", "!=", "customer"))
      const staffSnapshot = await getDocs(staffQuery)
      const staffData = staffSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setStaffList(staffData)
    } catch (error) {
      console.error("Error fetching staff list:", error)
      toast({
        title: "Xatolik",
        description: "Xodimlar ro'yxatini yuklashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsLoadingStaff(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingStaff) {
        // Update existing staff
        await setDoc(
          doc(db, "users", editingStaff.id),
          {
            name,
            email,
            role,
            updatedAt: new Date(),
          },
          { merge: true },
        )

        toast({
          title: "Muvaffaqiyatli yangilandi",
          description: "Xodim ma'lumotlari muvaffaqiyatli yangilandi",
        })

        setEditingStaff(null)
      } else {
        // Check if email already exists
        const emailQuery = query(collection(db, "users"), where("email", "==", email))
        const emailSnapshot = await getDocs(emailQuery)

        if (!emailSnapshot.empty) {
          throw new Error("Bu email allaqachon ro'yxatdan o'tgan")
        }

        // Create new user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // Save user data to Firestore
        await setDoc(doc(db, "users", user.uid), {
          name,
          email,
          role,
          createdAt: new Date(),
        })

        toast({
          title: "Muvaffaqiyatli ro'yxatdan o'tkazildi",
          description: "Yangi xodim muvaffaqiyatli ro'yxatdan o'tkazildi",
        })
      }

      // Reset form
      setName("")
      setEmail("")
      setPassword("")
      setRole("waiter")

      // Refresh staff list
      fetchStaffList()
    } catch (error: any) {
      console.error("Error registering staff:", error)
      toast({
        title: "Xatolik",
        description: error.message || "Xodimni ro'yxatdan o'tkazishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteStaff = async (staffId: string) => {
    try {
      await deleteDoc(doc(db, "users", staffId))
      toast({
        title: "Muvaffaqiyatli o'chirildi",
        description: "Xodim muvaffaqiyatli o'chirildi",
      })
      fetchStaffList()
    } catch (error) {
      console.error("Error deleting staff:", error)
      toast({
        title: "Xatolik",
        description: "Xodimni o'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const handleEditStaff = (staff: any) => {
    setEditingStaff(staff)
    setName(staff.name || "")
    setEmail(staff.email || "")
    setRole(staff.role || "waiter")
    // Don't set password as we don't want to change it
  }

  const cancelEdit = () => {
    setEditingStaff(null)
    setName("")
    setEmail("")
    setPassword("")
    setRole("waiter")
  }

  const filteredStaff = staffList.filter((staff) => {
    // Filter by tab
    if (activeTab !== "all" && staff.role !== activeTab) {
      return false
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (staff.name && staff.name.toLowerCase().includes(query)) ||
        (staff.email && staff.email.toLowerCase().includes(query))
      )
    }

    return true
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-600">
            <UserCheck className="mr-1 h-3 w-3" />
            Admin
          </Badge>
        )
      case "chef":
      case "oshpaz":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-600">
            Oshpaz
          </Badge>
        )
      case "waiter":
      case "ofitsiant":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600">
            Ofitsiant
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600">
            {role}
          </Badge>
        )
    }
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-4 md:p-6">
        <h1 className="mb-6 text-2xl font-bold">Xodimlarni ro'yxatdan o'tkazish</h1>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>{editingStaff ? "Xodimni tahrirlash" : "Yangi xodim qo'shish"}</CardTitle>
                <CardDescription>
                  {editingStaff
                    ? "Xodim ma'lumotlarini yangilang"
                    : "Yangi xodimni tizimga qo'shish uchun ma'lumotlarni kiriting"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Ism</Label>
                    <Input
                      id="name"
                      placeholder="Xodim ismi"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="xodim@restoran.uz"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={!!editingStaff}
                    />
                  </div>

                  {!editingStaff && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Parol</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="********"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={!editingStaff}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="role">Lavozim</Label>
                    <Select value={role} onValueChange={setRole} required>
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Lavozimni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="chef">Oshpaz</SelectItem>
                        <SelectItem value="waiter">Ofitsiant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {editingStaff ? "Yangilanmoqda..." : "Ro'yxatdan o'tkazilmoqda..."}
                        </>
                      ) : (
                        <>
                          {editingStaff ? (
                            <>
                              <Edit className="mr-2 h-4 w-4" />
                              Yangilash
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Ro'yxatdan o'tkazish
                            </>
                          )}
                        </>
                      )}
                    </Button>
                    {editingStaff && (
                      <Button type="button" variant="outline" onClick={cancelEdit}>
                        Bekor qilish
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <CardTitle>Xodimlar ro'yxati</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Qidirish..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="mb-4 w-full">
                    <TabsTrigger value="all" className="flex-1">
                      Barchasi
                    </TabsTrigger>
                    <TabsTrigger value="admin" className="flex-1">
                      Adminlar
                    </TabsTrigger>
                    <TabsTrigger value="chef" className="flex-1">
                      Oshpazlar
                    </TabsTrigger>
                    <TabsTrigger value="waiter" className="flex-1">
                      Ofitsiantlar
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab} className="mt-0">
                    {isLoadingStaff ? (
                      <div className="flex h-40 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : filteredStaff.length > 0 ? (
                      <div className="space-y-4">
                        {filteredStaff.map((staff) => (
                          <div
                            key={staff.id}
                            className="flex flex-col justify-between gap-2 rounded-lg border p-4 sm:flex-row sm:items-center"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{staff.name}</h3>
                                {getRoleBadge(staff.role)}
                              </div>
                              <p className="text-sm text-muted-foreground">{staff.email}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditStaff(staff)}
                                disabled={isLoading}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Tahrirlash
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm" disabled={isLoading}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    O'chirish
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Xodimni o'chirish</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Haqiqatan ham bu xodimni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteStaff(staff.id)}>
                                      O'chirish
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                        <UserX className="mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">Xodimlar topilmadi</p>
                        <p className="text-sm text-muted-foreground">
                          {searchQuery
                            ? "Qidiruv bo'yicha xodimlar topilmadi"
                            : "Hozircha bu turdagi xodimlar mavjud emas"}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
