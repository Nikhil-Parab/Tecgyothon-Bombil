'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Crown,
  Shield,
  User,
  MessageSquare,
  Calendar,
  CheckSquare,
  Settings,
  MoreVertical,
  UserPlus,
  Edit2,
  Trash2,
  Eye,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  Star,
  Clock,
  ArrowRight,
  Target,
  TrendingUp,
  Activity,
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TeamMember {
  id: string;
  email: string;
  displayName: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
  status: 'active' | 'offline';
  avatar?: string;
}

interface TeamTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string[];
  assignedBy: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in-progress' | 'review' | 'done';
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface TeamChat {
  id: string;
  message: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: 'message' | 'system' | 'task' | 'announcement';
  attachments?: string[];
}

interface Team {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
  color: string;
  avatar?: string;
  settings: {
    isPublic: boolean;
    allowMemberInvites: boolean;
    chatEnabled: boolean;
    taskManagement: boolean;
  };
}

export default function TeamsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeView, setActiveView] = useState<'teams' | 'create' | 'team-detail'>('teams');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'tasks' | 'members' | 'settings'>('overview');
  
  // Chat scroll ref
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  
  // Teams State
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'owner' | 'admin' | 'member'>('all');
  
  // Create Team State
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    color: '#000000',
    isPublic: false
  });
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<TeamChat[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // Tasks State
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: [] as string[],
    priority: 'medium' as TeamTask['priority'],
    deadline: ''
  });
  const [showCreateTask, setShowCreateTask] = useState(false);
  
  // Member Management State
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [showInviteMember, setShowInviteMember] = useState(false);

  // Load user's teams
  useEffect(() => {
    if (!user?.uid) return;

    const teamsQuery = query(
      collection(db, 'teams'),
      where('memberIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Team[];
      setTeams(teamsData);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Load team chat messages
  useEffect(() => {
    if (!selectedTeam?.id) return;

    console.log('Loading chat messages for team:', selectedTeam.id);

    // Simplified query without orderBy to avoid index requirements
    const chatQuery = query(
      collection(db, 'teamChats'),
      where('teamId', '==', selectedTeam.id)
    );

    const unsubscribe = onSnapshot(chatQuery, 
      (snapshot) => {
        console.log('Chat snapshot received:', snapshot.docs.length, 'messages');
        const messages = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
          };
        }) as TeamChat[];
        
        // Sort messages by timestamp on client side
        const sortedMessages = messages.sort((a, b) => 
          (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0)
        );
        
        setChatMessages(sortedMessages);
        console.log('Chat messages updated:', sortedMessages);
      },
      (error) => {
        console.error('Error loading chat messages:', error);
        // Set empty array on error to prevent UI crashes
        setChatMessages([]);
      }
    );

    return () => unsubscribe();
  }, [selectedTeam?.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Load team tasks
  useEffect(() => {
    if (!selectedTeam?.id) return;

    const tasksQuery = query(
      collection(db, 'teamTasks'),
      where('teamId', '==', selectedTeam.id)
    );

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      try {
        const tasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          deadline: doc.data().deadline?.toDate()
        })) as TeamTask[];
        
        // Sort tasks by createdAt (newest first) on client side to avoid composite index
        tasks.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        
        setTeamTasks(tasks);
      } catch (error) {
        console.error('Error processing team tasks:', error);
        setTeamTasks([]);
      }
    }, (error) => {
      console.error('Error loading team tasks:', error);
      setTeamTasks([]);
    });

    return () => unsubscribe();
  }, [selectedTeam?.id]);

  const createTeam = async () => {
    if (!user?.uid || !newTeam.name.trim()) return;

    try {
      const teamData = {
        name: newTeam.name.trim(),
        description: newTeam.description.trim(),
        ownerId: user.uid,
        memberIds: [user.uid],
        members: [{
          id: user.uid,
          email: user.email,
          displayName: user.displayName || user.email,
          role: 'owner' as const,
          joinedAt: new Date(),
          status: 'active' as const
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        color: newTeam.color,
        settings: {
          isPublic: newTeam.isPublic,
          allowMemberInvites: true,
          chatEnabled: true,
          taskManagement: true
        }
      };

      await addDoc(collection(db, 'teams'), teamData);
      
      // Reset form
      setNewTeam({
        name: '',
        description: '',
        color: '#000000',
        isPublic: false
      });
      
      setActiveView('teams');
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedTeam?.id || !newMessage.trim() || !user) {
      console.log('SendMessage validation failed:', {
        teamId: selectedTeam?.id,
        message: newMessage.trim(),
        user: !!user
      });
      return;
    }

    setChatLoading(true);
    try {
      console.log('Sending message:', {
        teamId: selectedTeam.id,
        message: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || user.email
      });

      const docRef = await addDoc(collection(db, 'teamChats'), {
        teamId: selectedTeam.id,
        message: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Unknown User',
        timestamp: serverTimestamp(),
        type: 'message'
      });

      console.log('Message sent successfully:', docRef.id);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const createTask = async () => {
    if (!selectedTeam?.id || !newTask.title.trim() || !user) return;

    try {
      const taskData = {
        teamId: selectedTeam.id,
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        assignedTo: newTask.assignedTo,
        assignedBy: user.uid,
        priority: newTask.priority,
        status: 'todo' as const,
        deadline: newTask.deadline ? new Date(newTask.deadline) : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'teamTasks'), taskData);
      
      // Send system message about new task
      await addDoc(collection(db, 'teamChats'), {
        teamId: selectedTeam.id,
        message: `New task created: ${newTask.title}`,
        senderId: user.uid,
        senderName: user.displayName || user.email,
        timestamp: serverTimestamp(),
        type: 'system'
      });

      // Reset form
      setNewTask({
        title: '',
        description: '',
        assignedTo: [],
        priority: 'medium',
        deadline: ''
      });
      setShowCreateTask(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const inviteMember = async () => {
    if (!selectedTeam?.id || !newMemberEmail.trim() || !user) return;

    try {
      // Check if user exists (in a real app, you'd validate email exists)
      const newMember = {
        id: newMemberEmail, // In real app, get actual user ID
        email: newMemberEmail.trim(),
        displayName: newMemberEmail.trim(),
        role: 'member' as const,
        joinedAt: new Date(),
        status: 'active' as const
      };

      await updateDoc(doc(db, 'teams', selectedTeam.id), {
        members: arrayUnion(newMember),
        memberIds: arrayUnion(newMemberEmail),
        updatedAt: serverTimestamp()
      });

      // Send system message
      await addDoc(collection(db, 'teamChats'), {
        teamId: selectedTeam.id,
        message: `${newMemberEmail} joined the team`,
        senderId: user.uid,
        senderName: user.displayName || user.email,
        timestamp: serverTimestamp(),
        type: 'system'
      });

      setNewMemberEmail('');
      setShowInviteMember(false);
    } catch (error) {
      console.error('Error inviting member:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: TeamTask['status']) => {
    try {
      await updateDoc(doc(db, 'teamTasks', taskId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getUserRole = (team: Team): TeamMember['role'] => {
    const member = team.members.find(m => m.id === user?.uid);
    return member?.role || 'member';
  };

  const canManageTeam = (team: Team): boolean => {
    const role = getUserRole(team);
    return role === 'owner' || role === 'admin';
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || getUserRole(team) === filterRole;
    return matchesSearch && matchesRole;
  });

  const getStatusColor = (status: TeamTask['status']) => {
    const colors = {
      'todo': 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'review': 'bg-yellow-100 text-yellow-800',
      'done': 'bg-green-100 text-green-800'
    };
    return colors[status];
  };

  const getPriorityColor = (priority: TeamTask['priority']) => {
    const colors = {
      'low': 'bg-gray-100 text-gray-800',
      'medium': 'bg-blue-100 text-blue-800',
      'high': 'bg-orange-100 text-orange-800',
      'urgent': 'bg-red-100 text-red-800'
    };
    return colors[priority];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black text-white border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                ← Back to Dashboard
              </button>
              <div className="flex items-center space-x-2">
                <Users className="w-6 h-6" />
                <h1 className="text-xl font-bold">Teams</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {activeView === 'teams' && (
                <button
                  onClick={() => setActiveView('create')}
                  className="flex items-center space-x-2 px-4 py-2 bg-white text-black hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Team</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Teams List View */}
        {activeView === 'teams' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="all">All Roles</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              </div>
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeams.map((team) => (
                <div
                  key={team.id}
                  className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedTeam(team);
                    setActiveView('team-detail');
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{team.name}</h3>
                        <p className="text-sm text-gray-500">{team.members.length} members</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getUserRole(team) === 'owner' && <Crown className="w-4 h-4 text-yellow-500" />}
                      {getUserRole(team) === 'admin' && <Shield className="w-4 h-4 text-blue-500" />}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {team.description || 'No description'}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Created {team.createdAt.toLocaleDateString()}</span>
                    <div className="flex items-center space-x-2">
                      {team.settings.chatEnabled && <MessageSquare className="w-4 h-4" />}
                      {team.settings.taskManagement && <CheckSquare className="w-4 h-4" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredTeams.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No teams found</h3>
                <p className="text-gray-600 mb-4">
                  {teams.length === 0 
                    ? "You're not a member of any teams yet." 
                    : "No teams match your search criteria."
                  }
                </p>
                <button
                  onClick={() => setActiveView('create')}
                  className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Create Your First Team
                </button>
              </div>
            )}
          </div>
        )}

        {/* Create Team View */}
        {activeView === 'create' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Team</h2>
                <button
                  onClick={() => setActiveView('teams')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    placeholder="Enter team name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newTeam.description}
                    onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                    placeholder="Describe your team's purpose"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={newTeam.color}
                      onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
                      className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">Choose a color for your team</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newTeam.isPublic}
                    onChange={(e) => setNewTeam({ ...newTeam, isPublic: e.target.checked })}
                    className="rounded border-gray-300 text-black focus:ring-black"
                  />
                  <label htmlFor="isPublic" className="text-sm text-gray-700">
                    Make this team discoverable by others
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    onClick={() => setActiveView('teams')}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createTeam}
                    disabled={!newTeam.name.trim()}
                    className="px-4 py-2 bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    Create Team
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Detail View */}
        {activeView === 'team-detail' && selectedTeam && (
          <div className="space-y-6">
            {/* Team Header */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setActiveView('teams')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </button>
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
                    style={{ backgroundColor: selectedTeam.color }}
                  >
                    {selectedTeam.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{selectedTeam.name}</h1>
                    <p className="text-gray-600">{selectedTeam.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>{selectedTeam.members.length} members</span>
                      <span>•</span>
                      <span>Created {selectedTeam.createdAt.toLocaleDateString()}</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        {getUserRole(selectedTeam) === 'owner' && <Crown className="w-4 h-4 text-yellow-500" />}
                        {getUserRole(selectedTeam) === 'admin' && <Shield className="w-4 h-4 text-blue-500" />}
                        <span className="capitalize">{getUserRole(selectedTeam)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {canManageTeam(selectedTeam) && (
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Settings className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-2">
              <div className="flex space-x-2">
                {[
                  { id: 'overview', label: 'Overview', icon: Eye },
                  { id: 'chat', label: 'Chat', icon: MessageSquare },
                  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
                  { id: 'members', label: 'Members', icon: Users },
                  ...(canManageTeam(selectedTeam) ? [{ id: 'settings', label: 'Settings', icon: Settings }] : [])
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-black text-white shadow-lg'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    {/* Team Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                          <Users className="w-8 h-8 text-gray-800" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">{selectedTeam.members.length}</div>
                        <div className="text-sm text-gray-600">Members</div>
                      </div>

                      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                          <CheckSquare className="w-8 h-8 text-gray-800" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">{teamTasks.length}</div>
                        <div className="text-sm text-gray-600">Tasks</div>
                      </div>

                      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                          <MessageSquare className="w-8 h-8 text-gray-800" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">{chatMessages.length}</div>
                        <div className="text-sm text-gray-600">Messages</div>
                      </div>

                      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                          <Activity className="w-8 h-8 text-gray-800" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">
                          {teamTasks.filter(t => t.status === 'done').length}
                        </div>
                        <div className="text-sm text-gray-600">Completed</div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
                      <div className="space-y-3">
                        {chatMessages.slice(-5).reverse().map((message) => (
                          <div key={message.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-sm font-bold">
                              {message.senderName[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{message.senderName}</span>
                                <span className="text-xs text-gray-500">
                                  {message.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{message.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                      <div className="space-y-3">
                        <button
                          onClick={() => setActiveTab('chat')}
                          className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-5 h-5 text-gray-800" />
                          <span>Open Team Chat</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('tasks');
                            setShowCreateTask(true);
                          }}
                          className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <Plus className="w-5 h-5 text-gray-800" />
                          <span>Create New Task</span>
                        </button>
                        {canManageTeam(selectedTeam) && (
                          <button
                            onClick={() => {
                              setActiveTab('members');
                              setShowInviteMember(true);
                            }}
                            className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <UserPlus className="w-5 h-5 text-gray-800" />
                            <span>Invite Member</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Task Status Overview */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Task Progress</h3>
                      <div className="space-y-3">
                        {['todo', 'in-progress', 'review', 'done'].map((status) => {
                          const count = teamTasks.filter(t => t.status === status).length;
                          const percentage = teamTasks.length > 0 ? (count / teamTasks.length) * 100 : 0;
                          return (
                            <div key={status} className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700 capitalize">
                                {status.replace('-', ' ')}
                              </span>
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-black h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600 w-8">{count}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="h-96 flex flex-col">
                    {/* Chat Header */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Team Chat</h3>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">{selectedTeam.members.length} members</span>
                          {user && (
                            <span className="text-xs text-gray-500">• {user.displayName || user.email}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div ref={chatMessagesRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <div className="text-center">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">No messages yet</p>
                            <p className="text-sm">Start the conversation by sending a message below</p>
                          </div>
                        </div>
                      ) : (
                        chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex items-start space-x-3 ${
                              message.senderId === user?.uid ? 'flex-row-reverse space-x-reverse' : ''
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-sm font-bold shrink-0">
                              {message.senderName?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className={`max-w-xs lg:max-w-md ${message.senderId === user?.uid ? 'text-right' : ''}`}>
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">{message.senderName || 'Unknown User'}</span>
                                <span className="text-xs text-gray-500">
                                  {message.timestamp?.toLocaleTimeString() || 'Now'}
                                </span>
                              </div>
                              <div
                                className={`inline-block p-3 rounded-lg ${
                                  message.senderId === user?.uid
                                    ? 'bg-black text-white'
                                    : message.type === 'system'
                                    ? 'bg-gray-100 text-gray-700 italic'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                {message.message}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          placeholder="Type a message..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                        <button
                          onClick={() => {
                            setNewMessage('Hello, this is a test message!');
                          }}
                          className="px-2 py-2 text-gray-600 hover:text-gray-800 rounded-lg transition-colors"
                          title="Test message"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={sendMessage}
                          disabled={!newMessage.trim() || chatLoading}
                          className="px-4 py-2 bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                        >
                          {chatLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks Tab */}
              {activeTab === 'tasks' && (
                <div className="space-y-6">
                  {/* Tasks Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">Team Tasks</h3>
                    <button
                      onClick={() => setShowCreateTask(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Task</span>
                    </button>
                  </div>

                  {/* Create Task Modal */}
                  {showCreateTask && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-bold text-gray-900">Create New Task</h4>
                          <button
                            onClick={() => setShowCreateTask(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                            <input
                              type="text"
                              value={newTask.title}
                              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                              placeholder="Task title"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                              value={newTask.description}
                              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                              placeholder="Task description"
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                              <select
                                value={newTask.priority}
                                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                              <input
                                type="date"
                                value={newTask.deadline}
                                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end space-x-3 pt-4">
                            <button
                              onClick={() => setShowCreateTask(false)}
                              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={createTask}
                              disabled={!newTask.title.trim()}
                              className="px-4 py-2 bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                            >
                              Create Task
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tasks List */}
                  <div className="space-y-4">
                    {teamTasks.map((task) => (
                      <div key={task.id} className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-gray-900">{task.title}</h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                                {task.status.replace('-', ' ')}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                            )}
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Created {task.createdAt.toLocaleDateString()}</span>
                              {task.deadline && (
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>Due {task.deadline.toLocaleDateString()}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <select
                              value={task.status}
                              onChange={(e) => updateTaskStatus(task.id, e.target.value as any)}
                              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-black focus:border-transparent"
                            >
                              <option value="todo">To Do</option>
                              <option value="in-progress">In Progress</option>
                              <option value="review">Review</option>
                              <option value="done">Done</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}

                    {teamTasks.length === 0 && (
                      <div className="text-center py-12">
                        <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks yet</h3>
                        <p className="text-gray-600 mb-4">Create your first task to get started.</p>
                        <button
                          onClick={() => setShowCreateTask(true)}
                          className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          Create First Task
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Members Tab */}
              {activeTab === 'members' && (
                <div className="space-y-6">
                  {/* Members Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">Team Members ({selectedTeam.members.length})</h3>
                    {canManageTeam(selectedTeam) && (
                      <button
                        onClick={() => setShowInviteMember(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Invite Member</span>
                      </button>
                    )}
                  </div>

                  {/* Invite Member Modal */}
                  {showInviteMember && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-bold text-gray-900">Invite Team Member</h4>
                          <button
                            onClick={() => setShowInviteMember(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                            <input
                              type="email"
                              value={newMemberEmail}
                              onChange={(e) => setNewMemberEmail(e.target.value)}
                              placeholder="member@example.com"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                            />
                          </div>

                          <div className="flex justify-end space-x-3 pt-4">
                            <button
                              onClick={() => setShowInviteMember(false)}
                              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={inviteMember}
                              disabled={!newMemberEmail.trim()}
                              className="px-4 py-2 bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                            >
                              Send Invite
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Members List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedTeam.members.map((member) => (
                      <div key={member.id} className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white font-bold">
                            {member.displayName[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{member.displayName}</h4>
                            <p className="text-sm text-gray-600">{member.email}</p>
                          </div>
                          <div className="flex items-center space-x-1">
                            {member.role === 'owner' && <Crown className="w-4 h-4 text-yellow-500" />}
                            {member.role === 'admin' && <Shield className="w-4 h-4 text-blue-500" />}
                            {member.role === 'member' && <User className="w-4 h-4 text-gray-500" />}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            member.role === 'owner' ? 'bg-yellow-100 text-yellow-800' :
                            member.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {member.role}
                          </span>
                          <div className="flex items-center space-x-1">
                            <div className={`w-2 h-2 rounded-full ${
                              member.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                            <span className="text-gray-500 capitalize">{member.status}</span>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-2">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && canManageTeam(selectedTeam) && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Team Settings</h3>
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">General Settings</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="font-medium text-gray-700">Public Team</label>
                              <p className="text-sm text-gray-600">Allow others to discover and request to join this team</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedTeam.settings.isPublic}
                              onChange={() => {}}
                              className="rounded border-gray-300 text-black focus:ring-black"
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="font-medium text-gray-700">Member Invites</label>
                              <p className="text-sm text-gray-600">Allow team members to invite others</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedTeam.settings.allowMemberInvites}
                              onChange={() => {}}
                              className="rounded border-gray-300 text-black focus:ring-black"
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="font-medium text-gray-700">Team Chat</label>
                              <p className="text-sm text-gray-600">Enable team chat functionality</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedTeam.settings.chatEnabled}
                              onChange={() => {}}
                              className="rounded border-gray-300 text-black focus:ring-black"
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="font-medium text-gray-700">Task Management</label>
                              <p className="text-sm text-gray-600">Enable task creation and assignment</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedTeam.settings.taskManagement}
                              onChange={() => {}}
                              className="rounded border-gray-300 text-black focus:ring-black"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-gray-200">
                        <h4 className="font-semibold text-red-600 mb-3">Danger Zone</h4>
                        <div className="space-y-3">
                          <button className="w-full p-4 border border-red-200 rounded-lg text-left hover:bg-red-50 transition-colors">
                            <div className="font-medium text-red-600">Delete Team</div>
                            <div className="text-sm text-red-500">Permanently delete this team and all its data</div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}