import { collection, getDocs as firestoreGetDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

// This is a wrapper around the Firebase getDocs function to make it easier to use
export async function getDocs(collectionPath: string, whereConditions?: [string, string, any][]) {
  try {
    let q = collection(db, collectionPath)

    if (whereConditions && whereConditions.length > 0) {
      whereConditions.forEach((condition) => {
        q = query(q, where(condition[0], condition[1] as any, condition[2]))
      })
    }

    const querySnapshot = await firestoreGetDocs(q)
    const result: any[] = []

    querySnapshot.forEach((doc) => {
      result.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return result
  } catch (error) {
    console.error(`Error getting documents from ${collectionPath}:`, error)
    throw error
  }
}
