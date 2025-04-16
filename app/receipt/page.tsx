"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getOrderWithDetails, getSeatingTypeDisplay, formatDate } from "@/lib/receipt-service"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"
import { Loader2, Printer, ArrowLeft, User, Calendar, CreditCard, Receipt, Home } from "lucide-react"
import { motion } from "framer-motion"
import type { Order } from "@/types"

export default function ReceiptPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get("orderId")
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError("Chek ID si ko'rsatilmagan")
        setLoading(false)
        return
      }

      try {
        const orderData = await getOrderWithDetails(orderId)
        if (orderData) {
          setOrder(orderData)
        } else {
          setError("Buyurtma topilmadi")
        }
      } catch (error) {
        console.error("Error fetching order:", error)
        setError("Buyurtmani yuklashda xatolik yuz berdi")
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML
      const originalContents = document.body.innerHTML

      document.body.innerHTML = `
        <html>
          <head>
            <title>Chek #${order?.id?.substring(0, 6)}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
              .receipt-header { text-align: center; margin-bottom: 20px; }
              .receipt-info { margin-bottom: 20px; }
              .receipt-info p { margin: 5px 0; }
              .receipt-items { width: 100%; border-collapse: collapse; }
              .receipt-items th, .receipt-items td { text-align: left; padding: 8px 4px; }
              .receipt-total { margin-top: 20px; text-align: right; }
              .receipt-footer { margin-top: 40px; text-align: center; font-size: 12px; }
              @media print {
                button { display: none !important; }
              }
            </style>
          </head>
          <body>
            ${printContents}
            <div class="receipt-footer">
              <p>Rahmat! Tashrif buyurganingiz uchun tashakkur.</p>
            </div>
          </body>
        </html>
      `

      window.print()
      document.body.innerHTML = originalContents
      window.location.reload()
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto flex h-[80vh] max-w-md items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p>Chek ma'lumotlari yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto flex h-[80vh] max-w-md items-center justify-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center text-red-500">Xatolik</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">{error || "Chek ma'lumotlarini yuklashda xatolik yuz berdi"}</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push("/")}>Bosh sahifaga qaytish</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-md p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 flex justify-between"
      >
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Orqaga
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Chekni chop etish
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="bg-primary text-primary-foreground">
            <CardTitle className="text-center">
              <Receipt className="mx-auto mb-2 h-8 w-8" />
              Chek #{order.id.substring(0, 6)}
            </CardTitle>
          </CardHeader>

          <div ref={printRef}>
            <CardContent className="p-6">
              <div className="receipt-header print:block hidden">
                <h1 className="text-2xl font-bold">Chek #{order.id.substring(0, 6)}</h1>
                <p>Restaurant Ordering System</p>
              </div>

              <div className="mb-6 space-y-3">
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Sana va vaqt:</div>
                    <div>{formatDate(order.createdAt)}</div>
                    {order.paidAt && (
                      <div className="text-sm text-muted-foreground">To'langan: {formatDate(order.paidAt)}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Home className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Joy:</div>
                    <div>
                      {order.orderType === "delivery"
                        ? "Yetkazib berish"
                        : `${getSeatingTypeDisplay(order)} ${order.roomNumber || order.tableNumber || ""}`}
                    </div>
                  </div>
                </div>

                {order.waiterName && (
                  <div className="flex items-start gap-2">
                    <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Ofitsiant:</div>
                      <div>{order.waiterName}</div>
                    </div>
                  </div>
                )}

                {order.orderType === "delivery" && (
                  <div className="flex items-start gap-2">
                    <Home className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Yetkazib berish manzili:</div>
                      <div>{order.address}</div>
                      {order.phoneNumber && <div>Tel: {order.phoneNumber}</div>}
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div>
                <h3 className="mb-3 font-semibold">Buyurtma elementlari</h3>
                <table className="w-full">
                  <thead className="text-left text-sm text-muted-foreground">
                    <tr>
                      <th className="pb-2">Taom nomi</th>
                      <th className="pb-2 text-right">Narxi</th>
                      <th className="pb-2 text-right">Soni</th>
                      <th className="pb-2 text-right">Jami</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {order.items.map((item, index) => (
                      <tr key={index} className="py-2">
                        <td className="py-2">{item.name}</td>
                        <td className="py-2 text-right">{formatCurrency(item.price)}</td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2 text-right">{formatCurrency(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Jami (taomlar):</span>
                  <span>{formatCurrency(order.subtotal || 0)}</span>
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
                      <span>{formatCurrency(order.deliveryFee || 0)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-lg font-bold">
                  <span>Umumiy summa:</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>

              <div className="mt-6 rounded-md bg-green-50 p-4 text-center text-green-800">
                <CreditCard className="mx-auto mb-2 h-6 w-6" />
                <p className="font-medium">To'langan</p>
              </div>
            </CardContent>
          </div>

          <CardFooter className="flex-col gap-2 p-6">
            <Button className="w-full" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Chekni chop etish
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
              <Home className="mr-2 h-4 w-4" />
              Bosh sahifaga
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
