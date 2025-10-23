'use client';

import React from 'react';
import { Lightbulb, ArrowRight, Clock, Users, FileText, TrendingUp, AlertCircle } from 'lucide-react';

interface Suggestion {
  id: string;
  type: 'expert' | 'decision' | 'document' | 'warning' | 'insight';
  title: string;
  description: string;
  action?: string;
  priority?: 'low' | 'medium' | 'high';
  timestamp?: Date;
  relatedPeople?: string[];
}

interface ContextualSuggestionsProps {
  currentContext: string;
  suggestions?: Suggestion[];
  onSuggestionClick?: (suggestion: Suggestion) => void;
}

export default function ContextualSuggestions({
  currentContext,
  suggestions: propSuggestions,
  onSuggestionClick,
}: ContextualSuggestionsProps) {
  // Mock suggestions if none provided
  const defaultSuggestions: Suggestion[] = [
    {
      id: '1',
      type: 'expert',
      title: 'Consult Sarah Chen',
      description: 'Sarah has relevant expertise in Product Strategy and was involved in similar discussions',
      action: 'Send message',
      priority: 'high',
      relatedPeople: ['Sarah Chen'],
    },
    {
      id: '2',
      type: 'decision',
      title: 'Similar Decision: Q3 Marketing Budget',
      description: 'A related decision was made 2 weeks ago that might provide useful context',
      action: 'View decision',
      priority: 'medium',
      timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      id: '3',
      type: 'warning',
      title: 'Potential Overlap Detected',
      description: 'There is an active initiative in marketing-team that overlaps with this topic',
      action: 'Review initiative',
      priority: 'high',
    },
    {
      id: '4',
      type: 'document',
      title: 'Relevant Documentation',
      description: 'Product Roadmap Q4 2025 contains related information',
      action: 'Open document',
      priority: 'low',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: '5',
      type: 'insight',
      title: 'Team Pattern Insight',
      description: 'Similar topics are typically discussed in cross-functional meetings with 3-5 participants',
      action: 'View pattern',
      priority: 'low',
      relatedPeople: ['Sarah Chen', 'Marcus Rodriguez', 'Emily Watson'],
    },
  ];

  const suggestions = propSuggestions || defaultSuggestions;

  const getIconForType = (type: Suggestion['type']) => {
    switch (type) {
      case 'expert':
        return Users;
      case 'decision':
        return FileText;
      case 'document':
        return FileText;
      case 'warning':
        return AlertCircle;
      case 'insight':
        return TrendingUp;
      default:
        return Lightbulb;
    }
  };

  const getColorForType = (type: Suggestion['type']) => {
    switch (type) {
      case 'expert':
        return 'from-gray-700 to-gray-800';
      case 'decision':
        return 'from-gray-800 to-black';
      case 'document':
        return 'from-gray-600 to-gray-700';
      case 'warning':
        return 'from-gray-500 to-gray-600';
      case 'insight':
        return 'from-gray-700 to-gray-900';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getPriorityBadgeColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-gray-900 text-white border-gray-900';
      case 'medium':
        return 'bg-gray-600 text-white border-gray-600';
      case 'low':
        return 'bg-gray-300 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-400 text-gray-800 border-gray-400';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-black px-6 py-4">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-6 h-6 text-white" />
          <div>
            <h3 className="font-bold text-white text-lg">Contextual Suggestions</h3>
            <p className="text-white/80 text-sm">Based on your current conversation</p>
          </div>
        </div>
      </div>

      {/* Current Context */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>
            Analyzing: <strong className="text-gray-900">{currentContext}</strong>
          </span>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="divide-y divide-gray-100">
        {suggestions.map((suggestion) => {
          const Icon = getIconForType(suggestion.type);
          const gradientColor = getColorForType(suggestion.type);

          return (
            <div
              key={suggestion.id}
              onClick={() => onSuggestionClick?.(suggestion)}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors group"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg bg-linear-to-br ${gradientColor} flex items-center justify-center shrink-0 shadow-md group-hover:shadow-lg transition-shadow`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 group-hover:text-black transition-colors">
                      {suggestion.title}
                    </h4>
                    {suggestion.priority && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityBadgeColor(suggestion.priority)} shrink-0`}>
                        {suggestion.priority}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {suggestion.timestamp && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{suggestion.timestamp.toLocaleDateString()}</span>
                        </div>
                      )}
                      {suggestion.relatedPeople && suggestion.relatedPeople.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{suggestion.relatedPeople.length} people</span>
                        </div>
                      )}
                    </div>

                    {suggestion.action && (
                      <button className="flex items-center gap-1 text-xs font-medium text-gray-900 hover:text-black group-hover:gap-2 transition-all">
                        <span>{suggestion.action}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Related People Tags */}
                  {suggestion.relatedPeople && suggestion.relatedPeople.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {suggestion.relatedPeople.map((person, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                        >
                          {person}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          💡 Suggestions update in real-time as you type
        </p>
      </div>
    </div>
  );
}
