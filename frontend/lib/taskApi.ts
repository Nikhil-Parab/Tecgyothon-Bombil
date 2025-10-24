import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// Embedded types for Task
export interface ChatMessage {
  id?: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  metadata?: {
    type?: 'roadmap' | 'summary' | 'task-creation' | 'general' | 'error' | 'roadmap_success';
    relatedTaskIds?: string[];
    data?: any;
    roadmapData?: any;
    text?: string;
    // Backend response metadata
    isBackendResponse?: boolean;
    confidence?: number;
    intents?: any[];
    retrievedDocs?: any[];
  };
}

export interface RoadmapPhase {
  title: string;
  description: string;
  duration: string;
  tasks: string[];
  status: 'pending' | 'in-progress' | 'completed';
}

export interface Roadmap {
  id?: string;
  title: string;
  description: string;
  phases: RoadmapPhase[];
  createdAt: Date | Timestamp;
  createdBy: 'ai' | 'user';
  status?: string;
}

export interface Summary {
  id?: string;
  title: string;
  content: string;
  type: 'daily' | 'weekly' | 'project';
  taskIds: string[];
  createdAt: Date;
}

export interface Task {
  id?: string;
  title: string;
  description?: string;
  deadline: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'due' | 'completed';
  userId: string;
  tags?: string[]; // Task tags for categorization
  assignedTo?: string[]; // User IDs assigned to this task
  completedAt?: Date; // When task was completed
  createdAt?: Date;
  updatedAt?: Date;
  // Embedded data instead of separate collections
  chatMessages?: ChatMessage[]; // Chat messages embedded in task
  roadmaps?: Roadmap[]; // Roadmaps embedded in task
  summaries?: Summary[]; // Summaries embedded in task
}

/**
 * Ensure user document exists
 */
async function ensureUserDocument(userId: string): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  
  try {
    await setDoc(
      userDocRef,
      {
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error ensuring user document:', error);
  }
}

/**
 * Fetch all tasks for a user
 * Structure: users/{userId}/tasks/{taskId}
 */
export async function fetchTasks(userId: string): Promise<Task[]> {
  try {
    await ensureUserDocument(userId);
    
    const userDocRef = doc(db, 'users', userId);
    const tasksRef = collection(userDocRef, 'tasks');
    const q = query(tasksRef, orderBy('deadline', 'asc'));
    
    const snapshot = await getDocs(q);

    const tasks: Task[] = [];
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      tasks.push({
        id: docSnapshot.id,
        title: data.title || 'Untitled',
        description: data.description || '',
        deadline: data.deadline?.toDate() || new Date(),
        priority: data.priority || 'medium',
        status: data.status || 'pending',
        tags: data.tags || [],
        assignedTo: data.assignedTo || [],
        completedAt: data.completedAt?.toDate(),
        userId: userId,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        chatMessages: data.chatMessages?.map((msg: any) => ({
          id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: msg.text || (msg.metadata?.text || ''),
          isUser: typeof msg.isUser === 'boolean' ? msg.isUser : true,
          timestamp: msg.timestamp?.toDate?.() || new Date(msg.timestamp || Date.now()),
          metadata: {
            ...msg.metadata,
            type: msg.metadata?.type || 'general',
            data: msg.metadata?.data || {}
          }
        })) || [],
        roadmaps: data.roadmaps?.map((rm: any) => ({
          id: rm.id || `roadmap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: rm.title || 'Untitled Roadmap',
          description: rm.description || '',
          phases: (rm.phases || []).map((phase: any) => ({
            title: phase.title || 'Untitled Phase',
            description: phase.description || '',
            duration: phase.duration || '',
            tasks: Array.isArray(phase.tasks) ? phase.tasks : [],
            status: phase.status || 'pending'
          })),
          createdAt: rm.createdAt?.toDate?.() || new Date(rm.createdAt || Date.now()),
          createdBy: rm.createdBy || 'user',
          status: rm.status || 'pending'
        })) || [],
        summaries: Array.isArray(data.summaries) ? data.summaries.map((sum: any) => ({
          id: sum.id || `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: sum.title || 'Untitled Summary',
          content: sum.content || '',
          type: sum.type || 'project',
          taskIds: Array.isArray(sum.taskIds) ? sum.taskIds : [],
          createdAt: sum.createdAt?.toDate?.() || new Date(sum.createdAt || Date.now())
        })) : [],
      });
    });

    return tasks;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
}

/**
 * Create a new task
 * Structure: users/{userId}/tasks/{taskId}
 */
