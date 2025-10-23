/**
 * API Client for Remo with Firebase Firestore
 * 
 * This module handles all database operations using Firebase Firestore:
 * - Chat management
 * - Message handling
 * - AI interactions
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export type ChatMessage = {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

export type Chat = {
  id: string
  title: string
  icon: string
  isPinned: boolean
  createdAt: Date
  isChat: boolean
  messages: ChatMessage[]
  userId?: string
  content?: any
}

export type CreateChatRequest = {
  title: string
  icon: string
  userId?: string
}

export type SendMessageRequest = {
  chatId: string
  text: string
  userId?: string
}

export type AIResponse = {
  text: string
  confidence?: number
  sources?: string[]
}

/**
 * Convert Firestore timestamp to Date
 */
function toDate(timestamp: any): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate()
  }
  if (timestamp?.toDate) {
    return timestamp.toDate()
  }
  return new Date(timestamp)
}

/**
 * Fetches all chats for a user
 */
export async function fetchChats(userId?: string): Promise<Chat[]> {
  try {
    const chatsRef = collection(db, 'chats')
    let q = query(chatsRef, orderBy('createdAt', 'desc'))
    
    if (userId) {
      q = query(chatsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'))
    }
    
    const querySnapshot = await getDocs(q)
    const chats: Chat[] = []
    
    for (const docSnap of querySnapshot.docs) {
      const chatData = docSnap.data()
      
      // Fetch messages for this chat
      const messagesRef = collection(db, 'chats', docSnap.id, 'messages')
      const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'))
      const messagesSnapshot = await getDocs(messagesQuery)
      
      const messages: ChatMessage[] = messagesSnapshot.docs.map(msgDoc => ({
        id: msgDoc.id,
        ...msgDoc.data(),
        timestamp: toDate(msgDoc.data().timestamp),
      })) as ChatMessage[]
      
      chats.push({
        id: docSnap.id,
        title: chatData.title,
        icon: chatData.icon || '💬',
        isPinned: chatData.isPinned || false,
        createdAt: toDate(chatData.createdAt),
        isChat: chatData.isChat !== undefined ? chatData.isChat : true,
        messages,
        userId: chatData.userId,
        content: chatData.content,
      })
    }
    
    return chats
  } catch (error) {
    console.error('Error fetching chats:', error)
    throw error
  }
}

/**
 * Creates a new chat
 */
export async function createChat(data: CreateChatRequest): Promise<Chat> {
  try {
    const chatData = {
      title: data.title,
      icon: data.icon || '💬',
      isPinned: false,
      isChat: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      userId: data.userId || undefined,
      content: {},
    }
    
    const docRef = await addDoc(collection(db, 'chats'), chatData)
    
    return {
      id: docRef.id,
      ...chatData,
      createdAt: new Date(),
      messages: [],
    }
  } catch (error) {
    console.error('Error creating chat:', error)
    throw error
  }
}

/**
 * Adds a message to a chat
 */
export async function addMessage(
  chatId: string,
  text: string,
  isUser: boolean,
  userId?: string
): Promise<ChatMessage> {
  try {
    const messageData = {
      text,
      isUser,
      timestamp: serverTimestamp(),
      userId: userId || null,
    }
    
    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const docRef = await addDoc(messagesRef, messageData)
    
    // Update chat's lastMessageAt
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    
    return {
      id: docRef.id,
      ...messageData,
      timestamp: new Date(),
    }
  } catch (error) {
    console.error('Error adding message:', error)
    throw error
  }
}

/**
 * Sends a message and gets AI response (dummy for now)
 */
export async function sendMessage(data: SendMessageRequest): Promise<AIResponse> {
  try {
    // Add user message to Firestore
    await addMessage(data.chatId, data.text, true, data.userId)
    
    // Generate AI response (dummy data - replace with actual AI service)
    const aiText = getAIResponse(data.text)
    
    // Add AI response to Firestore
    await addMessage(data.chatId, aiText, false)
    
    return {
      text: aiText,
      confidence: 0.95,
    }
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}

/**
 * Updates a chat (title, pinned status, etc.)
 */
export async function updateChat(
  chatId: string,
  updates: Partial<Pick<Chat, 'title' | 'isPinned' | 'icon'>>
): Promise<Chat> {
  try {
    const chatRef = doc(db, 'chats', chatId)
    
    await updateDoc(chatRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
    
    const chatDoc = await getDoc(chatRef)
    if (!chatDoc.exists()) {
      throw new Error('Chat not found')
    }
    
    const chatData = chatDoc.data()
    
    // Fetch messages
    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'))
    const messagesSnapshot = await getDocs(messagesQuery)
    
    const messages: ChatMessage[] = messagesSnapshot.docs.map(msgDoc => ({
      id: msgDoc.id,
      ...msgDoc.data(),
      timestamp: toDate(msgDoc.data().timestamp),
    })) as ChatMessage[]
    
    return {
      id: chatDoc.id,
      title: chatData.title,
      icon: chatData.icon,
      isPinned: chatData.isPinned,
      createdAt: toDate(chatData.createdAt),
      isChat: chatData.isChat,
      messages,
      userId: chatData.userId,
      content: chatData.content,
    }
  } catch (error) {
    console.error('Error updating chat:', error)
    throw error
  }
}

/**
 * Deletes a chat
 */
export async function deleteChat(chatId: string): Promise<void> {
  try {
    // Delete all messages in the chat
    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const messagesSnapshot = await getDocs(messagesRef)
    
    const deletePromises = messagesSnapshot.docs.map(msgDoc => deleteDoc(msgDoc.ref))
    await Promise.all(deletePromises)
    
    // Delete the chat document
    await deleteDoc(doc(db, 'chats', chatId))
  } catch (error) {
    console.error('Error deleting chat:', error)
    throw error
  }
}

/**
 * Fetches messages for a specific chat
 */
export async function fetchChatMessages(chatId: string): Promise<ChatMessage[]> {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const q = query(messagesRef, orderBy('timestamp', 'asc'))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: toDate(doc.data().timestamp),
    })) as ChatMessage[]
  } catch (error) {
    console.error('Error fetching messages:', error)
    throw error
  }
}

/**
 * Dummy AI response generator
 * TODO: Replace with actual AI service (OpenAI, Claude, etc.)
 */
function getAIResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase()
  
  if (lowerMessage.includes('how are you') || lowerMessage.includes('how r u')) {
    return "I'm doing great, thank you for asking! 😊 I'm here to help you with your workspace, answer questions, and assist with various tasks. How can I help you today?"
  }
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! 👋 Welcome to Remo. I'm your AI assistant ready to help you manage your workspace and answer any questions you might have."
  }
  if (lowerMessage.includes('what can you do')) {
    return "I can help you with:\n\n• Managing company policies and documentation\n• Tracking roadmap and priorities\n• Answering questions about your workspace\n• Creating and organizing content\n• Providing insights and suggestions\n\nWhat would you like to know more about?"
  }
  if (lowerMessage.includes('help')) {
    return "I'm here to assist you! You can ask me about:\n\n📊 Company strategies and roadmaps\n📖 Policies and documentation\n🎯 Team priorities\n💡 Workspace organization\n\nJust type your question and I'll do my best to help!"
  }
  
  return `I understand you're asking about "${userMessage}". I'm here to help! Could you provide more context or ask about company policies, roadmaps, or team priorities?`
}
