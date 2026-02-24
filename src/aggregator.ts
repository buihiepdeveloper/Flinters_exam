/**
 * Aggregator Module
 * Handles data aggregation and metric calculations
 */
import { CSVRecord, CampaignMetrics, CampaignResult } from './types';

/**
 * CampaignAggregator class
 * Aggregates campaign data and calculates metrics
 */
export class CampaignAggregator {
  private campaignMap: Map<string, CampaignMetrics>;

  constructor() {
    this.campaignMap = new Map<string, CampaignMetrics>();
  }

  /**
   * Aggregate a single record into the campaign map
   * Uses incremental update for O(1) per record
   * 
   * @param record - Parsed CSV record
   */
  public aggregate(record: CSVRecord): void {
    const existing = this.campaignMap.get(record.campaign_id);

    if (existing) {
      // Update existing campaign metrics - O(1)
      existing.totalImpressions += record.impressions;
      existing.totalClicks += record.clicks;
      existing.totalSpend += record.spend;
      existing.totalConversions += record.conversions;
    } else {
      // Create new campaign entry - O(1)
      this.campaignMap.set(record.campaign_id, {
        totalImpressions: record.impressions,
        totalClicks: record.clicks,
        totalSpend: record.spend,
        totalConversions: record.conversions,
      });
    }
  }

  /**
   * Calculate Click-Through Rate (CTR)
   * CTR = total_clicks / total_impressions
   * 
   * @param metrics - Campaign metrics
   * @returns CTR value or null if impressions is 0
   */
  public calculateCTR(metrics: CampaignMetrics): number | null {
    if (metrics.totalImpressions === 0) {
      return null;
    }
    return metrics.totalClicks / metrics.totalImpressions;
  }

  /**
   * Calculate Cost Per Acquisition (CPA)
   * CPA = total_spend / total_conversions
   * 
   * @param metrics - Campaign metrics
   * @returns CPA value or null if conversions is 0
   */
  public calculateCPA(metrics: CampaignMetrics): number | null {
    if (metrics.totalConversions === 0) {
      return null;
    }
    return metrics.totalSpend / metrics.totalConversions;
  }

  /**
   * Convert campaign metrics to result with pre-calculated CTR and CPA
   * 
   * @param campaignId - Campaign ID
   * @param metrics - Aggregated metrics
   * @param ctr - Pre-calculated CTR
   * @param cpa - Pre-calculated CPA
   * @returns Campaign result with all metrics
   */
  private metricsToResult(
    campaignId: string,
    metrics: CampaignMetrics,
    ctr: number | null,
    cpa: number | null
  ): CampaignResult {
    return {
      campaignId,
      totalImpressions: metrics.totalImpressions,
      totalClicks: metrics.totalClicks,
      totalSpend: metrics.totalSpend,
      totalConversions: metrics.totalConversions,
      ctr,
      cpa,
    };
  }

  /**
   * Get all campaign results with pre-calculated CTR and CPA
   * Single pass through campaignMap - calculates CTR/CPA once per campaign
   * 
   * @returns Array of all campaign results
   */
  public getAllResults(): CampaignResult[] {
    return Array.from(this.campaignMap.entries()).map(([campaignId, metrics]) => {
      const ctr = this.calculateCTR(metrics);
      const cpa = this.calculateCPA(metrics);
      return this.metricsToResult(campaignId, metrics, ctr, cpa);
    });
  }

  /**
   * Get top N campaigns by CTR (highest first)
   * Only includes campaigns with valid CTR (impressions > 0)
   * 
   * @param allResults - Pre-calculated results (optional, will compute if not provided)
   * @param n - Number of top campaigns to return (default: 10)
   * @returns Array of top N campaigns sorted by CTR descending
   */
  public getTopNCampaignsByCTR(n: number = 10, allResults?: CampaignResult[]): CampaignResult[] {
    const results = allResults ?? this.getAllResults();
    
    return results
      .filter(r => r.ctr !== null) // Only valid CTR (impressions > 0)
      .sort((a, b) => (b.ctr as number) - (a.ctr as number)) // Descending: highest CTR first
      .slice(0, n);
  }

  /**
   * Get top N campaigns by CPA (lowest first)
   * Only includes campaigns with valid CPA (conversions > 0)
   * 
   * @param allResults - Pre-calculated results (optional, will compute if not provided)
   * @param n - Number of top campaigns to return (default: 10)
   * @returns Array of top N campaigns sorted by CPA ascending
   */
  public getTopNCampaignsByCPA(n: number = 10, allResults?: CampaignResult[]): CampaignResult[] {
    const results = allResults ?? this.getAllResults();
    
    return results
      .filter(r => r.cpa !== null) // Only valid CPA (conversions > 0)
      .sort((a, b) => (a.cpa as number) - (b.cpa as number))
      .slice(0, n);
  }

  /**
   * Get the number of unique campaigns
   */
  public getUniqueCampaignCount(): number {
    return this.campaignMap.size;
  }

  /**
   * Get all campaign metrics
   */
  public getAllMetrics(): Map<string, CampaignMetrics> {
    return this.campaignMap;
  }

  /**
   * Clear all aggregated data
   */
  public clear(): void {
    this.campaignMap.clear();
  }
}
