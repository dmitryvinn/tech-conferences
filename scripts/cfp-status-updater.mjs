#!/usr/bin/env node
/**
 * CFP Status Updater
 * 
 * Scans conferences.json and produces a report of:
 *   - CFPs that have closed since the last run
 *   - Conferences that have already passed
 *   - Conferences with CFPs closing within 7 days
 * 
 * Outputs a JSON report for the GitHub Action to create/update an issue.
 * 
 * Run: node scripts/cfp-status-updater.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Load conference data from JSON ──────────────────────────────────────────

function parseConferences() {
  const filePath = resolve(ROOT, "conferences.json");
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content).filter(Boolean);
}

// ── Analyze statuses ───────────────────────────────────────────────────────

function analyzeStatuses(conferences) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const report = {
    generatedAt: new Date().toISOString(),
    totalConferences: conferences.length,
    closingSoon: [],      // CFP closes within 7 days
    recentlyClosed: [],   // CFP closed in the last 7 days
    pastEvents: [],       // Event end date has passed
    upcomingEvents: [],   // Event starts within 14 days
    noCfpDate: [],        // Has CFP URL but no close date
    stats: {
      openCfps: 0,
      closedCfps: 0,
      noCfpUrl: 0,
      futureEvents: 0,
      pastEventsCount: 0,
    },
  };

  for (const conf of conferences) {
    const cfpClose = conf.cfpCloseDate ? new Date(conf.cfpCloseDate + "T23:59:59") : null;
    const eventEnd = conf.eventEndDate ? new Date(conf.eventEndDate + "T23:59:59") : null;
    const eventStart = conf.eventStartDate ? new Date(conf.eventStartDate + "T00:00:00") : null;

    // CFP status
    if (!conf.cfpUrl) {
      report.stats.noCfpUrl++;
    } else if (!cfpClose) {
      report.noCfpDate.push({
        id: conf.id,
        name: conf.name,
        cfpUrl: conf.cfpUrl,
      });
    } else if (cfpClose < now) {
      report.stats.closedCfps++;
      // Recently closed (within 7 days)
      const daysSinceClosed = Math.floor((now - cfpClose) / (1000 * 60 * 60 * 24));
      if (daysSinceClosed <= 7) {
        report.recentlyClosed.push({
          id: conf.id,
          name: conf.name,
          cfpCloseDate: conf.cfpCloseDate,
          daysSinceClosed,
        });
      }
    } else {
      report.stats.openCfps++;
      // Closing soon (within 7 days)
      const daysUntilClose = Math.ceil((cfpClose - now) / (1000 * 60 * 60 * 24));
      if (daysUntilClose <= 7) {
        report.closingSoon.push({
          id: conf.id,
          name: conf.name,
          cfpCloseDate: conf.cfpCloseDate,
          cfpUrl: conf.cfpUrl,
          daysUntilClose,
        });
      }
    }

    // Event status
    if (eventEnd && eventEnd < now) {
      report.stats.pastEventsCount++;
      const daysSinceEnd = Math.floor((now - eventEnd) / (1000 * 60 * 60 * 24));
      if (daysSinceEnd <= 30) {
        report.pastEvents.push({
          id: conf.id,
          name: conf.name,
          eventEndDate: conf.eventEndDate,
          daysSinceEnd,
        });
      }
    } else if (eventStart) {
      report.stats.futureEvents++;
      const daysUntilStart = Math.ceil((eventStart - now) / (1000 * 60 * 60 * 24));
      if (daysUntilStart <= 14 && daysUntilStart >= 0) {
        report.upcomingEvents.push({
          id: conf.id,
          name: conf.name,
          eventStartDate: conf.eventStartDate,
          location: conf.location,
          daysUntilStart,
        });
      }
    }
  }

  // Sort
  report.closingSoon.sort((a, b) => a.daysUntilClose - b.daysUntilClose);
  report.recentlyClosed.sort((a, b) => a.daysSinceClosed - b.daysSinceClosed);
  report.upcomingEvents.sort((a, b) => a.daysUntilStart - b.daysUntilStart);

  return report;
}

// ── Generate Markdown report ───────────────────────────────────────────────

function generateMarkdown(report) {
  const lines = [];

  lines.push(`## CFP Status Report — ${new Date().toISOString().split("T")[0]}`);
  lines.push("");
  lines.push(`**Total conferences tracked:** ${report.totalConferences}`);
  lines.push(`**Open CFPs:** ${report.stats.openCfps} | **Closed CFPs:** ${report.stats.closedCfps} | **No CFP URL:** ${report.stats.noCfpUrl}`);
  lines.push(`**Future events:** ${report.stats.futureEvents} | **Past events:** ${report.stats.pastEventsCount}`);
  lines.push("");

  if (report.closingSoon.length > 0) {
    lines.push("### ⏰ CFPs Closing Soon (within 7 days)");
    lines.push("");
    lines.push("| Conference | Closes | Days Left | CFP Link |");
    lines.push("|-----------|--------|-----------|----------|");
    for (const c of report.closingSoon) {
      lines.push(`| ${c.name} | ${c.cfpCloseDate} | **${c.daysUntilClose}** | [Apply](${c.cfpUrl}) |`);
    }
    lines.push("");
  }

  if (report.recentlyClosed.length > 0) {
    lines.push("### 🔒 Recently Closed CFPs (last 7 days)");
    lines.push("");
    lines.push("| Conference | Closed | Days Ago |");
    lines.push("|-----------|--------|----------|");
    for (const c of report.recentlyClosed) {
      lines.push(`| ${c.name} | ${c.cfpCloseDate} | ${c.daysSinceClosed} |`);
    }
    lines.push("");
  }

  if (report.upcomingEvents.length > 0) {
    lines.push("### 📅 Upcoming Events (within 14 days)");
    lines.push("");
    lines.push("| Conference | Starts | Days Until | Location |");
    lines.push("|-----------|--------|------------|----------|");
    for (const c of report.upcomingEvents) {
      lines.push(`| ${c.name} | ${c.eventStartDate} | **${c.daysUntilStart}** | ${c.location || "TBD"} |`);
    }
    lines.push("");
  }

  if (report.pastEvents.length > 0) {
    lines.push("### 📦 Recently Passed Events (last 30 days)");
    lines.push("");
    lines.push("| Conference | Ended | Days Ago |");
    lines.push("|-----------|-------|----------|");
    for (const c of report.pastEvents) {
      lines.push(`| ${c.name} | ${c.eventEndDate} | ${c.daysSinceEnd} |`);
    }
    lines.push("");
  }

  if (report.noCfpDate.length > 0) {
    lines.push("### ❓ CFPs Missing Close Date");
    lines.push("");
    lines.push(`${report.noCfpDate.length} conference(s) have a CFP URL but no close date set.`);
    lines.push("");
  }

  lines.push(`_Generated by CFP Status Updater on ${report.generatedAt}_`);

  return lines.join("\n");
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log("📊 CFP Status Updater — analyzing conference data...\n");

  const conferences = parseConferences();
  console.log(`   Parsed ${conferences.length} conferences\n`);

  const report = analyzeStatuses(conferences);

  // Write JSON report
  const jsonPath = resolve(__dirname, "cfp-status-report.json");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`✅ JSON report: scripts/cfp-status-report.json`);

  // Write Markdown report
  const mdPath = resolve(__dirname, "cfp-status-report.md");
  const markdown = generateMarkdown(report);
  writeFileSync(mdPath, markdown);
  console.log(`✅ Markdown report: scripts/cfp-status-report.md`);

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   Open CFPs: ${report.stats.openCfps}`);
  console.log(`   Closed CFPs: ${report.stats.closedCfps}`);
  console.log(`   Closing soon (7d): ${report.closingSoon.length}`);
  console.log(`   Recently closed (7d): ${report.recentlyClosed.length}`);
  console.log(`   Upcoming events (14d): ${report.upcomingEvents.length}`);
  console.log(`   Recently passed (30d): ${report.pastEvents.length}`);
}

main();
