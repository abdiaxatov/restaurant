"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

export function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  // Modify the handleSubmit function to better handle authentication and improve error logging
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // First check if the email and password are provided
      if (!email.trim() || !password.trim()) {
        setError("Email va parol kiritilishi shart")
        setIsLoading(false)
        return
      }

      // Log authentication attempt
      console.log("Attempting login with:", email)

      // Try to authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      console.log("Login successful, user ID:", user.uid)

      // Get user role from Firestore
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        console.log("User document exists:", userDoc.exists())

        if (userDoc.exists()) {
          const userData = userDoc.data()
          const role = userData.role
          console.log("User role:", role)

          toast({
            title: "Login muvaffaqiyatli",
            description: "Xush kelibsiz!",
          })

          // Redirect based on role
          if (role === "chef" || role === "oshpaz") {
            router.push("/admin/chef")
          } else if (role === "waiter" || role === "ofitsiant") {
            router.push("/admin/waiter")
          } else {
            router.push("/admin/dashboard")
          }
        } else {
          // If user authenticated but document doesn't exist, create a basic user document
          console.log("User authenticated but document not found. Creating basic user document.")
          try {
            await setDoc(doc(db, "users", user.uid), {
              email: user.email,
              name: user.displayName || email.split("@")[0],
              role: "admin", // Default role
              createdAt: new Date(),
            })

            toast({
              title: "Login muvaffaqiyatli",
              description: "Foydalanuvchi ma'lumotlari yaratildi",
            })

            router.push("/admin/dashboard")
          } catch (docError) {
            console.error("Error creating user document:", docError)
            setError("Foydalanuvchi ma'lumotlarini yaratishda xatolik")
            setIsLoading(false)
          }
        }
      } catch (firestoreError) {
        // Handle Firestore errors separately
        console.error("Firestore error:", firestoreError)
        setError("Foydalanuvchi ma'lumotlarini olishda xatolik")
        toast({
          title: "Xatolik",
          description: "Foydalanuvchi ma'lumotlarini olishda xatolik yuz berdi",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    } catch (authError: any) {
      // Handle authentication errors
      console.error("Authentication error:", authError.message)

      // Provide more specific error messages based on Firebase error codes
      if (authError.code === "auth/user-not-found" || authError.code === "auth/wrong-password") {
        setError("Email yoki parol noto'g'ri")
      } else if (authError.code === "auth/too-many-requests") {
        setError("Ko'p urinishlar. Iltimos keyinroq qayta urinib ko'ring")
      } else {
        setError("Login xatoligi: " + authError.message)
      }

      toast({
        title: "Login xatoligi",
        description: "Email yoki parol noto'g'ri",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Parol</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Kirish...
          </>
        ) : (
          "Kirish"
        )}
      </Button>
    </form>
  )
}