export async function createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    await ensureUserDocument(taskData.userId);
    
    const userDocRef = doc(db, 'users', taskData.userId);
    const tasksRef = collection(userDocRef, 'tasks');
    
    // Ensure all required fields are present with defaults and properly formatted
    const docRef = await addDoc(tasksRef, {
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      deadline: Timestamp.fromDate(taskData.deadline),
      priority: taskData.priority || 'medium',
      status: taskData.status || 'pending',
      tags: taskData.tags || [],
      assignedTo: Array.isArray(taskData.assignedTo) ? taskData.assignedTo : [],
      chatMessages: Array.isArray(taskData.chatMessages) ? taskData.chatMessages.map(msg => ({
        id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: msg.text || '',
        isUser: typeof msg.isUser === 'boolean' ? msg.isUser : true,
        timestamp: Timestamp.fromDate(msg.timestamp || new Date()),
        metadata: msg.metadata || { type: 'general' }
      })) : [],
      roadmaps: Array.isArray(taskData.roadmaps) ? taskData.roadmaps.map(rm => ({
        id: rm.id || `roadmap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: rm.title || 'Untitled Roadmap',
        description: rm.description || '',
        phases: Array.isArray(rm.phases) ? rm.phases.map(phase => ({
          title: phase.title || 'Untitled Phase',
          description: phase.description || '',
          duration: phase.duration || '',
          tasks: Array.isArray(phase.tasks) ? phase.tasks : [],
          status: phase.status || 'pending'
        })) : [],
        createdAt: rm.createdAt instanceof Date ? Timestamp.fromDate(rm.createdAt) : (rm.createdAt || Timestamp.now()),
        createdBy: rm.createdBy || 'user',
        status: rm.status || 'pending'
      })) : [],
      summaries: Array.isArray(taskData.summaries) ? taskData.summaries.map(sum => ({
        id: sum.id || `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: sum.title || 'Untitled Summary',
        content: sum.content || '',
        type: sum.type || 'project',
        taskIds: Array.isArray(sum.taskIds) ? sum.taskIds : [],
        createdAt: Timestamp.fromDate(sum.createdAt || new Date())
      })) : [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

/**
 * Update an existing task
 * Structure: users/{userId}/tasks/{taskId}
 */
export async function updateTask(userId: string, taskId: string, updates: Partial<Task>): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const taskDocRef = doc(collection(userDocRef, 'tasks'), taskId);

    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    // Handle primitive fields
    if (updates.title) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.status) updateData.status = updates.status;
    if (updates.tags) updateData.tags = updates.tags;
    
    // Handle date fields
    if (updates.deadline) {
      updateData.deadline = Timestamp.fromDate(updates.deadline);
    }
    
    if (updates.completedAt) {
      updateData.completedAt = Timestamp.fromDate(updates.completedAt);
    }
    
    // Handle array fields with proper validation
    if (updates.assignedTo) {
      updateData.assignedTo = Array.isArray(updates.assignedTo) ? updates.assignedTo : [];
    }
    
    // Handle complex nested data
    if (updates.chatMessages) {
      updateData.chatMessages = Array.isArray(updates.chatMessages) ? updates.chatMessages.map(msg => ({
        id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: msg.text || (msg.metadata?.text || ''),
        isUser: typeof msg.isUser === 'boolean' ? msg.isUser : true,
        timestamp: msg.timestamp instanceof Date ? Timestamp.fromDate(msg.timestamp) : 
                  (msg.timestamp || Timestamp.now()),
        metadata: msg.metadata || { type: 'general' }
      })) : [];
    }
    
    if (updates.roadmaps) {
      updateData.roadmaps = Array.isArray(updates.roadmaps) ? updates.roadmaps.map(rm => ({
        id: rm.id || `roadmap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: rm.title || 'Untitled Roadmap',
        description: rm.description || '',
        phases: Array.isArray(rm.phases) ? rm.phases.map(phase => ({
          title: phase.title || 'Untitled Phase',
          description: phase.description || '',
          duration: phase.duration || '',
          tasks: Array.isArray(phase.tasks) ? phase.tasks : [],
          status: phase.status || 'pending'
        })) : [],
        createdAt: rm.createdAt instanceof Date ? Timestamp.fromDate(rm.createdAt) : 
                  (rm.createdAt || Timestamp.now()),
        createdBy: rm.createdBy || 'user',
        status: rm.status || 'pending'
      })) : [];
    }
    
    if (updates.summaries) {
      updateData.summaries = Array.isArray(updates.summaries) ? updates.summaries.map(sum => ({
        id: sum.id || `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: sum.title || 'Untitled Summary',
        content: sum.content || '',
        type: sum.type || 'project',
        taskIds: Array.isArray(sum.taskIds) ? sum.taskIds : [],
        createdAt: sum.createdAt instanceof Date ? Timestamp.fromDate(sum.createdAt) : 
                  (sum.createdAt || Timestamp.now())
      })) : [];
    }

    // Remove id and userId from updates
    delete updateData.id;
    delete updateData.userId;
    delete updateData.createdAt;

    await updateDoc(taskDocRef, updateData);
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

/**
 * Delete a task
 * Structure: users/{userId}/tasks/{taskId}
 */
export async function deleteTask(userId: string, taskId: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const taskDocRef = doc(collection(userDocRef, 'tasks'), taskId);
    
    await deleteDoc(taskDocRef);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

/**
 * Fetch tasks for a specific date
 * Structure: users/{userId}/tasks/{taskId}
 */
export async function fetchTasksForDate(userId: string, date: Date): Promise<Task[]> {
  try {
    await ensureUserDocument(userId);
    
    const userDocRef = doc(db, 'users', userId);
    const tasksRef = collection(userDocRef, 'tasks');
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(tasksRef, orderBy('deadline', 'asc'));
    const snapshot = await getDocs(q);

    const tasks: Task[] = [];
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const taskDeadline = data.deadline?.toDate();
      
      if (taskDeadline && taskDeadline >= startOfDay && taskDeadline <= endOfDay) {
        tasks.push({
          id: docSnapshot.id,
          title: data.title || 'Untitled',
          description: data.description || '',
          deadline: taskDeadline,
          priority: data.priority || 'medium',
          status: data.status || 'pending',
          tags: data.tags || [],
          assignedTo: data.assignedTo || [],
          completedAt: data.completedAt?.toDate(),
          userId: userId,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          chatMessages: data.chatMessages?.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp?.toDate?.() || new Date(msg.timestamp),
          })) || [],
          roadmaps: data.roadmaps?.map((rm: any) => ({
            ...rm,
            createdAt: rm.createdAt?.toDate?.() || new Date(rm.createdAt),
          })) || [],
          summaries: data.summaries?.map((sum: any) => ({
            ...sum,
            createdAt: sum.createdAt?.toDate?.() || new Date(sum.createdAt),
          })) || [],
        });
      }
    });

    return tasks;
  } catch (error) {
    console.error('Error fetching tasks for date:', error);
    return [];
  }
}

