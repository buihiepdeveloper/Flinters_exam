#!/usr/bin/env node

/**
 * CLI Entry Point
 * Ad Performance Aggregator - Command Line Interface
 */

import { Command } from 'commander';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { CSVProcessor, StatsFormatter } from './processor';
import { CLIOptions } from './types';

// Package info
const VERSION = '1.0.0';
const NAME = 'ad-aggregator';

/**
 * CLI class
 * Handles command line interface for the application
 */
class CLI {
  private program: Command;
  private progressBar: cliProgress.SingleBar;
  private progressStarted: boolean = false;

  constructor() {
    this.program = new Command();
    this.progressBar = new cliProgress.SingleBar({
      format: chalk.cyan('Processing') + ' |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} bytes',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
    });

    this.setupProgram();
  }

  /**
   * Setup CLI program with options
   */
  private setupProgram(): void {
    this.program
      .name(NAME)
      .description('Process advertising CSV data and generate performance reports')
      .version(VERSION)
      .requiredOption('-i, --input <path>', 'Path to input CSV file')
      .requiredOption('-o, --output <path>', 'Output directory for result files')
      .option('-v, --verbose', 'Enable verbose output', false);
  }

  /**
   * Print banner
   */
  private printBanner(): void {
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     📊 Ad Performance Aggregator                      ║
║                                                       ║
║     Process large CSV files efficiently               ║
║     Generate top CTR and CPA reports                  ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`));
  }

  /**
   * Handle progress updates
   */
  private handleProgress(processed: number, total: number): void {
    if (!this.progressStarted) {
      this.progressBar.start(total, 0);
      this.progressStarted = true;
    }
    this.progressBar.update(processed);
  }

  /**
   * Run the CLI
   */
  public async run(): Promise<void> {
    this.program.parse(process.argv);

    const opts = this.program.opts();

    const options: CLIOptions = {
      input: opts.input,
      output: opts.output,
      verbose: opts.verbose,
    };

    // Print banner
    this.printBanner();

    console.log(chalk.white('📁 Input file:  ') + chalk.yellow(options.input));
    console.log(chalk.white('📂 Output dir:  ') + chalk.yellow(options.output));
    console.log('');

    try {
      console.log(chalk.white('🚀 Starting processing...\n'));

      // Create processor with progress callback
      const processor = new CSVProcessor(
        options,
        (processed, total) => this.handleProgress(processed, total)
      );

      // Process the file
      const stats = await processor.process();

      if (this.progressStarted) {
        this.progressBar.stop();
      }

      // Print results
      console.log(chalk.green(StatsFormatter.format(stats)));

      console.log(chalk.white('\n📄 Output files:'));
      console.log(chalk.green(`   ✓ ${options.output}/top10_ctr.csv`));
      console.log(chalk.green(`   ✓ ${options.output}/top10_cpa.csv`));
      console.log('');

    } catch (error) {
      if (this.progressStarted) {
        this.progressBar.stop();
      }

      console.error(chalk.red('\n❌ Error: ') + (error as Error).message);

      if (options.verbose) {
        console.error(chalk.gray('\nStack trace:'));
        console.error(chalk.gray((error as Error).stack));
      }

      process.exit(1);
    }
  }
}

// Run CLI
const cli = new CLI();
cli.run().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
