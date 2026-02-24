/**
 * CSV Parser Module
 * Handles streaming CSV parsing with memory efficiency
 */
import * as fs from 'fs';
import { parse, Parser } from 'csv-parse';
import { CSVRecord } from './types';

/**
 * CSVParser class
 * Handles CSV file parsing with streaming support
 */
export class CSVParser {
  private filePath: string;
  private highWaterMark: number;

  /**
   * Create a new CSVParser instance
   * @param filePath - Path to the CSV file
   * @param highWaterMark - Chunk size for reading (default: 64KB)
   */
  constructor(filePath: string, highWaterMark: number = 64 * 1024) {
    this.filePath = filePath;
    this.highWaterMark = highWaterMark;
  }

  /**
   * Parse a raw CSV row object into a typed CSVRecord
   * Validates and converts data types
   * 
   * @param row - Raw row object from csv-parse
   * @returns Parsed CSVRecord
   * @throws Error if row is invalid
   */
  public parseRecord(row: Record<string, string>): CSVRecord {
    const campaignId = row.campaign_id?.trim();
    if (!campaignId) {
      throw new Error('Missing campaign_id');
    }

    const impressions = parseInt(row.impressions);
    const clicks = parseInt(row.clicks);
    const spend = parseFloat(row.spend);
    const conversions = parseInt(row.conversions);

    // Validate numeric fields
    if (isNaN(impressions) || impressions < 0) {
      throw new Error(`Invalid impressions: ${row.impressions}`);
    }
    if (isNaN(clicks) || clicks < 0) {
      throw new Error(`Invalid clicks: ${row.clicks}`);
    }
    if (isNaN(spend) || spend < 0) {
      throw new Error(`Invalid spend: ${row.spend}`);
    }
    if (isNaN(conversions) || conversions < 0) {
      throw new Error(`Invalid conversions: ${row.conversions}`);
    }

    return {
      campaign_id: campaignId,
      date: row.date || '',
      impressions,
      clicks,
      spend,
      conversions,
    };
  }

  /**
   * Create a streaming CSV parser
   * Uses async iterator pattern for memory efficiency
   * 
   * @returns Async iterable of raw row objects
   */
  public createStream(): AsyncIterable<Record<string, string>> {
    const fileStream = fs.createReadStream(this.filePath, {
      highWaterMark: this.highWaterMark,
    });

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    fileStream.pipe(parser);

    return parser;
  }

  /**
   * Get the file size in bytes
   * @returns File size in bytes
   */
  public getFileSize(): number {
    const stats = fs.statSync(this.filePath);
    return stats.size;
  }

  /**
   * Check if file exists and is readable
   * @returns true if file exists and is readable
   */
  public isReadable(): boolean {
    try {
      fs.accessSync(this.filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the file path
   */
  public getFilePath(): string {
    return this.filePath;
  }
}
