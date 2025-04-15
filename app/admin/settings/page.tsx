"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import AdminLayout  from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Save } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(true)
  const [deliveryFee, setDeliveryFee] = useState("15000")
  const [defaultContainerPrice, setDefaultContainerPrice] = useState("2000")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "settings", "orderSettings"))
        if (settingsDoc.exists()) {
          const data = settingsDoc.data()
          setIsDeliveryAvailable(data.deliveryAvailable !== false)
          setDeliveryFee(data.deliveryFee?.toString() || "15000")
          setDefaultContainerPrice(data.defaultContainerPrice?.toString() || "2000")
        }
      } catch (error) {
        console.error("Error fetching settings:", error)
        toast({
          title: "Xatolik",
          description: "Sozlamalarni yuklashda xatolik yuz berdi",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [toast])

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      await setDoc(
        doc(db, "settings", "orderSettings"),
        {
          deliveryAvailable: isDeliveryAvailable,
          deliveryFee: Number.parseInt(deliveryFee, 10),
          defaultContainerPrice: Number.parseInt(defaultContainerPrice, 10),
          updatedAt: new Date(),
        },
        { merge: true },
      )

      toast({
        title: "Muvaffaqiyatli saqlandi",
        description: "Sozlamalar muvaffaqiyatli saqlandi",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Xatolik",
        description: "Sozlamalarni saqlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <h1 className="mb-6 text-2xl font-bold">Sozlamalar</h1>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Yetkazib berish sozlamalari</CardTitle>
                <CardDescription>Yetkazib berish xizmati va narxlarini sozlash</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="delivery-toggle">Yetkazib berish xizmati</Label>
                    <p className="text-sm text-muted-foreground">Yetkazib berish xizmatini yoqish yoki o'chirish</p>
                  </div>
                  <Switch id="delivery-toggle" checked={isDeliveryAvailable} onCheckedChange={setIsDeliveryAvailable} />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="delivery-fee">Yetkazib berish narxi (UZS)</Label>
                  <Input
                    id="delivery-fee"
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    placeholder="15000"
                    min="0"
                  />
                  <p className="text-sm text-muted-foreground">Yetkazib berish uchun standart narx</p>
                </div>

              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saqlanmoqda...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Saqlash
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
