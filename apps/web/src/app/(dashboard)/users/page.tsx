'use client';

import { useState } from 'react';
import { Header } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  UserPlus,
  MoreVertical,
  Shield,
  Users,
  Mail,
  Calendar,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Pencil,
  Trash2,
  Key,
} from 'lucide-react';
import { formatDate, generateInitials } from '@/lib/utils';

// Mock data
const admins = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@lincoln.edu',
    role: 'Super Admin',
    department: 'District Office',
    status: 'active',
    lastActive: new Date(Date.now() - 1000 * 60 * 30),
    createdAt: new Date('2023-08-01'),
    avatar: null,
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael.chen@lincoln.edu',
    role: 'Knowledge Admin',
    department: 'Communications',
    status: 'active',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2),
    createdAt: new Date('2023-09-15'),
    avatar: null,
  },
  {
    id: '3',
    name: 'Lisa Martinez',
    email: 'lisa.martinez@lincoln.edu',
    role: 'Viewer',
    department: 'Lincoln Elementary',
    status: 'active',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24),
    createdAt: new Date('2024-01-10'),
    avatar: null,
  },
  {
    id: '4',
    name: 'James Wilson',
    email: 'james.wilson@lincoln.edu',
    role: 'Knowledge Admin',
    department: 'Washington High',
    status: 'pending',
    lastActive: null,
    createdAt: new Date('2024-09-01'),
    avatar: null,
  },
  {
    id: '5',
    name: 'Emily Brown',
    email: 'emily.brown@lincoln.edu',
    role: 'Analytics Viewer',
    department: 'Jefferson Elementary',
    status: 'inactive',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    createdAt: new Date('2023-11-20'),
    avatar: null,
  },
];

const roles = [
  {
    name: 'Super Admin',
    description: 'Full access to all features and settings',
    permissions: ['knowledge', 'analytics', 'users', 'settings', 'test-mode'],
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    name: 'Knowledge Admin',
    description: 'Manage documents and knowledge base',
    permissions: ['knowledge', 'analytics'],
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    name: 'Analytics Viewer',
    description: 'View analytics and reports',
    permissions: ['analytics'],
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    name: 'Viewer',
    description: 'Read-only access to dashboard',
    permissions: ['dashboard'],
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
];

const statusConfig = {
  active: { label: 'Active', variant: 'success' as const, icon: CheckCircle },
  pending: { label: 'Pending', variant: 'warning' as const, icon: Clock },
  inactive: { label: 'Inactive', variant: 'secondary' as const, icon: XCircle },
};

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch = 
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || admin.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || admin.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="flex flex-col">
      <Header 
        title="User Management" 
        description="Manage admin users and permissions"
      >
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </Header>

      <div className="flex-1 space-y-6 p-6">
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4 mt-4">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-blue-50 p-2">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{admins.length}</p>
                    <p className="text-xs text-muted-foreground">Total Users</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-green-50 p-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {admins.filter(a => a.status === 'active').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-amber-50 p-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {admins.filter(a => a.status === 'pending').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-purple-50 p-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{roles.length}</p>
                    <p className="text-xs text-muted-foreground">Roles</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {roles.map((role) => (
                          <SelectItem key={role.name} value={role.name}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User List */}
            <Card>
              <CardHeader>
                <CardTitle>Admin Users</CardTitle>
                <CardDescription>
                  {filteredAdmins.length} user{filteredAdmins.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredAdmins.map((admin) => {
                    const StatusIcon = statusConfig[admin.status as keyof typeof statusConfig]?.icon;
                    const roleInfo = roles.find(r => r.name === admin.role);
                    return (
                      <div
                        key={admin.id}
                        className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={admin.avatar || undefined} />
                          <AvatarFallback>{generateInitials(admin.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{admin.name}</h3>
                            <Badge variant={statusConfig[admin.status as keyof typeof statusConfig]?.variant}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {statusConfig[admin.status as keyof typeof statusConfig]?.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {admin.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {admin.department}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant="outline"
                            className={roleInfo ? `${roleInfo.color} border-current` : ''}
                          >
                            <Shield className="mr-1 h-3 w-3" />
                            {admin.role}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {admin.lastActive 
                              ? `Active ${formatDate(admin.lastActive)}`
                              : 'Never logged in'
                            }
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Roles & Permissions</CardTitle>
                    <CardDescription>
                      Define what each role can access in the admin console
                    </CardDescription>
                  </div>
                  <Button>Create Role</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roles.map((role) => (
                    <div
                      key={role.name}
                      className="flex items-start gap-4 rounded-lg border p-4"
                    >
                      <div className={`rounded-lg p-2 ${role.bgColor}`}>
                        <Shield className={`h-5 w-5 ${role.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{role.name}</h3>
                          <Badge variant="outline">
                            {admins.filter(a => a.role === role.name).length} users
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {role.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {role.permissions.map((perm) => (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
