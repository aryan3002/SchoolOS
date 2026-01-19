'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Users,
  Settings,
  MessageSquare,
  BookOpen,
  Bell,
  LogOut,
  ChevronDown,
  School,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: { title: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Knowledge Base',
    href: '/knowledge',
    icon: BookOpen,
    children: [
      { title: 'All Documents', href: '/knowledge' },
      { title: 'Upload New', href: '/knowledge/upload' },
      { title: 'Pending Review', href: '/knowledge/review' },
    ],
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    children: [
      { title: 'Overview', href: '/analytics' },
      { title: 'Questions', href: '/analytics/questions' },
      { title: 'Confusion Hotspots', href: '/analytics/confusion' },
      { title: 'Usage Metrics', href: '/analytics/usage' },
    ],
  },
  {
    title: 'Test Mode',
    href: '/test',
    icon: MessageSquare,
    badge: 'Beta',
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { title: 'District', href: '/settings/district' },
      { title: 'Integrations', href: '/settings/integrations' },
      { title: 'AI Configuration', href: '/settings/ai' },
      { title: 'Notifications', href: '/settings/notifications' },
    ],
  },
];

function NavLink({ item, isChild = false }: { item: NavItem | { title: string; href: string }; isChild?: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = 'icon' in item ? item.icon : null;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        isChild && 'pl-10'
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{item.title}</span>
      {'badge' in item && item.badge && (
        <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function NavGroup({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(item.href);

  if (!item.children) {
    return <NavLink item={item} />;
  }

  return (
    <div className="space-y-1">
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer',
          isActive
            ? 'text-foreground font-medium'
            : 'text-muted-foreground'
        )}
      >
        <item.icon className="h-4 w-4" />
        <span>{item.title}</span>
        {'badge' in item && item.badge && (
          <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
            {item.badge}
          </span>
        )}
      </div>
      {isActive && (
        <div className="space-y-1">
          {item.children.map((child) => (
            <NavLink key={child.href} item={child} isChild />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <School className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-lg font-bold">SchoolOS</h1>
            <p className="text-xs text-muted-foreground">Admin Console</p>
          </div>
        </div>

        {/* District Selector */}
        <div className="border-b p-4">
          <button className="flex w-full items-center justify-between rounded-lg bg-muted p-3 text-sm hover:bg-muted/80">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">LD</span>
              </div>
              <div className="text-left">
                <p className="font-medium">Lincoln District</p>
                <p className="text-xs text-muted-foreground">12,500 students</p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => (
            <NavGroup key={item.href} item={item} />
          ))}
        </nav>

        {/* User Menu */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src="/placeholder-avatar.jpg" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-muted-foreground">admin@lincoln.edu</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
