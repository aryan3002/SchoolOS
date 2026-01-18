/**
 * Document Parser Factory
 *
 * Factory for creating appropriate document parsers based on MIME type.
 * Supports PDF, HTML, plain text, and DOCX formats.
 */

import { Injectable, Logger } from '@nestjs/common';
import { DocumentParser, ParsedDocument, UnsupportedFormatError } from './types';
import { PDFParser } from './pdf-parser';
import { WebContentParser } from './web-content-parser';

export interface ParserOptions {
  enableOCR?: boolean;
  maxPages?: number;
  preserveFormatting?: boolean;
}

@Injectable()
export class DocumentParserFactory {
  private readonly logger = new Logger(DocumentParserFactory.name);

  private readonly parsers: Map<string, DocumentParser>;

  constructor(
    pdfParser: PDFParser,
    webContentParser: WebContentParser,
  ) {
    this.parsers = new Map();

    // Register PDF parser
    for (const mimeType of pdfParser.getSupportedMimeTypes()) {
      this.parsers.set(mimeType, pdfParser);
    }

    // Register web content parser
    for (const mimeType of webContentParser.getSupportedMimeTypes()) {
      this.parsers.set(mimeType, webContentParser);
    }
  }

  /**
   * Get the appropriate parser for a given MIME type
   */
  getParser(mimeType: string): DocumentParser {
    const normalizedMimeType = mimeType.toLowerCase().split(';')[0]?.trim() ?? '';
    const parser = this.parsers.get(normalizedMimeType);

    if (!parser) {
      throw new UnsupportedFormatError(`Unsupported document format: ${mimeType}`);
    }

    return parser;
  }

  /**
   * Parse a document based on its MIME type
   */
  async parse(file: Buffer, mimeType: string, _options?: ParserOptions): Promise<ParsedDocument> {
    const parser = this.getParser(mimeType);

    this.logger.log('Parsing document', {
      mimeType,
      fileSize: file.length,
    });

    const startTime = Date.now();
    const result = await parser.parse(file);
    const duration = Date.now() - startTime;

    this.logger.log('Document parsed successfully', {
      mimeType,
      duration,
      contentLength: result.content.length,
      pageCount: result.pages.length,
      sectionCount: result.structure.sections.length,
    });

    return result;
  }

  /**
   * Get list of supported MIME types
   */
  getSupportedMimeTypes(): string[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * Check if a MIME type is supported
   */
  isSupported(mimeType: string): boolean {
    const normalizedMimeType = mimeType.toLowerCase().split(';')[0]?.trim() ?? '';
    return this.parsers.has(normalizedMimeType);
  }

  /**
   * Detect MIME type from file content (magic bytes)
   */
  detectMimeType(file: Buffer): string | null {
    // PDF magic bytes: %PDF
    if (file.slice(0, 4).toString() === '%PDF') {
      return 'application/pdf';
    }

    // Check for HTML
    const textStart = file.slice(0, 1024).toString('utf-8').trim().toLowerCase();
    if (textStart.startsWith('<!doctype html') || textStart.startsWith('<html')) {
      return 'text/html';
    }

    // Check for XML (could be DOCX or other)
    if (textStart.startsWith('<?xml') || textStart.startsWith('<xml')) {
      return 'application/xml';
    }

    // Check for ZIP (DOCX, XLSX are ZIP files)
    if (file[0] === 0x50 && file[1] === 0x4b && file[2] === 0x03 && file[3] === 0x04) {
      // Could be DOCX, XLSX, etc. - would need to examine internal structure
      return 'application/zip';
    }

    // Default to plain text if it looks like text
    if (this.isLikelyText(file)) {
      return 'text/plain';
    }

    return null;
  }

  private isLikelyText(file: Buffer): boolean {
    // Check first 1024 bytes for text-like content
    const sample = file.slice(0, Math.min(1024, file.length));

    let textChars = 0;
    let binaryChars = 0;

    for (const byte of sample) {
      // Common text characters
      if (
        (byte >= 0x20 && byte <= 0x7e) || // Printable ASCII
        byte === 0x09 || // Tab
        byte === 0x0a || // LF
        byte === 0x0d || // CR
        byte >= 0xc0 // UTF-8 continuation bytes
      ) {
        textChars++;
      } else if (byte !== 0x00) {
        binaryChars++;
      }
    }

    // Consider it text if > 85% text characters
    return textChars > 0 && binaryChars / textChars < 0.15;
  }
}
