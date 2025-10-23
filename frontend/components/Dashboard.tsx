'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Plus,
  MessageSquare,
  Star,
  MoreHorizontal,
  Trash2,
  Edit2,
  Check,
  X,
  Send,
  Sparkles,
  Search,
  Calendar,
  User,
  Settings,
  Home,
  FileText,
  Clock,
} from 'lucide-react'
import RightPanel from './RightPanel'
import Link from 'next/link'

type ChatMessage = {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

type Page = {
  id: string
  title: string
  icon: string
  isPinned?: boolean
  createdAt: Date
  isChat: boolean
  messages?: ChatMessage[]
  content: {
    policies: Array<{ icon: string; title: string }>
    priorities: string[]
    company: Array<{ icon: string; title: string }>
    roadmap: Array<{ task: string; dri: string; status: string }>
  }
}

export default function CompanyHub() {
  const [showPanel, setShowPanel] = useState(false)
  const [pages, setPages] = useState<Page[]>([
    {
      id: 'home-1',
      title: 'Home',
      icon: '🏠',
      isPinned: true,
      createdAt: new Date(),
      isChat: false,
      content: {
        policies: [
          { icon: '📝', title: 'Expense Policy' },
          { icon: '🗓️', title: 'Vacation & PTO' },
          { icon: '📖', title: 'Employee Handbook' },
        ],
        priorities: [
          'Customer-centric growth by accelerating product innovation',
          'Expanding into priority markets',
          'Deepening enterprise relationships',
        ],
        company: [
          { icon: '📊', title: 'Annual Strategy' },
          { icon: '✨', title: "What's New?" },
          { icon: '🗓️', title: 'Meetings' },
          { icon: '📄', title: 'Docs' },
          { icon: '👥', title: 'Teams & Org Chart' },
        ],
        roadmap: [
          { task: 'Enter two priority geographies', dri: 'Kameron Shiller', status: 'Start' },
          { task: 'Launch AI-assisted onboarding', dri: 'Luca Beetz', status: 'Start' },
          { task: 'Migrate legacy services to modern cloud', dri: 'Jordan Scales', status: 'Scheduled' },
          { task: 'Build enterprise GTM capabilities', dri: 'Jordan Scales', status: 'Not started' },
        ],
      },
    },
  ])

  const [currentPage, setCurrentPage] = useState('home-1')
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  const currentPageData = pages.find(p => p.id === currentPage)

  // Scroll to bottom of chat
  useEffect(() => {
    if (currentPageData?.isChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentPageData?.messages, currentPageData?.isChat])

  const addNewPage = () => {
    const newPage: Page = {
      id: `page-${Date.now()}`,
      title: 'New Chat',
      icon: '💬',
      isPinned: false,
      createdAt: new Date(),
      isChat: true,
      messages: [],
      content: {
        policies: [],
        priorities: [],
        company: [],
        roadmap: [],
      },
    }
    setPages([...pages, newPage])
    setCurrentPage(newPage.id)
    setShowPanel(true)
  }

  // Dummy AI responses
  const getAIResponse = (userMessage: string): string => {
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
    
    // Default response
    return `I understand you're asking about "${userMessage}". While I don't have specific information on that right now (backend integration pending), I'm here to help! Could you provide more context or ask about company policies, roadmaps, or team priorities?`
  }

  const sendMessage = () => {
    if (!inputMessage.trim() || !currentPageData) return

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    }

    // If this is not a chat page, create a new chat
    if (!currentPageData.isChat) {
      const newChatPage: Page = {
        id: `chat-${Date.now()}`,
        title: inputMessage.slice(0, 30) + (inputMessage.length > 30 ? '...' : ''),
        icon: '💬',
        isPinned: false,
        createdAt: new Date(),
        isChat: true,
        messages: [userMsg],
        content: {
          policies: [],
          priorities: [],
          company: [],
          roadmap: [],
        },
      }

      // Simulate AI response after a short delay
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          text: getAIResponse(inputMessage),
          isUser: false,
          timestamp: new Date(),
        }
        
        setPages(prevPages => 
          prevPages.map(p => 
            p.id === newChatPage.id 
              ? { ...p, messages: [...(p.messages || []), aiResponse] }
              : p
          )
        )
      }, 800)

      setPages([newChatPage, ...pages])
      setCurrentPage(newChatPage.id)
      setInputMessage('')
      setShowPanel(false)
      return
    }

    // Add message to existing chat
    setPages(pages.map(p => 
      p.id === currentPage 
        ? { ...p, messages: [...(p.messages || []), userMsg] }
        : p
    ))

    setInputMessage('')

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        text: getAIResponse(userMsg.text),
        isUser: false,
        timestamp: new Date(),
      }
      
      setPages(prevPages => 
        prevPages.map(p => 
          p.id === currentPage 
            ? { ...p, messages: [...(p.messages || []), aiResponse] }
            : p
        )
      )
    }, 800)
  }

  const deletePage = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (pages.length <= 1) return // Keep at least one page
    
    const newPages = pages.filter(p => p.id !== pageId)
    setPages(newPages)
    
    if (currentPage === pageId) {
      setCurrentPage(newPages[0].id)
    }
  }

  const togglePin = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPages(pages.map(p => 
      p.id === pageId ? { ...p, isPinned: !p.isPinned } : p
    ))
  }

  const startEditing = (pageId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPageId(pageId)
    setEditingTitle(title)
  }

  const saveEdit = () => {
    if (editingPageId && editingTitle.trim()) {
      setPages(pages.map(p => 
        p.id === editingPageId ? { ...p, title: editingTitle.trim() } : p
      ))
    }
    setEditingPageId(null)
    setEditingTitle('')
  }

  const cancelEdit = () => {
    setEditingPageId(null)
    setEditingTitle('')
  }

  // Sort pages: pinned first, then by creation date
  const sortedPages = [...pages].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 bg-linear-to-b from-stone-50 to-stone-100 border-r border-stone-200 flex flex-col shadow-sm">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-stone-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-800">Remo</span>
            </div>
          </div>
          
          {/* New Chat Button */}
          <button
            onClick={addNewPage}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New Chat</span>
          </button>
        </div>

        {/* Pages List */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 px-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Recent Chats</span>
          </div>
          
          {sortedPages.map(page => (
            <div
              key={page.id}
              onClick={() => setCurrentPage(page.id)}
              onMouseEnter={() => setHoveredPageId(page.id)}
              onMouseLeave={() => setHoveredPageId(null)}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer mb-1 transition-all ${
                currentPage === page.id 
                  ? 'bg-white shadow-sm border border-stone-200' 
                  : 'hover:bg-white/50'
              }`}
            >
              {editingPageId === page.id ? (
                <>
                  <span className="text-lg">{page.icon}</span>
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit()
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    className="flex-1 text-sm bg-transparent border-b border-stone-300 focus:outline-none focus:border-stone-500 px-1"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      saveEdit()
                    }}
                    className="p-1 hover:bg-stone-200 rounded"
                  >
                    <Check className="w-3 h-3 text-green-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      cancelEdit()
                    }}
                    className="p-1 hover:bg-stone-200 rounded"
                  >
                    <X className="w-3 h-3 text-red-600" />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-lg">{page.icon}</span>
                  <span className="text-sm flex-1 truncate text-stone-700">{page.title}</span>
                  
                  {(hoveredPageId === page.id || page.isPinned) && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => togglePin(page.id, e)}
                        className="p-1 hover:bg-stone-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title={page.isPinned ? 'Unpin' : 'Pin'}
                      >
                        <Star 
                          className={`w-3.5 h-3.5 ${
                            page.isPinned 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-stone-400'
                          }`} 
                        />
                      </button>
                      <button
                        onClick={(e) => startEditing(page.id, page.title, e)}
                        className="p-1 hover:bg-stone-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                      </button>
                      {pages.length > 1 && (
                        <button
                          onClick={(e) => deletePage(page.id, e)}
                          className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-stone-200 bg-white">
          <div className="text-xs text-stone-500 text-center">
            <span className="font-medium text-stone-700">{pages.length}</span> chat{pages.length !== 1 ? 's' : ''} total
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto bg-white transition-all duration-300 ${
        showPanel ? 'mr-96' : 'mr-0'
      }`}>
        {currentPageData?.isChat ? (
          /* Chat Interface */
          <div className="h-full flex flex-col">
            {/* Chat Header */}
            <div className="border-b border-stone-200 px-8 py-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-stone-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    {currentPageData.title}
                  </h1>
                  <p className="text-stone-500 text-sm mt-0.5">
                    Chat with AI assistant
                  </p>
                </div>
                <button
                  onClick={() => setShowPanel(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Ask AI</span>
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto space-y-6">
                {currentPageData.messages && currentPageData.messages.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-stone-600 mb-2">
                      Start a conversation
                    </h3>
                    <p className="text-stone-500 text-sm">
                      Ask me anything about your workspace, policies, or roadmap
                    </p>
                  </div>
                ) : (
                  currentPageData.messages?.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                          msg.isUser
                            ? 'bg-stone-800 text-white'
                            : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!msg.isUser && (
                            <Sparkles className="w-4 h-4 mt-0.5 text-purple-500 shrink-0" />
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.text}
                          </p>
                        </div>
                        <p
                          className={`text-xs mt-2 ${
                            msg.isUser ? 'text-stone-300' : 'text-stone-500'
                          }`}
                        >
                          {msg.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Chat Input */}
            <div className="border-t border-stone-200 p-6 bg-white">
              <div className="max-w-3xl mx-auto">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Ask AI anything..."
                    className="flex-1 px-4 py-3 border border-stone-300 rounded-xl text-sm focus:outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim()}
                    className="px-5 py-3 bg-stone-800 text-white rounded-xl hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span className="text-sm font-medium">Send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Home/Default Content */
          <div className="p-10">
            <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 flex items-center gap-2">
                🤖 The AI That Thinks With You
              </h1>
              <p className="text-stone-500 text-sm mt-1">
                A cognitive workspace that grows smarter with your team.
              </p>
            </div>
            <button
              onClick={() => setShowPanel(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ask AI</span>
            </button>
          </div>

          {/* Problem Section */}
          <section className="mb-10">
            <h2 className="text-lg font-medium text-stone-700 mb-3">Problem</h2>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 text-stone-700 leading-relaxed">
              <p>
                Modern teams are overwhelmed by information spread across emails, chats, and meetings.
                While tools exist to manage tasks, none truly understand the “why” behind decisions or
                retain long-term context.
              </p>
              <p className="mt-3">
                As a result, teams lose continuity, repeat work, and struggle to recall past decisions or reasoning —
                reducing overall efficiency and innovation.
              </p>
            </div>
          </section>

          {/* Solution Section */}
          <section>
            <h2 className="text-lg font-medium text-stone-700 mb-3">What can be done</h2>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 text-stone-700 leading-relaxed space-y-3">
              <p>
                Create an <strong>AI-powered cognitive workspace</strong> that continuously learns from
                user interactions, summarizing discussions, identifying decisions, and suggesting contextual
                next steps.
              </p>
              <p>
                It would act as a <strong>shared memory layer</strong> for teams, integrating with tools like
                Slack, Notion, or Google Workspace — enabling AI-assisted recall, smart summaries, and
                decision tracking.
              </p>
              <p>
                Over time, <strong>Remo</strong> could predict workflow bottlenecks and recommend improvements
                based on behavioral data — helping teams not just work faster, but think smarter.
              </p>
            </div>
          </section>

          {/* Optional Quick Insights Section */}
          <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-stone-200 rounded-xl p-4 bg-white hover:shadow-sm transition">
              <h3 className="font-medium text-stone-700 mb-2">💡 Key Insight</h3>
              <p className="text-sm text-stone-600">
                AI can bridge the gap between information and intent — capturing context that traditional tools miss.
              </p>
            </div>
            <div className="border border-stone-200 rounded-xl p-4 bg-white hover:shadow-sm transition">
              <h3 className="font-medium text-stone-700 mb-2">📈 Vision</h3>
              <p className="text-sm text-stone-600">
                A workspace that doesn’t just store knowledge, but helps your team *think*, *decide*, and *evolve* together.
              </p>
            </div>
          </section>
            </div>
          </div>
        )}
      </main>

      {/* Right Panel */}
      <RightPanel 
        isVisible={showPanel} 
        onClose={() => setShowPanel(false)}
        onRoadmapCreated={(roadmap) => console.log('Roadmap created:', roadmap)}
        onSummaryCreated={(summary) => console.log('Summary created:', summary)}
        onTasksCreated={(tasks) => console.log('Tasks created:', tasks)}
      />
    </div>
  )
}
