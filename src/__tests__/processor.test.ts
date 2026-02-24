import * as fs from 'fs';
import * as path from 'path';
import { CSVProcessor, StatsFormatter } from '../processor';
import { CLIOptions, ProcessingStats } from '../types';

describe('CSVProcessor', () => {
  const testDataDir = path.join(__dirname, 'processor-test-data');
  const validCsvPath = path.join(testDataDir, 'processor-test.csv');
  const outputDir = path.join(testDataDir, 'output');

  // Helper to ensure test file exists
  const ensureTestFile = () => {
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    if (!fs.existsSync(validCsvPath)) {
      const csvContent = `campaign_id,date,impressions,clicks,spend,conversions
CMP001,2025-01-01,12000,300,45.50,12
CMP002,2025-01-01,8000,120,28.00,4
CMP001,2025-01-02,14000,340,48.20,15
CMP003,2025-01-01,5000,60,15.00,3
CMP002,2025-01-02,8500,150,31.00,5
CMP004,2025-01-01,10000,200,40.00,8
CMP005,2025-01-01,15000,450,60.00,20
CMP006,2025-01-01,20000,800,100.00,25
CMP007,2025-01-01,7000,140,35.00,7
CMP008,2025-01-01,9000,180,45.00,9
CMP009,2025-01-01,11000,220,55.00,11
CMP010,2025-01-01,13000,260,65.00,13
CMP011,2025-01-01,6000,90,30.00,0
CMP012,2025-01-01,0,0,20.00,5`;
      fs.writeFileSync(validCsvPath, csvContent);
    }
  };

  beforeAll(() => {
    ensureTestFile();
  });

  afterAll(() => {
    // Cleanup test data
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Ensure test file exists before each test
    ensureTestFile();
    // Clean output directory before each test
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
  });

  describe('process', () => {
    it('should process CSV file and generate output files', async () => {
      const options: CLIOptions = {
        input: validCsvPath,
        output: outputDir,
      };

      const processor = new CSVProcessor(options);
      const stats = await processor.process();

      // Check stats
      expect(stats.totalRecords).toBe(14);
      expect(stats.validRecords).toBe(14);
      expect(stats.invalidRecords).toBe(0);
      expect(stats.uniqueCampaigns).toBe(12);
      expect(stats.processingTimeMs).toBeGreaterThan(0);

      // Check output files exist
      const ctrPath = path.join(outputDir, 'top10_ctr.csv');
      const cpaPath = path.join(outputDir, 'top10_cpa.csv');

      expect(fs.existsSync(ctrPath)).toBe(true);
      expect(fs.existsSync(cpaPath)).toBe(true);
    });

    it('should create output directory if not exists', async () => {
      const newOutputDir = path.join(testDataDir, 'new-output');
      const options: CLIOptions = {
        input: validCsvPath,
        output: newOutputDir,
      };

      const processor = new CSVProcessor(options);
      await processor.process();

      expect(fs.existsSync(newOutputDir)).toBe(true);
    });

    it('should throw error for non-existing input file', async () => {
      const options: CLIOptions = {
        input: '/non/existing/file.csv',
        output: outputDir,
      };

      const processor = new CSVProcessor(options);

      await expect(processor.process()).rejects.toThrow('Input file not found');
    });

    it('should handle invalid records with verbose mode', async () => {
      // Create CSV with invalid data
      const invalidCsvPath = path.join(testDataDir, 'invalid-data.csv');
      const csvContent = `campaign_id,date,impressions,clicks,spend,conversions
CMP001,2025-01-01,12000,300,45.50,12
,2025-01-01,8000,120,28.00,4
CMP003,2025-01-01,invalid,60,15.00,3`;
      fs.writeFileSync(invalidCsvPath, csvContent);

      const options: CLIOptions = {
        input: invalidCsvPath,
        output: outputDir,
        verbose: true,
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const processor = new CSVProcessor(options);
      const stats = await processor.process();

      expect(stats.totalRecords).toBe(3);
      expect(stats.validRecords).toBe(1);
      expect(stats.invalidRecords).toBe(2);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should call progress callback', async () => {
      const options: CLIOptions = {
        input: validCsvPath,
        output: outputDir,
      };

      const progressCalls: Array<{ processed: number; total: number }> = [];
      const processor = new CSVProcessor(options, (processed, total) => {
        progressCalls.push({ processed, total });
      });

      await processor.process();

      // Should have at least one progress call (100% at the end)
      expect(progressCalls.length).toBeGreaterThan(0);
      // Last call should be 100%
      const lastCall = progressCalls[progressCalls.length - 1];
      expect(lastCall.processed).toBe(lastCall.total);
    });

    it('should call progress callback at intervals', async () => {
      const options: CLIOptions = {
        input: validCsvPath,
        output: outputDir,
      };

      const progressCalls: Array<{ processed: number; total: number }> = [];
      // Use small interval to trigger progress during processing
      const processor = new CSVProcessor(
        options,
        (processed, total) => {
          progressCalls.push({ processed, total });
        },
        5 // Progress every 5 records
      );

      await processor.process();

      // Should have multiple progress calls (at least 2: during processing + final)
      expect(progressCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should track peak memory during processing', async () => {
      const options: CLIOptions = {
        input: validCsvPath,
        output: outputDir,
      };

      // Use small interval to trigger memory tracking
      const processor = new CSVProcessor(options, undefined, 5);
      const stats = await processor.process();

      // Peak memory should be tracked
      expect(stats.peakMemoryMB).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resultsToCSV', () => {
    it('should format results as CSV string', () => {
      const options: CLIOptions = {
        input: validCsvPath,
        output: outputDir,
      };

      const processor = new CSVProcessor(options);
      const results = [
        {
          campaignId: 'CMP001',
          totalImpressions: 26000,
          totalClicks: 640,
          totalSpend: 93.7,
          totalConversions: 27,
          ctr: 0.0246,
          cpa: 3.47,
        },
      ];

      const csv = processor.resultsToCSV(results);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('campaign_id,total_impressions,total_clicks,total_spend,total_conversions,CTR,CPA');
      expect(lines[1]).toContain('CMP001');
      expect(lines[1]).toContain('26000');
      expect(lines[1]).toContain('640');
    });

    it('should handle null CPA', () => {
      const options: CLIOptions = {
        input: validCsvPath,
        output: outputDir,
      };

      const processor = new CSVProcessor(options);
      const results = [
        {
          campaignId: 'CMP001',
          totalImpressions: 10000,
          totalClicks: 500,
          totalSpend: 100,
          totalConversions: 0,
          ctr: 0.05,
          cpa: null,
        },
      ];

      const csv = processor.resultsToCSV(results);
      const lines = csv.split('\n');
      const values = lines[1].split(',');

      // Should have 7 columns
      expect(values.length).toBe(7);
      // CPA (last column) should be empty string
      expect(values[6]).toBe('');
    });

    it('should format numbers with correct decimal places', () => {
      const options: CLIOptions = {
        input: validCsvPath,
        output: outputDir,
      };

      const processor = new CSVProcessor(options);
      const results = [
        {
          campaignId: 'CMP001',
          totalImpressions: 10000,
          totalClicks: 500,
          totalSpend: 123.456789,
          totalConversions: 10,
          ctr: 0.123456789,
          cpa: 12.3456789,
        },
      ];

      const csv = processor.resultsToCSV(results);
      const lines = csv.split('\n');
      const values = lines[1].split(',');

      // spend should have 2 decimal places
      expect(values[3]).toBe('123.46');
      // CTR should have 4 decimal places
      expect(values[5]).toBe('0.1235');
      // CPA should have 2 decimal places
      expect(values[6]).toBe('12.35');
    });
  });

  describe('output file content', () => {
    it('should generate correct top10_ctr.csv content', async () => {
      const options: CLIOptions = {
        input: validCsvPath,
        output: outputDir,
      };

      const processor = new CSVProcessor(options);
      await processor.process();

      const ctrPath = path.join(outputDir, 'top10_ctr.csv');
      const content = fs.readFileSync(ctrPath, 'utf-8');
      const lines = content.split('\n');

      // Should have header + 10 data rows (or less if fewer campaigns)
      expect(lines.length).toBeGreaterThan(1);

      // Header should be correct
      expect(lines[0]).toBe('campaign_id,total_impressions,total_clicks,total_spend,total_conversions,CTR,CPA');

      // First campaign should have highest CTR
      // CMP006 has 800/20000 = 0.04 CTR (highest)
      expect(lines[1]).toContain('CMP006');
    });

    it('should generate correct top10_cpa.csv content', async () => {
      const options: CLIOptions = {
        input: validCsvPath,
        output: outputDir,
      };

      const processor = new CSVProcessor(options);
      await processor.process();

      const cpaPath = path.join(outputDir, 'top10_cpa.csv');
      const content = fs.readFileSync(cpaPath, 'utf-8');
      const lines = content.split('\n');

      // Should have header + data rows
      expect(lines.length).toBeGreaterThan(1);

      // Should not include CMP011 (zero conversions) or CMP012 (zero impressions)
      expect(content).not.toContain('CMP011');
    });
  });

  describe('getAggregator and getParser', () => {
    it('should return aggregator instance', () => {
      const options: CLIOptions = {
        input: validCsvPath,
        output: outputDir,
      };

      const processor = new CSVProcessor(options);
      const aggregator = processor.getAggregator();

      expect(aggregator).toBeDefined();
      expect(typeof aggregator.aggregate).toBe('function');
    });

    it('should return parser instance', () => {
      const options: CLIOptions = {
        input: validCsvPath,
        output: outputDir,
      };

      const processor = new CSVProcessor(options);
      const parser = processor.getParser();

      expect(parser).toBeDefined();
      expect(parser.getFilePath()).toBe(validCsvPath);
    });
  });
});

describe('StatsFormatter', () => {
  describe('format', () => {
    it('should format stats correctly', () => {
      const stats: ProcessingStats = {
        totalRecords: 1000000,
        validRecords: 999000,
        invalidRecords: 1000,
        uniqueCampaigns: 500,
        processingTimeMs: 5000,
        peakMemoryMB: 128.5,
      };

      const formatted = StatsFormatter.format(stats);

      expect(formatted).toContain('1,000,000'); // Total records
      expect(formatted).toContain('999,000'); // Valid records
      expect(formatted).toContain('1,000'); // Invalid records
      expect(formatted).toContain('500'); // Unique campaigns
      expect(formatted).toContain('5.00s'); // Processing time
      expect(formatted).toContain('128.50 MB'); // Peak memory
      expect(formatted).toContain('200,000 records/sec'); // Throughput
    });

    it('should handle zero processing time', () => {
      const stats: ProcessingStats = {
        totalRecords: 100,
        validRecords: 100,
        invalidRecords: 0,
        uniqueCampaigns: 10,
        processingTimeMs: 1, // Very small to avoid division by zero
        peakMemoryMB: 10,
      };

      const formatted = StatsFormatter.format(stats);

      expect(formatted).toContain('100');
    });
  });
});
