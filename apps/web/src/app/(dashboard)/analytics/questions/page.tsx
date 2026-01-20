'use client';

import { useState } from 'react';
import { Header } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Filter,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  MessageCircle,
  Clock,
  CheckCircle,
  Eye,
  Flag,
  FileText,
  ExternalLink,
  Brain,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

// Mock data
const questions = [
  {
    id: '1',
    question: 'What time does the school bus arrive at Pine Street stop?',
    answer: 'The school bus typically arrives at the Pine Street stop at 7:45 AM. However, arrival times may vary by 5-10 minutes depending on traffic conditions.',
    category: 'Transportation',
    confidence: 95,
    sources: ['Transportation Routes 2024-2025.pdf'],
    askedAt: new Date(Date.now() - 1000 * 60 * 15),
    feedback: 'positive',
    status: 'answered',
    parentId: 'parent-123',
    school: 'Lincoln Elementary',
  },
  {
    id: '2',
    question: 'Can my child with a nut allergy eat the school lunch?',
    answer: 'Yes, Lincoln District schools offer nut-free lunch options daily. Please contact the school cafeteria to discuss specific allergen concerns and view the allergen-free menu options.',
    category: 'Food Services',
    confidence: 88,
    sources: ['Nutrition Services Guide.pdf', 'Allergy Policy.pdf'],
    askedAt: new Date(Date.now() - 1000 * 60 * 45),
    feedback: 'positive',
    status: 'answered',
    parentId: 'parent-456',
    school: 'Lincoln Elementary',
  },
  {
    id: '3',
    question: 'What are the requirements for the advanced math program?',
    answer: 'Students must score in the 85th percentile or above on standardized math assessments and maintain a B+ average in current math courses. Teacher recommendations are also considered.',
    category: 'Academic Programs',
    confidence: 72,
    sources: ['Academic Programs Handbook.pdf'],
    askedAt: new Date(Date.now() - 1000 * 60 * 90),
    feedback: null,
    status: 'flagged',
    flagReason: 'Low confidence - verification recommended',
    parentId: 'parent-789',
    school: 'Lincoln Middle School',
  },
  {
    id: '4',
    question: 'How do I transfer my child to a different school in the district?',
    answer: null,
    category: 'Enrollment',
    confidence: 42,
    sources: [],
    askedAt: new Date(Date.now() - 1000 * 60 * 120),
    feedback: null,
    status: 'escalated',
    escalatedTo: 'Enrollment Office',
    parentId: 'parent-234',
    school: 'Washington High',
  },
  {
    id: '5',
    question: 'When is spring break this year?',
    answer: 'Spring break for the 2024-2025 school year is scheduled for March 17-21, 2025. School resumes on Monday, March 24, 2025.',
    category: 'Calendar',
    confidence: 99,
    sources: ['District Calendar 2024-2025.pdf'],
    askedAt: new Date(Date.now() - 1000 * 60 * 180),
    feedback: 'positive',
    status: 'answered',
    parentId: 'parent-567',
    school: 'Jefferson Elementary',
  },
  {
    id: '6',
    question: 'What is the visitor policy for classroom observations?',
    answer: 'Parents wishing to observe their child\'s classroom must schedule at least 48 hours in advance through the main office. Visits are limited to 30 minutes and require a background check on file.',
    category: 'Policies',
    confidence: 78,
    sources: ['Visitor Policy.pdf'],
    askedAt: new Date(Date.now() - 1000 * 60 * 240),
    feedback: 'negative',
    feedbackComment: 'Information was outdated - policy changed this year',
    status: 'answered',
    parentId: 'parent-890',
    school: 'Lincoln Elementary',
  },
];

const statusConfig = {
  answered: { 
    label: 'Answered', 
    variant: 'success' as const, 
    icon: CheckCircle 
  },
  flagged: { 
    label: 'Flagged', 
    variant: 'warning' as const, 
    icon: Flag 
  },
  escalated: { 
    label: 'Escalated', 
    variant: 'secondary' as const, 
    icon: AlertTriangle 
  },
};

export default function QuestionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedQuestion, setSelectedQuestion] = useState<typeof questions[0] | null>(null);

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || q.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="flex flex-col">
      <Header 
        title="Question Analysis" 
        description="Review AI responses and parent questions"
      />

      <div className="flex-1 p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Question List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Transportation">Transportation</SelectItem>
                        <SelectItem value="Food Services">Food Services</SelectItem>
                        <SelectItem value="Academic Programs">Academic Programs</SelectItem>
                        <SelectItem value="Calendar">Calendar</SelectItem>
                        <SelectItem value="Policies">Policies</SelectItem>
                        <SelectItem value="Enrollment">Enrollment</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="answered">Answered</SelectItem>
                        <SelectItem value="flagged">Flagged</SelectItem>
                        <SelectItem value="escalated">Escalated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions List */}
            <div className="space-y-2">
              {filteredQuestions.map((q) => {
                const StatusIcon = statusConfig[q.status as keyof typeof statusConfig]?.icon;
                return (
                  <Card 
                    key={q.id}
                    className={`cursor-pointer transition-colors hover:border-primary/50 ${
                      selectedQuestion?.id === q.id ? 'border-primary' : ''
                    }`}
                    onClick={() => setSelectedQuestion(q)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium leading-relaxed">{q.question}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span>{q.category}</span>
                              <span>•</span>
                              <span>{q.school}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatRelativeTime(q.askedAt)}
                              </span>
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
                            <Badge variant={statusConfig[q.status as keyof typeof statusConfig]?.variant}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {statusConfig[q.status as keyof typeof statusConfig]?.label}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Brain className="h-3 w-3 text-muted-foreground" />
                            <span className={`text-xs font-medium ${
                              q.confidence >= 90 ? 'text-green-600' :
                              q.confidence >= 70 ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {q.confidence}% confidence
                            </span>
                          </div>
                          {q.sources.length > 0 && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <FileText className="h-3 w-3" />
                                {q.sources.length} source{q.sources.length > 1 ? 's' : ''}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Question Detail */}
          <div className="space-y-4">
            {selectedQuestion ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Question Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Question</p>
                      <p className="text-sm">{selectedQuestion.question}</p>
                    </div>
                    
                    {selectedQuestion.answer && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">AI Response</p>
                        <p className="text-sm bg-muted p-3 rounded-lg">
                          {selectedQuestion.answer}
                        </p>
                      </div>
                    )}

                    {selectedQuestion.status === 'escalated' && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-800">Escalated</p>
                          <p className="text-amber-600">
                            Sent to {selectedQuestion.escalatedTo}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedQuestion.flagReason && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <Flag className="h-4 w-4 text-amber-600" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-800">Flagged</p>
                          <p className="text-amber-600">{selectedQuestion.flagReason}</p>
                        </div>
                      </div>
                    )}

                    {selectedQuestion.feedbackComment && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                        <ThumbsDown className="h-4 w-4 text-red-600" />
                        <div className="text-sm">
                          <p className="font-medium text-red-800">Negative Feedback</p>
                          <p className="text-red-600">{selectedQuestion.feedbackComment}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedQuestion.sources.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Sources Used</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedQuestion.sources.map((source, i) => (
                          <div 
                            key={i}
                            className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{source}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button className="w-full" variant="outline">
                      <Eye className="mr-2 h-4 w-4" />
                      View Full Conversation
                    </Button>
                    <Button className="w-full" variant="outline">
                      <Flag className="mr-2 h-4 w-4" />
                      Flag for Review
                    </Button>
                    <Button className="w-full" variant="outline">
                      Add to Training Data
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Select a question to view details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
