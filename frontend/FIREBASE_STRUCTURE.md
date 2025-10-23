# Firebase Structure Documentation

## Final Database Structure

All data is stored under: **`users/{userId}/tasks/{taskId}`**

Each task document contains:
- Task metadata (title, description, deadline, priority, status, tags, assignedTo, etc.)
- Embedded arrays:
  - `chatMessages[]` - Chat messages related to this task
  - `roadmaps[]` - Roadmaps associated with this task
  - `summaries[]` - Summaries for this task

## Example Structure

```
firestore
└── users/
    └── {userId}/
        └── tasks/
            └── {taskId}/
                ├── title: "Complete project setup"
                ├── description: "Set up Firebase and initial structure"
                ├── deadline: Timestamp
                ├── priority: "high"
                ├── status: "pending"
                ├── tags: ["setup", "firebase"]
                ├── assignedTo: ["user1", "user2"]
                ├── chatMessages: [
                │     {
                │       id: "msg_123",
                │       text: "Started working on this",
                │       isUser: true,
                │       timestamp: Timestamp,
                │       metadata: {}
                │     }
                │   ]
                ├── roadmaps: [
                │     {
                │       id: "roadmap_456",
                │       title: "Development Roadmap",
                │       description: "Complete development plan",
                │       phases: [...],
                │       createdBy: "ai",
                │       createdAt: Timestamp
                │     }
                │   ]
                ├── summaries: [
                │     {
                │       id: "summary_789",
                │       title: "Weekly Summary",
                │       content: "Progress this week...",
                │       type: "weekly",
                │       taskIds: ["task1", "task2"],
                │       createdAt: Timestamp
                │     }
                │   ]
                ├── createdAt: Timestamp
                └── updatedAt: Timestamp
```

## API Functions

### Task API (taskApi.ts)
- `fetchTasks(userId)` - Get all tasks for user
- `createTask(taskData)` - Create new task
- `updateTask(userId, taskId, updates)` - Update task
- `deleteTask(userId, taskId)` - Delete task
- `fetchTasksForDate(userId, date)` - Get tasks for specific date
- `updateTaskStatus(userId, taskId, status)` - Update task status
- `updateTaskTags(userId, taskId, tags)` - Update task tags
- `assignUsersToTask(userId, taskId, userIds)` - Assign users to task

### Chat API (chatApi.ts)
- `saveChatMessage(userId, taskId, text, isUser, metadata)` - Add chat message to task
- `fetchChatHistory(userId, taskId)` - Get chat messages for task
- `saveRoadmap(userId, taskId, roadmap)` - Add roadmap to task
- `fetchRoadmaps(userId, taskId)` - Get roadmaps for task
- `saveSummary(userId, taskId, summary)` - Add summary to task
- `fetchSummaries(userId, taskId)` - Get summaries for task
- `generateAIResponse(message, history)` - Generate AI response

## Migration Notes

**Previous Structure:**
- `users/{userId}/tasks/tasklist/tasklist/{taskId}` ❌

**Current Structure:**
- `users/{userId}/tasks/{taskId}` ✅

All chat messages, roadmaps, and summaries are embedded within task documents as arrays, making data retrieval more efficient and reducing the number of Firestore reads.
