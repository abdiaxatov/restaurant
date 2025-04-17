"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"
import { ArrowLeft, Printer, Receipt, Download } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

export default function ReceiptPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [restaurant, setRestaurant] = useState<any>({
    name: "Restaurant Name",
    address: "Restaurant Address",
    phone: "+998 XX XXX XX XX",
    taxId: "123456789",
  })
  const receiptRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (!orderId) return

        // Fetch order data
        const orderDoc = await getDoc(doc(db, "orders", orderId as string))

        if (!orderDoc.exists()) {
          toast({
            title: "Xatolik",
            description: "Buyurtma topilmadi",
            variant: "destructive",
          })
          router.push("/admin/dashboard")
          return
        }

        const orderData = { id: orderDoc.id, ...orderDoc.data() }
        setOrder(orderData)

        // Fetch restaurant info from settings
        try {
          const settingsDoc = await getDoc(doc(db, "settings", "restaurantInfo"))
          if (settingsDoc.exists()) {
            setRestaurant(settingsDoc.data())
          }
        } catch (error) {
          console.error("Error fetching restaurant info:", error)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching order:", error)
        toast({
          title: "Xatolik",
          description: "Buyurtma ma'lumotlarini yuklashda xatolik yuz berdi",
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, router, toast])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return

    try {
      toast({
        title: "PDF tayyorlanmoqda",
        description: "Iltimos, kuting...",
      })

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
      pdf.save(`receipt-${orderId}.pdf`)

      toast({
        title: "PDF yuklandi",
        description: "Chek muvaffaqiyatli yuklandi",
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Xatolik",
        description: "PDF yaratishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto flex h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-lg">Chek ma'lumotlari yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto p-4">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-8 text-center">
          <h2 className="mb-4 text-2xl font-bold text-destructive">Buyurtma topilmadi</h2>
          <p className="mb-6 text-muted-foreground">Ushbu buyurtma mavjud emas yoki o'chirilgan</p>
          <Button onClick={() => router.push("/admin/dashboard")}>Bosh sahifaga qaytish</Button>
        </div>
      </div>
    )
  }

  // Format date
  const orderDate = order.createdAt ? new Date(order.createdAt.seconds * 1000) : new Date()
  const formattedDate = orderDate.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const formattedTime = orderDate.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Orqaga
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Chop etish
          </Button>
          <Button onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            PDF yuklash
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl">
        <Card className="print:border-none print:shadow-none" ref={receiptRef}>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Receipt className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">{restaurant.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{restaurant.address}</p>
            <p className="text-sm text-muted-foreground">{restaurant.phone}</p>
            {restaurant.taxId && <p className="text-sm text-muted-foreground">STIR: {restaurant.taxId}</p>}
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-between text-sm">
              <div>
                <p>
                  <span className="font-medium">Sana:</span> {formattedDate}
                </p>
                <p>
                  <span className="font-medium">Vaqt:</span> {formattedTime}
                </p>
              </div>
              <div className="text-right">
                <p>
                  <span className="font-medium">Chek №:</span> {order.id.slice(-6).toUpperCase()}
                </p>
                <p>
                  <span className="font-medium">Buyurtma turi:</span>{" "}
                  {order.orderType === "table" ? "Joy buyurtmasi" : "Yetkazib berish"}
                </p>
              </div>
            </div>

            {order.orderType === "table" && (
              <div className="mb-4 rounded-md bg-muted p-2 text-sm">
                {order.tableNumber && (
                  <p>
                    <span className="font-medium">Stol:</span> {order.tableNumber}-{order.seatingType || "Stol"}
                  </p>
                )}
                {order.roomNumber && (
                  <p>
                    <span className="font-medium">Xona:</span> {order.roomNumber}-Xona
                  </p>
                )}
              </div>
            )}

            {order.orderType === "delivery" && (
              <div className="mb-4 rounded-md bg-muted p-2 text-sm">
                <p>
                  <span className="font-medium">Telefon:</span> {order.phoneNumber}
                </p>
                <p>
                  <span className="font-medium">Manzil:</span> {order.address}
                </p>
              </div>
            )}

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span>Taom</span>
                <div className="flex gap-8">
                  <span className="w-16 text-right">Narx</span>
                  <span className="w-8 text-center">Soni</span>
                  <span className="w-20 text-right">Jami</span>
                </div>
              </div>
              <Separator />

              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="max-w-[200px]">{item.name}</span>
                  <div className="flex gap-8">
                    <span className="w-16 text-right">{formatCurrency(item.price)}</span>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <span className="w-20 text-right">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}

              <Separator className="my-2" />

              <div className="flex justify-between text-sm">
                <span>Jami summa:</span>
                <span className="font-medium">{formatCurrency(order.subtotal)}</span>
              </div>

              {order.orderType === "delivery" && (
                <>
                  {order.containerCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Idishlar narxi:</span>
                      <span>{formatCurrency(order.containerCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Yetkazib berish:</span>
                    <span>{formatCurrency(order.deliveryFee)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between pt-2 text-lg font-bold">
                <span>Umumiy summa:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="text-center text-sm text-muted-foreground">
              <p>Xaridingiz uchun rahmat!</p>
              <p>Yana tashrif buyuring</p>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <p>
              {new Date().getFullYear()} © {restaurant.name}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