/**
 * Update task status
 * Structure: users/{userId}/tasks/{taskId}
 */
export async function updateTaskStatus(
  userId: string,
  taskId: string,
  status: 'pending' | 'due' | 'completed'
): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const taskDocRef = doc(collection(userDocRef, 'tasks'), taskId);
    
    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
    };
    
    // If marking as completed, set completedAt timestamp
    if (status === 'completed') {
      updateData.completedAt = serverTimestamp();
    }
    
    await updateDoc(taskDocRef, updateData);
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
}

/**
 * Add a chat/comment to a task
 * Structure: users/{userId}/tasks/{taskId}
 */
export async function addChatToTask(
  userId: string,
  taskId: string,
  chatId: string
): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const taskDocRef = doc(collection(userDocRef, 'tasks'), taskId);
    
    // Get current task to append to chats array
    const taskSnapshot = await getDoc(taskDocRef);
    const currentChats = taskSnapshot.data()?.chats || [];
    
    await updateDoc(taskDocRef, {
      chats: [...currentChats, chatId],
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error adding chat to task:', error);
    throw error;
  }
}

/**
 * Add tags to a task
 * Structure: users/{userId}/tasks/{taskId}
 */
export async function updateTaskTags(
  userId: string,
  taskId: string,
  tags: string[]
): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const taskDocRef = doc(collection(userDocRef, 'tasks'), taskId);
    
    await updateDoc(taskDocRef, {
      tags,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating task tags:', error);
    throw error;
  }
}

/**
 * Assign users to a task
 * Structure: users/{userId}/tasks/{taskId}
 */
export async function assignUsersToTask(
  userId: string,
  taskId: string,
  assignedUserIds: string[]
): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const taskDocRef = doc(collection(userDocRef, 'tasks'), taskId);
    
    await updateDoc(taskDocRef, {
      assignedTo: assignedUserIds,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error assigning users to task:', error);
    throw error;
  }
}

/**
 * Get or create a default "General Chat" task for user
 * This is used for AI assistant conversations that aren't task-specific
 * Structure: users/{userId}/tasks/{taskId}
 */
export async function getOrCreateGeneralChatTask(userId: string): Promise<string> {
  try {
    await ensureUserDocument(userId);
    
    const userDocRef = doc(db, 'users', userId);
    const tasksRef = collection(userDocRef, 'tasks');
    
    // Query for existing general chat task
    const q = query(tasksRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    
    // Look for task with title "General Chat" or "AI Assistant"
    let generalChatTask = snapshot.docs.find(
      doc => doc.data().title === 'AI Assistant' || doc.data().title === 'General Chat'
    );
    
    if (generalChatTask) {
      return generalChatTask.id;
    }
    
    // Create new general chat task if doesn't exist
    const defaultTask = {
      title: 'AI Assistant',
      description: 'General conversation with AI assistant',
      deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      priority: 'low' as const,
      status: 'pending' as const,
      tags: ['ai-chat', 'general'],
      assignedTo: [],
      chatMessages: [],
      roadmaps: [],
      summaries: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(tasksRef, defaultTask);
    return docRef.id;
  } catch (error) {
    console.error('Error getting or creating general chat task:', error);
    throw error;
  }
}
