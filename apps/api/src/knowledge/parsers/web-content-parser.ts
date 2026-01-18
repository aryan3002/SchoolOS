/**
 * Web Content Parser
 *
 * Parses HTML and plain text content, extracting structured
 * text while preserving document hierarchy.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  DocumentParser,
  ParsedDocument,
  DocumentStructure,
  DocumentParsingError,
} from './types';

@Injectable()
export class WebContentParser implements DocumentParser {
  private readonly logger = new Logger(WebContentParser.name);

  getSupportedMimeTypes(): string[] {
    return ['text/html', 'text/plain', 'text/markdown'];
  }

  async parse(file: Buffer): Promise<ParsedDocument> {
    try {
      const content = file.toString('utf-8');
      const mimeType = this.detectMimeType(content);

      if (mimeType === 'text/html') {
        return this.parseHTML(content);
      } else if (mimeType === 'text/markdown') {
        return this.parseMarkdown(content);
      } else {
        return this.parsePlainText(content);
      }
    } catch (error) {
      this.logger.error('Web content parsing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DocumentParsingError('Failed to parse web content', error instanceof Error ? error : undefined);
    }
  }

  private detectMimeType(content: string): string {
    const trimmed = content.trim();

    if (trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html') || /<[a-z][\s\S]*>/i.test(trimmed)) {
      return 'text/html';
    }

    // Check for markdown patterns
    if (/^#{1,6}\s/.test(trimmed) || /^\*\*.*\*\*/.test(trimmed) || /^\[.*\]\(.*\)/.test(trimmed)) {
      return 'text/markdown';
    }

    return 'text/plain';
  }

  private parseHTML(html: string): ParsedDocument {
    // Strip script and style tags
    const cleanHtml = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Extract title
    const titleMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch && titleMatch[1] ? this.decodeHtmlEntities(titleMatch[1].trim()) : 'Untitled';

    // Extract body content
    const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? (bodyMatch[1] ?? cleanHtml) : cleanHtml;

    // Extract text content
    const textContent = this.extractTextFromHTML(bodyContent);
    const structure = this.extractStructureFromHTML(bodyContent);

    return {
      content: textContent,
      metadata: {
        title,
        wordCount: this.countWords(textContent),
      },
      pages: [
        {
          pageNumber: 1,
          content: textContent,
        },
      ],
      structure,
    };
  }

  private extractTextFromHTML(html: string): string {
    // Replace block elements with newlines
    const withLineBreaks = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
      .replace(/<(p|div|h[1-6]|li|tr|blockquote)[^>]*>/gi, '\n')
      .replace(/<\/?(ul|ol|table|tbody|thead)>/gi, '\n');

    // Remove remaining tags
    const textOnly = withLineBreaks.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    const decoded = this.decodeHtmlEntities(textOnly);

    // Clean up whitespace
    return decoded
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter((line) => line.length > 0)
      .join('\n');
  }

  private extractStructureFromHTML(html: string): DocumentStructure {
    const structure: DocumentStructure = {
      sections: [],
      headers: [],
      lists: [],
      tables: [],
    };

    // Extract headers
    const headerRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
    let match: RegExpExecArray | null;
    let lineNumber = 0;

    while ((match = headerRegex.exec(html)) !== null) {
      const level = parseInt(match[1] ?? '1', 10);
      const text = this.extractTextFromHTML(match[2] ?? '');

      structure.headers.push({
        text,
        line: lineNumber++,
        level,
      });

      structure.sections.push({
        title: text,
        startLine: lineNumber - 1,
        content: [],
        level,
      });
    }

    // Extract lists
    const listRegex = /<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
    while ((match = listRegex.exec(html)) !== null) {
      const tagName = match[1]?.toLowerCase() ?? 'ul';
      const listType = tagName === 'ol' ? 'ordered' : 'unordered';
      const listContent = match[2] ?? '';
      const listItems = listContent.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) ?? [];

      structure.lists.push({
        items: listItems.map((item) => this.extractTextFromHTML(item.replace(/<\/?li[^>]*>/gi, ''))),
        startLine: lineNumber++,
        type: listType,
      });
    }

    return structure;
  }

  private parseMarkdown(markdown: string): ParsedDocument {
    const lines = markdown.split('\n');
    const structure: DocumentStructure = {
      sections: [],
      headers: [],
      lists: [],
      tables: [],
    };

    let title = 'Untitled';
    const contentParts: string[] = [];
    let currentList: { items: string[]; startLine: number; type: 'ordered' | 'unordered' } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';

      // Headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1]?.length ?? 1;
        const text = headerMatch[2]?.trim() ?? '';

        if (level === 1 && title === 'Untitled') {
          title = text;
        }

        structure.headers.push({ text, line: i, level });
        structure.sections.push({
          title: text,
          startLine: i,
          content: [],
          level,
        });
        contentParts.push(text);
        continue;
      }

      // List items
      const listMatch = line.match(/^(\s*)([*+-]|\d+\.)\s+(.+)$/);
      if (listMatch) {
        const marker = listMatch[2] ?? '*';
        const type = /^\d+\./.test(marker) ? 'ordered' : 'unordered';
        const item = listMatch[3]?.trim() ?? '';

        if (!currentList) {
          currentList = { items: [], startLine: i, type };
        }
        currentList.items.push(item);
        contentParts.push(item);
        continue;
      } else if (currentList) {
        structure.lists.push(currentList);
        currentList = null;
      }

      // Regular text (remove markdown formatting)
      const cleanLine = line
        .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
        .replace(/\*(.+?)\*/g, '$1') // Italic
        .replace(/`(.+?)`/g, '$1') // Inline code
        .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
        .trim();

      if (cleanLine) {
        contentParts.push(cleanLine);
      }
    }

    if (currentList) {
      structure.lists.push(currentList);
    }

    const content = contentParts.join('\n');

    return {
      content,
      metadata: {
        title,
        wordCount: this.countWords(content),
      },
      pages: [{ pageNumber: 1, content }],
      structure,
    };
  }

  private parsePlainText(text: string): ParsedDocument {
    const lines = text.split('\n');
    const structure = this.extractStructureFromPlainText(lines);

    // Try to extract title from first non-empty line
    const firstLine = lines.find((l) => l.trim().length > 0);
    const title = firstLine && firstLine.length < 100 ? firstLine.trim() : 'Untitled';

    return {
      content: text,
      metadata: {
        title,
        wordCount: this.countWords(text),
      },
      pages: [{ pageNumber: 1, content: text }],
      structure,
    };
  }

  private extractStructureFromPlainText(lines: string[]): DocumentStructure {
    const structure: DocumentStructure = {
      sections: [],
      headers: [],
      lists: [],
      tables: [],
    };

    let currentList: { items: string[]; startLine: number } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? '';

      if (!line) {
        if (currentList && currentList.items.length > 0) {
          structure.lists.push(currentList);
          currentList = null;
        }
        continue;
      }

      // Detect ALL CAPS headers
      if (line === line.toUpperCase() && line.length > 3 && line.length < 100 && /[A-Z]/.test(line)) {
        structure.headers.push({ text: line, line: i, level: 1 });
        structure.sections.push({
          title: line,
          startLine: i,
          content: [],
          level: 1,
        });
        continue;
      }

      // Detect numbered/bulleted lists
      if (/^[•●○◦▪▸►\d+.)a-z)–—-]\s+/.test(line)) {
        const item = line.replace(/^[•●○◦▪▸►\d+.)a-z)–—-]\s*/i, '');
        if (!currentList) {
          currentList = { items: [], startLine: i };
        }
        currentList.items.push(item);
      }
    }

    if (currentList && currentList.items.length > 0) {
      structure.lists.push(currentList);
    }

    return structure;
  }

  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',
      '&mdash;': '—',
      '&ndash;': '–',
      '&hellip;': '…',
      '&copy;': '©',
      '&reg;': '®',
      '&trade;': '™',
    };

    let decoded = text;
    for (const [entity, char] of Object.entries(entities)) {
      decoded = decoded.replace(new RegExp(entity, 'gi'), char);
    }

    // Handle numeric entities
    decoded = decoded.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
    decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

    return decoded;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter((w) => w.length > 0).length;
  }
}
