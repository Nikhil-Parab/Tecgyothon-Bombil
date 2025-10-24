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
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  CalendarDays,
  FileText,
  Mail,
} from 'lucide-react';
import RightPanel from './RightPanel';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { RemoTheme } from '@/lib/theme';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  where,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

type ChatMessage = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  context?: {
    relatedDecisions?: string[];
    suggestedExperts?: string[];
    conflictWarning?: string;
    // Extended context for combined messages
    source?: string;
    pageTitle?: string;
    taskTitle?: string;
    taskId?: string;
    priority?: string;
    status?: string;
    aiQuery?: string;
    eventTitle?: string;
    eventId?: string;
    eventType?: string;
    chatPageId?: string;
    // Email drafting context
    emailDraft?: {
      recipient: string;
      subject: string;
      body: string;
      status: string;
    };
  };
};

type Page = {
  id: string;
  title: string;
  icon: string;
  isPinned?: boolean;
  createdAt: Date;
  isChat: boolean;
  // messages are now stored separately in the messages collection
  tags?: string[];
  category?: 'discussion' | 'decision' | 'brainstorm' | 'review';
};

type Event = {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
  type: 'meeting' | 'reminder' | 'task';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  // Task deadline specific properties
  priority?: 'low' | 'medium' | 'high';
  isTaskDeadline?: boolean;
};

