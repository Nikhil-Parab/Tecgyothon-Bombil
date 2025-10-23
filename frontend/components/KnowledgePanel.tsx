'use client';

import React, { useState } from 'react';
import {
  Brain,
  FileText,
  Users,
  Target,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Search,
  Filter,
  Sparkles,
} from 'lucide-react';

interface PastDecision {
  id: string;
  title: string;
  outcome: 'approved' | 'rejected' | 'pending';
  date: Date;
  participants: string[];
  summary: string;
  relatedTopics: string[];
}

interface SimilarProject {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'cancelled';
  owner: string;
  lessons: string[];
  date: Date;
}

interface ExpertSuggestion {
  id: string;
  name: string;
  expertise: string[];
  relevanceScore: number;
  availability: 'available' | 'busy' | 'away';
  recentContributions: string[];
}

interface KnowledgePanelProps {
  topic: string;
  onItemClick?: (item: any) => void;
}

export default function KnowledgePanel({ topic, onItemClick }: KnowledgePanelProps) {
  const [activeTab, setActiveTab] = useState<'decisions' | 'projects' | 'experts'>('decisions');

  // Mock data - replace with Firebase queries
  const pastDecisions: PastDecision[] = [
    {
      id: '1',
      title: 'Q3 Marketing Budget Allocation',
      outcome: 'approved',
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      participants: ['Sarah Chen', 'Marcus Rodriguez', 'Emily Watson'],
      summary: 'Approved 40% increase in digital marketing spend, focusing on social media and content marketing',
      relatedTopics: ['marketing', 'budget', 'digital strategy'],
    },
    {
      id: '2',
      title: 'Product Roadmap Q4 Priorities',
      outcome: 'approved',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      participants: ['Sarah Chen', 'Jordan Scales'],
      summary: 'Prioritized AI-powered features and enterprise capabilities over consumer features',
      relatedTopics: ['product', 'ai', 'enterprise'],
    },
    {
      id: '3',
      title: 'Tech Stack Migration to Cloud',
      outcome: 'rejected',
      date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      participants: ['Jordan Scales', 'Tech Team'],
      summary: 'Rejected immediate migration due to cost concerns. Scheduled for Q1 2026 instead',
      relatedTopics: ['technology', 'infrastructure', 'budget'],
    },
  ];

  const similarProjects: SimilarProject[] = [
    {
      id: '1',
      name: 'Customer Portal Redesign',
      status: 'completed',
      owner: 'Marcus Rodriguez',
      lessons: [
        'User testing was critical - saved 2 weeks of rework',
        'Cross-functional team meetings weekly improved alignment',
        'Design system created reusable components',
      ],
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      name: 'AI Chatbot Implementation',
      status: 'in-progress',
      owner: 'Sarah Chen',
      lessons: [
        'Start with limited scope to validate value',
        'Customer feedback loop essential for training',
      ],
      date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
  ];

  const expertSuggestions: ExpertSuggestion[] = [
    {
      id: '1',
      name: 'Sarah Chen',
      expertise: ['Product Strategy', 'AI/ML', 'Enterprise Solutions'],
      relevanceScore: 95,
      availability: 'available',
      recentContributions: ['Led Q4 Product Planning', 'AI Feature Specification'],
    },
    {
      id: '2',
      name: 'Marcus Rodriguez',
      expertise: ['UI/UX Design', 'User Research', 'Design Systems'],
      relevanceScore: 88,
      availability: 'busy',
      recentContributions: ['Customer Portal Redesign', 'Design System 2.0'],
    },
    {
      id: '3',
      name: 'Emily Watson',
      expertise: ['Marketing Analytics', 'Growth Strategy', 'Data Analysis'],
      relevanceScore: 82,
      availability: 'available',
      recentContributions: ['Q3 Marketing Analysis', 'Customer Segmentation Study'],
    },
  ];

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-gray-800 text-white';
      case 'in-progress':
        return 'bg-gray-600 text-white';
      case 'cancelled':
        return 'bg-gray-300 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available':
        return 'bg-gray-800';
      case 'busy':
        return 'bg-gray-400';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-w-2xl">
      {/* Header */}
      <div className="bg-black px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Brain className="w-7 h-7 text-white" />
          <div>
            <h3 className="font-bold text-white text-xl">Knowledge Injection</h3>
            <p className="text-white/90 text-sm">Contextual insights for: <strong>{topic}</strong></p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'decisions', label: 'Past Decisions', icon: Target, count: pastDecisions.length },
          { id: 'projects', label: 'Similar Projects', icon: FileText, count: similarProjects.length },
          { id: 'experts', label: 'Expert Suggestions', icon: Users, count: expertSuggestions.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-gray-100 text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="p-6 max-h-96 overflow-y-auto">
        {/* Past Decisions Tab */}
        {activeTab === 'decisions' && (
          <div className="space-y-4">
            {pastDecisions.map((decision) => (
              <div
                key={decision.id}
                onClick={() => onItemClick?.(decision)}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getOutcomeIcon(decision.outcome)}
                    <h4 className="font-semibold text-gray-900 group-hover:text-black transition-colors">
                      {decision.title}
                    </h4>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getOutcomeColor(decision.outcome)}`}>
                    {decision.outcome}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-3">{decision.summary}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{decision.date.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{decision.participants.length} participants</span>
                    </div>
                  </div>

                  <button className="flex items-center gap-1 text-xs font-medium text-gray-900 hover:text-black opacity-0 group-hover:opacity-100 transition-all">
                    <span>View details</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {decision.relatedTopics.map((topic, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-gray-200 text-gray-800 rounded-full text-xs">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Similar Projects Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {similarProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => onItemClick?.(project)}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-gray-800" />
                    <h4 className="font-semibold text-gray-900 group-hover:text-black transition-colors">
                      {project.name}
                    </h4>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>

                <div className="text-sm text-gray-600 mb-3">
                  <strong>Owner:</strong> {project.owner}
                </div>

                {/* Lessons Learned */}
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">📚 Key Lessons:</p>
                  <ul className="space-y-1">
                    {project.lessons.map((lesson, idx) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span>{lesson}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{project.date.toLocaleDateString()}</span>
                  </div>
                  <button className="flex items-center gap-1 font-medium text-gray-900 hover:text-black opacity-0 group-hover:opacity-100 transition-all">
                    <span>View project</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expert Suggestions Tab */}
        {activeTab === 'experts' && (
          <div className="space-y-4">
            {expertSuggestions.map((expert) => (
              <div
                key={expert.id}
                onClick={() => onItemClick?.(expert)}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                    {expert.name.split(' ').map(n => n[0]).join('')}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 group-hover:text-black transition-colors">
                          {expert.name}
                        </h4>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(expert.availability)}`} />
                          <span className="text-xs text-gray-500 capitalize">{expert.availability}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-900 rounded-lg">
                        <TrendingUp className="w-3 h-3" />
                        <span className="text-xs font-medium">{expert.relevanceScore}% match</span>
                      </div>
                    </div>

                    {/* Expertise Tags */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {expert.expertise.map((skill, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-200 text-gray-800 rounded-full text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Recent Contributions */}
                    <div className="text-xs text-gray-600 mb-2">
                      <strong>Recent:</strong> {expert.recentContributions.join(', ')}
                    </div>

                    <button className="flex items-center gap-1 text-xs font-medium text-gray-900 hover:text-black opacity-0 group-hover:opacity-100 transition-all">
                      <span>Contact expert</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-gray-800" />
            <span>Knowledge base updated in real-time</span>
          </div>
          <button className="text-gray-900 hover:text-black font-medium">View all →</button>
        </div>
      </div>
    </div>
  );
}
