import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Function to mark a table as occupied
export const markTableAsOccupied = async (tableNumber: number): Promise<boolean> => {
  try {
    // Find the table by number
    const tablesQuery = query(collection(db, "tables"), where("number", "==", tableNumber))
    const tablesSnapshot = await getDocs(tablesQuery)
    let tableId: string | null = null

    tablesSnapshot.forEach((doc) => {
      tableId = doc.id
    })

    if (tableId) {
      // Update table status to occupied
      await updateDoc(doc(db, "tables", tableId), {
        status: "occupied",
        updatedAt: new Date(),
      })
      return true
    } else {
      console.error("Table not found")
      return false
    }
  } catch (error) {
    console.error("Error updating table status:", error)
    return false
  }
}

// Function to mark a room as occupied
export const markRoomAsOccupied = async (roomNumber: number): Promise<boolean> => {
  try {
    // Find the room by number
    const roomsQuery = query(collection(db, "rooms"), where("number", "==", roomNumber))
    const roomsSnapshot = await getDocs(roomsQuery)
    let roomId: string | null = null

    roomsSnapshot.forEach((doc) => {
      roomId = doc.id
    })

    if (roomId) {
      // Update room status to occupied
      await updateDoc(doc(db, "rooms", roomId), {
        status: "occupied",
        updatedAt: new Date(),
      })
      return true
    } else {
      console.error("Room not found")
      return false
    }
  } catch (error) {
    console.error("Error updating room status:", error)
    return false
  }
}
