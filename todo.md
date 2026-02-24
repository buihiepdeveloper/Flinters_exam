# TODO - Ad Performance Aggregator

## 📋 Tổng quan dự án

Xây dựng CLI application xử lý file CSV lớn (~1GB) chứa dữ liệu quảng cáo và tạo báo cáo tổng hợp.

**Ngôn ngữ**: TypeScript/Node.js  
**Runtime**: Node.js >= 18  
**Architecture**: Class-based OOP

---

## 🔧 1. Logic xử lý file tối ưu Memory & Performance

### 1.1. Thư viện sử dụng

| Thư viện | Mục đích | Lý do chọn |
|----------|----------|------------|
| `csv-parse` | Parse CSV streaming | Hỗ trợ stream, memory efficient, mature library |
| `commander` | CLI arguments | Dễ sử dụng, type-safe, auto-generate help |
| `cli-progress` | Progress bar | Hiển thị tiến độ xử lý |
| `chalk` | Console colors | Output đẹp hơn |
| `jest` | Unit testing | Popular, good TypeScript support |

### 1.2. Class Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI                                  │
│  - Handles command line arguments                           │
│  - Progress bar display                                     │
│  - Error handling & output                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     CSVProcessor                             │
│  - Orchestrates the processing pipeline                     │
│  - Manages CSVParser and CampaignAggregator                │
│  - Writes output files                                      │
└─────────────────────────────────────────────────────────────┘
                    │                   │
                    ▼                   ▼
┌───────────────────────┐   ┌───────────────────────────────┐
│      CSVParser        │   │     CampaignAggregator        │
│  - Stream file reading│   │  - Aggregate metrics          │
│  - Parse & validate   │   │  - Calculate CTR/CPA          │
│  - Memory efficient   │   │  - Get top N campaigns        │
└───────────────────────┘   └───────────────────────────────┘
```

### 1.3. Classes Overview

#### `CSVParser` (src/parser.ts)
```typescript
class CSVParser {
  constructor(filePath: string, highWaterMark?: number)
  
  // Parse single row to typed record
  parseRecord(row: Record<string, string>): CSVRecord
  
  // Create async iterable stream
  createStream(): AsyncIterable<Record<string, string>>
  
  // File utilities
  getFileSize(): number
  isReadable(): boolean
  getFilePath(): string
}
```

#### `CampaignAggregator` (src/aggregator.ts)
```typescript
class CampaignAggregator {
  constructor()
  
  // Aggregate single record - O(1)
  aggregate(record: CSVRecord): void
  
  // Calculate metrics
  calculateCTR(metrics: CampaignMetrics): number | null
  calculateCPA(metrics: CampaignMetrics): number | null
  
  // Get rankings
  getTopNCampaignsByCTR(n?: number): CampaignResult[]
  getTopNCampaignsByCPA(n?: number): CampaignResult[]
  
  // Utilities
  getUniqueCampaignCount(): number
  getAllMetrics(): Map<string, CampaignMetrics>
  clear(): void
}
```

#### `CSVProcessor` (src/processor.ts)
```typescript
class CSVProcessor {
  constructor(options: CLIOptions, onProgress?: ProgressCallback, progressInterval?: number)
  
  // Main processing method
  process(): Promise<ProcessingStats>
  
  // Output utilities
  resultsToCSV(results: CampaignResult[]): string
  writeResultsToFile(filePath: string, results: CampaignResult[]): void
  
  // Getters
  getAggregator(): CampaignAggregator
  getParser(): CSVParser
}
```

#### `StatsFormatter` (src/processor.ts)
```typescript
class StatsFormatter {
  static format(stats: ProcessingStats): string
}
```

#### `CLI` (src/cli.ts)
```typescript
class CLI {
  constructor()
  run(): Promise<void>
}
```

### 1.4. Pattern xử lý: Async Iterator + Single Pass

**Lý do KHÔNG dùng Promise.all:**
- File 1GB có ~10-20 triệu records
- Promise.all sẽ tạo 10-20 triệu promises trong memory → OOM
- Không cần parallel vì bottleneck là I/O, không phải CPU

**Lý do dùng Async Iterator:**
- Memory constant O(1) - chỉ giữ 1 record tại 1 thời điểm
- Backpressure tự động - stream sẽ pause khi xử lý chậm
- Code clean, dễ đọc, dễ test

### 1.5. Memory Optimization

- [x] Sử dụng `Map` thay vì plain object (better memory management)
- [x] Parse numbers ngay khi đọc (không giữ string)
- [x] Không lưu `date` vì không cần cho aggregation
- [x] Stream write output files (không buffer toàn bộ)

---

## 🖥️ 2. CLI Design

### 2.1. Arguments
- [x] `--input` / `-i`: Path đến file CSV input (required)
- [x] `--output` / `-o`: Directory output cho kết quả (required)
- [x] `--verbose` / `-v`: Hiển thị chi tiết (optional)
- [x] `--help` / `-h`: Hiển thị hướng dẫn

### 2.2. Usage Example (Docker)

```bash
# Build image
docker build -t ad-performance-aggregator .

# Run với file cụ thể
docker run --rm -it \
  -v $(pwd)/input:/data/input:ro \
  -v $(pwd)/results:/data/output \
  ad-performance-aggregator \
  --input /data/input/ad_data.csv \
  --output /data/output

