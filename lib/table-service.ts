import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Function to get waiter information for a seating item
export async function getWaiterForSeatingItem(
  type: string,
  number: number,
): Promise<{ id: string; name: string } | null> {
  try {
    // Query the seating item
    const seatingItemsQuery = query(
      collection(db, "seatingItems"),
      where("type", "==", type),
      where("number", "==", number),
    )

    const snapshot = await getDocs(seatingItemsQuery)

    if (snapshot.empty) {
      return null
    }

    const seatingItem = snapshot.docs[0].data()

    // If no waiterId, return null
    if (!seatingItem.waiterId) {
      return null
    }

    // Get the waiter information
    const waiterDoc = await getDoc(doc(db, "users", seatingItem.waiterId))

    if (!waiterDoc.exists()) {
      return null
    }

    const waiterData = waiterDoc.data()

    return {
      id: seatingItem.waiterId,
      name: waiterData.name,
    }
  } catch (error) {
    console.error("Error getting waiter for seating item:", error)
    return null
  }
}

// Function to get all waiters
export async function getAllWaiters(): Promise<{ id: string; name: string }[]> {
  try {
    const waitersQuery = query(collection(db, "users"), where("role", "==", "waiter"))
    const snapshot = await getDocs(waitersQuery)

    const waiters: { id: string; name: string }[] = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      waiters.push({
        id: doc.id,
        name: data.name,
      })
    })

    return waiters
  } catch (error) {
    console.error("Error getting all waiters:", error)
    return []
  }
}

// Function to get waiter name by ID
export async function getWaiterNameById(waiterId: string): Promise<string | null> {
  try {
    if (!waiterId) return null

    const waiterDoc = await getDoc(doc(db, "users", waiterId))

    if (!waiterDoc.exists()) {
      return null
    }

    return waiterDoc.data().name
  } catch (error) {
    console.error("Error getting waiter name by ID:", error)
    return null
  }
}
