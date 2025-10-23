import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
  limit,
  doc,
  setDoc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ChatMessage, Roadmap, RoadmapPhase, Summary } from './taskApi';

// Re-export types for convenience
export type { ChatMessage, Roadmap, RoadmapPhase, Summary };

/**
 * Ensure user document exists in Firestore
 * Structure: users/{userId}
 */
async function ensureUserDocument(userId: string): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  
  try {
    // Create user document if it doesn't exist (setDoc with merge)
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
 * Save a chat message to a specific task
 * Structure: Embedded in users/{userId}/tasks/{taskId}
 */
export async function saveChatMessage(
  userId: string,
  taskId: string,
  text: string,
  isUser: boolean,
  metadata?: ChatMessage['metadata']
): Promise<string> {
  try {
    // Ensure user document exists
    await ensureUserDocument(userId);
    
    // Reference to the specific task document
    const userDocRef = doc(db, 'users', userId);
    const taskDocRef = doc(collection(userDocRef, 'tasks'), taskId);
    
    // Create new message with generated ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: ChatMessage = {
      id: messageId,
      text,
      isUser,
      timestamp: new Date(),
      metadata: metadata || {},
    };
    
    // Get current task document
    const taskSnapshot = await getDoc(taskDocRef);
    
    if (!taskSnapshot.exists()) {
      throw new Error('Task not found');
    }
    
    const currentMessages = taskSnapshot.data().chatMessages || [];
    
    // Update task with new message appended
    await updateDoc(taskDocRef, {
      chatMessages: [...currentMessages, newMessage],
      updatedAt: serverTimestamp(),
    });

    return messageId;
  } catch (error) {
    console.error('Error saving chat message:', error);
    throw error;
  }
}

/**
 * Fetch chat history for a specific task
 * Structure: Embedded in users/{userId}/tasks/{taskId}
 */
export async function fetchChatHistory(userId: string, taskId: string): Promise<ChatMessage[]> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const taskDocRef = doc(collection(userDocRef, 'tasks'), taskId);
    
    const taskSnapshot = await getDoc(taskDocRef);
    
    if (!taskSnapshot.exists()) {
      return [];
    }

    const taskData = taskSnapshot.data();
    const messages = taskData.chatMessages || [];

    // Convert any Firestore timestamps to Date objects
    return messages.map((msg: any) => ({
      id: msg.id,
      text: msg.text,
      isUser: msg.isUser,
      timestamp: msg.timestamp instanceof Timestamp ? msg.timestamp.toDate() : new Date(msg.timestamp),
      metadata: msg.metadata || {},
    }));
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return [];
  }
}

/**
 * Save a roadmap to a specific task
 * Structure: Embedded in users/{userId}/tasks/{taskId}
 */
