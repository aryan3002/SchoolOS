'use client';

import { useState, useEffect } from 'react';
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
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useKnowledgeSources, useDeleteKnowledge, usePublishKnowledge } from '@/lib/hooks';
import { KnowledgeSource, KnowledgeSourceStatus } from '@/lib/api/knowledge';
import { toast } from 'sonner';

const categories = [
  'All Categories',
  'policies',
  'transportation',
  'food-services',
  'programs',
  'safety',
  'athletics',
  'academics',
  'events',
];

const statusConfig: Record<KnowledgeSourceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }> = {
  PUBLISHED: { label: 'Published', variant: 'default', icon: CheckCircle },
  PENDING_REVIEW: { label: 'Pending Review', variant: 'secondary', icon: Clock },
  DRAFT: { label: 'Draft', variant: 'outline', icon: Clock },
  ARCHIVED: { label: 'Archived', variant: 'secondary', icon: XCircle },
  EXPIRED: { label: 'Expired', variant: 'destructive', icon: XCircle },
};

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState<KnowledgeSourceStatus | 'all'>('all');

  // Fetch knowledge sources from API
  const { data, isLoading, error, refetch } = useKnowledgeSources({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    category: categoryFilter !== 'All Categories' ? categoryFilter : undefined,
    searchQuery: searchQuery || undefined,
  });

  const deleteMutation = useDeleteKnowledge();
  const publishMutation = usePublishKnowledge();

  const sources = data?.items || [];
  const total = data?.pagination?.total || 0;

  // Filter documents client-side for immediate feedback
  const filteredDocs = sources.filter((doc) => {
    const matchesSearch = searchQuery 
      ? doc.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesSearch;
  });

  // Calculate stats
  const publishedCount = sources.filter(d => d.status === 'PUBLISHED').length;
  const pendingCount = sources.filter(d => d.status === 'PENDING_REVIEW' || d.status === 'DRAFT').length;
  const totalChunks = sources.reduce((acc, d) => acc + (d._count?.chunks || 0), 0);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Document deleted successfully');
      } catch (err) {
        toast.error('Failed to delete document');
      }
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishMutation.mutateAsync(id);
      toast.success('Document published successfully');
    } catch (err) {
      toast.error('Failed to publish document');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (error) {
    return (
      <div className="flex flex-col">
        <Header 
          title="Knowledge Base" 
          description="Manage documents that power your AI assistant"
        />
        <div className="flex-1 p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-medium">Failed to load documents</h3>
              <p className="text-muted-foreground mt-1">
                {error instanceof Error ? error.message : 'Please check your connection and try again'}
              </p>
              <Button onClick={() => refetch()} className="mt-4">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                <p className="text-2xl font-bold">{total}</p>
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
                <p className="text-2xl font-bold">{publishedCount}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-amber-50 p-2">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending/Draft</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-purple-50 p-2">
                <FolderOpen className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalChunks}</p>
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
                        {cat === 'All Categories' ? cat : cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as KnowledgeSourceStatus | 'all')}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
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
              {isLoading ? 'Loading...' : `${filteredDocs.length} document${filteredDocs.length !== 1 ? 's' : ''} found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No documents found</h3>
                <p className="text-muted-foreground mt-1">
                  {searchQuery || categoryFilter !== 'All Categories' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Upload your first document to get started'}
                </p>
                <Link href="/knowledge/upload">
                  <Button className="mt-4">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocs.map((doc) => {
                  const config = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.DRAFT;
                  const StatusIcon = config.icon;
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
                          <Badge variant={config.variant}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {doc.category && (
                            <span className="flex items-center gap-1">
                              <FolderOpen className="h-3 w-3" />
                              {doc.category}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(doc.createdAt)}
                          </span>
                          <span>{doc.sourceType} • {formatFileSize(doc.fileSize)}</span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{doc._count?.chunks || 0} chunks</p>
                        <p>v{doc.version}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {doc.status === 'DRAFT' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Publish"
                            onClick={() => handlePublish(doc.id)}
                            disabled={publishMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          title="Delete"
                          onClick={() => handleDelete(doc.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
