#!/usr/bin/env node

/**
 * Audit Script for Job Application Tracker
 * Runs ESLint and generates structured audit reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const REPORT_DIR = path.join(__dirname);
const JSON_REPORT_PATH = path.join(REPORT_DIR, 'audit-report.json');
const MD_REPORT_PATH = path.join(REPORT_DIR, 'AUDIT.md');

// Exclusions from the plan
const EXCLUDED_PATTERNS = [
  'chrome-extension/**',
  'node_modules/**',
  'vendor/**',
  'dist/**',
  'build/**',
];

function runESLint() {
  console.log('Running ESLint...');
  
  try {
    const output = execSync(
      'npx eslint . --format json --report-unused-disable-directives',
      { 
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
      }
    );
    
    return JSON.parse(output);
  } catch (error) {
    // ESLint returns exit code 1 when there are errors
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch (parseError) {
        console.error('Failed to parse ESLint JSON output:', parseError.message);
        return [];
      }
    }
    console.error('ESLint execution error:', error.message);
    return [];
  }
}

function filterResults(results) {
  return results.filter(file => {
    const filePath = file.filePath;
    return !EXCLUDED_PATTERNS.some(pattern => {
      if (pattern.endsWith('/**')) {
        const prefix = pattern.slice(0, -3);
        return filePath.includes(prefix);
      }
      return filePath.endsWith(pattern);
    });
  });
}

function categorizeIssues(results) {
  const categories = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    warning: [],
  };

  // Map ESLint rule severity to our categories
  const severityMap = {
    2: 'critical', // error
    1: 'warning',  // warning
  };

  results.forEach(file => {
    const filePath = file.filePath;
    const messages = file.messages || [];
    
    messages.forEach(msg => {
      const severity = severityMap[msg.severity] || 'medium';
      const ruleId = msg.ruleId || 'unknown';
      
      // Categorize specific rules
      let category = severity;
      
      if (ruleId.includes('no-explicit-any')) {
        category = 'high';
      } else if (ruleId.includes('no-unused-vars')) {
        category = 'medium';
      } else if (ruleId.includes('exhaustive-deps')) {
        category = 'medium';
      } else if (ruleId.includes('prefer-const')) {
        category = 'low';
      }
      
      if (categories[category]) {
        categories[category].push({
          file: filePath,
          line: msg.line,
          column: msg.column,
          message: msg.message,
          rule: ruleId,
          severity: msg.severity,
        });
      }
    });
  });

  return categories;
}

function generateMarkdownReport(auditData) {
  const { summary, categories, files, timestamp } = auditData;
  
  let md = `# Code Audit Report\n\n`;
  md += `**Generated:** ${timestamp}\n`;
  md += `**Branch:** ${auditData.branch || 'N/A'}\n\n`;
  
  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Issues | ${summary.total} |\n`;
  md += `| Critical | ${summary.critical} |\n`;
  md += `| High | ${summary.high} |\n`;
  md += `| Medium | ${summary.medium} |\n`;
  md += `| Low | ${summary.low} |\n`;
  md += `| Warnings | ${summary.warning} |\n`;
  md += `| Files Analyzed | ${summary.filesAnalyzed} |\n\n`;
  
  if (summary.critical > 0 || summary.high > 0) {
    md += `## 🚨 Critical & High Priority Issues\n\n`;
    
    const criticalIssues = [...categories.critical, ...categories.high];
    criticalIssues.forEach(issue => {
      const relativePath = issue.file.replace(ROOT_DIR, '.');
      md += `### ${issue.rule}\n`;
      md += `- **File:** \`${relativePath}:${issue.line}:${issue.column}\`\n`;
      md += `- **Message:** ${issue.message}\n\n`;
    });
  }
  
  md += `## All Issues by Category\n\n`;
  
  Object.entries(categories).forEach(([category, issues]) => {
    if (issues.length > 0) {
      md += `### ${category.charAt(0).toUpperCase() + category.slice(1)} (${issues.length})\n\n`;
      md += `| File | Line | Rule | Message |\n`;
      md += `|------|------|------|---------|\n`;
      
      issues.forEach(issue => {
        const relativePath = issue.file.replace(ROOT_DIR, '.');
        const msg = issue.message.length > 80 
          ? issue.message.substring(0, 77) + '...' 
          : issue.message;
        md += `| ${relativePath}:${issue.line} | ${issue.column} | \`${issue.rule}\` | ${msg} |\n`;
      });
      md += '\n';
    }
  });
  
  md += `## Files Analyzed\n\n`;
  files.forEach(file => {
    const relativePath = file.replace(ROOT_DIR, '.');
    md += `- ${relativePath}\n`;
  });
  md += '\n';
  
  md += `## Recommendations\n\n`;
  md += `1. **Fix Critical Issues First**: Address all \`@typescript-eslint/no-explicit-any\` and \`@typescript-eslint/no-unused-vars\` issues\n`;
  md += `2. **Type Safety**: Replace \`any\` types with proper TypeScript types\n`;
  md += `3. **Code Cleanup**: Remove unused variables and imports\n`;
  md += `4. **Dependency Arrays**: Fix React hooks with missing dependencies in useCallback/useEffect\n`;
  md += `5. **Consistency**: Use \`const\` instead of \`let\` for variables that are never reassigned\n`;
  
  return md;
}

function main() {
  console.log('=== Code Audit Script ===\n');
  
  // Get current git branch
  let branch = 'unknown';
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', { 
      cwd: ROOT_DIR, 
      encoding: 'utf-8' 
    }).trim();
  } catch (e) {
    // Ignore git errors
  }
  
  // Run ESLint
  const rawResults = runESLint();
  const filteredResults = filterResults(rawResults);
  
  // Process results
  const allMessages = [];
  const analyzedFiles = [];
  
  filteredResults.forEach(file => {
    analyzedFiles.push(file.filePath);
    if (file.messages) {
      allMessages.push(...file.messages);
    }
  });
  
  // Categorize issues
  const categories = categorizeIssues(filteredResults);
  
  // Calculate summary
  const summary = {
    total: allMessages.length,
    critical: categories.critical.length,
    high: categories.high.length,
    medium: categories.medium.length,
    low: categories.low.length,
    warning: categories.warning.length,
    filesAnalyzed: analyzedFiles.length,
  };
  
  // Prepare audit data
  const auditData = {
    timestamp: new Date().toISOString(),
    branch,
    summary,
    categories,
    files: analyzedFiles,
    rawResults: filteredResults,
  };
  
  // Write JSON report
  const jsonOutput = JSON.stringify(auditData, null, 2);
  fs.writeFileSync(JSON_REPORT_PATH, jsonOutput, 'utf-8');
  console.log(`✓ JSON report written to: ${JSON_REPORT_PATH}`);
  
  // Generate and write Markdown report
  const mdReport = generateMarkdownReport(auditData);
  fs.writeFileSync(MD_REPORT_PATH, mdReport, 'utf-8');
  console.log(`✓ Markdown report written to: ${MD_REPORT_PATH}`);
  
  // Print summary
  console.log('\n=== Audit Summary ===');
  console.log(`Total Issues: ${summary.total}`);
  console.log(`  - Critical: ${summary.critical}`);
  console.log(`  - High: ${summary.high}`);
  console.log(`  - Medium: ${summary.medium}`);
  console.log(`  - Low: ${summary.low}`);
  console.log(`  - Warnings: ${summary.warning}`);
  console.log(`Files Analyzed: ${summary.filesAnalyzed}`);
  
  if (summary.total > 0) {
    console.log('\n⚠️  Run "npm run lint:fix" to automatically fix some issues');
  }
  
  console.log('\n✓ Audit complete!');
}

main();