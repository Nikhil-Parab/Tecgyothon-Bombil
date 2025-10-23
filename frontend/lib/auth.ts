/**
 * Firebase Authentication Service
 * 
 * Handles all authentication operations including:
 * - Sign up with email/password
 * - Sign in with email/password
 * - Google sign-in
 * - Password reset
 * - Sign out
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  onAuthStateChanged,
  sendEmailVerification,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

export type AuthUser = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(
  email: string,
  password: string,
  displayName?: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Update display name if provided
    if (displayName) {
      await updateProfile(user, { displayName })
    }

    // Send email verification
    await sendEmailVerification(user)

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: displayName || null,
      photoURL: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      emailVerified: false,
      preferences: {},
    })

    return {
      user: {
        uid: user.uid,
        email: user.email,
        displayName: displayName || null,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
      },
      error: null,
    }
  } catch (error: any) {
    console.error('Sign up error:', error)
    return {
      user: null,
      error: getAuthErrorMessage(error.code),
    }
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Update last login in Firestore
    await setDoc(
      doc(db, 'users', user.uid),
      {
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    return {
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
      },
      error: null,
    }
  } catch (error: any) {
    console.error('Sign in error:', error)
    return {
      user: null,
      error: getAuthErrorMessage(error.code),
    }
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<{
  user: AuthUser | null
  error: string | null
}> {
  try {
    const provider = new GoogleAuthProvider()
    const userCredential = await signInWithPopup(auth, provider)
    const user = userCredential.user

    // Check if user document exists, create if not
    const userDoc = await getDoc(doc(db, 'users', user.uid))
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        emailVerified: user.emailVerified,
        preferences: {},
      })
    } else {
      // Update last login
      await setDoc(
        doc(db, 'users', user.uid),
        {
          lastLogin: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    }

    return {
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
      },
      error: null,
    }
  } catch (error: any) {
    console.error('Google sign in error:', error)
    return {
      user: null,
      error: getAuthErrorMessage(error.code),
    }
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ error: string | null }> {
  try {
    await firebaseSignOut(auth)
    return { error: null }
  } catch (error: any) {
    console.error('Sign out error:', error)
    return { error: 'Failed to sign out. Please try again.' }
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  try {
    await sendPasswordResetEmail(auth, email)
    return { error: null }
  } catch (error: any) {
    console.error('Password reset error:', error)
    return { error: getAuthErrorMessage(error.code) }
  }
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser
}

/**
 * Listen to authentication state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}

/**
 * Convert Firebase auth error codes to user-friendly messages
 */
function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.'
    case 'auth/invalid-email':
      return 'Invalid email address.'
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.'
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.'
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.'
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up.'
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.'
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.'
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed. Please try again.'
    default:
      return 'An error occurred. Please try again.'
  }
}