export async function saveRoadmap(userId: string, taskId: string, roadmap: Omit<Roadmap, 'id' | 'createdAt'>): Promise<string> {
  try {
    // Ensure user document exists
    await ensureUserDocument(userId);
    
    const userDocRef = doc(db, 'users', userId);
    const taskDocRef = doc(collection(userDocRef, 'tasks'), taskId);
    
    // Create new roadmap with generated ID
    const roadmapId = `roadmap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRoadmap: Roadmap = {
      id: roadmapId,
      title: roadmap.title,
      description: roadmap.description,
      phases: roadmap.phases,
      createdBy: roadmap.createdBy,
      createdAt: new Date(),
    };
    
    // Get current task document
    const taskSnapshot = await getDoc(taskDocRef);
    
    if (!taskSnapshot.exists()) {
      throw new Error('Task not found');
    }
    
    const currentRoadmaps = taskSnapshot.data().roadmaps || [];
    
    // Update task with new roadmap appended
    await updateDoc(taskDocRef, {
      roadmaps: [...currentRoadmaps, newRoadmap],
      updatedAt: serverTimestamp(),
    });

    return roadmapId;
  } catch (error) {
    console.error('Error saving roadmap:', error);
    throw error;
  }
}

/**
 * Fetch all roadmaps for a specific task
 * Structure: Embedded in users/{userId}/tasks/{taskId}
 */
export async function fetchRoadmaps(userId: string, taskId: string): Promise<Roadmap[]> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const taskDocRef = doc(collection(userDocRef, 'tasks'), taskId);
    
    const taskSnapshot = await getDoc(taskDocRef);
    
    if (!taskSnapshot.exists()) {
      return [];
    }

    const taskData = taskSnapshot.data();
    const roadmaps = taskData.roadmaps || [];

    // Convert any Firestore timestamps to Date objects
    return roadmaps.map((rm: any) => ({
      id: rm.id,
      title: rm.title,
      description: rm.description,
      phases: rm.phases,
      createdBy: rm.createdBy,
      createdAt: rm.createdAt instanceof Timestamp ? rm.createdAt.toDate() : new Date(rm.createdAt),
    }));
  } catch (error) {
    console.error('Error fetching roadmaps:', error);
    return [];
  }
}

/**
 * Save a summary to a specific task
 * Structure: Embedded in users/{userId}/tasks/{taskId}
 */
export async function saveSummary(userId: string, taskId: string, summary: Omit<Summary, 'id' | 'createdAt'>): Promise<string> {
  try {
    // Ensure user document exists
    await ensureUserDocument(userId);
    
    const userDocRef = doc(db, 'users', userId);
    const taskDocRef = doc(collection(userDocRef, 'tasks'), taskId);
    
    // Create new summary with generated ID
    const summaryId = `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSummary: Summary = {
      id: summaryId,
      title: summary.title,
      content: summary.content,
      type: summary.type,
      taskIds: summary.taskIds,
      createdAt: new Date(),
    };
    
    // Get current task document
    const taskSnapshot = await getDoc(taskDocRef);
    
    if (!taskSnapshot.exists()) {
      throw new Error('Task not found');
    }
    
    const currentSummaries = taskSnapshot.data().summaries || [];
    
    // Update task with new summary appended
    await updateDoc(taskDocRef, {
      summaries: [...currentSummaries, newSummary],
      updatedAt: serverTimestamp(),
    });

    return summaryId;
  } catch (error) {
    console.error('Error saving summary:', error);
    throw error;
  }
}

/**
 * Fetch all summaries for a specific task
 * Structure: Embedded in users/{userId}/tasks/{taskId}
 */
export async function fetchSummaries(userId: string, taskId: string): Promise<Summary[]> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const taskDocRef = doc(collection(userDocRef, 'tasks'), taskId);
    
    const taskSnapshot = await getDoc(taskDocRef);
    
    if (!taskSnapshot.exists()) {
      return [];
    }

    const taskData = taskSnapshot.data();
    const summaries = taskData.summaries || [];

    // Convert any Firestore timestamps to Date objects
    return summaries.map((sum: any) => ({
      id: sum.id,
      title: sum.title,
      content: sum.content,
      type: sum.type,
      taskIds: sum.taskIds || [],
      createdAt: sum.createdAt instanceof Timestamp ? sum.createdAt.toDate() : new Date(sum.createdAt),
    }));
  } catch (error) {
    console.error('Error fetching summaries:', error);
    return [];
  }
}

/**
 * Generate AI response based on user message
 * This is a dummy implementation - replace with actual AI API call
 */
