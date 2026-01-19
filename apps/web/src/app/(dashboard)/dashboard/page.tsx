'use client';

import { Header } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FileText,
  Users,
  Brain,
  Clock,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
} from 'lucide-react';
import { formatNumber, formatRelativeTime } from '@/lib/utils';

// Mock data - in production this would come from API
const stats = [
  {
    title: 'Total Questions',
    value: 12453,
    change: '+12.5%',
    trend: 'up',
    description: 'vs last 30 days',
    icon: MessageCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Answer Rate',
    value: '94.2%',
    change: '+2.1%',
    trend: 'up',
    description: 'AI-answered questions',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    title: 'Avg. Confidence',
    value: '87%',
    change: '-1.3%',
    trend: 'down',
    description: 'AI confidence score',
    icon: Brain,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'Escalations',
    value: 234,
    change: '-8.2%',
    trend: 'up', // down is good for escalations
    description: 'Sent to staff',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
];

const recentQuestions = [
  {
    id: 1,
    question: 'What are the lunch options for kids with allergies?',
    status: 'answered',
    confidence: 92,
    time: new Date(Date.now() - 1000 * 60 * 5),
    feedback: 'positive',
  },
  {
    id: 2,
    question: 'When is the parent-teacher conference scheduled?',
    status: 'answered',
    confidence: 98,
    time: new Date(Date.now() - 1000 * 60 * 15),
    feedback: null,
  },
  {
    id: 3,
    question: 'How do I update emergency contacts?',
    status: 'answered',
    confidence: 88,
    time: new Date(Date.now() - 1000 * 60 * 32),
    feedback: 'positive',
  },
  {
    id: 4,
    question: 'What is the policy on bringing electronics to school?',
    status: 'escalated',
    confidence: 45,
    time: new Date(Date.now() - 1000 * 60 * 45),
    feedback: null,
  },
  {
    id: 5,
    question: 'Can my child switch to a different bus route?',
    status: 'answered',
    confidence: 76,
    time: new Date(Date.now() - 1000 * 60 * 60),
    feedback: 'negative',
  },
];

const topCategories = [
  { name: 'Schedules & Events', count: 3421, percentage: 28 },
  { name: 'Transportation', count: 2156, percentage: 17 },
  { name: 'Attendance', count: 1892, percentage: 15 },
  { name: 'Meals & Nutrition', count: 1456, percentage: 12 },
  { name: 'Academic Programs', count: 1234, percentage: 10 },
];

const pendingActions = [
  {
    id: 1,
    title: '3 documents pending review',
    description: 'New policy documents uploaded',
    href: '/knowledge/review',
    priority: 'high',
  },
  {
    id: 2,
    title: '12 questions flagged for review',
    description: 'Low confidence answers need verification',
    href: '/analytics/questions?filter=flagged',
    priority: 'medium',
  },
  {
    id: 3,
    title: 'Integration sync failed',
    description: 'PowerSchool sync needs attention',
    href: '/settings/integrations',
    priority: 'high',
  },
];

function StatCard({ stat }: { stat: typeof stats[0] }) {
  const Icon = stat.icon;
  const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
            <p className="text-3xl font-bold">
              {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
            </p>
            <div className="flex items-center gap-1 text-sm">
              <TrendIcon className={`h-4 w-4 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
              <span className={stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                {stat.change}
              </span>
              <span className="text-muted-foreground">{stat.description}</span>
            </div>
          </div>
          <div className={`rounded-lg p-3 ${stat.bgColor}`}>
            <Icon className={`h-6 w-6 ${stat.color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col">
      <Header 
        title="Dashboard" 
        description="Overview of your district's AI assistant performance"
      >
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </Header>

      <div className="flex-1 space-y-6 p-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} stat={stat} />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Questions */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Questions</CardTitle>
                <CardDescription>Latest questions from parents</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-relaxed">{q.question}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(q.time)}
                        </span>
                        <span>•</span>
                        <span>Confidence: {q.confidence}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {q.feedback && (
                        q.feedback === 'positive' ? (
                          <ThumbsUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <ThumbsDown className="h-4 w-4 text-red-600" />
                        )
                      )}
                      <Badge 
                        variant={q.status === 'answered' ? 'success' : 'warning'}
                      >
                        {q.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Pending Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Actions</CardTitle>
                <CardDescription>Items requiring your attention</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingActions.map((action) => (
                  <a
                    key={action.id}
                    href={action.href}
                    className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
                  >
                    <div className={`mt-0.5 h-2 w-2 rounded-full ${
                      action.priority === 'high' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium group-hover:text-primary">
                        {action.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </CardContent>
            </Card>

            {/* Top Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
                <CardDescription>Most asked topics this month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topCategories.map((category) => (
                  <div key={category.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{category.name}</span>
                      <span className="text-muted-foreground">
                        {formatNumber(category.count)}
                      </span>
                    </div>
                    <Progress value={category.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-blue-50 p-3">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">156</p>
                <p className="text-sm text-muted-foreground">Knowledge Documents</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-purple-50 p-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">8,234</p>
                <p className="text-sm text-muted-foreground">Active Parents</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-green-50 p-3">
                <ThumbsUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">96.8%</p>
                <p className="text-sm text-muted-foreground">Satisfaction Rate</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
