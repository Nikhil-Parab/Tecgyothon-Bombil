'use client';

import React from 'react';
import { Zap, Clock, TrendingUp, Activity, Moon, Coffee, Flame } from 'lucide-react';

interface FlowStateUser {
  id: string;
  name: string;
  avatar: string;
  state: 'deep-work' | 'collaborative' | 'away' | 'available';
  duration: number; // in minutes
  currentActivity?: string;
}

interface FlowStateIndicatorProps {
  users?: FlowStateUser[];
  currentUser?: FlowStateUser;
}

export default function FlowStateIndicator({ users: propUsers, currentUser }: FlowStateIndicatorProps) {
  // Mock data
  const defaultUsers: FlowStateUser[] = [
    {
      id: '1',
      name: 'Sarah Chen',
      avatar: 'SC',
      state: 'deep-work',
      duration: 127,
      currentActivity: 'Writing product spec',
    },
    {
      id: '2',
      name: 'Marcus Rodriguez',
      avatar: 'MR',
      state: 'collaborative',
      duration: 45,
      currentActivity: 'Design review meeting',
    },
    {
      id: '3',
      name: 'Emily Watson',
      avatar: 'EW',
      state: 'deep-work',
      duration: 92,
      currentActivity: 'Data analysis',
    },
    {
      id: '4',
      name: 'Jordan Scales',
      avatar: 'JS',
      state: 'away',
      duration: 30,
      currentActivity: 'Break',
    },
  ];

  const users = propUsers || defaultUsers;

  const getStateColor = (state: string) => {
    switch (state) {
      case 'deep-work':
        return 'from-purple-600 to-pink-600';
      case 'collaborative':
        return 'from-blue-600 to-cyan-600';
      case 'away':
        return 'from-gray-400 to-gray-500';
      case 'available':
        return 'from-green-500 to-emerald-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'deep-work':
        return Flame;
      case 'collaborative':
        return Activity;
      case 'away':
        return Coffee;
      case 'available':
        return Zap;
      default:
        return Activity;
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'deep-work':
        return 'Deep Work Flow';
      case 'collaborative':
        return 'Collaborating';
      case 'away':
        return 'Away';
      case 'available':
        return 'Available';
      default:
        return 'Unknown';
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const deepWorkUsers = users.filter((u) => u.state === 'deep-work');
  const totalFlowTime = users.reduce((acc, u) => acc + (u.state === 'deep-work' ? u.duration : 0), 0);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-purple-600 to-pink-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-white" />
            <div>
              <h3 className="font-bold text-white text-lg">Flow State Monitor</h3>
              <p className="text-white/80 text-sm">Real-time team productivity insights</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{deepWorkUsers.length}</div>
            <div className="text-xs text-white/80">In Flow State</div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4 p-6 bg-linear-to-r from-purple-50 to-pink-50 border-b border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{formatDuration(totalFlowTime)}</div>
          <div className="text-xs text-gray-600">Total Flow Time</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{users.filter((u) => u.state === 'collaborative').length}</div>
          <div className="text-xs text-gray-600">Collaborating</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{users.filter((u) => u.state === 'available').length}</div>
          <div className="text-xs text-gray-600">Available</div>
        </div>
      </div>

      {/* Team Status List */}
      <div className="p-6 space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Team Status</h4>
        {users.map((user) => {
          const StateIcon = getStateIcon(user.state);
          const stateColor = getStateColor(user.state);

          return (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              {/* Avatar with Status Indicator */}
              <div className="relative shrink-0">
                <div className={`w-12 h-12 rounded-full bg-linear-to-br ${stateColor} flex items-center justify-center text-white font-bold shadow-md`}>
                  {user.avatar}
                </div>
                {user.state === 'deep-work' && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center shadow-md">
                    <Flame className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{user.name}</span>
                  {user.state === 'deep-work' && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      🔥 Flow State
                    </span>
                  )}
                </div>
                {user.currentActivity && (
                  <div className="text-sm text-gray-600">{user.currentActivity}</div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <div className={`flex items-center gap-1 text-xs ${
                    user.state === 'deep-work' ? 'text-purple-600' : 'text-gray-500'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(user.duration)}</span>
                  </div>
                  {user.state === 'deep-work' && (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <Activity className="w-3 h-3" />
                      <span>High focus</span>
                    </div>
                  )}
                </div>
              </div>

              {/* State Badge */}
              <div className={`px-3 py-1 rounded-full bg-linear-to-r ${stateColor} text-white text-xs font-medium flex items-center gap-1 shadow-sm`}>
                <StateIcon className="w-3 h-3" />
                {getStateLabel(user.state)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Do Not Disturb Notice */}
      {deepWorkUsers.length > 0 && (
        <div className="mx-6 mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Moon className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h5 className="font-semibold text-purple-900 mb-1">🔕 Do Not Disturb Mode</h5>
              <p className="text-sm text-purple-700">
                {deepWorkUsers.length} team member{deepWorkUsers.length > 1 ? 's are' : ' is'} in deep work mode.
                Non-urgent notifications are being held until they finish.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {deepWorkUsers.map((user) => (
                  <span key={user.id} className="px-2 py-1 bg-white text-purple-700 rounded-md text-xs font-medium border border-purple-200">
                    {user.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Tips */}
      <div className="px-6 py-3 bg-linear-to-r from-gray-50 to-purple-50 border-t border-gray-200">
        <p className="text-xs text-gray-600 flex items-center gap-2">
          <TrendingUp className="w-3 h-3 text-purple-600" />
          <span>💡 Tip: Schedule async messages during flow states to maximize team productivity</span>
        </p>
      </div>
    </div>
  );
}
