'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  File,
  FileImage,
  FileSpreadsheet,
} from 'lucide-react';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
}

const categories = [
  'Policies',
  'Transportation',
  'Food Services',
  'Programs',
  'Safety',
  'Athletics',
  'Academics',
  'Events',
  'General Information',
];

const acceptedFileTypes = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
};

function getFileIcon(type: string) {
  if (type.includes('pdf')) return FileText;
  if (type.includes('image')) return FileImage;
  if (type.includes('spreadsheet') || type.includes('excel')) return FileSpreadsheet;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [category, setCategory] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substring(7),
      status: 'pending',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !category) return;
    
    setIsUploading(true);
    
    // Simulate upload process
    for (const uploadFile of files) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
        )
      );

      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, progress: i } : f
          )
        );
      }

      // Simulate processing
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'processing', progress: 100 } : f
        )
      );
      
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Complete
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'complete' } : f
        )
      );
    }

    setIsUploading(false);
  };

  const allComplete = files.length > 0 && files.every((f) => f.status === 'complete');

  return (
    <div className="flex flex-col">
      <Header 
        title="Upload Document" 
        description="Add new documents to your knowledge base"
      >
        <Link href="/knowledge">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Documents
          </Button>
        </Link>
      </Header>

      <div className="flex-1 space-y-6 p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Upload Area */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Upload Files</CardTitle>
              <CardDescription>
                Drag and drop files or click to browse. Supported formats: PDF, DOC, DOCX, XLS, XLSX, TXT, MD
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm font-medium">
                  {isDragActive
                    ? 'Drop files here...'
                    : 'Drag and drop files here, or click to select'}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Maximum file size: 50MB
                </p>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Files to upload</h4>
                  {files.map((uploadFile) => {
                    const FileIcon = getFileIcon(uploadFile.file.type);
                    return (
                      <div
                        key={uploadFile.id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <div className="rounded-lg bg-muted p-2">
                          <FileIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {uploadFile.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(uploadFile.file.size)}
                          </p>
                          {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                            <Progress value={uploadFile.progress} className="mt-2 h-1" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {uploadFile.status === 'pending' && (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                          {uploadFile.status === 'uploading' && (
                            <Badge variant="secondary">
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Uploading
                            </Badge>
                          )}
                          {uploadFile.status === 'processing' && (
                            <Badge variant="info">
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Processing
                            </Badge>
                          )}
                          {uploadFile.status === 'complete' && (
                            <Badge variant="success">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Complete
                            </Badge>
                          )}
                          {uploadFile.status === 'error' && (
                            <Badge variant="destructive">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Error
                            </Badge>
                          )}
                          {uploadFile.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFile(uploadFile.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Document Settings</CardTitle>
              <CardDescription>
                Configure how this document will be processed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="e.g., handbook, policies, 2024"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple tags with commas
                </p>
              </div>

              <div className="space-y-2">
                <Label>Processing Options</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked className="rounded" />
                    Auto-extract key information
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked className="rounded" />
                    Generate summary
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    Require approval before publishing
                  </label>
                </div>
              </div>

              <div className="pt-4">
                {allComplete ? (
                  <Link href="/knowledge">
                    <Button className="w-full">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Done - View Documents
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className="w-full"
                    disabled={files.length === 0 || !category || isUploading}
                    onClick={handleUpload}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'Files'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Tips for Better Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex gap-3">
                <div className="rounded-lg bg-blue-50 p-2 h-fit">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Use Clear Formatting</h4>
                  <p className="text-xs text-muted-foreground">
                    Documents with clear headings and structure are processed more accurately
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="rounded-lg bg-green-50 p-2 h-fit">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Keep Content Up-to-Date</h4>
                  <p className="text-xs text-muted-foreground">
                    Remove outdated documents to prevent incorrect information
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="rounded-lg bg-purple-50 p-2 h-fit">
                  <AlertCircle className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Avoid Sensitive Data</h4>
                  <p className="text-xs text-muted-foreground">
                    Don't upload documents containing personal student information
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
