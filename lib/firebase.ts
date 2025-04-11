import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

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

// We need to make sure Firebase is only initialized on the client side
if (typeof window !== "undefined") {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApp()
  }
  db = getFirestore(app)
  auth = getAuth(app)
}

export { app, db, auth }
