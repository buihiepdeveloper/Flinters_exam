/**
 * Processor Module
 * Main processing pipeline that orchestrates CSV reading, aggregation, and output
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  CampaignResult,
  ProcessingStats,
  CLIOptions,
  ProgressCallback,
} from './types';
import { CSVParser } from './parser';
import { CampaignAggregator } from './aggregator';

/**
 * CSVProcessor class
 * Main processing pipeline for CSV files
 */
export class CSVProcessor {
  private options: CLIOptions;
  private parser: CSVParser;
  private aggregator: CampaignAggregator;
  private onProgress?: ProgressCallback;
  private progressInterval: number;

  /**
   * Create a new CSVProcessor instance
   * @param options - CLI options
   * @param onProgress - Optional progress callback
   * @param progressInterval - Interval for progress updates (default: 100000)
   */
  constructor(
    options: CLIOptions,
    onProgress?: ProgressCallback,
    progressInterval: number = 100000
  ) {
    this.options = options;
    this.parser = new CSVParser(options.input);
    this.aggregator = new CampaignAggregator();
    this.onProgress = onProgress;
    this.progressInterval = progressInterval;
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsageMB(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100;
  }

  /**
   * Format a number to fixed decimal places
   */
  private formatNumber(num: number, decimals: number = 4): string {
    return num.toFixed(decimals);
  }

  /**
   * Convert campaign results to CSV string
   * @param results - Array of campaign results
   * @returns CSV formatted string
   */
  public resultsToCSV(results: CampaignResult[]): string {
    const headers = [
      'campaign_id',
      'total_impressions',
      'total_clicks',
      'total_spend',
      'total_conversions',
      'CTR',
      'CPA',
    ];

    const rows = results.map((r) => [
      r.campaignId,
      r.totalImpressions.toString(),
      r.totalClicks.toString(),
      this.formatNumber(r.totalSpend, 2),
      r.totalConversions.toString(),
      r.ctr !== null ? this.formatNumber(r.ctr, 4) : '',
      r.cpa !== null ? this.formatNumber(r.cpa, 2) : '',
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  /**
   * Write results to CSV file
   * @param filePath - Output file path
   * @param results - Campaign results to write
   */
  public writeResultsToFile(filePath: string, results: CampaignResult[]): void {
    const csv = this.resultsToCSV(results);
    fs.writeFileSync(filePath, csv, 'utf-8');
  }

  /**
   * Ensure output directory exists
   * @param dirPath - Directory path
   */
  private ensureOutputDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Main processing method
   * Reads CSV file using streaming, aggregates data, and generates output files
   * 
   * Uses Async Iterator pattern for memory efficiency:
   * - Single pass through the file
   * - O(1) memory per record
   * - Automatic backpressure handling
   * 
   * @returns Processing statistics
   */
  public async process(): Promise<ProcessingStats> {
    const startTime = Date.now();
    let peakMemory = 0;

    // Validate input file
    if (!this.parser.isReadable()) {
      throw new Error(`Input file not found or not readable: ${this.options.input}`);
    }

    // Get file size for progress tracking
    const fileSize = this.parser.getFileSize();

    // Ensure output directory exists
    this.ensureOutputDir(this.options.output);

    // Processing counters
    let totalRecords = 0;
    let validRecords = 0;
    let invalidRecords = 0;

    // Create CSV stream
    const csvStream = this.parser.createStream();

    // Process records using async iterator (memory efficient)
    for await (const row of csvStream) {
      totalRecords++;

      // Track memory usage periodically
      if (totalRecords % this.progressInterval === 0) {
        const currentMemory = this.getMemoryUsageMB();
        if (currentMemory > peakMemory) {
          peakMemory = currentMemory;
        }

        // Report progress
        if (this.onProgress) {
          const estimatedProgress = Math.min(totalRecords * 50, fileSize);
          this.onProgress(estimatedProgress, fileSize);
        }
      }

      try {
        // Parse and validate record
        const record = this.parser.parseRecord(row);

        // Aggregate into map - O(1) operation
        this.aggregator.aggregate(record);

        validRecords++;
      } catch (error) {
        invalidRecords++;
        if (this.options.verbose) {
          console.warn(`Warning: Skipping invalid row ${totalRecords}: ${(error as Error).message}`);
        }
      }
    }

    // Final memory check
    const finalMemory = this.getMemoryUsageMB();
    if (finalMemory > peakMemory) {
      peakMemory = finalMemory;
    }

    // Report 100% progress
    if (this.onProgress) {
      this.onProgress(fileSize, fileSize);
    }

    // Generate top 10 results - calculate CTR/CPA once, reuse for both
    const allResults = this.aggregator.getAllResults();
    const top10CTR = this.aggregator.getTopNCampaignsByCTR(10, allResults);
    const top10CPA = this.aggregator.getTopNCampaignsByCPA(10, allResults);

    // Write output files
    const ctrOutputPath = path.join(this.options.output, 'top10_ctr.csv');
    const cpaOutputPath = path.join(this.options.output, 'top10_cpa.csv');

    this.writeResultsToFile(ctrOutputPath, top10CTR);
    this.writeResultsToFile(cpaOutputPath, top10CPA);

    const processingTimeMs = Date.now() - startTime;

    // Return processing statistics
    return {
      totalRecords,
      validRecords,
      invalidRecords,
      uniqueCampaigns: this.aggregator.getUniqueCampaignCount(),
      processingTimeMs,
      peakMemoryMB: peakMemory,
    };
  }

  /**
   * Get the aggregator instance
   */
  public getAggregator(): CampaignAggregator {
    return this.aggregator;
  }

  /**
   * Get the parser instance
   */
  public getParser(): CSVParser {
    return this.parser;
  }
}

/**
 * StatsFormatter class
 * Formats processing statistics for display
 */
export class StatsFormatter {
  /**
   * Format processing stats for display
   * @param stats - Processing statistics
   * @returns Formatted string
   */
  public static format(stats: ProcessingStats): string {
    const lines = [
      '',
      '═══════════════════════════════════════════════════════',
      '                   PROCESSING COMPLETE                  ',
      '═══════════════════════════════════════════════════════',
      '',
      `  📊 Total Records:      ${stats.totalRecords.toLocaleString()}`,
      `  ✅ Valid Records:      ${stats.validRecords.toLocaleString()}`,
      `  ❌ Invalid Records:    ${stats.invalidRecords.toLocaleString()}`,
      `  🏷️  Unique Campaigns:   ${stats.uniqueCampaigns.toLocaleString()}`,
      '',
      `  ⏱️  Processing Time:    ${(stats.processingTimeMs / 1000).toFixed(2)}s`,
      `  💾 Peak Memory:        ${stats.peakMemoryMB.toFixed(2)} MB`,
      `  🚀 Throughput:         ${Math.round(stats.totalRecords / (stats.processingTimeMs / 1000)).toLocaleString()} records/sec`,
      '',
      '═══════════════════════════════════════════════════════',
    ];

    return lines.join('\n');
  }
}
