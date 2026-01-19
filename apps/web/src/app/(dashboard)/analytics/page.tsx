'use client';

import { Header } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  MessageCircle,
  Brain,
  AlertTriangle,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

// Mock data for charts - in production these would come from API
const weeklyData = [
  { day: 'Mon', questions: 145, answered: 138, escalated: 7 },
  { day: 'Tue', questions: 167, answered: 159, escalated: 8 },
  { day: 'Wed', questions: 189, answered: 181, escalated: 8 },
  { day: 'Thu', questions: 156, answered: 148, escalated: 8 },
  { day: 'Fri', questions: 234, answered: 221, escalated: 13 },
  { day: 'Sat', questions: 45, answered: 43, escalated: 2 },
  { day: 'Sun', questions: 32, answered: 31, escalated: 1 },
];

const categoryBreakdown = [
  { category: 'Schedules & Events', percentage: 28, count: 3421, trend: '+5.2%' },
  { category: 'Transportation', percentage: 17, count: 2156, trend: '+12.8%' },
  { category: 'Attendance', percentage: 15, count: 1892, trend: '-2.1%' },
  { category: 'Meals & Nutrition', percentage: 12, count: 1456, trend: '+8.4%' },
  { category: 'Academic Programs', percentage: 10, count: 1234, trend: '+3.6%' },
  { category: 'Safety & Policies', percentage: 8, count: 987, trend: '-1.2%' },
  { category: 'After School', percentage: 6, count: 743, trend: '+15.3%' },
  { category: 'Other', percentage: 4, count: 564, trend: '+2.1%' },
];

const kpiCards = [
  {
    title: 'Total Questions',
    value: 12453,
    change: '+12.5%',
    trend: 'up',
    period: 'vs last month',
    icon: MessageCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'AI Answer Rate',
    value: '94.2%',
    change: '+2.1%',
    trend: 'up',
    period: 'vs last month',
    icon: Brain,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'Satisfaction Score',
    value: '4.7/5',
    change: '+0.3',
    trend: 'up',
    period: 'vs last month',
    icon: ThumbsUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    title: 'Escalation Rate',
    value: '5.8%',
    change: '-1.2%',
    trend: 'down',
    period: 'vs last month',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
];

const peakHours = [
  { hour: '7 AM', questions: 234 },
  { hour: '8 AM', questions: 567 },
  { hour: '9 AM', questions: 423 },
  { hour: '12 PM', questions: 389 },
  { hour: '3 PM', questions: 678 },
  { hour: '4 PM', questions: 512 },
  { hour: '5 PM', questions: 345 },
  { hour: '6 PM', questions: 234 },
];

function KPICard({ kpi }: { kpi: typeof kpiCards[0] }) {
  const Icon = kpi.icon;
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : TrendingDown;
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
            <p className="text-3xl font-bold">
              {typeof kpi.value === 'number' ? formatNumber(kpi.value) : kpi.value}
            </p>
            <div className="flex items-center gap-1 text-sm">
              <TrendIcon className={`h-4 w-4 ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
              <span className={kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                {kpi.change}
              </span>
              <span className="text-muted-foreground">{kpi.period}</span>
            </div>
          </div>
          <div className={`rounded-lg p-3 ${kpi.bgColor}`}>
            <Icon className={`h-6 w-6 ${kpi.color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col">
      <Header 
        title="Analytics" 
        description="Insights into AI assistant performance and parent engagement"
      >
        <div className="flex items-center gap-2">
          <Select defaultValue="30d">
            <SelectTrigger className="w-[150px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </Header>

      <div className="flex-1 space-y-6 p-6">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((kpi) => (
            <KPICard key={kpi.title} kpi={kpi} />
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Weekly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Questions This Week</CardTitle>
              <CardDescription>Daily breakdown of questions and responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyData.map((day) => (
                  <div key={day.day} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium w-10">{day.day}</span>
                      <div className="flex-1 mx-4">
                        <div className="relative h-6 rounded bg-muted overflow-hidden">
                          <div 
                            className="absolute inset-y-0 left-0 bg-green-500 rounded-l"
                            style={{ width: `${(day.answered / day.questions) * 100}%` }}
                          />
                          <div 
                            className="absolute inset-y-0 bg-amber-500"
                            style={{ 
                              left: `${(day.answered / day.questions) * 100}%`,
                              width: `${(day.escalated / day.questions) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-muted-foreground w-16 text-right">
                        {day.questions}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-6 pt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-green-500" />
                    <span className="text-muted-foreground">AI Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-amber-500" />
                    <span className="text-muted-foreground">Escalated</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Peak Activity Hours</CardTitle>
              <CardDescription>When parents are most active</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {peakHours.map((hour) => {
                  const maxQuestions = Math.max(...peakHours.map(h => h.questions));
                  const percentage = (hour.questions / maxQuestions) * 100;
                  return (
                    <div key={hour.hour} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-14">{hour.hour}</span>
                      <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {hour.questions}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Questions by Category</CardTitle>
                <CardDescription>Topic distribution over the selected period</CardDescription>
              </div>
              <Button variant="ghost" size="sm">View Details →</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {categoryBreakdown.map((cat) => (
                <div 
                  key={cat.category}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{ 
                        backgroundColor: `hsl(${cat.percentage * 10}, 70%, 95%)`,
                        color: `hsl(${cat.percentage * 10}, 70%, 40%)`
                      }}
                    >
                      {cat.percentage}%
                    </div>
                    <div>
                      <p className="font-medium">{cat.category}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(cat.count)} questions
                      </p>
                    </div>
                  </div>
                  <Badge variant={cat.trend.startsWith('+') ? 'success' : 'secondary'}>
                    {cat.trend}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-50 p-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Parents</p>
                  <p className="text-2xl font-bold">8,234</p>
                  <p className="text-xs text-green-600">+234 this week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-purple-50 p-3">
                  <MessageCircle className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Response Time</p>
                  <p className="text-2xl font-bold">1.2s</p>
                  <p className="text-xs text-green-600">-0.3s improvement</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-green-50 p-3">
                  <Brain className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Knowledge Utilization</p>
                  <p className="text-2xl font-bold">87%</p>
                  <p className="text-xs text-muted-foreground">of documents cited</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
