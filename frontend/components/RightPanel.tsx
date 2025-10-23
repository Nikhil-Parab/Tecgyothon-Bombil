'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Zap,
  FileText,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import {
  saveChatMessage,
  fetchChatHistory,
  generateAIResponse,
  saveRoadmap,
  saveSummary,
  ChatMessage,
} from '@/lib/chatApi';
import { createTask, getOrCreateGeneralChatTask } from '@/lib/taskApi';

type RightPanelProps = {
  isVisible: boolean;
  onClose: () => void;
  onRoadmapCreated?: (roadmap: any) => void;
  onSummaryCreated?: (summary: any) => void;
  onTasksCreated?: (tasks: any[]) => void;
};

export default function RightPanel({
  isVisible,
  onClose,
  onRoadmapCreated,
  onSummaryCreated,
  onTasksCreated,
}: RightPanelProps) {
  const { user } = useAuth();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    // Test message to verify rendering
    {
      text: "Hello! This is a test message to verify the chat is working.",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generalTaskId, setGeneralTaskId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    if (isVisible) {
      // Always load for testing, remove user dependency temporarily
      loadChatHistory();
    }
  }, [isVisible]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadChatHistory = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      // Get or create general chat task
      const taskId = await getOrCreateGeneralChatTask(user.uid);
      setGeneralTaskId(taskId);
      
      // Fetch chat history from that task
      const history = await fetchChatHistory(user.uid, taskId);
      setChatMessages(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim()) return; // Remove user dependency for testing

    const userMessage = chatInput.trim();
    setChatInput('');
    setIsSaving(true);

    try {
      // Add user message to UI
      const userMsg: ChatMessage = {
        text: userMessage,
        isUser: true,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, userMsg]);

      // Skip Firebase for testing - just generate AI response locally
      setTimeout(() => {
        let responseText = `I received your message: "${userMessage}". This is a test response to verify the chat interface is working properly!`;
        let shouldTriggerRoadmap = false;

        // Check for roadmap keywords
        if (userMessage.toLowerCase().includes('roadmap') || userMessage.toLowerCase().includes('create roadmap')) {
          responseText = `🎯 **Roadmap Created Successfully!**\n\nI've generated a comprehensive roadmap view for Acme Inc. based on your request:\n\n📋 **Included Sections:**\n• Company priorities and policies\n• Strategic roadmap with timelines\n• Team assignments and status tracking\n\n✨ **The roadmap will be displayed in the main view shortly!**\n\nYou can see tasks like:\n• Launch AI-assisted onboarding\n• Enter two priority geographies\n• Migrate legacy services to modern cloud\n• Build enterprise GTM capabilities`;
          shouldTriggerRoadmap = true;
        }

        const aiMsg: ChatMessage = {
          text: responseText,
          isUser: false,
          timestamp: new Date(),
          metadata: {
            type: shouldTriggerRoadmap ? 'roadmap' : 'general'
          },
        };
        setChatMessages((prev) => [...prev, aiMsg]);
        setIsSaving(false);

        // Trigger roadmap creation if needed
        if (shouldTriggerRoadmap) {
          onRoadmapCreated?.({
            id: 'test-roadmap',
            title: 'Acme Inc. Strategic Roadmap',
            description: 'Company-wide strategic initiatives',
            phases: ['Q1', 'Q2', 'Q3', 'Q4']
          });
        }
      }, 1000);

    } catch (error) {
      console.error('Error sending message:', error);
      setChatMessages((prev) => [
        ...prev,
        {
          text: 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: new Date(),
        },
      ]);
      setIsSaving(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const quickActions = [
    { icon: MessageSquare, label: 'Create Roadmap', prompt: 'Create a detailed roadmap for my project' },
    { icon: FileText, label: 'Task Summary', prompt: 'Summarize my current tasks' },
    { icon: Plus, label: 'New Task', prompt: 'Help me create a new task' },
  ];

  return (
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white flex flex-col transition-transform duration-300 ease-in-out shadow-2xl z-50 ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.12)',
        }}
      >
      {/* Premium Header */}
      <div className="relative border-b border-gray-200">
        <div className="absolute inset-0 bg-black"></div>
        <div className="relative px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-lg blur-sm"></div>
                <div className="relative bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg tracking-tight">AI Assistant</h3>
                <p className="text-white/60 text-xs">Powered by Bombil AI</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
              title="Close panel"
            >
              <X className="w-5 h-5 text-white/80 group-hover:text-white group-hover:rotate-90 transition-all duration-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-white">
        {/* Debug info */}
        <div className="text-xs text-black p-2 bg-yellow-100 rounded border">
          Messages: {chatMessages.length} | Loading: {isLoading.toString()} | User: {user ? 'Yes' : 'No'} | TaskId: {generalTaskId || 'None'}
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative">
              <div className="absolute inset-0 bg-black/10 rounded-full blur-xl animate-pulse"></div>
              <Loader2 className="relative w-10 h-10 animate-spin text-black" />
            </div>
            <p className="mt-4 text-gray-800 text-sm font-medium">Loading messages...</p>
          </div>
        ) : chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            {/* Empty State */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-black/10 rounded-2xl blur-2xl"></div>
              <div className="relative bg-white p-8 rounded-2xl border-2 border-gray-300 shadow-lg">
                <Bot className="w-16 h-16 text-black mx-auto" />
              </div>
            </div>
            
            <h4 className="text-2xl font-bold text-black mb-3">Let's Get Started</h4>
            <p className="text-gray-800 text-sm mb-8 max-w-xs leading-relaxed font-medium">
              Choose a quick action below or type your own message
            </p>

            {/* Quick Action Cards */}
            <div className="space-y-3 w-full">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => setChatInput(action.prompt)}
                    className="group w-full bg-white hover:bg-black border-2 border-gray-400 hover:border-black rounded-xl px-5 py-4 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-100 group-hover:bg-white p-3 rounded-lg transition-colors duration-200 border-2 border-gray-300">
                        <Icon className="w-5 h-5 text-black" />
                      </div>
                      <span className="text-black group-hover:text-white font-bold text-left flex-1 transition-colors duration-200">
                        {action.label}
                      </span>
                      <Send className="w-4 h-4 text-black group-hover:text-white opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                style={{ animation: 'fadeIn 0.3s ease-in' }}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className="shrink-0 mt-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                        msg.isUser ? 'bg-black border-2 border-black' : 'bg-white border-2 border-gray-400'
                      }`}
                    >
                      {msg.isUser ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <Bot className="w-5 h-5 text-black" />
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="flex flex-col">
                    <div
                      className={`rounded-2xl px-5 py-4 shadow-lg border-2 ${
                        msg.isUser
                          ? 'bg-black text-white border-black'
                          : 'bg-white border-gray-400 text-black'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap font-semibold">{msg.text}</p>
                    </div>

                    {/* Metadata Badges */}
                    {msg.metadata?.type && !msg.isUser && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.metadata.type === 'roadmap' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium shadow-sm">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Roadmap Created
                          </span>
                        )}
                        {msg.metadata.type === 'summary' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Summary Generated
                          </span>
                        )}
                        {msg.metadata.type === 'task-creation' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium shadow-sm">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Task Suggestion
                          </span>
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <span
                      className={`text-xs text-black mt-2 font-bold ${
                        msg.isUser ? 'text-right' : 'text-left'
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isSaving && (
              <div className="flex gap-3" style={{ animation: 'fadeIn 0.3s ease-in' }}>
                <div className="shrink-0 mt-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border-2 border-gray-400 shadow-lg">
                    <Bot className="w-5 h-5 text-black" />
                  </div>
                </div>
                <div className="bg-white border-2 border-gray-400 rounded-2xl px-5 py-4 shadow-lg">
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2.5 h-2.5 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2.5 h-2.5 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* Premium Input Area */}
      <div className="border-t-2 border-gray-200 px-6 py-5 bg-white">
        <div className="bg-gray-50 border-2 border-gray-300 rounded-2xl p-2 focus-within:border-black focus-within:bg-white transition-all duration-200 shadow-md focus-within:shadow-lg">
          <div className="flex items-end gap-2">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 bg-transparent text-gray-900 placeholder-gray-600 resize-none focus:outline-none text-sm max-h-32 border-0 font-medium"
              rows={1}
              disabled={isSaving}
              style={{
                minHeight: '40px',
                maxHeight: '128px',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
            
            {/* Premium Send Button */}
            <button
              onClick={sendMessage}
              disabled={!chatInput.trim() || isSaving}
              className="group shrink-0 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-none"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
              )}
            </button>
          </div>
        </div>

        {/* Helper Text */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <Zap className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-xs text-gray-500 font-medium">
            AI-powered roadmaps, summaries, and task assistance
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
