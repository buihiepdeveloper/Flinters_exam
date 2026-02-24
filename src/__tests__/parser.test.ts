import * as fs from 'fs';
import * as path from 'path';
import { CSVParser } from '../parser';

describe('CSVParser', () => {
  const testDataDir = path.join(__dirname, 'parser-test-data');
  const validCsvPath = path.join(testDataDir, 'valid.csv');
  const invalidCsvPath = path.join(testDataDir, 'invalid.csv');
  const emptyCsvPath = path.join(testDataDir, 'empty.csv');

  // Setup test data directory and files
  beforeAll(() => {
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Create valid CSV file
    const validCsvContent = `campaign_id,date,impressions,clicks,spend,conversions
CMP001,2025-01-01,12000,300,45.50,12
CMP002,2025-01-01,8000,120,28.00,4
CMP001,2025-01-02,14000,340,48.20,15`;
    fs.writeFileSync(validCsvPath, validCsvContent);

    // Create invalid CSV file (missing fields)
    const invalidCsvContent = `campaign_id,date,impressions,clicks,spend,conversions
,2025-01-01,12000,300,45.50,12
CMP002,2025-01-01,invalid,120,28.00,4`;
    fs.writeFileSync(invalidCsvPath, invalidCsvContent);

    // Create empty CSV file
    fs.writeFileSync(emptyCsvPath, '');
  });

  // Cleanup test data
  afterAll(() => {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
  });

  describe('parseRecord', () => {
    let parser: CSVParser;

    beforeEach(() => {
      parser = new CSVParser(validCsvPath);
    });

    it('should parse valid CSV row correctly', () => {
      const row = {
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: '12000',
        clicks: '300',
        spend: '45.50',
        conversions: '12',
      };

      const result = parser.parseRecord(row);

      expect(result).toEqual({
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: 12000,
        clicks: 300,
        spend: 45.5,
        conversions: 12,
      });
    });

    it('should trim campaign_id whitespace', () => {
      const row = {
        campaign_id: '  CMP001  ',
        date: '2025-01-01',
        impressions: '12000',
        clicks: '300',
        spend: '45.50',
        conversions: '12',
      };

      const result = parser.parseRecord(row);
      expect(result.campaign_id).toBe('CMP001');
    });

    it('should throw error for missing campaign_id', () => {
      const row = {
        campaign_id: '',
        date: '2025-01-01',
        impressions: '12000',
        clicks: '300',
        spend: '45.50',
        conversions: '12',
      };

      expect(() => parser.parseRecord(row)).toThrow('Missing campaign_id');
    });

    it('should throw error for undefined campaign_id', () => {
      const row = {
        date: '2025-01-01',
        impressions: '12000',
        clicks: '300',
        spend: '45.50',
        conversions: '12',
      } as Record<string, string>;

      expect(() => parser.parseRecord(row)).toThrow('Missing campaign_id');
    });

    it('should throw error for invalid impressions', () => {
      const row = {
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: 'invalid',
        clicks: '300',
        spend: '45.50',
        conversions: '12',
      };

      expect(() => parser.parseRecord(row)).toThrow('Invalid impressions');
    });

    it('should throw error for negative impressions', () => {
      const row = {
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: '-100',
        clicks: '300',
        spend: '45.50',
        conversions: '12',
      };

      expect(() => parser.parseRecord(row)).toThrow('Invalid impressions');
    });

    it('should throw error for invalid clicks', () => {
      const row = {
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: '12000',
        clicks: 'abc',
        spend: '45.50',
        conversions: '12',
      };

      expect(() => parser.parseRecord(row)).toThrow('Invalid clicks');
    });

    it('should throw error for negative clicks', () => {
      const row = {
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: '12000',
        clicks: '-50',
        spend: '45.50',
        conversions: '12',
      };

      expect(() => parser.parseRecord(row)).toThrow('Invalid clicks');
    });

    it('should throw error for invalid spend', () => {
      const row = {
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: '12000',
        clicks: '300',
        spend: 'not-a-number',
        conversions: '12',
      };

      expect(() => parser.parseRecord(row)).toThrow('Invalid spend');
    });

    it('should throw error for negative spend', () => {
      const row = {
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: '12000',
        clicks: '300',
        spend: '-10.50',
        conversions: '12',
      };

      expect(() => parser.parseRecord(row)).toThrow('Invalid spend');
    });

    it('should throw error for invalid conversions', () => {
      const row = {
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: '12000',
        clicks: '300',
        spend: '45.50',
        conversions: 'xyz',
      };

      expect(() => parser.parseRecord(row)).toThrow('Invalid conversions');
    });

    it('should throw error for negative conversions', () => {
      const row = {
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: '12000',
        clicks: '300',
        spend: '45.50',
        conversions: '-5',
      };

      expect(() => parser.parseRecord(row)).toThrow('Invalid conversions');
    });

    it('should handle empty date gracefully', () => {
      const row = {
        campaign_id: 'CMP001',
        date: '',
        impressions: '12000',
        clicks: '300',
        spend: '45.50',
        conversions: '12',
      };

      const result = parser.parseRecord(row);
      expect(result.date).toBe('');
    });

    it('should parse zero values correctly', () => {
      const row = {
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: '0',
        clicks: '0',
        spend: '0',
        conversions: '0',
      };

      const result = parser.parseRecord(row);

      expect(result.impressions).toBe(0);
      expect(result.clicks).toBe(0);
      expect(result.spend).toBe(0);
      expect(result.conversions).toBe(0);
    });

    it('should parse decimal spend correctly', () => {
      const row = {
        campaign_id: 'CMP001',
        date: '2025-01-01',
        impressions: '12000',
        clicks: '300',
        spend: '123.456789',
        conversions: '12',
      };

      const result = parser.parseRecord(row);
      expect(result.spend).toBeCloseTo(123.456789, 6);
    });
  });

  describe('isReadable', () => {
    it('should return true for existing readable file', () => {
      const parser = new CSVParser(validCsvPath);
      expect(parser.isReadable()).toBe(true);
    });

    it('should return false for non-existing file', () => {
      const parser = new CSVParser('/non/existing/path.csv');
      expect(parser.isReadable()).toBe(false);
    });
  });

  describe('getFileSize', () => {
    it('should return correct file size', () => {
      const parser = new CSVParser(validCsvPath);
      const expectedSize = fs.statSync(validCsvPath).size;
      expect(parser.getFileSize()).toBe(expectedSize);
    });
  });

  describe('getFilePath', () => {
    it('should return the file path', () => {
      const parser = new CSVParser(validCsvPath);
      expect(parser.getFilePath()).toBe(validCsvPath);
    });
  });

  describe('createStream', () => {
    it('should create async iterable stream', async () => {
      const parser = new CSVParser(validCsvPath);
      const stream = parser.createStream();

      const rows: Record<string, string>[] = [];
      for await (const row of stream) {
        rows.push(row);
      }

      expect(rows).toHaveLength(3);
      expect(rows[0].campaign_id).toBe('CMP001');
      expect(rows[1].campaign_id).toBe('CMP002');
      expect(rows[2].campaign_id).toBe('CMP001');
    });

    it('should handle empty file', async () => {
      const parser = new CSVParser(emptyCsvPath);
      const stream = parser.createStream();

      const rows: Record<string, string>[] = [];
      for await (const row of stream) {
        rows.push(row);
      }

      expect(rows).toHaveLength(0);
    });
  });
});
