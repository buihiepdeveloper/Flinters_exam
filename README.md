# 📊 Ad Performance Aggregator

A high-performance CLI tool for processing large CSV files containing advertising data and generating aggregated analytics reports.

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Usage](#-usage)
- [Output](#-output)
- [Performance](#-performance)
- [Architecture](#-architecture)
- [Development](#-development)
- [Testing](#-testing)
- [Libraries](#-libraries)

---

## ✨ Features

- **Memory Efficient**: Processes ~1GB files with only ~20MB peak memory usage
- **High Performance**: ~420,000 records/second throughput
- **Streaming Processing**: Single-pass algorithm with O(1) memory per record
- **Progress Bar**: Real-time progress display during processing
- **Error Handling**: Gracefully handles malformed CSV rows
- **Docker Support**: Run anywhere with Docker - no Node.js installation required

---

## 🚀 Quick Start

### Prerequisites

- **Docker** (recommended)

### Build Docker Image

```bash
docker build -t ad-performance-aggregator .
```

### Run

```bash
# Prepare directories
mkdir -p input results

# Place your CSV file in input directory
cp your_data.csv input/ad_data.csv

# Run with Docker
docker run --rm -it \
  -v $(pwd)/input:/data/input:ro \
  -v $(pwd)/results:/data/output \
  ad-performance-aggregator \
  --input /data/input/ad_data.csv \
  --output /data/output
```

---

## 💻 Usage

### Basic Command

```bash
docker run --rm -it \
  -v $(pwd)/input:/data/input:ro \
  -v $(pwd)/results:/data/output \
  ad-performance-aggregator \
  --input /data/input/<your-file>.csv \
  --output /data/output
```

### CLI Options

| Option | Alias | Required | Description |
|--------|-------|----------|-------------|
| `--input` | `-i` | ✅ | Path to input CSV file |
| `--output` | `-o` | ✅ | Output directory for result files |
| `--verbose` | `-v` | ❌ | Enable verbose output (show skipped rows) |
| `--help` | `-h` | ❌ | Display help information |
| `--version` | | ❌ | Display version number |

### Examples

```bash
# Process ad_data.csv
docker run --rm -it \
  -v $(pwd)/input:/data/input:ro \
  -v $(pwd)/results:/data/output \
  ad-performance-aggregator \
  --input /data/input/ad_data.csv \
  --output /data/output

# With verbose mode (shows invalid rows)
docker run --rm -it \
  -v $(pwd)/input:/data/input:ro \
  -v $(pwd)/results:/data/output \
  ad-performance-aggregator \
  --input /data/input/ad_data.csv \
  --output /data/output \
  --verbose

# Show help
docker run --rm ad-performance-aggregator --help
```

### Volume Mounts

| Host Path | Container Path | Description |
|-----------|----------------|-------------|
| `./input` | `/data/input` | Input directory (read-only recommended) |
| `./results` | `/data/output` | Output directory for results |

---

## 📄 Output

The tool generates two CSV files in the output directory:

### 1. `top10_ctr.csv` - Top 10 Campaigns by CTR (Click-Through Rate)

Campaigns with the highest CTR, sorted in descending order.

| Column | Description |
|--------|-------------|
| campaign_id | Campaign identifier |
| total_impressions | Sum of all impressions |
| total_clicks | Sum of all clicks |
| total_spend | Sum of all spend (USD) |
| total_conversions | Sum of all conversions |
| CTR | Click-Through Rate (clicks / impressions) |
| CPA | Cost Per Acquisition (spend / conversions) |

### 2. `top10_cpa.csv` - Top 10 Campaigns by CPA (Cost Per Acquisition)

Campaigns with the lowest CPA, sorted in ascending order.
*Note: Campaigns with zero conversions are excluded.*

### Example Output

```csv
campaign_id,total_impressions,total_clicks,total_spend,total_conversions,CTR,CPA
CMP005,13648608306,375627610,394780333.96,20403485,0.0275,19.35
CMP022,13703365735,377109904,395899684.64,20480486,0.0275,19.33
...
```

---

## ⚡ Performance

### Benchmark Results

Tested with a **995MB CSV file** containing **26,843,544 records**:

| Metric | Value |
|--------|-------|
| **Total Records** | 26,843,544 |
| **Valid Records** | 26,843,544 (100%) |
| **Invalid Records** | 0 |
| **Unique Campaigns** | 50 |
| **Processing Time** | 63.57 seconds |
| **Peak Memory** | 19.81 MB |
| **Throughput** | 422,281 records/sec |

### Test Environment

- **OS**: Ubuntu Linux
- **Docker**: 24.x
- **CPU**: Intel Core i5
- **RAM**: 16GB
- **Storage**: SSD

### Memory Optimization Techniques

1. **Streaming I/O**: File is read in 64KB chunks, not loaded entirely into memory
2. **Single-Pass Algorithm**: Data is processed once, aggregated on-the-fly
3. **Map Data Structure**: O(1) lookup and update for campaign aggregation
4. **Lazy Computation**: CTR and CPA calculated only when needed

---

## 🏗️ Architecture

### Class Diagram

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

### Processing Flow

```
Input CSV → Stream Read → Parse Row → Validate → Aggregate → Sort → Output CSV
              (64KB)      (1 row)    (skip bad)   (Map)     (Top 10)
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Async Iterator** | Memory efficient, automatic backpressure |
| **Map for aggregation** | O(1) lookup/update, better than Object for dynamic keys |
| **Class-based OOP** | Clean separation of concerns, testable |
| **Single-pass algorithm** | O(n) time complexity, minimal memory |

---

## 🛠️ Development

### Prerequisites (for development)

- **Node.js** >= 18.0.0
- **npm** or **yarn**

### Local Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run locally (without Docker)
node dist/cli.js --input ./input/ad_data.csv --output ./results
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run dev` | Run with ts-node (development) |
| `npm start` | Run compiled version |
| `npm test` | Run unit tests |
| `npm run test:coverage` | Run tests with coverage report |

---

## 🧪 Testing

### Run Tests with Docker

```bash
# Build and run tests
docker build --target builder -t ad-aggregator-test .
docker run --rm ad-aggregator-test npm test
```

### Run Tests Locally

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Coverage

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

### Test Categories

- **Parser Tests**: CSV parsing, validation, error handling
- **Aggregator Tests**: Metric calculations, CTR/CPA, ranking
- **Processor Tests**: End-to-end processing, file I/O
- **Integration Tests**: Full pipeline with sample data

---

## 📚 Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `csv-parse` | ^5.5.6 | Streaming CSV parser |
| `commander` | ^12.1.0 | CLI argument parsing |
| `cli-progress` | ^3.12.0 | Progress bar display |
| `chalk` | ^4.1.2 | Terminal colors |
| `typescript` | ^5.4.5 | Type safety |
| `jest` | ^29.7.0 | Unit testing |
| `ts-jest` | ^29.1.4 | TypeScript support for Jest |

---

## 📁 Project Structure

```
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── processor.ts        # Main processing logic
│   ├── parser.ts           # CSV parsing
│   ├── aggregator.ts       # Data aggregation
│   ├── types.ts            # TypeScript interfaces
│   ├── index.ts            # Public API exports
│   └── __tests__/          # Unit tests
│       ├── parser.test.ts
│       ├── aggregator.test.ts
│       └── processor.test.ts
├── input/                  # Input CSV files
├── results/                # Output CSV files
├── Dockerfile
├── .dockerignore
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

---

## 📝 Input CSV Format

| Column | Type | Description |
|--------|------|-------------|
| campaign_id | string | Campaign identifier |
| date | string | Date in YYYY-MM-DD format |
| impressions | integer | Number of impressions |
| clicks | integer | Number of clicks |
| spend | float | Advertising cost (USD) |
| conversions | integer | Number of conversions |

### Example Input

```csv
campaign_id,date,impressions,clicks,spend,conversions
CMP001,2025-01-01,12000,300,45.50,12
CMP002,2025-01-01,8000,120,28.00,4
CMP001,2025-01-02,14000,340,48.20,15
```
