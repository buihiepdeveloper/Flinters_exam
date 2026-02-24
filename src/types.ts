/**
 * Types and interfaces for Ad Performance Aggregator
 */

/**
 * Raw CSV record structure
 * Represents a single row from the input CSV file
 */
export interface CSVRecord {
  campaign_id: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

/**
 * Aggregated metrics for a single campaign
 * Used during the aggregation phase
 */
export interface CampaignMetrics {
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
  totalConversions: number;
}

/**
 * Final campaign result with calculated metrics
 * Used for output generation
 */
export interface CampaignResult {
  campaignId: string;
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
  totalConversions: number;
  ctr: number;
  cpa: number | null;
}

/**
 * Processing statistics
 * Tracks performance metrics during processing
 */
export interface ProcessingStats {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  uniqueCampaigns: number;
  processingTimeMs: number;
  peakMemoryMB: number;
}

/**
 * CLI options passed from command line
 */
export interface CLIOptions {
  input: string;
  output: string;
  verbose?: boolean;
}

/**
 * Progress callback function type
 * Called periodically during processing to report progress
 */
export type ProgressCallback = (processed: number, total: number) => void;
