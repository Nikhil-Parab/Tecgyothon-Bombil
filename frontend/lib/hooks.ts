/**
 * Custom React Hooks for Remo Application
 */

import { useState, useEffect, useCallback } from 'react'
import * as api from './api'

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
  content?: any
}

/**
 * Hook for managing chats with API integration
 */
export function useChats(userId?: string) {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch chats on mount
  useEffect(() => {
    const loadChats = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.fetchChats(userId)
        setChats(data)
      } catch (err) {
        console.error('Failed to load chats:', err)
        setError('Failed to load chats. Please try again.')
        // Fall back to default chat if loading fails
        setChats([getDefaultChat()])
      } finally {
        setLoading(false)
      }
    }

    loadChats()
  }, [userId])

  // Create new chat
  const createChat = useCallback(async (title: string, icon: string = '💬') => {
    try {
      const newChat = await api.createChat({ title, icon, userId })
      setChats(prev => [newChat, ...prev])
      return newChat
    } catch (err) {
      console.error('Failed to create chat:', err)
      // Fallback to local creation
      const localChat: Chat = {
        id: `local-${Date.now()}`,
        title,
        icon,
        isPinned: false,
        createdAt: new Date(),
        isChat: true,
        messages: [],
      }
      setChats(prev => [localChat, ...prev])
      return localChat
    }
  }, [userId])

  // Update chat
  const updateChat = useCallback(async (
    chatId: string, 
    updates: Partial<Pick<Chat, 'title' | 'isPinned' | 'icon'>>
  ) => {
    try {
      const updatedChat = await api.updateChat(chatId, updates)
      setChats(prev => prev.map(c => c.id === chatId ? updatedChat : c))
      return updatedChat
    } catch (err) {
      console.error('Failed to update chat:', err)
      // Fallback to local update
      setChats(prev => prev.map(c => 
        c.id === chatId ? { ...c, ...updates } : c
      ))
    }
  }, [])

  // Delete chat
  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await api.deleteChat(chatId)
      setChats(prev => prev.filter(c => c.id !== chatId))
    } catch (err) {
      console.error('Failed to delete chat:', err)
      // Still remove locally even if API fails
      setChats(prev => prev.filter(c => c.id !== chatId))
    }
  }, [])

  // Add message to chat
  const addMessage = useCallback((chatId: string, message: ChatMessage) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId
        ? { ...chat, messages: [...chat.messages, message] }
        : chat
    ))
  }, [])

  return {
    chats,
    loading,
    error,
    createChat,
    updateChat,
    deleteChat,
    addMessage,
  }
}

/**
 * Hook for sending messages and getting AI responses
 */
export function useAIChat() {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (
    chatId: string, 
    text: string, 
    userId?: string
  ) => {
    try {
      setSending(true)
      setError(null)
      
      const response = await api.sendMessage({ chatId, text, userId })
      return response
    } catch (err) {
      console.error('Failed to send message:', err)
      setError('Failed to send message. Please try again.')
      
      // Fallback to dummy response
      return {
        text: getDummyResponse(text),
      }
    } finally {
      setSending(false)
    }
  }, [])

  return {
    sendMessage,
    sending,
    error,
  }
}

// Helper function to create default chat
function getDefaultChat(): Chat {
  return {
    id: 'home-1',
    title: 'Home',
    icon: '🏠',
    isPinned: true,
    createdAt: new Date(),
    isChat: false,
    messages: [],
    content: {
      policies: [
        { icon: '💰', title: 'Expense Policy' },
        { icon: '🏖️', title: 'Vacation & PTO' },
        { icon: '📖', title: 'Employee Handbook' },
      ],
      priorities: [
        'Customer-centric growth by accelerating product innovation',
        'Expanding into priority markets',
        'Deepening enterprise relationships',
      ],
      company: [
        { icon: '📊', title: 'Annual Strategy' },
        { icon: '🎉', title: "What's New?" },
        { icon: '🏖️', title: 'Meetings' },
        { icon: '📖', title: 'Docs' },
        { icon: '👥', title: 'Teams & Org Chart' },
      ],
      roadmap: [
        { task: 'Enter two priority geographies', dri: 'Kameron Shiller', status: 'Start' },
        { task: 'Launch AI-assisted onboarding', dri: 'Luca Beetz', status: 'Start' },
        { task: 'Migrate legacy services to modern cloud', dri: 'Jordan Scales', status: 'Scheduled' },
        { task: 'Build enterprise GTM capabilities', dri: 'Jordan Scales', status: 'Not started' },
      ],
    },
  }
}

// Dummy AI response generator (fallback)
function getDummyResponse(userMessage: string): string {
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
