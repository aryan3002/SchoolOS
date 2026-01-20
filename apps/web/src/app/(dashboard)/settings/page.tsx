'use client';

import { Header } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Link2,
  Brain,
  Bell,
  ChevronRight,
  Shield,
  Palette,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

const settingsSections = [
  {
    title: 'District Configuration',
    description: 'Manage district information, schools, and branding',
    href: '/settings/district',
    icon: Building2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Integrations',
    description: 'Connect with SIS, LMS, and other systems',
    href: '/settings/integrations',
    icon: Link2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'AI Configuration',
    description: 'Customize AI behavior, tone, and escalation rules',
    href: '/settings/ai',
    icon: Brain,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    title: 'Notifications',
    description: 'Configure alerts, reports, and email settings',
    href: '/settings/notifications',
    icon: Bell,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    title: 'Security',
    description: 'Authentication, SSO, and access policies',
    href: '/settings/security',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  {
    title: 'Appearance',
    description: 'Customize colors, logos, and branding',
    href: '/settings/appearance',
    icon: Palette,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <Header 
        title="Settings" 
        description="Configure your SchoolOS admin console"
      />

      <div className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href as any}>
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-lg p-3 ${section.bgColor}`}>
                        <Icon className={`h-6 w-6 ${section.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{section.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {section.description}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Settings</CardTitle>
            <CardDescription>Common configuration options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Require document approval</p>
                <p className="text-sm text-muted-foreground">
                  New documents need admin approval before going live
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Auto-escalate low confidence responses</p>
                <p className="text-sm text-muted-foreground">
                  Automatically escalate responses below 70% confidence
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Enable feedback collection</p>
                <p className="text-sm text-muted-foreground">
                  Allow parents to rate AI responses
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Weekly analytics reports</p>
                <p className="text-sm text-muted-foreground">
                  Send weekly email summaries to admins
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
