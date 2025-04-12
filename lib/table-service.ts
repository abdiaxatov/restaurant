import { doc, updateDoc, collection, query, where, getDocs, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Mark a table as occupied
export async function markTableAsOccupied(tableNumber: number) {
  try {
    // Find the table by number
    const tablesRef = collection(db, "tables")
    const q = query(tablesRef, where("number", "==", tableNumber))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.error(`Table #${tableNumber} not found`)
      return false
    }

    // Update the first matching table
    const tableDoc = querySnapshot.docs[0]
    const tableData = tableDoc.data()

    await updateDoc(doc(db, "tables", tableDoc.id), {
      status: "occupied",
      updatedAt: new Date(),
    })

    // If the table belongs to a room, also mark it in the room info
    if (tableData.roomId) {
      const roomDoc = await getDoc(doc(db, "rooms", tableData.roomId))
      if (roomDoc.exists()) {
        const roomData = roomDoc.data()
        const occupiedTables = roomData.occupiedTables || []

        if (!occupiedTables.includes(tableNumber)) {
          await updateDoc(doc(db, "rooms", tableData.roomId), {
            occupiedTables: [...occupiedTables, tableNumber],
            updatedAt: new Date(),
          })
        }
      }
    }

    return true
  } catch (error) {
    console.error("Error marking table as occupied:", error)
    return false
  }
}

// Mark a table as available
export async function markTableAsAvailable(tableNumber: number) {
  try {
    // Find the table by number
    const tablesRef = collection(db, "tables")
    const q = query(tablesRef, where("number", "==", tableNumber))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.error(`Table #${tableNumber} not found`)
      return false
    }

    // Update the first matching table
    const tableDoc = querySnapshot.docs[0]
    const tableData = tableDoc.data()

    await updateDoc(doc(db, "tables", tableDoc.id), {
      status: "available",
      updatedAt: new Date(),
    })

    // If the table belongs to a room, also update it in the room info
    if (tableData.roomId) {
      const roomDoc = await getDoc(doc(db, "rooms", tableData.roomId))
      if (roomDoc.exists()) {
        const roomData = roomDoc.data()
        const occupiedTables = roomData.occupiedTables || []

        if (occupiedTables.includes(tableNumber)) {
          await updateDoc(doc(db, "rooms", tableData.roomId), {
            occupiedTables: occupiedTables.filter((t) => t !== tableNumber),
            updatedAt: new Date(),
          })
        }
      }
    }

    return true
  } catch (error) {
    console.error("Error marking table as available:", error)
    return false
  }
}

// Check if a table is available
export async function isTableAvailable(tableNumber: number) {
  try {
    // Find the table by number
    const tablesRef = collection(db, "tables")
    const q = query(tablesRef, where("number", "==", tableNumber))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.error(`Table #${tableNumber} not found`)
      return false
    }

    // Check the status of the first matching table
    const tableDoc = querySnapshot.docs[0]
    const tableData = tableDoc.data()

    return tableData.status === "available"
  } catch (error) {
    console.error("Error checking table availability:", error)
    return false
  }
}

// Get room information for a table
export async function getRoomForTable(tableNumber: number) {
  try {
    // Find the table by number
    const tablesRef = collection(db, "tables")
    const q = query(tablesRef, where("number", "==", tableNumber))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.error(`Table #${tableNumber} not found`)
      return null
    }

    // Get the table data
    const tableDoc = querySnapshot.docs[0]
    const tableData = tableDoc.data()

    // If the table belongs to a room, get the room info
    if (tableData.roomId) {
      const roomDoc = await getDoc(doc(db, "rooms", tableData.roomId))
      if (roomDoc.exists()) {
        return {
          id: roomDoc.id,
          ...roomDoc.data(),
        }
      }
    }

    return null
  } catch (error) {
    console.error("Error getting room for table:", error)
    return null
  }
}

// Mark a room as occupied
export async function markRoomAsOccupied(roomId: string) {
  try {
    await updateDoc(doc(db, "rooms", roomId), {
      status: "occupied",
      updatedAt: new Date(),
    })
    return true
  } catch (error) {
    console.error("Error marking room as occupied:", error)
    return false
  }
}

// Mark a room as available
export async function markRoomAsAvailable(roomId: string) {
  try {
    await updateDoc(doc(db, "rooms", roomId), {
      status: "available",
      updatedAt: new Date(),
    })
    return true
  } catch (error) {
    console.error("Error marking room as available:", error)
    return false
  }
}

// Check if a room is available
export async function isRoomAvailable(roomId: string) {
  try {
    const roomDoc = await getDoc(doc(db, "rooms", roomId))
    if (!roomDoc.exists()) {
      console.error(`Room ${roomId} not found`)
      return false
    }

    const roomData = roomDoc.data()
    return !roomData.status || roomData.status === "available"
  } catch (error) {
    console.error("Error checking room availability:", error)
    return false
  }
}