type Task = {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  deadline: Date;
  description: string;
  assignedTo: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

export default function DashboardEnhanced() {
  const { user } = useAuth();
  const router = useRouter();
  const [showPanel, setShowPanel] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [messages, setMessages] = useState<{ [pageId: string]: ChatMessage[] }>({});

  const [currentPage, setCurrentPage] = useState('welcome-chat');
  const [currentView, setCurrentView] = useState<'chat' | 'roadmap' | 'document' | 'calendar'>('calendar');
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: Date;
    read: boolean;
    actionUrl?: string;
  }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentPageData = pages.find((p) => p.id === currentPage);
  const currentPageMessages = messages[currentPage] || [];

  // Generate sample notifications on component mount
  useEffect(() => {
    const sampleNotifications = [
      {
        id: 'notif-1',
        title: 'Task Deadline Approaching',
        message: 'Task "Complete project proposal" is due tomorrow',
        type: 'warning' as const,
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        read: false,
        actionUrl: '/tasks'
      },
      {
        id: 'notif-2',
        title: 'New Team Member Added',
        message: 'Sarah Chen has been added to the Marketing Team',
        type: 'info' as const,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        read: false,
        actionUrl: '/teams'
      },
      {
        id: 'notif-3',
        title: 'Meeting Starting Soon',
        message: 'Team standup starts in 15 minutes',
        type: 'info' as const,
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        read: true,
        actionUrl: '/calendar'
      },
      {
        id: 'notif-4',
        title: 'Email Draft Ready',
        message: 'Your email draft to john@example.com is ready to send',
        type: 'success' as const,
        timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        read: false
      }
    ];
    setNotifications(sampleNotifications);
  }, []);

  // Mark notification as read
  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  // Add new notification
  const addNotification = (notification: Omit<typeof notifications[0], 'id' | 'timestamp'>) => {
    const newNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: new Date()
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showNotifications && !target.closest('[data-notifications-dropdown]')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  // Fetch messages for a specific chat page in real-time
  const fetchMessagesForPage = (pageId: string) => {
    if (!user?.uid) {
      // For welcome page without user
      if (pageId === 'welcome-chat') {
        setMessages(prev => ({
          ...prev,
          [pageId]: [
            {
              id: 'welcome-1',
              text: "Welcome to Remo - Your Cognitive Workspace! 🚀\n\nI'm your AI assistant designed to help you collaborate smarter. Here's what I can do:\n\n🧠 **Contextual Memory**: I remember past decisions and conversations\n💡 **Proactive Suggestions**: I'll suggest relevant context and experts\n⚡ **Conflict Detection**: I'll warn you about overlapping or contradictory initiatives\n🎯 **Decision Tracking**: I'll help identify and track important decisions\n\nTry asking me something or start a new conversation!",
              isUser: false,
              timestamp: new Date(Date.now() - 3600000),
            },
          ]
        }));
      }
      return;
    }

    try {
      // First, let's try to get the messages from the chat page itself (legacy approach)
      // This will work with existing data structure
      const pageRef = doc(db, 'users', user.uid, 'chatPages', pageId);
      
      const unsubscribePageMessages = onSnapshot(pageRef, (docSnapshot) => {
        console.log('Page snapshot for', pageId, 'exists:', docSnapshot.exists());
        if (docSnapshot.exists()) {
          const pageData = docSnapshot.data();
          console.log('Page data:', pageData);
          if (pageData.messages && Array.isArray(pageData.messages)) {
            const fetchedMessages: ChatMessage[] = pageData.messages.map((msg: any) => ({
              id: msg.id || `msg-${Date.now()}-${Math.random()}`,
              text: msg.text || '',
              isUser: msg.isUser || false,
              timestamp: msg.timestamp?.toDate() || new Date(msg.timestamp) || new Date(),
              context: msg.context
            }));

            console.log('Found', fetchedMessages.length, 'messages for page', pageId);
            setMessages(prev => ({
              ...prev,
              [pageId]: fetchedMessages
            }));
            return;
          } else {
            console.log('No messages found in page document for', pageId);
          }
        }

        // If no messages in page document, try the separate messages collection
        // Use a simpler query to avoid index requirements
        const messagesRef = collection(db, 'messages');
        const messagesQuery = query(
          messagesRef,
          where('chatPageId', '==', pageId),
          where('userId', '==', user.uid)
        );

        onSnapshot(messagesQuery, (snapshot) => {
          const fetchedMessages: ChatMessage[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            fetchedMessages.push({
              id: doc.id,
              text: data.text || '',
              isUser: data.isUser || false,
              timestamp: data.timestamp?.toDate() || new Date(),
              context: data.context
            });
          });

          // Sort messages by timestamp manually
          fetchedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

          setMessages(prev => ({
            ...prev,
            [pageId]: fetchedMessages
          }));
        }, (error) => {
          console.error('Error fetching messages from messages collection:', pageId, error);
          // Fallback: set empty messages array
          setMessages(prev => ({
            ...prev,
            [pageId]: []
          }));
        });
      }, (error) => {
        console.error('Error fetching page messages:', pageId, error);
        // Fallback: set empty messages array
        setMessages(prev => ({
          ...prev,
          [pageId]: []
        }));
      });

      return unsubscribePageMessages;
    } catch (error) {
      console.error('Error setting up messages listener:', pageId, error);
      // Fallback: set empty messages array
      setMessages(prev => ({
        ...prev,
        [pageId]: []
      }));
    }
  };

  // Fetch user events from Firestore
  const fetchUserEvents = () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      // Query events collection for the current user
      const eventsRef = collection(db, 'users', user.uid, 'events');
      const eventsQuery = query(eventsRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
        const fetchedEvents: Event[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Convert Firestore timestamps to Date objects
          const startTime = data.startTime?.toDate() || new Date(data.startTime);
          const endTime = data.endTime?.toDate() || new Date(data.endTime);
          const createdAt = data.createdAt?.toDate() || new Date(data.createdAt);
          const updatedAt = data.updatedAt?.toDate() || new Date(data.updatedAt);

          fetchedEvents.push({
            id: doc.id,
            title: data.title || 'Untitled Event',
            description: data.description || '',
            startTime,
            endTime,
            location: data.location || '',
            attendees: data.attendees || [],
            status: data.status || 'scheduled',
            type: data.type || 'event',
            tags: data.tags || [],
            createdAt,
            updatedAt
          });
        });

        setEvents(fetchedEvents);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching events:', error);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up events listener:', error);
      setLoading(false);
    }
  };

  // Also fetch reminders and tasks
  const fetchUserReminders = () => {
    if (!user?.uid) return;

    try {
      const remindersRef = collection(db, 'users', user.uid, 'reminders');
      const remindersQuery = query(remindersRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(remindersQuery, (snapshot) => {
        const fetchedReminders: Event[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Convert reminder to event format
          const reminderTime = data.reminderTime?.toDate() || new Date();
          const createdAt = data.createdAt?.toDate() || new Date();
          const updatedAt = data.updatedAt?.toDate() || new Date();

          fetchedReminders.push({
            id: doc.id,
            title: data.title || 'Reminder',
            description: data.description || data.message || '',
            startTime: reminderTime,
            endTime: new Date(reminderTime.getTime() + 15 * 60000), // 15 minutes duration
            location: '',
            attendees: [],
            status: data.completed ? 'completed' : 'scheduled',
            type: 'reminder',
            tags: data.tags || ['reminder'],
            createdAt,
            updatedAt
          });
        });

        // Add reminders to events (merge with existing events)
        setEvents(prev => {
          const eventIds = new Set(prev.filter(e => e.type !== 'reminder').map(e => e.id));
          const mergedEvents = [...prev.filter(e => e.type !== 'reminder'), ...fetchedReminders];
          return mergedEvents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        });
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  // Fetch user tasks from Firestore
  const fetchUserTasks = () => {
    if (!user?.uid) {
      setTasksLoading(false);
      return;
    }

    try {
      const tasksRef = collection(db, 'users', user.uid, 'tasks');
      const tasksQuery = query(tasksRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
        const fetchedTasks: Task[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Convert Firestore timestamps to Date objects
          const deadline = data.deadline?.toDate() || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 1 week
          const createdAt = data.createdAt?.toDate() || new Date(data.createdAt);
          const updatedAt = data.updatedAt?.toDate() || new Date(data.updatedAt);

          fetchedTasks.push({
            id: doc.id,
            title: data.title || 'Untitled Task',
            status: data.status || 'pending',
            priority: data.priority || 'medium',
            deadline,
            description: data.description || '',
            assignedTo: data.assignedTo || [],
            tags: data.tags || [],
            createdAt,
            updatedAt
          });
        });

        setTasks(fetchedTasks);
        setTasksLoading(false);
      }, (error) => {
        console.error('Error fetching tasks:', error);
        setTasksLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up tasks listener:', error);
      setTasksLoading(false);
    }
  };

  // Fetch user chat pages from Firestore
  const fetchUserPages = () => {
    if (!user?.uid) {
      // Load default welcome page if no user
      setPages([{
        id: 'welcome-chat',
        title: 'Welcome to Remo',
        icon: '🧠',
        isPinned: true,
        createdAt: new Date(),
        isChat: true,
        category: 'discussion',
        tags: ['welcome', 'getting-started']
      }]);
      return;
    }

    try {
      const pagesRef = collection(db, 'users', user.uid, 'chatPages');
      const pagesQuery = query(pagesRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(pagesQuery, (snapshot) => {
        const fetchedPages: Page[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Skip deleted pages
          if (data.deleted) return;
          
          fetchedPages.push({
            id: doc.id,
            title: data.title || 'Untitled Chat',
            icon: data.icon || '💬',
            isPinned: data.isPinned || false,
            createdAt: data.createdAt?.toDate() || new Date(),
            isChat: data.isChat !== false, // Default true
            category: data.category || 'discussion',
            tags: data.tags || []
          });
        });

        // If no pages found, add welcome page
        if (fetchedPages.length === 0) {
          const welcomePage = {
            id: 'welcome-chat',
            title: 'Welcome to Remo',
            icon: '🧠',
            isPinned: true,
            createdAt: new Date(),
            isChat: true,
            category: 'discussion' as const,
            tags: ['welcome', 'getting-started']
          };
          setPages([welcomePage]);
          setCurrentPage('welcome-chat');
          // Save welcome page to Firebase
          savePageToFirebase(welcomePage);
        } else {
          setPages(fetchedPages);
          if (!currentPage || !fetchedPages.find(p => p.id === currentPage)) {
            setCurrentPage(fetchedPages[0].id);
          }
        }
      }, (error) => {
        console.error('Error fetching chat pages:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up pages listener:', error);
    }
  };

  // Save a chat page to Firebase
  const savePageToFirebase = async (page: Page, initialMessages?: ChatMessage[]) => {
    if (!user?.uid) return;

    try {
      const pageData: any = {
        title: page.title,
        icon: page.icon,
        isPinned: page.isPinned || false,
        createdAt: Timestamp.fromDate(page.createdAt),
        isChat: page.isChat,
        category: page.category,
        tags: page.tags || [],
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Add initial messages if provided
      if (initialMessages && initialMessages.length > 0) {
        pageData.messages = initialMessages.map(msg => ({
          id: msg.id,
          text: msg.text,
          isUser: msg.isUser,
          timestamp: Timestamp.fromDate(msg.timestamp),
          context: msg.context
        }));
      }

      // Use the page ID to create the document with a specific ID
      const pageRef = doc(db, 'users', user.uid, 'chatPages', page.id);
      await updateDoc(pageRef, pageData).catch(async () => {
        // If document doesn't exist, create it with set
        await setDoc(pageRef, pageData);
      });
    } catch (error) {
      console.error('Error saving page to Firebase:', error);
    }
  };

  // Update a chat page in Firebase
  const updatePageInFirebase = async (pageId: string, updates: any) => {
    if (!user?.uid) return;

    try {
      const pageRef = doc(db, 'users', user.uid, 'chatPages', pageId);
      const updateData: any = {
        updatedAt: Timestamp.fromDate(new Date())
      };

      if (updates.title) updateData.title = updates.title;
      if (updates.icon) updateData.icon = updates.icon;
      if (typeof updates.isPinned === 'boolean') updateData.isPinned = updates.isPinned;
      if (updates.category) updateData.category = updates.category;
      if (updates.tags) updateData.tags = updates.tags;
      
      // Handle messages if provided
      if (updates.messages) {
        updateData.messages = updates.messages.map((msg: ChatMessage) => ({
          id: msg.id,
          text: msg.text,
          isUser: msg.isUser,
          timestamp: Timestamp.fromDate(msg.timestamp),
          context: msg.context
        }));
      }

      await updateDoc(pageRef, updateData);
    } catch (error) {
      console.error('Error updating page in Firebase:', error);
    }
  };

  // Load user data when component mounts or user changes
  useEffect(() => {
    if (user?.uid) {
      setLoading(true);
      setTasksLoading(true);
      const unsubscribeEvents = fetchUserEvents();
      const unsubscribeReminders = fetchUserReminders();
      const unsubscribeTasks = fetchUserTasks();
      const unsubscribePages = fetchUserPages();

      return () => {
        if (unsubscribeEvents) unsubscribeEvents();
        if (unsubscribeReminders) unsubscribeReminders();
        if (unsubscribeTasks) unsubscribeTasks();
        if (unsubscribePages) unsubscribePages();
      };
    } else {
      setEvents([]);
      setTasks([]);
      setLoading(false);
      setTasksLoading(false);
      fetchUserPages(); // Load welcome page for non-authenticated users
    }
  }, [user?.uid]);

  // Load messages when current page changes
  useEffect(() => {
    if (currentPage) {
      console.log('Loading messages for page:', currentPage, 'User:', user?.uid);
      const unsubscribeMessages = fetchMessagesForPage(currentPage);
      return () => {
        if (unsubscribeMessages) unsubscribeMessages();
      };
    }
  }, [currentPage, user?.uid]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentPageMessages]);

  // Debug function to check current page messages
  useEffect(() => {
    console.log('Current page messages for', currentPage, ':', currentPageMessages);
  }, [currentPageMessages, currentPage]);

  // Create event in Firestore
  const createEventInFirestore = async (eventData: Omit<Event, 'id'>) => {
    if (!user?.uid) {
      console.error('No user logged in');
      return;
    }

    try {
      const eventsRef = collection(db, 'users', user.uid, 'events');
      
      // Convert Date objects to Firestore Timestamps
      const firestoreEventData = {
        ...eventData,
        startTime: Timestamp.fromDate(eventData.startTime),
        endTime: Timestamp.fromDate(eventData.endTime),
        createdAt: Timestamp.fromDate(eventData.createdAt),
        updatedAt: Timestamp.fromDate(eventData.updatedAt)
      };

      const docRef = await addDoc(eventsRef, firestoreEventData);
      console.log('Event created with ID:', docRef.id);
      
      // Add notification for event creation
      addNotification({
        title: 'Event Created',
        message: `"${eventData.title}" has been scheduled`,
        type: 'success',
        read: false,
        actionUrl: '/calendar'
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  // Handlers for AI-generated content
  const handleRoadmapCreated = (roadmap: any) => {
    console.log('Roadmap created:', roadmap);
    setRoadmaps((prev) => [roadmap, ...prev]);
    // Stay on calendar view
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

  // Scroll to bottom of chat when switching pages
  useEffect(() => {
    if (currentPageData?.isChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentPageData?.isChat, currentPage]);

  // Task reference and summary functions
  const findTaskByReference = (reference: string): Task | null => {
    // Remove @ symbol and normalize reference
    const cleanRef = reference.replace('@', '').toLowerCase().trim();
    
    // Find task by partial title match or exact ID
    return tasks.find(task => 
      task.id === cleanRef ||
      task.title.toLowerCase().includes(cleanRef) ||
      task.title.toLowerCase().startsWith(cleanRef)
    ) || null;
  };

  const generateTaskSummary = (task: Task): string => {
    const status = task.status || 'pending';
    const priority = task.priority || 'medium';
    const deadline = task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline';
    const assignedTo = Array.isArray(task.assignedTo) && task.assignedTo.length > 0 
      ? task.assignedTo.join(', ') 
      : 'Unassigned';
    
    const createdDate = task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Unknown';
    const updatedDate = task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : createdDate;
    const tags = task.tags && task.tags.length > 0 ? task.tags.join(', ') : 'No tags';

    return `🔍 **Task Summary: ${task.title}**\n\n📋 **Status:** ${status}\n🎯 **Priority:** ${priority}\n📅 **Deadline:** ${deadline}\n👤 **Assigned to:** ${assignedTo}\n🏷️ **Tags:** ${tags}\n\n📝 **Description:**\n${task.description || 'No description available'}\n\n� **Timeline:**\n• Created: ${createdDate}\n• Last updated: ${updatedDate}`;
  };

  const extractTaskReferences = (message: string): string[] => {
    // Find all @mentions in the message
    const mentions = message.match(/@[\w\s-]+/g) || [];
    return mentions.map(mention => mention.trim());
  };

  // Enhanced AI response with context
  const getAIResponse = (userMessage: string): ChatMessage => {
    const lowerMessage = userMessage.toLowerCase();
    let text = '';
    let context = {};

    // Check for task references first
    const taskReferences = extractTaskReferences(userMessage);
    if (taskReferences.length > 0) {
      const referencedTasks: Task[] = [];
      const taskSummaries: string[] = [];

      taskReferences.forEach(reference => {
        const task = findTaskByReference(reference);
        if (task) {
          referencedTasks.push(task);
          taskSummaries.push(generateTaskSummary(task));
        }
      });

      if (referencedTasks.length > 0) {
        text = `🎯 **Task Reference Detected**\n\nI found ${referencedTasks.length} task(s) matching your reference:\n\n${taskSummaries.join('\n\n---\n\n')}\n\n💡 **What I can help with:**\n• Update task status or priority\n• Add new assignees\n• Extend deadline\n• Add comments or notes\n• Create related tasks`;
        
        context = {
          taskReferences: referencedTasks.map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority
          })),
          suggestedExperts: referencedTasks.flatMap(task => task.assignedTo),
          relatedDecisions: [`Referenced ${referencedTasks.length} task(s)`]
        };

        return {
          id: `msg-${Date.now()}-ai`,
          text,
          isUser: false,
          timestamp: new Date(),
          context,
        };
      } else {
        // Task references found but no matching tasks
        text = `🔍 **Task Reference Not Found**\n\nI couldn't find tasks matching: ${taskReferences.join(', ')}\n\n📋 **Available tasks:**\n${tasks.slice(0, 5).map(task => `• ${task.title} (${task.status})`).join('\n')}\n\n💡 **Tip:** Try using partial task names or check the task list for exact titles.`;
        
        context = {
          suggestedExperts: [],
          conflictWarning: 'Task reference not found'
        };

        return {
          id: `msg-${Date.now()}-ai`,
          text,
          isUser: false,
          timestamp: new Date(),
          context,
        };
      }
    }

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
    } else if (lowerMessage.includes('schedule') || lowerMessage.includes('meeting') || lowerMessage.includes('event') || lowerMessage.includes('calendar')) {
      text = `📅 **Event Created Successfully!**\n\nI've scheduled a new event for you:\n\n📋 **Event Details:**\n• Title: "${userMessage.split(' ').slice(0, 3).join(' ')}..."\n• Date: Today at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n• Type: Meeting\n• Status: Scheduled\n\n✨ **The event is now displayed in the calendar view. You can see:**\n• Full calendar with all your events\n• Event details sidebar\n• Reminders and tasks\n\n📊 **Switch to calendar view to see your schedule!**`;
      
      // Create a new event in Firestore
      const newEventData = {
        title: userMessage.slice(0, 50) || 'New Meeting',
        description: `AI-generated event from: "${userMessage}"`,
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000), // 1 hour later
        location: 'To be determined',
        attendees: [user?.email?.split('@')[0] || 'You'],
        status: 'scheduled' as const,
        type: 'meeting' as const,
        tags: ['ai-generated'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Save to Firestore (will automatically update local state via real-time listener)
      createEventInFirestore(newEventData);
      
      context = {
        relatedDecisions: ['Calendar Integration', 'AI Event Creation'],
        conflictWarning: 'Event created - check calendar for details',
      };
    } else if ((lowerMessage.includes('draft') && lowerMessage.includes('email')) || (lowerMessage.includes('email') && lowerMessage.includes('@'))) {
      // Email drafting functionality
      const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
      const emailMatch = userMessage.match(emailPattern);
      const recipient = emailMatch ? emailMatch[0] : 'recipient@example.com';
      
      // Extract subject with better pattern matching
      let subject = 'Message from AI Assistant';
      const subjectPatterns = [
        /(?:with\s+)?subject[:\s]+([^,]+?)(?:\s+(?:saying|body|about|regarding)|$)/i,
        /subject[:\s]+"([^"]+)"/i,
        /subject[:\s]+'([^']+)'/i
      ];
      
      for (const pattern of subjectPatterns) {
        const match = userMessage.match(pattern);
        if (match) {
          subject = match[1].trim();
          break;
        }
      }
      
      // Extract body content with better parsing
      let body = '';
      const bodyPatterns = [
        /(?:saying|body|message|content)[:\s]+(.+?)$/i,
        /(?:about|regarding)[:\s]+(.+?)$/i
      ];
      
      for (const pattern of bodyPatterns) {
        const match = userMessage.match(pattern);
        if (match) {
          body = match[1].trim();
          break;
        }
      }
      
      // If no explicit body found, extract from remaining text
      if (!body) {
        body = userMessage
          .replace(/draft\s+(?:an?\s+)?email\s+to\s+\S+@\S+/i, '')
          .replace(/with\s+subject[:\s]+[^,]+/i, '')
          .replace(/subject[:\s]+[^,]+/i, '')
          .replace(/saying/i, '')
          .trim();
      }
      
      // Generate default body if still empty
      if (!body || body.length < 5) {
        body = `Hello,\n\nI hope this email finds you well.\n\n[Your message content here]\n\nBest regards,\n${user?.displayName || user?.email?.split('@')[0] || 'Assistant'}`;
      }
      
      text = `📧 **Email Draft Created Successfully!**\n\n**To:** ${recipient}\n**Subject:** ${subject}\n\n**Preview:**\n${body.slice(0, 200)}${body.length > 200 ? '...' : ''}\n\n✨ **What I can do next:**\n• Edit the draft content\n• Add more recipients\n• Schedule sending\n• Save as template\n\n📝 **Actions available:**\n- Say "send email" to send it now\n- Say "edit subject" to modify the subject\n- Say "add recipient" to include more people`;
      
      context = {
        emailDraft: {
          recipient,
          subject,
          body,
          status: 'draft'
        },
        suggestedExperts: [],
        relatedDecisions: ['Email Draft Created']
      };

      // Add notification for email draft creation
      addNotification({
        title: 'Email Draft Ready',
        message: `Draft email to ${recipient} is ready to send`,
        type: 'success',
        read: false
      });
    } else if (lowerMessage.includes('send email') || (lowerMessage.includes('email') && lowerMessage.includes('to'))) {
      // Email sending functionality
      const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
      const emailMatch = userMessage.match(emailPattern);
      const recipient = emailMatch ? emailMatch[0] : 'recipient@example.com';
      
      text = `📧 **Email Sending Process**\n\n**Recipient:** ${recipient}\n\n⚠️ **Note:** Email sending requires Gmail integration setup.\n\n🔧 **To enable email sending:**\n1. Configure Gmail App Password\n2. Set up SMTP credentials\n3. Enable less secure app access\n\n💡 **Alternative:** I can create a draft for you to send manually through your email client.\n\nWould you like me to create a draft instead?`;
      
      context = {
        suggestedExperts: [],
        conflictWarning: 'Email sending requires additional setup'
      };
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      text = `Hello! 👋 I'm Remo, your cognitive workspace assistant.\n\nI have context from ${pages.length} conversations and 43 team decisions. How can I help you today?\n\n💡 **Quick suggestions:**\n• "What decisions were made about the product roadmap?"\n• "Who should I talk to about marketing?"\n• "Show me recent team priorities"\n• "Draft an email to john@example.com about project updates"\n• "Schedule a meeting for tomorrow at 2pm"`;
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

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const messageText = inputMessage;
    setInputMessage('');

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    // If this is not a chat page, create a new chat
    if (!currentPageData || !currentPageData.isChat) {
      const newChatPageId = `chat-${Date.now()}`;
      const newChatPage: Page = {
        id: newChatPageId,
        title: messageText.slice(0, 30) + (messageText.length > 30 ? '...' : ''),
        icon: '💬',
        isPinned: false,
        createdAt: new Date(),
        isChat: true,
        category: 'discussion',
        tags: ['new']
      };

      setIsThinking(true);

      // Save new chat page to Firebase and then add the initial message
      await savePageToFirebase(newChatPage);
      // Add initial user message by updating the page
      await updatePageInFirebase(newChatPageId, { 
        messages: [userMsg] 
      } as any);

      // Simulate AI response with thinking delay
      setTimeout(async () => {
        const aiResponse = getAIResponse(messageText);
        const updatedMessages = [userMsg, aiResponse];
        await updatePageInFirebase(newChatPageId, { 
          messages: updatedMessages 
        } as any);
        setIsThinking(false);
      }, 1200);

      // Switch to new chat page
      setCurrentPage(newChatPageId);
      setShowPanel(false);
      return;
    }

    // Add message to existing chat
    const existingMessages = currentPageMessages || [];
    const updatedMessages = [...existingMessages, userMsg];
    
    setIsThinking(true);
    
    // Update Firebase with user message
    await updatePageInFirebase(currentPage, { 
      messages: updatedMessages 
    } as any);

    // Simulate AI response
    setTimeout(async () => {
      const aiResponse = getAIResponse(messageText);
      const finalMessages = [...updatedMessages, aiResponse];
      await updatePageInFirebase(currentPage, { 
        messages: finalMessages 
      } as any);
      setIsThinking(false);
    }, 1200);
  };



  const addNewPage = async () => {
    const newPage: Page = {
      id: `page-${Date.now()}`,
      title: 'New Conversation',
      icon: '💬',
      isPinned: false,
      createdAt: new Date(),
      isChat: true,
      category: 'discussion',
      tags: ['new']
      // Messages are now stored separately
    };
    
    // Save new page to Firebase
    await savePageToFirebase(newPage);
    
    // Local state will be updated via Firebase listener
    setCurrentPage(newPage.id);
    setShowPanel(true);
  };

  const deletePage = async (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pages.length <= 1) return;

    if (!user?.uid) return;

    try {
      // Delete from Firebase
      const pageRef = doc(db, 'users', user.uid, 'chatPages', pageId);
      await updateDoc(pageRef, { deleted: true, deletedAt: Timestamp.fromDate(new Date()) });
      
      // Local state will be updated via Firebase listener
      if (currentPage === pageId && pages.length > 1) {
        const remainingPages = pages.filter(p => p.id !== pageId);
        setCurrentPage(remainingPages[0].id);
      }
    } catch (error) {
      console.error('Error deleting page:', error);
    }
  };

  const togglePin = async (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    
    await updatePageInFirebase(pageId, { isPinned: !page.isPinned });
  };

  const startEditing = (pageId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPageId(pageId);
    setEditingTitle(title);
  };

  const saveEdit = async () => {
    if (editingPageId && editingTitle.trim()) {
      await updatePageInFirebase(editingPageId, { title: editingTitle.trim() });
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

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date: Date) => {
    // Get regular events
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === date.toDateString();
    });

    // Get task deadlines for this date
    const taskDeadlines = tasks.filter(task => {
      const deadlineDate = new Date(task.deadline);
      return deadlineDate.toDateString() === date.toDateString();
    }).map(task => ({
      id: `task-${task.id}`,
      title: `📋 ${task.title}`,
      description: `Task deadline: ${task.description}`,
      startTime: new Date(task.deadline),
      endTime: new Date(task.deadline.getTime() + 30 * 60000), // 30 minutes duration
      location: '',
      attendees: task.assignedTo,
      status: task.status === 'completed' ? 'completed' : 'scheduled' as const,
      type: 'task' as const,
      tags: [...task.tags, 'deadline'],
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      priority: task.priority,
      isTaskDeadline: true
    }));

    return [...dayEvents, ...taskDeadlines];
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-500';
      case 'reminder':
        return 'bg-yellow-500';
      case 'task':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getEventStatusDotColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'low':
        return 'bg-green-100 text-green-800 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚫';
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
                  {currentView === 'roadmap' ? '📍' : 
                   currentView === 'calendar' ? '📅' : 
                   currentPageData?.icon}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-black">
                    {currentView === 'roadmap' ? 'Roadmap View' : 
                     currentView === 'calendar' ? 'Calendar View' : 
                     currentPageData?.title}
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
                  ) : currentView === 'calendar' ? (
                    <div className="flex items-center gap-3 mt-2">
                      <span className="px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm bg-black text-white">
                        CALENDAR
                      </span>
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium border border-gray-200">
                        #events
                      </span>
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium border border-gray-200">
                        #schedule
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
                <button 
                  onClick={() => router.push('/teams')}
                  className="flex items-center gap-2 px-4 py-3 hover:bg-gray-100 rounded-xl transition-all duration-200 shadow-sm border border-gray-200" 
                  title="Teams"
                >
                  <Users className="w-5 h-5 text-gray-700" />
                  <span className="text-sm font-medium text-gray-700">Teams</span>
                </button>
                <button 
                  onClick={() => router.push('/profile')}
                  className="flex items-center gap-2 px-4 py-3 hover:bg-gray-100 rounded-xl transition-all duration-200 shadow-sm border border-gray-200" 
                  title="Profile"
                >
                  <UserIcon className="w-5 h-5 text-gray-700" />
                  <span className="text-sm font-medium text-gray-700">Profile</span>
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-3 hover:bg-gray-100 rounded-xl transition-all duration-200 shadow-sm border border-gray-200 relative" 
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5 text-gray-700" />
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </div>
                    )}
                  </button>
                  
                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div 
                      data-notifications-dropdown
                      className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto"
                    >
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">Notifications</h3>
                          <span className="text-sm text-gray-500">{unreadCount} unread</span>
                        </div>
                      </div>
                      
                      <div className="divide-y divide-gray-100">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm">No notifications yet</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                !notification.read ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => {
                                markNotificationAsRead(notification.id);
                                if (notification.actionUrl) {
                                  router.push(notification.actionUrl);
                                  setShowNotifications(false);
                                }
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-2 h-2 rounded-full mt-2 ${
                                  notification.type === 'error' ? 'bg-red-500' :
                                  notification.type === 'warning' ? 'bg-yellow-500' :
                                  notification.type === 'success' ? 'bg-green-500' :
                                  'bg-blue-500'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-medium text-gray-900 truncate">
                                      {notification.title}
                                    </h4>
                                    {!notification.read && (
                                      <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {notification.timestamp.toLocaleTimeString([], { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      {notifications.length > 0 && (
                        <div className="p-3 border-t border-gray-100">
                          <button
                            onClick={() => {
                              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                            }}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Mark all as read
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
              {currentPageMessages && currentPageMessages.length > 0 ? (
                currentPageMessages.map((msg) => (
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
                          
                          {msg.context?.emailDraft && (
                            <div className="bg-linear-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4 shadow-sm">
                              <div className="flex items-center gap-3 mb-3">
                                <Mail className="w-5 h-5 text-purple-600" />
                                <span className="text-sm font-bold text-purple-900">Email Draft Created</span>
                              </div>
                              <div className="space-y-3">
                                <div className="bg-white rounded-lg p-3 border border-purple-200">
                                  <div className="text-xs text-gray-500 mb-2">TO:</div>
                                  <div className="text-sm font-medium text-gray-900">{msg.context.emailDraft.recipient}</div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-purple-200">
                                  <div className="text-xs text-gray-500 mb-2">SUBJECT:</div>
                                  <div className="text-sm font-medium text-gray-900">{msg.context.emailDraft.subject}</div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-purple-200">
                                  <div className="text-xs text-gray-500 mb-2">PREVIEW:</div>
                                  <div className="text-sm text-gray-700 whitespace-pre-line max-h-32 overflow-y-auto">
                                    {msg.context.emailDraft.body.slice(0, 300)}
                                    {msg.context.emailDraft.body.length > 300 && '...'}
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <button 
                                    onClick={() => setInputMessage(`send email to ${msg.context?.emailDraft?.recipient || ''}`)}
                                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors"
                                  >
                                    Send Now
                                  </button>
                                  <button 
                                    onClick={() => setInputMessage(`edit subject: ${msg.context?.emailDraft?.subject || ''}`)}
                                    className="px-3 py-2 bg-white border border-purple-300 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-50 transition-colors"
                                  >
                                    Edit Subject
                                  </button>
                                  <button 
                                    onClick={() => setInputMessage(`edit email body`)}
                                    className="px-3 py-2 bg-white border border-purple-300 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-50 transition-colors"
                                  >
                                    Edit Body
                                  </button>
                                </div>
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
        ) : currentView === 'calendar' ? (
          /* Calendar View */
          <div className="flex-1 h-52 overflow-y-auto bg-gray-50">
            <div className="max-w-7xl mx-auto px-8 py-8">
              <div className="space-y-8">
                {/* Calendar and Events Row */}
                <div className="grid lg:grid-cols-4 gap-8">
                  {/* Calendar Section */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg">
                      {/* Calendar Header */}
                      <div className="px-4 py-4 border-b border-gray-100">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-bold text-black">
                              {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </h2>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => navigateMonth('prev')}
                              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => setCurrentDate(new Date())}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-xs font-medium"
                            >
                              Today
                            </button>
                            <button
                              onClick={() => navigateMonth('next')}
                              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                            >
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Calendar Grid */}
                      <div className="p-4">
                        {/* Days of Week Header */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                            <div key={idx} className="text-center py-2 text-xs font-bold text-gray-600 uppercase">
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="grid grid-cols-7 gap-1">
                          {/* Empty cells for days before month starts */}
                          {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, idx) => (
                            <div key={idx} className="aspect-square"></div>
                          ))}
                          
                          {/* Month days */}
                          {Array.from({ length: getDaysInMonth(currentDate) }).map((_, idx) => {
                            const day = idx + 1;
                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                            const dayEvents = getEventsForDate(date);
                            const isToday = date.toDateString() === new Date().toDateString();
                            const isSelected = selectedDate?.toDateString() === date.toDateString();
                            
                            return (
                              <div
                                key={day}
                                onClick={() => setSelectedDate(date)}
                                className={`aspect-square p-1 rounded-md cursor-pointer transition-all duration-200 ${
                                  isSelected
                                    ? 'bg-black text-white shadow-md scale-105'
                                    : isToday
                                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                    : 'hover:bg-gray-100'
                                }`}
                              >
                                <div className="h-full flex flex-col">
                                  <span className={`text-xs font-bold mb-1 ${isSelected ? 'text-white' : isToday ? 'text-blue-900' : 'text-gray-900'}`}>
                                    {day}
                                  </span>
                                  <div className="flex-1 space-y-0.5">
                                    {dayEvents.slice(0, 2).map((event) => (
                                      <div
                                        key={event.id}
                                        className={`w-full ${event.isTaskDeadline ? 'h-1.5 rounded-full' : 'h-1 rounded-full'} ${
                                          event.isTaskDeadline 
                                            ? event.priority === 'high' 
                                              ? 'bg-red-500' 
                                              : event.priority === 'medium' 
                                              ? 'bg-orange-500'
                                              : 'bg-green-500'
                                            : getEventStatusDotColor(event.status)
                                        }`}
                                        title={event.isTaskDeadline 
                                          ? `📋 ${event.title} - Deadline (${event.priority} priority)` 
                                          : `${event.title} - ${event.status}`}
                                      ></div>
                                    ))}
                                    {dayEvents.length > 2 && (
                                      <div className="text-[10px] text-gray-500 font-medium">
                                        +{dayEvents.length - 2}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Event List Sidebar */}
                  <div className="lg:col-span-3">
                    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg">
                      <div className="px-6 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <CalendarDays className="w-5 h-5 text-gray-600" />
                          <h2 className="text-lg font-bold text-black">
                            {selectedDate ? selectedDate.toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'short', 
                              day: 'numeric' 
                            }) : 'All Events'}
                          </h2>
                        </div>
                      </div>
                      
                      <div className="p-6 max-h-96 overflow-y-auto">
                        <div className="space-y-4">
                          {loading ? (
                            <div className="text-center py-12">
                              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                              <p className="text-gray-500 text-sm">Loading your events...</p>
                            </div>
                          ) : (selectedDate ? getEventsForDate(selectedDate) : events.slice(0, 10)).length > 0 ? (
                            (selectedDate ? getEventsForDate(selectedDate) : events.slice(0, 10)).map((event) => (
                            <div key={event.id} className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200">
                              <div className="flex items-start gap-4">
                                <div className={`w-4 h-4 rounded-full mt-1 shrink-0 ${getEventStatusDotColor(event.status)}`}></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3 mb-3">
                                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{event.title}</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${getEventStatusColor(event.status)}`}>
                                      {event.status.toUpperCase()}
                                    </span>
                                  </div>
                                  
                                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">{event.description}</p>
                                  
                                  <div className="grid grid-cols-1 gap-3">
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                      <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                                      <span className="font-medium">
                                        {event.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {event.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    
                                    {event.location && (
                                      <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span className="font-medium truncate">{event.location}</span>
                                      </div>
                                    )}
                                    
                                    {event.attendees.length > 0 && (
                                      <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <Users className="w-4 h-4 text-gray-400 shrink-0" />
                                        <div className="flex flex-wrap gap-1">
                                          {event.attendees.map((attendee, idx) => (
                                            <span key={idx} className="bg-gray-100 px-2 py-1 rounded-md text-xs font-medium">
                                              {attendee}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-500 font-medium capitalize bg-gray-50 px-3 py-1 rounded-full">
                                        {event.type}
                                      </span>
                                      {event.isTaskDeadline && event.priority && (
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                          event.priority === 'high' 
                                            ? 'bg-red-100 text-red-800' 
                                            : event.priority === 'medium' 
                                            ? 'bg-orange-100 text-orange-800'
                                            : 'bg-green-100 text-green-800'
                                        }`}>
                                          {event.priority.toUpperCase()} PRIORITY
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-400">
                                      {event.createdAt.toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500 text-sm">
                                {selectedDate ? 'No events on this date' : 'No events scheduled'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tasks Data Table Section */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-black">Tasks</h2>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                          {tasks.length} total
                        </span>
                      </div>
                      <button
                        onClick={() => setShowPanel(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Add Task
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {tasksLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-500 text-sm">Loading your tasks...</p>
                      </div>
                    ) : tasks.length > 0 ? (
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                              Title
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                              Status
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                              Priority
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                              Deadline
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tasks.map((task) => (
                            <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-gray-900 mb-1">{task.title}</h3>
                                    <p className="text-xs text-gray-600 leading-relaxed">{task.description}</p>
                                    {task.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {task.tags.slice(0, 3).map((tag, idx) => (
                                          <span key={idx} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium">
                                            #{tag}
                                          </span>
                                        ))}
                                        {task.tags.length > 3 && (
                                          <span className="text-xs text-gray-500">+{task.tags.length - 3}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getTaskStatusColor(task.status)}`}>
                                  {task.status.replace('-', ' ').toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{getPriorityIcon(task.priority)}</span>
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(task.priority)}`}>
                                    {task.priority.toUpperCase()}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 font-medium">
                                  {task.deadline.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {task.deadline < new Date() ? (
                                    <span className="text-red-600 font-medium">Overdue</span>
                                  ) : (
                                    `${Math.ceil((task.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left`
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm mb-4">No tasks found</p>
                        <button
                          onClick={() => setShowPanel(true)}
                          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                        >
                          Create your first task
                        </button>
                      </div>
                    )}
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
