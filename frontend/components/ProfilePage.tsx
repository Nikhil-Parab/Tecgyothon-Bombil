'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Calendar,
  Clock,
  Award,
  Target,
  TrendingUp,
  Brain,
  Zap,
  Settings,
  LogOut,
  Edit2,
  Check,
  X,
  Camera,
  Shield,
  Bell,
  Palette,
  Globe,
  Lock,
  Activity,
  MessageSquare,
  FileText,
  Users,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { RemoTheme } from '@/lib/theme';
import { useRouter } from 'next/navigation';

interface ExpertiseArea {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  interactions: number;
  trend: 'up' | 'down' | 'stable';
}

interface ActivityStats {
  totalMessages: number;
  decisionsInfluenced: number;
  collaborations: number;
  flowStateHours: number;
  expertiseShares: number;
}

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  expertise: string[];
  collaborationCount: number;
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'expertise' | 'analytics' | 'settings'>('overview');
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || 'User');
  const [tempName, setTempName] = useState(displayName);

  // Mock data - Replace with real Firebase data
  const [expertiseAreas, setExpertiseAreas] = useState<ExpertiseArea[]>([
    { name: 'Product Strategy', level: 'expert', interactions: 247, trend: 'up' },
    { name: 'UI/UX Design', level: 'advanced', interactions: 189, trend: 'up' },
    { name: 'Marketing', level: 'intermediate', interactions: 156, trend: 'stable' },
    { name: 'Data Analytics', level: 'advanced', interactions: 203, trend: 'up' },
    { name: 'Project Management', level: 'expert', interactions: 312, trend: 'up' },
  ]);

  const [activityStats, setActivityStats] = useState<ActivityStats>({
    totalMessages: 1547,
    decisionsInfluenced: 43,
    collaborations: 89,
    flowStateHours: 127,
    expertiseShares: 56,
  });

  const [frequentCollaborators, setFrequentCollaborators] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'Sarah Chen',
      avatar: 'SC',
      expertise: ['Engineering', 'Architecture'],
      collaborationCount: 34,
    },
    {
      id: '2',
      name: 'Marcus Rodriguez',
      avatar: 'MR',
      expertise: ['Design', 'Research'],
      collaborationCount: 28,
    },
    {
      id: '3',
      name: 'Emily Watson',
      avatar: 'EW',
      expertise: ['Marketing', 'Analytics'],
      collaborationCount: 21,
    },
  ]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  const handleSaveName = () => {
    setDisplayName(tempName);
    setIsEditingName(false);
    // TODO: Update in Firebase
  };

  const getExpertiseColor = (level: string) => {
    const colors = {
      beginner: 'bg-gray-300',
      intermediate: 'bg-gray-500',
      advanced: 'bg-gray-700',
      expert: 'bg-black',
    };
    return colors[level as keyof typeof colors];
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-gray-800" />;
    if (trend === 'down') return <TrendingUp className="w-4 h-4 text-gray-400 rotate-180" />;
    return <div className="w-4 h-4" />;
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
                ← Back to Workspace
              </button>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-4 py-2 text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <button className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                  <Camera className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* User Info */}
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  {isEditingName ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="text-2xl font-bold border-b-2 border-blue-500 focus:outline-none"
                        autoFocus
                      />
                      <button onClick={handleSaveName} className="text-green-600 hover:text-green-700">
                        <Check className="w-5 h-5" />
                      </button>
                      <button onClick={() => {
                        setIsEditingName(false);
                        setTempName(displayName);
                      }} className="text-red-600 hover:text-red-700">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {new Date(user?.metadata.creationTime || '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-3">
                  <div className="w-3 h-3 bg-gray-800 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-600">Active Now</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-black">
                  {activityStats.decisionsInfluenced}
                </div>
                <div className="text-sm text-gray-600">Decisions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-black">
                  {activityStats.collaborations}
                </div>
                <div className="text-sm text-gray-600">Collaborations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-black">
                  {activityStats.flowStateHours}h
                </div>
                <div className="text-sm text-gray-600">Flow State</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-2 mb-6">
          <div className="flex space-x-2">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'expertise', label: 'Expertise Map', icon: Brain },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'settings', label: 'Settings', icon: Settings },
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
              {/* Activity Overview */}
              <div className="lg:col-span-2 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <MessageSquare className="w-8 h-8 text-gray-800" />
                      <span className="text-sm text-gray-600 font-medium">+12% this week</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{activityStats.totalMessages.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total Messages</div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Zap className="w-8 h-8 text-gray-800" />
                      <span className="text-sm text-gray-600 font-medium">+8% this week</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{activityStats.expertiseShares}</div>
                    <div className="text-sm text-gray-600">Expertise Shares</div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Activity className="w-8 h-8 text-gray-800" />
                      <span className="text-sm text-gray-600 font-medium">+15% this week</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{activityStats.flowStateHours}h</div>
                    <div className="text-sm text-gray-600">Flow State Time</div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Target className="w-8 h-8 text-gray-800" />
                      <span className="text-sm text-gray-600 font-medium">+5% this week</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{activityStats.decisionsInfluenced}</div>
                    <div className="text-sm text-gray-600">Decisions Influenced</div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-gray-800" />
                    <span>Recent Activity</span>
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        type: 'decision',
                        text: 'Contributed to decision on Q4 marketing strategy',
                        time: '2 hours ago',
                        icon: Target,
                        color: 'text-gray-800',
                      },
                      {
                        type: 'expertise',
                        text: 'Shared expertise on Product Strategy in #product-team',
                        time: '5 hours ago',
                        icon: Brain,
                        color: 'text-gray-800',
                      },
                      {
                        type: 'collaboration',
                        text: 'Collaborated with Sarah Chen on new feature design',
                        time: '1 day ago',
                        icon: Users,
                        color: 'text-gray-800',
                      },
                      {
                        type: 'flow',
                        text: 'Entered deep work flow state (3.5 hours)',
                        time: '1 day ago',
                        icon: Zap,
                        color: 'text-gray-800',
                      },
                    ].map((activity, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <activity.icon className={`w-5 h-5 ${activity.color} mt-0.5`} />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{activity.text}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Frequent Collaborators */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <Users className="w-5 h-5 text-gray-800" />
                  <span>Top Collaborators</span>
                </h3>
                <div className="space-y-4">
                  {frequentCollaborators.map((member) => (
                    <div key={member.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                      <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white font-bold shadow-md">
                        {member.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{member.name}</div>
                        <div className="text-xs text-gray-500">{member.expertise.join(', ')}</div>
                        <div className="text-xs text-gray-800 mt-1">
                          {member.collaborationCount} collaborations
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="w-full mt-4 py-2 text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium">
                  View All Team Members
                </button>
              </div>
            </div>
          )}

          {/* Expertise Map Tab */}
          {activeTab === 'expertise' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-gray-800" />
                  <span>Your Expertise Areas</span>
                </h3>
                <div className="space-y-4">
                  {expertiseAreas.map((area, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getExpertiseColor(area.level)}`} />
                          <span className="font-semibold text-gray-900">{area.name}</span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">
                            {area.level}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          {getTrendIcon(area.trend)}
                          <span className="text-sm text-gray-600">{area.interactions} interactions</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${getExpertiseColor(area.level)} h-2 rounded-full transition-all`}
                          style={{
                            width: area.level === 'expert' ? '100%' : area.level === 'advanced' ? '75%' : area.level === 'intermediate' ? '50%' : '25%'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expertise Growth */}
              <div className="bg-black rounded-xl shadow-xl p-8 text-white border border-gray-800">
                <h3 className="text-2xl font-bold mb-4">🎯 Expertise Growth Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20">
                    <div className="text-3xl font-bold">+15%</div>
                    <div className="text-sm opacity-90">Overall Growth</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4">
                    <div className="text-3xl font-bold">3</div>
                    <div className="text-sm opacity-90">New Areas This Month</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4">
                    <div className="text-3xl font-bold">247</div>
                    <div className="text-sm opacity-90">Total Expertise Shares</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Coming Soon: Advanced Analytics</h3>
                <p className="text-gray-600">
                  Deep insights into your cognitive workspace patterns, including flow state analysis, 
                  bottleneck prediction, and team collaboration dynamics.
                </p>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-gray-800" />
                  <span>Account Settings</span>
                </h3>
                <div className="space-y-4">
                  {[
                    { icon: Bell, label: 'Notifications', description: 'Manage your notification preferences' },
                    { icon: Shield, label: 'Privacy', description: 'Control your data and privacy settings' },
                    { icon: Palette, label: 'Appearance', description: 'Customize your workspace theme' },
                    { icon: Globe, label: 'Language & Region', description: 'Set your language and timezone' },
                    { icon: Lock, label: 'Security', description: 'Manage password and 2FA settings' },
                  ].map((setting, idx) => (
                    <button
                      key={idx}
                      className="w-full flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors text-left"
                    >
                      <setting.icon className="w-6 h-6 text-gray-600" />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{setting.label}</div>
                        <div className="text-sm text-gray-600">{setting.description}</div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
