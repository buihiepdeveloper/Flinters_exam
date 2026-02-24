import { CampaignAggregator } from '../aggregator';
import { CSVRecord, CampaignMetrics } from '../types';

describe('CampaignAggregator', () => {
  let aggregator: CampaignAggregator;

  beforeEach(() => {
    aggregator = new CampaignAggregator();
  });

  describe('aggregate', () => {
    it('should aggregate single record correctly', () => {
      const record: CSVRecord = {
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: 12000,
        clicks: 300,
        spend: 45.5,
        conversions: 12,
      };

      aggregator.aggregate(record);

      const metrics = aggregator.getAllMetrics().get('CMP001');
      expect(metrics).toEqual({
        totalImpressions: 12000,
        totalClicks: 300,
        totalSpend: 45.5,
        totalConversions: 12,
      });
    });

    it('should aggregate multiple records for same campaign', () => {
      const record1: CSVRecord = {
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: 12000,
        clicks: 300,
        spend: 45.5,
        conversions: 12,
      };

      const record2: CSVRecord = {
        campaign_id: 'CMP001',
        date: '2025-01-02',
        impressions: 14000,
        clicks: 340,
        spend: 48.2,
        conversions: 15,
      };

      aggregator.aggregate(record1);
      aggregator.aggregate(record2);

      const metrics = aggregator.getAllMetrics().get('CMP001');
      expect(metrics).toEqual({
        totalImpressions: 26000,
        totalClicks: 640,
        totalSpend: 93.7,
        totalConversions: 27,
      });
    });

    it('should aggregate multiple different campaigns', () => {
      const record1: CSVRecord = {
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: 12000,
        clicks: 300,
        spend: 45.5,
        conversions: 12,
      };

      const record2: CSVRecord = {
        campaign_id: 'CMP002',
        date: '2025-01-01',
        impressions: 8000,
        clicks: 120,
        spend: 28.0,
        conversions: 4,
      };

      aggregator.aggregate(record1);
      aggregator.aggregate(record2);

      expect(aggregator.getUniqueCampaignCount()).toBe(2);

      const metrics1 = aggregator.getAllMetrics().get('CMP001');
      const metrics2 = aggregator.getAllMetrics().get('CMP002');

      expect(metrics1?.totalImpressions).toBe(12000);
      expect(metrics2?.totalImpressions).toBe(8000);
    });

    it('should handle zero values correctly', () => {
      const record: CSVRecord = {
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
      };

      aggregator.aggregate(record);

      const metrics = aggregator.getAllMetrics().get('CMP001');
      expect(metrics).toEqual({
        totalImpressions: 0,
        totalClicks: 0,
        totalSpend: 0,
        totalConversions: 0,
      });
    });
  });

  describe('calculateCTR', () => {
    it('should calculate CTR correctly', () => {
      const metrics: CampaignMetrics = {
        totalImpressions: 10000,
        totalClicks: 500,
        totalSpend: 100,
        totalConversions: 10,
      };

      const ctr = aggregator.calculateCTR(metrics);
      expect(ctr).toBe(0.05); // 500/10000 = 0.05
    });

    it('should return null when impressions is 0', () => {
      const metrics: CampaignMetrics = {
        totalImpressions: 0,
        totalClicks: 0,
        totalSpend: 100,
        totalConversions: 10,
      };

      const ctr = aggregator.calculateCTR(metrics);
      expect(ctr).toBeNull();
    });

    it('should handle high CTR correctly', () => {
      const metrics: CampaignMetrics = {
        totalImpressions: 100,
        totalClicks: 100,
        totalSpend: 100,
        totalConversions: 10,
      };

      const ctr = aggregator.calculateCTR(metrics);
      expect(ctr).toBe(1.0); // 100% CTR
    });

    it('should handle very small CTR correctly', () => {
      const metrics: CampaignMetrics = {
        totalImpressions: 1000000,
        totalClicks: 1,
        totalSpend: 100,
        totalConversions: 10,
      };

      const ctr = aggregator.calculateCTR(metrics);
      expect(ctr).toBe(0.000001);
    });
  });

  describe('calculateCPA', () => {
    it('should calculate CPA correctly', () => {
      const metrics: CampaignMetrics = {
        totalImpressions: 10000,
        totalClicks: 500,
        totalSpend: 100,
        totalConversions: 10,
      };

      const cpa = aggregator.calculateCPA(metrics);
      expect(cpa).toBe(10); // 100/10 = 10
    });

    it('should return null when conversions is 0', () => {
      const metrics: CampaignMetrics = {
        totalImpressions: 10000,
        totalClicks: 500,
        totalSpend: 100,
        totalConversions: 0,
      };

      const cpa = aggregator.calculateCPA(metrics);
      expect(cpa).toBeNull();
    });

    it('should handle decimal CPA correctly', () => {
      const metrics: CampaignMetrics = {
        totalImpressions: 10000,
        totalClicks: 500,
        totalSpend: 33.33,
        totalConversions: 3,
      };

      const cpa = aggregator.calculateCPA(metrics);
      expect(cpa).toBeCloseTo(11.11, 2);
    });

    it('should handle very low CPA correctly', () => {
      const metrics: CampaignMetrics = {
        totalImpressions: 10000,
        totalClicks: 500,
        totalSpend: 1,
        totalConversions: 1000,
      };

      const cpa = aggregator.calculateCPA(metrics);
      expect(cpa).toBe(0.001);
    });
  });

  describe('getTopNCampaignsByCTR', () => {
    beforeEach(() => {
      // Add 15 campaigns with different CTRs
      for (let i = 1; i <= 15; i++) {
        aggregator.aggregate({
          campaign_id: `CMP${i.toString().padStart(3, '0')}`,
          date: '2025-01-01',
          impressions: 10000,
          clicks: i * 100, // CTR varies from 1% to 15%
          spend: 100,
          conversions: 10,
        });
      }
    });

    it('should return top 10 campaigns by CTR', () => {
      const top10 = aggregator.getTopNCampaignsByCTR(10);

      expect(top10).toHaveLength(10);
      // Highest CTR should be first (CMP015 with 15% CTR)
      expect(top10[0].campaignId).toBe('CMP015');
      expect(top10[0].ctr).toBe(0.15);
      // 10th should be CMP006 with 6% CTR
      expect(top10[9].campaignId).toBe('CMP006');
      expect(top10[9].ctr).toBe(0.06);
    });

    it('should return all campaigns when less than N', () => {
      const newAggregator = new CampaignAggregator();
      newAggregator.aggregate({
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: 10000,
        clicks: 500,
        spend: 100,
        conversions: 10,
      });
      newAggregator.aggregate({
        campaign_id: 'CMP002',
        date: '2025-01-01',
        impressions: 10000,
        clicks: 300,
        spend: 100,
        conversions: 10,
      });

      const top10 = newAggregator.getTopNCampaignsByCTR(10);

      expect(top10).toHaveLength(2);
      expect(top10[0].campaignId).toBe('CMP001'); // Higher CTR
      expect(top10[1].campaignId).toBe('CMP002');
    });

    it('should exclude campaigns with zero impressions', () => {
      const newAggregator = new CampaignAggregator();
      newAggregator.aggregate({
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: 10000,
        clicks: 500,
        spend: 100,
        conversions: 10,
      });
      newAggregator.aggregate({
        campaign_id: 'CMP002',
        date: '2025-01-01',
        impressions: 0, // Zero impressions
        clicks: 0,
        spend: 100,
        conversions: 10,
      });

      const top10 = newAggregator.getTopNCampaignsByCTR(10);

      expect(top10).toHaveLength(1);
      expect(top10[0].campaignId).toBe('CMP001');
    });

    it('should handle campaigns with same CTR', () => {
      const newAggregator = new CampaignAggregator();
      newAggregator.aggregate({
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: 10000,
        clicks: 500,
        spend: 100,
        conversions: 10,
      });
      newAggregator.aggregate({
        campaign_id: 'CMP002',
        date: '2025-01-01',
        impressions: 20000,
        clicks: 1000, // Same CTR (5%)
        spend: 100,
        conversions: 10,
      });

      const top10 = newAggregator.getTopNCampaignsByCTR(10);

      expect(top10).toHaveLength(2);
      expect(top10[0].ctr).toBe(top10[1].ctr);
    });

    it('should use default N=10 when not specified', () => {
      const top = aggregator.getTopNCampaignsByCTR();
      expect(top).toHaveLength(10);
    });

    it('should return custom N campaigns', () => {
      const top5 = aggregator.getTopNCampaignsByCTR(5);
      expect(top5).toHaveLength(5);
    });
  });

  describe('getTopNCampaignsByCPA', () => {
    beforeEach(() => {
      // Add 15 campaigns with different CPAs
      for (let i = 1; i <= 15; i++) {
        aggregator.aggregate({
          campaign_id: `CMP${i.toString().padStart(3, '0')}`,
          date: '2025-01-01',
          impressions: 10000,
          clicks: 500,
          spend: i * 10, // Spend varies
          conversions: 10, // Same conversions, so CPA varies
        });
      }
    });

    it('should return top 10 campaigns by lowest CPA', () => {
      const top10 = aggregator.getTopNCampaignsByCPA(10);

      expect(top10).toHaveLength(10);
      // Lowest CPA should be first (CMP001 with CPA = 1)
      expect(top10[0].campaignId).toBe('CMP001');
      expect(top10[0].cpa).toBe(1);
      // 10th should be CMP010 with CPA = 10
      expect(top10[9].campaignId).toBe('CMP010');
      expect(top10[9].cpa).toBe(10);
    });

    it('should exclude campaigns with zero conversions', () => {
      const newAggregator = new CampaignAggregator();
      newAggregator.aggregate({
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: 10000,
        clicks: 500,
        spend: 100,
        conversions: 10,
      });
      newAggregator.aggregate({
        campaign_id: 'CMP002',
        date: '2025-01-01',
        impressions: 10000,
        clicks: 500,
        spend: 50,
        conversions: 0, // Zero conversions
      });

      const top10 = newAggregator.getTopNCampaignsByCPA(10);

      expect(top10).toHaveLength(1);
      expect(top10[0].campaignId).toBe('CMP001');
    });

    it('should return all valid campaigns when less than N', () => {
      const newAggregator = new CampaignAggregator();
      newAggregator.aggregate({
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: 10000,
        clicks: 500,
        spend: 100,
        conversions: 10,
      });
      newAggregator.aggregate({
        campaign_id: 'CMP002',
        date: '2025-01-01',
        impressions: 10000,
        clicks: 500,
        spend: 50,
        conversions: 10,
      });

      const top10 = newAggregator.getTopNCampaignsByCPA(10);

      expect(top10).toHaveLength(2);
      expect(top10[0].campaignId).toBe('CMP002'); // Lower CPA
      expect(top10[1].campaignId).toBe('CMP001');
    });

    it('should use default N=10 when not specified', () => {
      const top = aggregator.getTopNCampaignsByCPA();
      expect(top).toHaveLength(10);
    });

    it('should handle sorting with null CPA values correctly', () => {
      const newAggregator = new CampaignAggregator();
      // Add campaigns with valid conversions
      newAggregator.aggregate({
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: 10000,
        clicks: 500,
        spend: 100,
        conversions: 10, // CPA = 10
      });
      newAggregator.aggregate({
        campaign_id: 'CMP002',
        date: '2025-01-01',
        impressions: 10000,
        clicks: 500,
        spend: 50,
        conversions: 10, // CPA = 5
      });

      const top = newAggregator.getTopNCampaignsByCPA(10);

      // CMP002 should be first (lower CPA)
      expect(top[0].campaignId).toBe('CMP002');
      expect(top[0].cpa).toBe(5);
      expect(top[1].campaignId).toBe('CMP001');
      expect(top[1].cpa).toBe(10);
    });
  });

  describe('getUniqueCampaignCount', () => {
    it('should return 0 for empty aggregator', () => {
      expect(aggregator.getUniqueCampaignCount()).toBe(0);
    });

    it('should return correct count after aggregation', () => {
      aggregator.aggregate({
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: 10000,
        clicks: 500,
        spend: 100,
        conversions: 10,
      });
      aggregator.aggregate({
        campaign_id: 'CMP002',
        date: '2025-01-01',
        impressions: 10000,
        clicks: 500,
        spend: 100,
        conversions: 10,
      });
      aggregator.aggregate({
        campaign_id: 'CMP001', // Same campaign
        date: '2025-01-02',
        impressions: 5000,
        clicks: 250,
        spend: 50,
        conversions: 5,
      });

      expect(aggregator.getUniqueCampaignCount()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all aggregated data', () => {
      aggregator.aggregate({
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: 10000,
        clicks: 500,
        spend: 100,
        conversions: 10,
      });

      expect(aggregator.getUniqueCampaignCount()).toBe(1);

      aggregator.clear();

      expect(aggregator.getUniqueCampaignCount()).toBe(0);
      expect(aggregator.getAllMetrics().size).toBe(0);
    });
  });

  describe('getAllMetrics', () => {
    it('should return empty map for new aggregator', () => {
      const metrics = aggregator.getAllMetrics();
      expect(metrics.size).toBe(0);
    });

    it('should return map with all campaigns', () => {
      aggregator.aggregate({
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: 10000,
        clicks: 500,
        spend: 100,
        conversions: 10,
      });
      aggregator.aggregate({
        campaign_id: 'CMP002',
        date: '2025-01-01',
        impressions: 8000,
        clicks: 400,
        spend: 80,
        conversions: 8,
      });

      const metrics = aggregator.getAllMetrics();

      expect(metrics.size).toBe(2);
      expect(metrics.has('CMP001')).toBe(true);
      expect(metrics.has('CMP002')).toBe(true);
    });
  });
});
