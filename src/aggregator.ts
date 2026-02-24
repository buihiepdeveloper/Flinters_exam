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
   * Convert campaign metrics to result with calculated CTR and CPA
   * 
   * @param campaignId - Campaign ID
   * @param metrics - Aggregated metrics
   * @returns Campaign result with all metrics
   */
  private metricsToResult(campaignId: string, metrics: CampaignMetrics): CampaignResult {
    return {
      campaignId,
      totalImpressions: metrics.totalImpressions,
      totalClicks: metrics.totalClicks,
      totalSpend: metrics.totalSpend,
      totalConversions: metrics.totalConversions,
      ctr: this.calculateCTR(metrics) ?? 0,
      cpa: this.calculateCPA(metrics),
    };
  }

  /**
   * Get top N campaigns by CTR (highest first)
   * Only includes campaigns with valid CTR (impressions > 0)
   * 
   * @param n - Number of top campaigns to return (default: 10)
   * @returns Array of top N campaigns sorted by CTR descending
   */
  public getTopNCampaignsByCTR(n: number = 10): CampaignResult[] {
    const results: CampaignResult[] = [];

    for (const [campaignId, metrics] of this.campaignMap) {
      const ctr = this.calculateCTR(metrics);
      if (ctr === null) continue;

      results.push(this.metricsToResult(campaignId, metrics));
    }

    return results
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, n);
  }

  /**
   * Get top N campaigns by CPA (lowest first)
   * Only includes campaigns with valid CPA (conversions > 0)
   * 
   * @param n - Number of top campaigns to return (default: 10)
   * @returns Array of top N campaigns sorted by CPA ascending
   */
  public getTopNCampaignsByCPA(n: number = 10): CampaignResult[] {
    const results: CampaignResult[] = [];

    for (const [campaignId, metrics] of this.campaignMap) {
      const cpa = this.calculateCPA(metrics);
      if (cpa === null) continue;

      results.push(this.metricsToResult(campaignId, metrics));
    }

    // Sort by CPA ascending (lowest first)
    // Note: cpa is guaranteed to be non-null here due to filter above
    return results
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
