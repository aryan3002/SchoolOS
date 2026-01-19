'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import {
  FileText,
  Upload,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Download,
  Calendar,
  User,
  CheckCircle,
  Clock,
  XCircle,
  FolderOpen,
} from 'lucide-react';
import { formatDate, formatRelativeTime } from '@/lib/utils';

// Mock data
const documents = [
  {
    id: '1',
    title: 'Student Handbook 2024-2025',
    category: 'Policies',
    status: 'approved',
    uploadedBy: 'Dr. Sarah Johnson',
    uploadedAt: new Date('2024-08-15'),
    lastUpdated: new Date('2024-08-20'),
    fileType: 'PDF',
    fileSize: '2.4 MB',
    chunks: 156,
    views: 1234,
  },
  {
    id: '2',
    title: 'Transportation Routes & Schedules',
    category: 'Transportation',
    status: 'approved',
    uploadedBy: 'Michael Chen',
    uploadedAt: new Date('2024-08-10'),
    lastUpdated: new Date('2024-09-01'),
    fileType: 'PDF',
    fileSize: '1.8 MB',
    chunks: 89,
    views: 2567,
  },
  {
    id: '3',
    title: 'Lunch Menu - September 2024',
    category: 'Food Services',
    status: 'approved',
    uploadedBy: 'Lisa Martinez',
    uploadedAt: new Date('2024-08-28'),
    lastUpdated: new Date('2024-08-28'),
    fileType: 'PDF',
    fileSize: '850 KB',
    chunks: 24,
    views: 4521,
  },
  {
    id: '4',
    title: 'After School Programs Guide',
    category: 'Programs',
    status: 'pending',
    uploadedBy: 'James Wilson',
    uploadedAt: new Date('2024-09-02'),
    lastUpdated: new Date('2024-09-02'),
    fileType: 'DOCX',
    fileSize: '1.2 MB',
    chunks: 67,
    views: 0,
  },
  {
    id: '5',
    title: 'Emergency Procedures Manual',
    category: 'Safety',
    status: 'approved',
    uploadedBy: 'Dr. Sarah Johnson',
    uploadedAt: new Date('2024-07-01'),
    lastUpdated: new Date('2024-08-15'),
    fileType: 'PDF',
    fileSize: '3.1 MB',
    chunks: 203,
    views: 892,
  },
  {
    id: '6',
    title: 'Athletic Registration Forms',
    category: 'Athletics',
    status: 'rejected',
    uploadedBy: 'Robert Taylor',
    uploadedAt: new Date('2024-09-01'),
    lastUpdated: new Date('2024-09-03'),
    fileType: 'PDF',
    fileSize: '456 KB',
    chunks: 0,
    views: 0,
    rejectionReason: 'Missing required consent sections',
  },
];

const categories = [
  'All Categories',
  'Policies',
  'Transportation',
  'Food Services',
  'Programs',
  'Safety',
  'Athletics',
  'Academics',
  'Events',
];

const statusConfig = {
  approved: { label: 'Approved', variant: 'success' as const, icon: CheckCircle },
  pending: { label: 'Pending Review', variant: 'warning' as const, icon: Clock },
  rejected: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
};

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All Categories' || doc.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="flex flex-col">
      <Header 
        title="Knowledge Base" 
        description="Manage documents that power your AI assistant"
      >
        <Link href="/knowledge/upload">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </Link>
      </Header>

      <div className="flex-1 space-y-6 p-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-blue-50 p-2">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documents.length}</p>
                <p className="text-xs text-muted-foreground">Total Documents</p>
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
                  {documents.filter(d => d.status === 'approved').length}
                </p>
                <p className="text-xs text-muted-foreground">Approved</p>
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
                  {documents.filter(d => d.status === 'pending').length}
                </p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-purple-50 p-2">
                <FolderOpen className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {documents.reduce((acc, d) => acc + d.chunks, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Knowledge Chunks</p>
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
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredDocs.map((doc) => {
                const StatusIcon = statusConfig[doc.status].icon;
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="rounded-lg bg-muted p-3">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{doc.title}</h3>
                        <Badge variant={statusConfig[doc.status].variant}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusConfig[doc.status].label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {doc.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {doc.uploadedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(doc.uploadedAt)}
                        </span>
                        <span>{doc.fileType} • {doc.fileSize}</span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{doc.chunks} chunks</p>
                      <p>{doc.views.toLocaleString()} views</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
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
      </div>
    </div>
  );
}
