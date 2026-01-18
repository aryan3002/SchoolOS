/**
 * Knowledge Parser Types
 *
 * Type definitions for document parsing system.
 */

export interface ParsedDocument {
  content: string;
  metadata: DocumentMetadata;
  pages: PageContent[];
  structure: DocumentStructure;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  pageCount?: number;
  wordCount?: number;
  language?: string;
  pdfVersion?: string;
  [key: string]: unknown;
}

export interface PageContent {
  pageNumber: number;
  content: string;
  metadata?: {
    width?: number;
    height?: number;
    [key: string]: unknown;
  };
}

export interface DocumentStructure {
  sections: DocumentSection[];
  headers: HeaderInfo[];
  lists: ListInfo[];
  tables: TableInfo[];
}

export interface DocumentSection {
  title: string;
  startLine: number;
  endLine?: number;
  content: string[];
  level?: number;
}

export interface HeaderInfo {
  text: string;
  line: number;
  level: number;
}

export interface ListInfo {
  items: string[];
  startLine: number;
  type?: 'ordered' | 'unordered';
}

export interface TableInfo {
  headers?: string[];
  rows: string[][];
  startLine: number;
  endLine: number;
}

export interface DocumentParser {
  parse(file: Buffer): Promise<ParsedDocument>;
  getSupportedMimeTypes(): string[];
}

export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class DocumentParsingError extends Error {
  public readonly errorCause?: Error | undefined;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'DocumentParsingError';
    if (cause) {
      this.errorCause = cause;
    }
  }
}

export class UnsupportedFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFormatError';
  }
}
