'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Brain,
  Sliders,
  MessageSquare,
  AlertTriangle,
  Save,
  RotateCcw,
  Info,
} from 'lucide-react';

export default function AISettingsPage() {
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [maxResponseLength, setMaxResponseLength] = useState(500);
  const [tone, setTone] = useState('friendly');
  const [language, setLanguage] = useState('en');

  return (
    <div className="flex flex-col">
      <Header 
        title="AI Configuration" 
        description="Customize how the AI assistant responds to parents"
      >
        <div className="flex items-center gap-2">
          <Link href="/settings">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Settings
            </Button>
          </Link>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </Header>

      <div className="flex-1 space-y-6 p-6">
        <Tabs defaultValue="behavior">
          <TabsList>
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
            <TabsTrigger value="escalation">Escalation Rules</TabsTrigger>
            <TabsTrigger value="prompts">Custom Prompts</TabsTrigger>
            <TabsTrigger value="limits">Limits & Safety</TabsTrigger>
          </TabsList>

          <TabsContent value="behavior" className="space-y-6 mt-6">
            {/* Response Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Response Settings
                </CardTitle>
                <CardDescription>
                  Configure how the AI formulates responses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Response Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">Friendly & Warm</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="concise">Concise & Direct</SelectItem>
                        <SelectItem value="supportive">Supportive & Empathetic</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Sets the overall communication style
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Primary Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="zh">Chinese (Simplified)</SelectItem>
                        <SelectItem value="vi">Vietnamese</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Auto-detect is enabled for other languages
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Maximum Response Length</Label>
                      <span className="text-sm text-muted-foreground">{maxResponseLength} words</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={1000}
                      step={50}
                      value={maxResponseLength}
                      onChange={(e) => setMaxResponseLength(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Longer responses may be more comprehensive but can overwhelm parents
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Response Style Options</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <div>
                        <p className="text-sm font-medium">Include source citations</p>
                        <p className="text-xs text-muted-foreground">Reference document names in responses</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <div>
                        <p className="text-sm font-medium">Offer follow-up suggestions</p>
                        <p className="text-xs text-muted-foreground">Suggest related questions</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" className="rounded" />
                      <div>
                        <p className="text-sm font-medium">Include contact information</p>
                        <p className="text-xs text-muted-foreground">Add relevant staff contacts</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <div>
                        <p className="text-sm font-medium">Use bullet points</p>
                        <p className="text-xs text-muted-foreground">Format complex info as lists</p>
                      </div>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Confidence Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Confidence Settings
                </CardTitle>
                <CardDescription>
                  Control how the AI handles uncertainty
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Minimum Confidence Threshold</Label>
                    <Badge variant={confidenceThreshold >= 70 ? 'success' : 'warning'}>
                      {confidenceThreshold}%
                    </Badge>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={95}
                    step={5}
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Responses below this threshold will be escalated or flagged
                  </p>
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Confidence Score Explained</p>
                      <p className="text-muted-foreground mt-1">
                        The AI calculates confidence based on how well the question matches available knowledge. 
                        Higher thresholds reduce incorrect answers but may increase escalations.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="escalation" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Escalation Rules
                </CardTitle>
                <CardDescription>
                  Define when questions should be sent to staff
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Automatic Escalation Triggers</Label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Low confidence responses</p>
                        <p className="text-xs text-muted-foreground">
                          When AI confidence is below {confidenceThreshold}%
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Sensitive topics</p>
                        <p className="text-xs text-muted-foreground">
                          Questions about discipline, special education, legal matters
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Parent requests human support</p>
                        <p className="text-xs text-muted-foreground">
                          When a parent explicitly asks to speak with staff
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" className="rounded" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Negative feedback received</p>
                        <p className="text-xs text-muted-foreground">
                          When a parent marks a response as unhelpful
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Default Escalation Target</Label>
                  <Select defaultValue="office">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">Main Office</SelectItem>
                      <SelectItem value="principal">Principal</SelectItem>
                      <SelectItem value="counselor">School Counselor</SelectItem>
                      <SelectItem value="custom">Custom (by topic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Escalation Response Time Goal</Label>
                  <Select defaultValue="4">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Within 1 hour</SelectItem>
                      <SelectItem value="4">Within 4 hours</SelectItem>
                      <SelectItem value="24">Within 24 hours</SelectItem>
                      <SelectItem value="48">Within 2 business days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prompts" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom System Prompts</CardTitle>
                <CardDescription>
                  Customize the AI's base instructions and personality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Introduction Message</Label>
                  <textarea
                    className="w-full min-h-[100px] rounded-lg border bg-background px-3 py-2 text-sm"
                    placeholder="Hi! I'm your SchoolOS assistant. I'm here to help answer questions about our district..."
                    defaultValue="Hi! I'm your SchoolOS assistant for Lincoln District. I'm here to help answer your questions about school policies, schedules, events, and more. How can I help you today?"
                  />
                </div>

                <div className="space-y-2">
                  <Label>System Instructions</Label>
                  <textarea
                    className="w-full min-h-[150px] rounded-lg border bg-background px-3 py-2 text-sm font-mono text-xs"
                    placeholder="You are a helpful assistant for parents..."
                    defaultValue={`You are a helpful assistant for parents in the Lincoln School District. 

Key guidelines:
- Always be friendly, supportive, and professional
- If you're not sure about something, say so and offer to escalate
- Never share sensitive student information
- Cite your sources when referencing specific documents
- Offer to help with follow-up questions`}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Escalation Message</Label>
                  <textarea
                    className="w-full min-h-[80px] rounded-lg border bg-background px-3 py-2 text-sm"
                    defaultValue="I want to make sure you get the most accurate information, so I'm going to connect you with our staff who can better assist with this question. They'll typically respond within 4 hours during school days."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="limits" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Rate Limits & Safety</CardTitle>
                <CardDescription>
                  Protect against misuse and ensure quality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Max questions per user/hour</Label>
                    <Input type="number" defaultValue={20} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max questions per user/day</Label>
                    <Input type="number" defaultValue={100} />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Content Filters</Label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Block PII requests</p>
                        <p className="text-xs text-muted-foreground">
                          Refuse to share student addresses, phone numbers, etc.
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Block off-topic questions</p>
                        <p className="text-xs text-muted-foreground">
                          Only respond to school-related queries
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Moderate inappropriate content</p>
                        <p className="text-xs text-muted-foreground">
                          Filter abusive or inappropriate messages
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
