"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc, collection, getDocs, deleteDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { ChefHat, User, Trash2, Edit, Check, X, Search } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { User as UserType } from "@/types"

export function RegisterStaffPage() {
  const [chefData, setChefData] = useState({
    name: "",
    email: "",
    password: "",
  })

  const [waiterData, setWaiterData] = useState({
    name: "",
    email: "",
    password: "",
  })

  const [staffList, setStaffList] = useState<UserType[]>([])
  const [filteredStaff, setFilteredStaff] = useState<UserType[]>([])
  const [isSubmittingChef, setIsSubmittingChef] = useState(false)
  const [isSubmittingWaiter, setIsSubmittingWaiter] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("register")
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null)
  const [editingStaff, setEditingStaff] = useState<UserType | null>(null)
  const [editedName, setEditedName] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    fetchStaffList()
  }, [])

  useEffect(() => {
    // Filter staff based on search query and role
    let filtered = staffList

    if (searchQuery) {
      filtered = filtered.filter(
        (staff) =>
          staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          staff.email.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((staff) => staff.role === roleFilter)
    }

    setFilteredStaff(filtered)
  }, [searchQuery, roleFilter, staffList])

  const fetchStaffList = async () => {
    try {
      setIsLoading(true)
      const usersSnapshot = await getDocs(collection(db, "users"))
      const usersData: UserType[] = []

      usersSnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as UserType)
      })

      setStaffList(usersData)
      setFilteredStaff(usersData)
    } catch (error) {
      console.error("Error fetching staff list:", error)
      toast({
        title: "Xatolik",
        description: "Xodimlar ro'yxatini yuklashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChefChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setChefData((prev) => ({ ...prev, [name]: value }))
  }

  const handleWaiterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setWaiterData((prev) => ({ ...prev, [name]: value }))
  }

  const registerChef = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!chefData.name || !chefData.email || !chefData.password) {
      toast({
        title: "Xatolik",
        description: "Barcha maydonlarni to'ldiring",
        variant: "destructive",
      })
      return
    }

    setIsSubmittingChef(true)

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, chefData.email, chefData.password)

      // Update profile with name
      await updateProfile(userCredential.user, {
        displayName: chefData.name,
      })

      // Add user to Firestore with role
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: chefData.name,
        email: chefData.email,
        role: "chef",
        createdAt: new Date(),
      })

      toast({
        title: "Muvaffaqiyatli",
        description: "Oshpaz ro'yxatga olindi",
      })

      // Reset form
      setChefData({
        name: "",
        email: "",
        password: "",
      })

      // Refresh staff list
      fetchStaffList()

      // Switch to staff list tab
      setActiveTab("staff-list")
    } catch (error: any) {
      console.error("Error registering chef:", error)
      toast({
        title: "Xatolik",
        description: error.message || "Oshpazni ro'yxatga olishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingChef(false)
    }
  }

  const registerWaiter = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!waiterData.name || !waiterData.email || !waiterData.password) {
      toast({
        title: "Xatolik",
        description: "Barcha maydonlarni to'ldiring",
        variant: "destructive",
      })
      return
    }

    setIsSubmittingWaiter(true)

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, waiterData.email, waiterData.password)

      // Update profile with name
      await updateProfile(userCredential.user, {
        displayName: waiterData.name,
      })

      // Add user to Firestore with role
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: waiterData.name,
        email: waiterData.email,
        role: "waiter",
        createdAt: new Date(),
      })

      toast({
        title: "Muvaffaqiyatli",
        description: "Ofitsiant ro'yxatga olindi",
      })

      // Reset form
      setWaiterData({
        name: "",
        email: "",
        password: "",
      })

      // Refresh staff list
      fetchStaffList()

      // Switch to staff list tab
      setActiveTab("staff-list")
    } catch (error: any) {
      console.error("Error registering waiter:", error)
      toast({
        title: "Xatolik",
        description: error.message || "Ofitsiantni ro'yxatga olishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingWaiter(false)
    }
  }

  const handleDeleteStaff = async () => {
    if (!deletingStaffId) return

    try {
      // Delete user from Firestore
      await deleteDoc(doc(db, "users", deletingStaffId))

      toast({
        title: "Muvaffaqiyatli",
        description: "Xodim o'chirildi",
      })

      // Refresh staff list
      fetchStaffList()
    } catch (error) {
      console.error("Error deleting staff:", error)
      toast({
        title: "Xatolik",
        description: "Xodimni o'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setDeletingStaffId(null)
    }
  }

  const handleEditStaff = (staff: UserType) => {
    setEditingStaff(staff)
    setEditedName(staff.name)
  }

  const handleSaveEdit = async () => {
    if (!editingStaff || !editedName.trim()) return

    try {
      // Update user in Firestore
      await updateDoc(doc(db, "users", editingStaff.id), {
        name: editedName.trim(),
      })

      toast({
        title: "Muvaffaqiyatli",
        description: "Xodim ma'lumotlari yangilandi",
      })

      // Refresh staff list
      fetchStaffList()

      // Reset editing state
      setEditingStaff(null)
      setEditedName("")
    } catch (error) {
      console.error("Error updating staff:", error)
      toast({
        title: "Xatolik",
        description: "Xodim ma'lumotlarini yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-blue-500">Admin</Badge>
      case "chef":
        return <Badge className="bg-green-500">Oshpaz</Badge>
      case "waiter":
        return <Badge className="bg-amber-500">Ofitsiant</Badge>
      default:
        return <Badge>{role}</Badge>
    }
  }

  const countStaffByRole = (role: string) => {
    return staffList.filter((staff) => staff.role === role).length
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">Xodimlarni boshqarish</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="register">Ro'yxatga olish</TabsTrigger>
            <TabsTrigger value="staff-list">
              Xodimlar ro'yxati
              <Badge variant="secondary" className="ml-2">
                {staffList.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5" />
                    Oshpazni ro'yxatga olish
                  </CardTitle>
                  <CardDescription>
                    Yangi oshpaz uchun hisob yarating. Oshpaz ushbu ma'lumotlar bilan tizimga kirishi mumkin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={registerChef} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="chef-name">Ism</Label>
                      <Input
                        id="chef-name"
                        name="name"
                        value={chefData.name}
                        onChange={handleChefChange}
                        placeholder="Oshpazning to'liq ismi"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="chef-email">Email</Label>
                      <Input
                        id="chef-email"
                        name="email"
                        type="email"
                        value={chefData.email}
                        onChange={handleChefChange}
                        placeholder="oshpaz@restoran.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="chef-password">Parol</Label>
                      <Input
                        id="chef-password"
                        name="password"
                        type="password"
                        value={chefData.password}
                        onChange={handleChefChange}
                        placeholder="Kamida 6 ta belgi"
                        required
                        minLength={6}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmittingChef}>
                      {isSubmittingChef ? "Ro'yxatga olinmoqda..." : "Ro'yxatga olish"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Ofitsiantni ro'yxatga olish
                  </CardTitle>
                  <CardDescription>
                    Yangi ofitsiant uchun hisob yarating. Ofitsiant ushbu ma'lumotlar bilan tizimga kirishi mumkin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={registerWaiter} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="waiter-name">Ism</Label>
                      <Input
                        id="waiter-name"
                        name="name"
                        value={waiterData.name}
                        onChange={handleWaiterChange}
                        placeholder="Ofitsiantning to'liq ismi"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="waiter-email">Email</Label>
                      <Input
                        id="waiter-email"
                        name="email"
                        type="email"
                        value={waiterData.email}
                        onChange={handleWaiterChange}
                        placeholder="ofitsiant@restoran.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="waiter-password">Parol</Label>
                      <Input
                        id="waiter-password"
                        name="password"
                        type="password"
                        value={waiterData.password}
                        onChange={handleWaiterChange}
                        placeholder="Kamida 6 ta belgi"
                        required
                        minLength={6}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmittingWaiter}>
                      {isSubmittingWaiter ? "Ro'yxatga olinmoqda..." : "Ro'yxatga olish"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="staff-list">
            <Card>
              <CardHeader>
                <CardTitle>Xodimlar ro'yxati</CardTitle>
                <CardDescription>
                  Jami {staffList.length} ta xodim: {countStaffByRole("admin")} ta admin, {countStaffByRole("chef")} ta
                  oshpaz, {countStaffByRole("waiter")} ta ofitsiant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 grid gap-4 md:grid-cols-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Xodimlarni qidirish..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Barcha xodimlar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Barcha xodimlar</SelectItem>
                      <SelectItem value="admin">Adminlar</SelectItem>
                      <SelectItem value="chef">Oshpazlar</SelectItem>
                      <SelectItem value="waiter">Ofitsiantlar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isLoading ? (
                  <div className="py-8 text-center">Xodimlar ro'yxati yuklanmoqda...</div>
                ) : filteredStaff.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">Xodimlar topilmadi</div>
                ) : (
                  <div className="space-y-2">
                    {filteredStaff.map((staff) => (
                      <div key={staff.id} className="flex items-center justify-between rounded-md border p-3">
                        {editingStaff?.id === staff.id ? (
                          <div className="flex flex-1 items-center gap-2">
                            <Input
                              value={editedName}
                              onChange={(e) => setEditedName(e.target.value)}
                              className="flex-1"
                            />
                            <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingStaff(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div>
                              <div className="font-medium">{staff.name}</div>
                              <div className="text-sm text-muted-foreground">{staff.email}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getRoleBadge(staff.role)}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditStaff(staff)}
                                disabled={staff.role === "admin"}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => setDeletingStaffId(staff.id)}
                                disabled={staff.role === "admin"}
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
          </TabsContent>
        </Tabs>

        {/* Delete Staff Confirmation Dialog */}
        <AlertDialog open={!!deletingStaffId} onOpenChange={(open) => !open && setDeletingStaffId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xodimni o'chirishni tasdiqlaysizmi?</AlertDialogTitle>
              <AlertDialogDescription>
                Bu amal qaytarib bo'lmaydi. Xodim tizimdan butunlay o'chiriladi.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteStaff}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                O'chirish
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  )
}
