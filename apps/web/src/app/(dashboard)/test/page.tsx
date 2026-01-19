'use client';

import { useState, useRef, useEffect } from 'react';
import { Header } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Send,
  Bot,
  User,
  Brain,
  FileText,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Sparkles,
  Settings,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
  sources?: string[];
  responseTime?: number;
}

const sampleQuestions = [
  "What time does the school day start?",
  "How do I sign up for the after-school program?",
  "What are the lunch options for kids with allergies?",
  "When is spring break this year?",
  "How do I update my emergency contact information?",
  "What is the dress code policy?",
];

const mockSources = [
  'Student Handbook 2024-2025.pdf',
  'Transportation Routes.pdf',
  'Lunch Menu September 2024.pdf',
  'District Calendar.pdf',
];

export default function TestModePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('lincoln-elementary');
  const [selectedRole, setSelectedRole] = useState('parent');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response delay
    const startTime = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1500));

    const confidence = Math.floor(70 + Math.random() * 30);
    const responseTime = Date.now() - startTime;

    // Mock AI response
    const responses: Record<string, string> = {
      default: "Based on our district information, I can help you with that! The school day at Lincoln Elementary starts at 8:30 AM. Students should arrive by 8:15 AM for a smooth morning transition. If you need bus transportation information, I can help with that too!",
    };

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: responses.default,
      timestamp: new Date(),
      confidence,
      sources: mockSources.slice(0, Math.floor(Math.random() * 3) + 1),
      responseTime,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleReset = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <Header 
        title="Test Mode" 
        description="Test the AI assistant as different user roles"
      >
        <Badge variant="info" className="gap-1">
          <Sparkles className="h-3 w-3" />
          Sandbox Environment
        </Badge>
      </Header>

      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">SchoolOS Assistant</CardTitle>
                    <CardDescription>Testing as {selectedRole}</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset Chat
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <Bot className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">Test the AI Assistant</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-2">
                    Ask questions as if you were a parent to see how the AI responds.
                    You can change the school and role in the sidebar.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {sampleQuestions.slice(0, 3).map((q) => (
                      <Button
                        key={q}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setInput(q)}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback
                          className={
                            message.role === 'assistant'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }
                        >
                          {message.role === 'assistant' ? (
                            <Bot className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`flex-1 max-w-[80%] ${
                          message.role === 'user' ? 'text-right' : ''
                        }`}
                      >
                        <div
                          className={`inline-block rounded-lg px-4 py-2 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {message.confidence && (
                              <span className="flex items-center gap-1">
                                <Brain className="h-3 w-3" />
                                {message.confidence}% confidence
                              </span>
                            )}
                            {message.responseTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {(message.responseTime / 1000).toFixed(1)}s
                              </span>
                            )}
                            {message.sources && message.sources.length > 0 && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {message.sources.length} sources
                              </span>
                            )}
                            <div className="flex items-center gap-1 ml-auto">
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </CardContent>

            <div className="border-t p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Type your question..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                />
                <Button type="submit" disabled={!input.trim() || isLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-80 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Test Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">School Context</label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lincoln-elementary">Lincoln Elementary</SelectItem>
                    <SelectItem value="washington-high">Washington High School</SelectItem>
                    <SelectItem value="jefferson-elementary">Jefferson Elementary</SelectItem>
                    <SelectItem value="district-wide">District-Wide</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Test As Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="new-parent">New Parent (First Time)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sample Questions</CardTitle>
              <CardDescription>Click to use as input</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sampleQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="w-full text-left text-sm p-2 rounded hover:bg-muted transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {messages.some((m) => m.role === 'assistant') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Response Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Avg. Confidence</span>
                    <Badge variant="success">
                      {Math.round(
                        messages
                          .filter((m) => m.role === 'assistant' && m.confidence)
                          .reduce((acc, m) => acc + (m.confidence || 0), 0) /
                          messages.filter((m) => m.role === 'assistant' && m.confidence).length
                      )}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Avg. Response Time</span>
                    <span>
                      {(
                        messages
                          .filter((m) => m.role === 'assistant' && m.responseTime)
                          .reduce((acc, m) => acc + (m.responseTime || 0), 0) /
                        messages.filter((m) => m.role === 'assistant' && m.responseTime).length /
                        1000
                      ).toFixed(1)}s
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Messages</span>
                    <span>{messages.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
