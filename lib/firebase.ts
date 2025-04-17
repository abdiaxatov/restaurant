import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyBzr0W1tqLQgQ-0Kv6MMo9Bi_Rma4dkkqY",
  authDomain: "restaurant-807ba.firebaseapp.com",
  projectId: "restaurant-807ba",
  storageBucket: "restaurant-807ba.appspot.com",
  messagingSenderId: "707900973222",
  appId: "1:707900973222:web:bfbbe7c4de7890aa1d9467",
  measurementId: "G-H61PTE5MY3",
}

// Initialize Firebase
let app
let db
let auth
let storage

// We need to make sure Firebase is only initialized on the client side
if (typeof window !== "undefined") {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApp()
  }

  db = getFirestore(app)
  auth = getAuth(app)
  storage = getStorage(app)

  // Enable offline persistence
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.log("Persistence failed: Multiple tabs open")
    } else if (err.code === "unimplemented") {
      // The current browser does not support persistence
      console.log("Persistence not supported by this browser")
    }
  })
}

export { app, db, auth, storage }
