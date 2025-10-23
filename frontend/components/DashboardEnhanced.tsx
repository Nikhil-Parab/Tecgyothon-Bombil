'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Brain,
  Zap,
  TrendingUp,
  Users,
  Clock,
  Archive,
  Search,
  Filter,
  Settings,
  Bell,
  User as UserIcon,
  Lightbulb,
  Target,
  AlertCircle,
  ChevronDown,
  Layers,
} from 'lucide-react';
import RightPanel from './RightPanel';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { RemoTheme } from '@/lib/theme';

type ChatMessage = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  context?: {
    relatedDecisions?: string[];
    suggestedExperts?: string[];
    conflictWarning?: string;
  };
};

type Page = {
  id: string;
  title: string;
  icon: string;
  isPinned?: boolean;
  createdAt: Date;
  isChat: boolean;
  messages?: ChatMessage[];
  tags?: string[];
  category?: 'discussion' | 'decision' | 'brainstorm' | 'review';
};

export default function DashboardEnhanced() {
  const { user } = useAuth();
  const router = useRouter();
  const [showPanel, setShowPanel] = useState(false);
  const [pages, setPages] = useState<Page[]>([
    {
      id: 'welcome-chat',
      title: 'Welcome to Remo',
      icon: '🧠',
      isPinned: true,
      createdAt: new Date(),
      isChat: true,
      category: 'discussion',
      tags: ['welcome', 'getting-started'],
      messages: [
        {
          id: 'welcome-1',
          text: "Welcome to Remo - Your Cognitive Workspace! 🚀\n\nI'm your AI assistant designed to help you collaborate smarter. Here's what I can do:\n\n🧠 **Contextual Memory**: I remember past decisions and conversations\n💡 **Proactive Suggestions**: I'll suggest relevant context and experts\n⚡ **Conflict Detection**: I'll warn you about overlapping or contradictory initiatives\n🎯 **Decision Tracking**: I'll help identify and track important decisions\n\nTry asking me something or start a new conversation!",
          isUser: false,
          timestamp: new Date(Date.now() - 3600000),
        },
      ],
    },
  ]);

  const [currentPage, setCurrentPage] = useState('welcome-chat');
  const [currentView, setCurrentView] = useState<'chat' | 'roadmap' | 'document'>('chat');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [aiTasks, setAiTasks] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentPageData = pages.find((p) => p.id === currentPage);

  // Handlers for AI-generated content
  const handleRoadmapCreated = (roadmap: any) => {
    console.log('Roadmap created:', roadmap);
    setRoadmaps((prev) => [roadmap, ...prev]);
    setCurrentView('roadmap');
    // Optionally show a notification or update UI
  };

  const handleSummaryCreated = (summary: any) => {
    console.log('Summary created:', summary);
    setSummaries((prev) => [summary, ...prev]);
    // Optionally show a notification or update UI
  };

  const handleTasksCreated = (tasks: any[]) => {
    console.log('Tasks created:', tasks);
    setAiTasks((prev) => [...prev, ...tasks]);
    // Optionally show a notification or update UI
  };

  // Scroll to bottom of chat
  useEffect(() => {
    if (currentPageData?.isChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentPageData?.messages, currentPageData?.isChat]);

  // Enhanced AI response with context
  const getAIResponse = (userMessage: string): ChatMessage => {
    const lowerMessage = userMessage.toLowerCase();
    let text = '';
    let context = {};

    if (lowerMessage.includes('decision') || lowerMessage.includes('decide')) {
      text = `I'll help you make this decision! Based on your workspace history:\n\n📊 **Similar Past Decisions:**\n• Q3 Marketing Budget (2 weeks ago) - Decided to focus on digital channels\n• Product Roadmap (1 month ago) - Prioritized AI features\n\n👥 **Recommended Experts to Consult:**\n• Sarah Chen (Product Strategy)\n• Marcus Rodriguez (Analytics)\n\n💡 **Key Considerations:**\nBased on past patterns, decisions in this area typically involve cross-team alignment and data validation.`;
      context = {
        relatedDecisions: ['Q3 Marketing Budget', 'Product Roadmap'],
        suggestedExperts: ['Sarah Chen', 'Marcus Rodriguez'],
      };
    } else if (lowerMessage.includes('marketing') || lowerMessage.includes('campaign')) {
      text = `📢 **Marketing Context Detected**\n\nI found relevant information from your workspace:\n\n⚠️ **Overlap Warning**: There's already an active marketing initiative in #marketing-team (started 3 days ago)\n\n📚 **Past Context:**\n• Last marketing campaign achieved 23% conversion\n• Budget constraints were discussed in Q4 planning\n\n🎯 **Suggested Next Steps:**\n1. Review existing campaign to avoid duplication\n2. Consult with Emily Watson (Marketing lead)\n3. Check available budget allocation`;
      context = {
        conflictWarning: 'Active marketing initiative detected in #marketing-team',
        suggestedExperts: ['Emily Watson'],
      };
    } else if (lowerMessage.includes('team') || lowerMessage.includes('collaborate')) {
      text = `👥 **Team Collaboration Insights**\n\nBased on your workspace patterns:\n\n🔥 **Most Active Collaborators:**\n• Sarah Chen - 34 interactions this month\n• Marcus Rodriguez - 28 interactions\n\n💡 **Expertise Mapping:**\n• For Engineering questions: Sarah Chen\n• For Design feedback: Marcus Rodriguez\n• For Analytics: Emily Watson\n\n⚡ **Flow State Alert:**\nSarah Chen is currently in deep work mode (started 2h ago). Consider async communication.`;
      context = {
        suggestedExperts: ['Sarah Chen', 'Marcus Rodriguez', 'Emily Watson'],
      };
    } else if (lowerMessage.includes('roadmap') || lowerMessage.includes('priority')) {
      text = `🎯 **Roadmap Created Successfully!**\n\nI've generated a comprehensive roadmap view based on current priorities:\n\n📋 **Included Sections:**\n1. Company priorities and policies\n2. Strategic roadmap with timelines\n3. Team assignments and status tracking\n\n🔄 **Related Past Discussions:**\n• "Q4 Product Strategy" - 2 weeks ago\n• "Tech Stack Modernization" - 1 month ago\n\n✨ **The roadmap is now displayed in the main view. You can see:**\n• Launch AI-assisted onboarding\n• Enter two priority geographies\n• Migrate legacy services to modern cloud\n• Build enterprise GTM capabilities\n\n📊 **Switch to roadmap view to see the full interactive roadmap!**`;
      context = {
        relatedDecisions: ['Q4 Product Strategy', 'Tech Stack Modernization'],
        conflictWarning: 'Timeline conflict detected',
      };
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      text = `Hello! 👋 I'm Remo, your cognitive workspace assistant.\n\nI have context from ${pages.length} conversations and 43 team decisions. How can I help you today?\n\n💡 **Quick suggestions:**\n• "What decisions were made about the product roadmap?"\n• "Who should I talk to about marketing?"\n• "Show me recent team priorities"`;
    } else {
      text = `I understand you're asking about "${userMessage}". \n\n🧠 **Contextual Analysis:**\nLet me search the workspace memory...\n\n📊 **Related Context:**\n• No exact matches found, but this topic is related to recent discussions in #product-team\n• Sarah Chen mentioned something similar last week\n\n💡 **Suggestion:**\nWould you like me to:\n1. Search for similar past discussions?\n2. Connect you with relevant team members?\n3. Create a decision tracking document?`;
    }

    return {
      id: `msg-${Date.now()}-ai`,
      text,
      isUser: false,
      timestamp: new Date(),
      context,
    };
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !currentPageData) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    // If this is not a chat page, create a new chat
    if (!currentPageData.isChat) {
      const newChatPage: Page = {
        id: `chat-${Date.now()}`,
        title: inputMessage.slice(0, 30) + (inputMessage.length > 30 ? '...' : ''),
        icon: '💬',
        isPinned: false,
        createdAt: new Date(),
        isChat: true,
        category: 'discussion',
        tags: ['new'],
        messages: [userMsg],
      };

      setIsThinking(true);

      // Simulate AI response with thinking delay
      setTimeout(() => {
        const aiResponse = getAIResponse(inputMessage);

        setPages((prevPages) =>
          prevPages.map((p) =>
            p.id === newChatPage.id ? { ...p, messages: [...(p.messages || []), aiResponse] } : p
          )
        );
        setIsThinking(false);

        // Check if the message contains roadmap keywords and switch to roadmap view
        const lowerMessage = inputMessage.toLowerCase();
        if (lowerMessage.includes('roadmap') || lowerMessage.includes('create roadmap') || lowerMessage.includes('show roadmap')) {
          setTimeout(() => {
            setCurrentView('roadmap');
          }, 500); // Small delay to let the message appear first
        }
      }, 1200);

      setPages([newChatPage, ...pages]);
      setCurrentPage(newChatPage.id);
      setInputMessage('');
      setShowPanel(false);
      return;
    }

    // Add message to existing chat
    setPages(
      pages.map((p) => (p.id === currentPage ? { ...p, messages: [...(p.messages || []), userMsg] } : p))
    );

    setInputMessage('');
    setIsThinking(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = getAIResponse(userMsg.text);

      setPages((prevPages) =>
        prevPages.map((p) =>
          p.id === currentPage ? { ...p, messages: [...(p.messages || []), aiResponse] } : p
        )
      );
      setIsThinking(false);

      // Check if the message contains roadmap keywords and switch to roadmap view
      const lowerMessage = userMsg.text.toLowerCase();
      if (lowerMessage.includes('roadmap') || lowerMessage.includes('create roadmap') || lowerMessage.includes('show roadmap')) {
        setTimeout(() => {
          setCurrentView('roadmap');
        }, 500); // Small delay to let the message appear first
      }
    }, 1200);
  };

  const addNewPage = () => {
    const newPage: Page = {
      id: `page-${Date.now()}`,
      title: 'New Conversation',
      icon: '💬',
      isPinned: false,
      createdAt: new Date(),
      isChat: true,
      category: 'discussion',
      tags: ['new'],
      messages: [],
    };
    setPages([newPage, ...pages]);
    setCurrentPage(newPage.id);
    setShowPanel(true);
  };

  const deletePage = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pages.length <= 1) return;

    const newPages = pages.filter((p) => p.id !== pageId);
    setPages(newPages);

    if (currentPage === pageId) {
      setCurrentPage(newPages[0].id);
    }
  };

  const togglePin = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPages(pages.map((p) => (p.id === pageId ? { ...p, isPinned: !p.isPinned } : p)));
  };

  const startEditing = (pageId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPageId(pageId);
    setEditingTitle(title);
  };

  const saveEdit = () => {
    if (editingPageId && editingTitle.trim()) {
      setPages(pages.map((p) => (p.id === editingPageId ? { ...p, title: editingTitle.trim() } : p)));
    }
    setEditingPageId(null);
    setEditingTitle('');
  };

  const cancelEdit = () => {
    setEditingPageId(null);
    setEditingTitle('');
  };

  // Filter pages by search and category
  const filteredPages = pages.filter((page) => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || page.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort pages: pinned first, then by creation date
  const sortedPages = [...filteredPages].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'decision':
        return 'bg-gray-200 text-gray-800';
      case 'brainstorm':
        return 'bg-gray-300 text-gray-900';
      case 'review':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      {/* Main Content - Full Width */}
      <div className={`h-full flex flex-col transition-all duration-300 ${showPanel ? 'mr-96' : ''}`}>
        {/* Premium Header */}
        <div className="bg-white border-b-2 border-gray-100 shadow-sm">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-3xl">
                  {currentView === 'roadmap' ? '📍' : currentPageData?.icon}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-black">
                    {currentView === 'roadmap' ? 'Roadmap View' : currentPageData?.title}
                  </h1>
                  {currentView === 'roadmap' ? (
                    <div className="flex items-center gap-3 mt-2">
                      <span className="px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm bg-black text-white">
                        ROADMAP
                      </span>
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium border border-gray-200">
                        #company
                      </span>
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium border border-gray-200">
                        #strategy
                      </span>
                    </div>
                  ) : currentPageData?.category && (
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm ${
                        currentPageData.category === 'discussion' 
                          ? 'bg-black text-white' 
                          : 'bg-gray-200 text-gray-800'
                      }`}>
                        {currentPageData.category.toUpperCase()}
                      </span>
                      {currentPageData.tags?.map((tag, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium border border-gray-200">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="p-3 hover:bg-gray-100 rounded-xl transition-all duration-200 shadow-sm border border-gray-200" title="Notifications">
                  <Bell className="w-5 h-5 text-gray-700" />
                </button>
                <button className="p-3 hover:bg-gray-100 rounded-xl transition-all duration-200 shadow-sm border border-gray-200" title="Settings">
                  <Settings className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={() => setShowPanel(!showPanel)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-200 font-bold shadow-md ${
                    showPanel
                      ? 'bg-black text-white shadow-lg'
                      : 'bg-white text-gray-800 hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  <span>AI Assistant</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Content Area */}
        {currentView === 'chat' && currentPageData?.isChat ? (
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="max-w-5xl mx-auto px-8 py-8">
              {currentPageData.messages && currentPageData.messages.length > 0 ? (
                currentPageData.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'} mb-8`}>
                    <div className={`max-w-[75%] ${msg.isUser ? 'order-2' : 'order-1'}`}>
                      {/* Enhanced Message Bubble */}
                      <div
                        className={`rounded-2xl px-6 py-5 shadow-md border-2 ${
                          msg.isUser
                            ? 'bg-black text-white border-black'
                            : 'bg-white border-gray-200 shadow-lg'
                        }`}
                      >
                        {!msg.isUser && (
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center shadow-sm">
                              <Brain className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-black text-sm">Bombil AI</span>
                          </div>
                        )}
                        <p className={`whitespace-pre-line text-sm leading-relaxed font-medium ${msg.isUser ? 'text-white' : 'text-gray-900'}`}>
                          {msg.text}
                        </p>
                        <p className={`text-xs mt-4 font-medium ${msg.isUser ? 'text-white/80' : 'text-gray-600'}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Enhanced Context Cards (for AI messages) */}
                      {!msg.isUser && msg.context && (
                        <div className="mt-4 space-y-3">
                          {msg.context.conflictWarning && (
                            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                              <div className="text-sm text-yellow-900">
                                <strong className="font-bold">Overlap Detected:</strong> {msg.context.conflictWarning}
                              </div>
                            </div>
                          )}
                          {msg.context.suggestedExperts && msg.context.suggestedExperts.length > 0 && (
                            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
                              <div className="flex items-center gap-3 mb-3">
                                <Users className="w-5 h-5 text-blue-600" />
                                <span className="text-sm font-bold text-blue-900">Suggested Experts:</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {msg.context.suggestedExperts.map((expert, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-2 bg-white border-2 border-blue-300 rounded-xl text-sm text-blue-900 font-bold shadow-sm"
                                  >
                                    {expert}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-24">
                  <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-gray-200 flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Brain className="w-12 h-12 text-black" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-3">Start a Conversation</h3>
                  <p className="text-gray-700 mb-8 max-w-md mx-auto leading-relaxed font-medium">
                    Ask me anything! I have context from your workspace and can provide intelligent suggestions.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    {[
                      'What are the current priorities?',
                      'Who should I collaborate with?',
                      'Show me past decisions',
                    ].map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInputMessage(suggestion)}
                        className="px-6 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-black hover:shadow-lg transition-all text-sm text-gray-800 font-medium shadow-sm"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Enhanced Thinking Indicator */}
              {isThinking && (
                <div className="flex justify-start mb-8">
                  <div className="bg-white border-2 border-gray-200 rounded-2xl px-6 py-5 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center shadow-sm">
                        <Brain className="w-5 h-5 text-white animate-pulse" />
                      </div>
                      <span className="text-gray-800 text-sm font-bold">Bombil is thinking...</span>
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>
        ) : currentView === 'roadmap' ? (
          /* Roadmap View */
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="max-w-7xl mx-auto px-8 py-8">
              {/* Roadmap Header */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg mb-6">
                <div className="px-8 py-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                        <span className="text-2xl">📍</span>
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-black">Acme Inc.</h1>
                        <p className="text-gray-600 mt-1">Company Roadmap</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setCurrentView('chat')}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                      >
                        Back to Chat
                      </button>
                      <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        Share
                      </button>
                    </div>
                  </div>
                </div>

                {/* Company Info Section */}
                <div className="px-8 py-6">
                  <div className="grid lg:grid-cols-2 gap-8">
                    {/* Left Column - Policies & Company */}
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-bold text-black mb-4">Policies</h2>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">💰</span>
                            <span className="text-gray-800 font-medium">Expense Policy</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">🏖️</span>
                            <span className="text-gray-800 font-medium">Vacation & PTO</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">📚</span>
                            <span className="text-gray-800 font-medium">Employee Handbook</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h2 className="text-xl font-bold text-black mb-4">Company</h2>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">📊</span>
                            <span className="text-gray-800 font-medium">Annual Strategy</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">🎯</span>
                            <span className="text-gray-800 font-medium">What's New?</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">🏗️</span>
                            <span className="text-gray-800 font-medium">Meetings</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">📋</span>
                            <span className="text-gray-800 font-medium">Docs</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">🏗️</span>
                            <span className="text-gray-800 font-medium">Teams & Org Chart</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Company Priorities */}
                    <div>
                      <h2 className="text-xl font-bold text-black mb-4">Company Priorities</h2>
                      <p className="text-gray-700 leading-relaxed">
                        Acme Inc. is focused on customer-centric growth by accelerating 
                        product innovation, expanding into priority markets, and deepening 
                        enterprise relationships.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roadmap Section */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg">
                <div className="px-8 py-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-black">Roadmap</h2>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600 font-medium">Status</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600 font-medium">Timeline</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600 font-medium">Priority</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600 font-medium">By team</span>
                      </div>
                      <Plus className="w-4 h-4 text-gray-500 cursor-pointer hover:text-black transition-colors" />
                    </div>
                  </div>
                </div>

                {/* Roadmap Table */}
                <div className="px-8 py-6">
                  <div className="space-y-4">
                    {/* Header Row */}
                    <div className="grid grid-cols-12 gap-4 pb-3 border-b border-gray-100">
                      <div className="col-span-5 text-sm font-bold text-gray-600 uppercase tracking-wide">Task</div>
                      <div className="col-span-2 text-sm font-bold text-gray-600 uppercase tracking-wide">DRI</div>
                      <div className="col-span-2 text-sm font-bold text-gray-600 uppercase tracking-wide">Status</div>
                      <div className="col-span-3"></div>
                    </div>

                    {/* Roadmap Items */}
                    {[
                      {
                        task: "Launch AI-assisted onboarding",
                        dri: "Luca Beetz",
                        status: "Start",
                        statusColor: "bg-green-100 text-green-800"
                      },
                      {
                        task: "Enter two priority geographies",
                        dri: "Kameron Shiller",
                        status: "Start",
                        statusColor: "bg-green-100 text-green-800"
                      },
                      {
                        task: "Migrate legacy services to modern cloud",
                        dri: "Jordan Scales",
                        status: "In Progress",
                        statusColor: "bg-blue-100 text-blue-800"
                      },
                      {
                        task: "Build enterprise GTM capabilities",
                        dri: "Jordan Scales",
                        status: "Planning",
                        statusColor: "bg-yellow-100 text-yellow-800"
                      }
                    ].map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-4 py-4 border-b border-gray-50 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="col-span-5 flex items-center gap-3">
                          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                          <span className="text-gray-900 font-medium">{item.task}</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-600">
                              {item.dri.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="text-gray-700 text-sm">{item.dri}</span>
                        </div>
                        <div className="col-span-2 flex items-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.statusColor}`}>
                            {item.status}
                          </span>
                        </div>
                        <div className="col-span-3"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-8">
                <h2 className="text-3xl font-bold text-black mb-4">Document View</h2>
                <p className="text-gray-700 font-medium">This section will display non-chat content like documents, files, and other resources.</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Right Panel */}
      <RightPanel 
        isVisible={showPanel} 
        onClose={() => setShowPanel(false)} 
        onRoadmapCreated={handleRoadmapCreated}
        onSummaryCreated={handleSummaryCreated}
        onTasksCreated={handleTasksCreated}
      />
      </div>
  );
}