export function generateAIResponse(
  userMessage: string,
  chatHistory: ChatMessage[]
): { response: string; type: string; data?: any } {
  const lowerMessage = userMessage.toLowerCase();

  // Roadmap generation
  if (lowerMessage.includes('roadmap') || lowerMessage.includes('plan')) {
    return {
      response: `I'll help you create a roadmap!

📋 **Project Roadmap**

**Phase 1: Planning (Week 1-2)**
- Define project scope and objectives
- Identify key stakeholders
- Setup development infrastructure
- Create initial documentation

**Phase 2: Development (Week 3-6)**
- Develop core features
- Create user interface design
- Implement backend APIs
- Integration testing

**Phase 3: Testing (Week 7-8)**
- Unit testing
- Integration testing
- User acceptance testing
- Bug fixes and optimization

**Phase 4: Deployment (Week 9-10)**
- Production deployment
- Monitor performance
- Gather user feedback
- Iterate based on insights

I've saved this roadmap to your workspace. You can view and modify it anytime!`,
      type: 'roadmap',
      data: {
        title: 'Project Roadmap',
        description: 'AI-generated project roadmap',
        phases: [
          {
            title: 'Planning',
            description: 'Initial project setup and planning',
            duration: '2 weeks',
            tasks: [
              'Define project scope and objectives',
              'Identify key stakeholders',
              'Setup development infrastructure',
              'Create initial documentation',
            ],
            status: 'pending' as const,
          },
          {
            title: 'Development',
            description: 'Core feature development',
            duration: '4 weeks',
            tasks: [
              'Develop core features',
              'Create user interface design',
              'Implement backend APIs',
              'Integration testing',
            ],
            status: 'pending' as const,
          },
          {
            title: 'Testing',
            description: 'Quality assurance and testing',
            duration: '2 weeks',
            tasks: [
              'Unit testing',
              'Integration testing',
              'User acceptance testing',
              'Bug fixes and optimization',
            ],
            status: 'pending' as const,
          },
          {
            title: 'Deployment',
            description: 'Production launch and monitoring',
            duration: '2 weeks',
            tasks: [
              'Production deployment',
              'Monitor performance',
              'Gather user feedback',
              'Iterate based on insights',
            ],
            status: 'pending' as const,
          },
        ],
      },
    };
  }

  // Task summary
  if (lowerMessage.includes('summary') || lowerMessage.includes('summarize')) {
    return {
      response: `📊 **Task Summary**

Here's an overview of your current tasks:

**Overall Progress:**
- Total Tasks: 12
- ✅ Completed: 5 (42%)
- 🔄 In Progress: 4 (33%)
- 📝 Todo: 3 (25%)

**Priority Breakdown:**
- 🔴 High: 2 tasks
- 🟡 Medium: 6 tasks
- 🟢 Low: 4 tasks

**Recent Activity:**
- 2 tasks completed this week
- 3 tasks approaching deadline
- 1 overdue task requiring attention

**Recommendations:**
1. Focus on the 2 high-priority tasks first
2. Review the overdue task and reassign if needed
3. Great progress! Keep up the momentum

I've saved this summary for your records.`,
      type: 'summary',
      data: {
        title: 'Task Progress Summary',
        content: 'Summary of current task status and recommendations',
        type: 'project',
      },
    };
  }

  // Task creation
  if (lowerMessage.includes('create task') || lowerMessage.includes('add task')) {
    return {
      response: `I can help you create a new task!

📋 **Task Suggestion:**

**Title:** Review and Update Documentation
**Description:** Review existing documentation and update with recent changes
**Priority:** Medium
**Suggested Deadline:** 5 days from now

Would you like me to create this task? You can also customize the details before adding it to your task list.

(Note: Auto-creation is currently disabled, but you can enable it in settings)`,
      type: 'task-creation',
      data: {
        suggestedTask: {
          title: 'Review and Update Documentation',
          description: 'Review existing documentation and update with recent changes',
          priority: 'medium',
          status: 'todo',
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
      },
    };
  }

  // General response
  return {
    response: `I understand you're asking about "${userMessage}". 

I'm here to help you with:
- 🗺️ Creating project roadmaps
- 📊 Generating task summaries
- ✏️ Suggesting and creating tasks
- 💬 Answering questions about your workspace

Try asking me to:
- "Create a roadmap for [your project]"
- "Summarize my current tasks"
- "Help me create a task for [something]"

What would you like to work on?`,
    type: 'general',
  };
}