# Xem help
docker run --rm ad-performance-aggregator --help
```

### 2.3. Output
- [x] Tạo file `top10_ctr.csv` - Top 10 campaigns có CTR cao nhất
- [x] Tạo file `top10_cpa.csv` - Top 10 campaigns có CPA thấp nhất
- [x] Hiển thị summary sau khi xử lý xong (thời gian, memory, số records)

### 2.4. Error handling
- [x] Validate input file exists và readable
- [x] Validate output directory exists hoặc tạo mới
- [x] Handle malformed CSV rows gracefully
- [x] Meaningful error messages

---
## 🧪 3. Unit Tests

### 3.1. Test CSVParser ✅
- [x] Test parseRecord với valid data
- [x] Test parseRecord với missing campaign_id
- [x] Test parseRecord với invalid numbers
- [x] Test parseRecord với negative values
- [x] Test isReadable với existing file
- [x] Test isReadable với non-existing file
- [x] Test getFileSize
- [x] Test getFilePath
- [x] Test createStream với valid file
- [x] Test createStream với empty file

### 3.2. Test CampaignAggregator ✅
- [x] Test aggregate single record
- [x] Test aggregate multiple records same campaign
- [x] Test aggregate multiple campaigns
- [x] Test calculateCTR normal case
- [x] Test calculateCTR với impressions = 0
- [x] Test calculateCPA normal case
- [x] Test calculateCPA với conversions = 0
- [x] Test getTopNCampaignsByCTR với < N campaigns
- [x] Test getTopNCampaignsByCTR với > N campaigns
- [x] Test getTopNCampaignsByCPA exclude zero conversions
- [x] Test clear() method
- [x] Test getAllMetrics()
- [x] Test getUniqueCampaignCount()

### 3.3. Test CSVProcessor ✅
- [x] Test process() với valid file
- [x] Test process() với invalid input file
- [x] Test process() với verbose mode
- [x] Test progress callback
- [x] Test progress callback at intervals
- [x] Test peak memory tracking
- [x] Test resultsToCSV format
- [x] Test resultsToCSV với null CPA
- [x] Test output file content

### 3.4. Test StatsFormatter ✅
- [x] Test format() với valid stats
- [x] Test format() với edge cases

### 3.5. Coverage Requirements ✅
- [x] 100% Line Coverage

### 3.5. Coverage Results ✅

```
---------------|---------|----------|---------|---------|
File           | % Stmts | % Branch | % Funcs | % Lines |
---------------|---------|----------|---------|---------|
All files      |     100 |    97.36 |     100 |     100 |
 aggregator.ts |     100 |      100 |     100 |     100 |
 parser.ts     |     100 |      100 |     100 |     100 |
 processor.ts  |     100 |    91.66 |     100 |     100 |
---------------|---------|----------|---------|---------|

Tests: 65 passed, 65 total
```

---

## 🐳 4. Docker ✅

### 4.1. Files Created
- [x] `Dockerfile` - Build với Node.js 20 Alpine
- [x] `.dockerignore` - Exclude unnecessary files

### 4.2. Docker Usage

```bash
# Build image
docker build -t ad-performance-aggregator .

# Run với file cụ thể (với progress bar)
docker run --rm -it \
  -v $(pwd)/input:/data/input:ro \
  -v $(pwd)/results:/data/output \
  ad-performance-aggregator \
  --input /data/input/ad_data.csv \
  --output /data/output

# Xem help
docker run --rm ad-performance-aggregator --help
```

### 4.3. Docker Test Results ✅

```
📊 Total Records:      26,843,544
✅ Valid Records:      26,843,544
❌ Invalid Records:    0
🏷️  Unique Campaigns:   50

⏱️  Processing Time:    63.57s
💾 Peak Memory:        19.81 MB
🚀 Throughput:         422,281 records/sec
```

---

## 📚 5. Documentation (README.md) ✅

### 5.1. Setup Instructions
- [x] Prerequisites (Docker)
- [x] Build instructions (`docker build`)
- [x] Quick start guide

### 5.2. How to Run
- [x] Docker usage examples
- [x] All CLI options với descriptions
- [x] Volume mount explanations

### 5.3. Libraries Used
- [x] `csv-parse` - CSV streaming parser
- [x] `commander` - CLI framework
- [x] `cli-progress` - Progress bar
- [x] `chalk` - Console styling

### 5.4. Performance Benchmarks
- [x] Processing time cho file 1GB
- [x] Peak memory usage
- [x] Throughput (records/second)
- [x] Hardware specs khi test

---

## 🗓️ Progress Tracking

| Task | Status | File |
|------|--------|------|
| Core Logic - Types | ✅ Done | `src/types.ts` |
| Core Logic - CSVParser | ✅ Done | `src/parser.ts` |
| Core Logic - CampaignAggregator | ✅ Done | `src/aggregator.ts` |
| Core Logic - CSVProcessor | ✅ Done | `src/processor.ts` |
| CLI | ✅ Done | `src/cli.ts` |
| Unit Tests - Parser | ✅ Done (21 tests) | `src/__tests__/parser.test.ts` |
| Unit Tests - Aggregator | ✅ Done (28 tests) | `src/__tests__/aggregator.test.ts` |
| Unit Tests - Processor | ✅ Done (16 tests) | `src/__tests__/processor.test.ts` |
| Docker | ✅ Done | `Dockerfile` |
| Documentation | ✅ Done | `README.md` |

---

## ✅ Checklist trước khi submit

- [x] Code chạy được với file 1GB
- [x] Output files đúng format
- [x] README đầy đủ thông tin
- [x] Unit tests pass (65 tests, 100% line coverage)
- [x] Code clean và có comments
- [x] Docker support
- [x] PROMPTS.md
