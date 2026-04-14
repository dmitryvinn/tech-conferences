#!/usr/bin/env node
/**
 * CFP Auto-Discovery Script
 * 
 * Fetches conference data from two public sources:
 *   1. confs.tech (tech-conferences/conference-data on GitHub)
 *   2. developers.events (all-cfps.json)
 * 
 * Compares against existing conferences in conferences.json,
 * identifies new conferences with open CFPs, and outputs
 * a JSON file of candidates for review.
 * 
 * Run: node scripts/cfp-auto-discover.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Configuration ──────────────────────────────────────────────────────────
const CONFS_TECH_BASE = "https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences";
const DEV_EVENTS_CFPS = "https://developers.events/all-cfps.json";

const CONFS_TECH_TOPICS = [
  "accessibility", "android", "api", "css", "data", "devops", "dotnet",
  "general", "graphql", "ios", "iot", "java", "javascript", "kotlin",
  "leadership", "networking", "opensource", "performance", "php", "product",
  "python", "rust", "security", "sre", "testing", "typescript", "ux",
];

// DevRel-relevant keywords for filtering conferences
const DEVREL_KEYWORDS = [
  "developer", "devrel", "advocacy", "community", "open source", "opensource",
  "api", "platform", "cloud", "devops", "kubernetes", "docker", "ai", "ml",
  "machine learning", "data", "security", "frontend", "backend", "mobile",
  "react", "node", "python", "java", "rust", "go", "typescript", "javascript",
  "linux", "oss", "tech", "software", "engineering", "conference", "summit",
  "forum", "congress", "symposium", "meetup", "hackathon",
];

// ── Helpers ────────────────────────────────────────────────────────────────

async function fetchJSON(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeUrl(url) {
  if (!url) return "";
  return url.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
}

function normalizeName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function mapRegion(country, city) {
  if (!country) return "online";
  const c = country.toLowerCase();
  const northAmerica = ["usa", "u.s.a.", "united states", "canada", "mexico"];
  const europe = [
    "germany", "france", "uk", "united kingdom", "spain", "italy", "netherlands",
    "belgium", "austria", "switzerland", "poland", "czech republic", "czechia",
    "portugal", "sweden", "norway", "denmark", "finland", "ireland", "romania",
    "hungary", "greece", "croatia", "serbia", "bulgaria", "slovakia", "slovenia",
    "estonia", "latvia", "lithuania", "luxembourg", "iceland",
  ];
  const asiaPacific = [
    "japan", "china", "india", "australia", "south korea", "korea", "singapore",
    "taiwan", "hong kong", "indonesia", "thailand", "vietnam", "philippines",
    "malaysia", "new zealand", "pakistan", "bangladesh", "sri lanka",
  ];
  const latinAmerica = [
    "brazil", "argentina", "chile", "colombia", "peru", "uruguay", "costa rica",
    "ecuador", "bolivia", "paraguay", "venezuela", "panama", "guatemala",
  ];
  const africa = [
    "south africa", "nigeria", "kenya", "egypt", "morocco", "ghana", "ethiopia",
    "tanzania", "uganda", "rwanda", "senegal", "tunisia",
  ];

  if (northAmerica.some(n => c.includes(n))) return "north-america";
  if (europe.some(n => c.includes(n))) return "europe";
  if (asiaPacific.some(n => c.includes(n))) return "asia-pacific";
  if (latinAmerica.some(n => c.includes(n))) return "latin-america";
  if (africa.some(n => c.includes(n))) return "africa";
  if (c === "online" || c === "virtual") return "online";
  return "europe"; // default fallback
}

function mapAudienceTypes(topic) {
  const mapping = {
    accessibility: ["general-tech"],
    android: ["mobile"],
    api: ["developer-experience"],
    css: ["frontend"],
    data: ["data", "ai-ml"],
    devops: ["platform-engineering", "cloud"],
    dotnet: ["backend"],
    general: ["general-tech"],
    graphql: ["developer-experience", "backend"],
    ios: ["mobile"],
    iot: ["general-tech"],
    java: ["backend"],
    javascript: ["frontend"],
    kotlin: ["mobile", "backend"],
    leadership: ["community"],
    networking: ["general-tech"],
    opensource: ["open-source", "community"],
    performance: ["general-tech"],
    php: ["backend"],
    product: ["developer-experience"],
    python: ["backend", "data"],
    rust: ["backend"],
    security: ["security"],
    sre: ["platform-engineering"],
    testing: ["general-tech"],
    typescript: ["frontend", "backend"],
    ux: ["developer-experience"],
  };
  return mapping[topic] || ["general-tech"];
}

function isFutureDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d > new Date();
}

// ── Load existing conferences from JSON ──────────────────────────────────

function loadExistingConferences() {
  const filePath = resolve(ROOT, "conferences.json");
  const content = readFileSync(filePath, "utf-8");
  const conferences = JSON.parse(content).filter(Boolean);

  // Extract all URLs
  const urls = new Set();
  for (const conf of conferences) {
    if (conf.url) urls.add(normalizeUrl(conf.url));
  }

  // Extract all names
  const names = new Set();
  for (const conf of conferences) {
    if (conf.name) names.add(normalizeName(conf.name));
  }

  // Extract CFP URLs
  const cfpUrls = new Set();
  for (const conf of conferences) {
    if (conf.cfpUrl) cfpUrls.add(normalizeUrl(conf.cfpUrl));
  }

  return { urls, names, cfpUrls };
}

function isDuplicate(existing, conf) {
  if (existing.urls.has(normalizeUrl(conf.url))) return true;
  if (conf.cfpUrl && existing.cfpUrls.has(normalizeUrl(conf.cfpUrl))) return true;

  // Fuzzy name match
  const name = normalizeName(conf.name);
  for (const existingName of existing.names) {
    // Exact match
    if (name === existingName) return true;
    // One contains the other (e.g., "KubeCon" vs "KubeCon + CloudNativeCon North America")
    if (name.length > 5 && existingName.length > 5) {
      if (name.includes(existingName) || existingName.includes(name)) return true;
    }
  }
  return false;
}

// ── Fetch from confs.tech ──────────────────────────────────────────────────

async function fetchConfsTech() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = [currentYear, currentYear + 1];
  const results = [];

  for (const year of years) {
    for (const topic of CONFS_TECH_TOPICS) {
      const url = `${CONFS_TECH_BASE}/${year}/${topic}.json`;
      const data = await fetchJSON(url);
      if (!data || !Array.isArray(data)) continue;

      for (const conf of data) {
        // Only include conferences with CFP URLs and future dates
        if (!conf.cfpUrl) continue;
        if (!isFutureDate(conf.startDate) && !isFutureDate(conf.cfpEndDate)) continue;

        results.push({
          source: "confs.tech",
          topic,
          name: conf.name,
          url: conf.url,
          cfpUrl: conf.cfpUrl,
          startDate: conf.startDate,
          endDate: conf.endDate,
          cfpEndDate: conf.cfpEndDate,
          city: conf.city,
          country: conf.country,
          online: conf.online || false,
          twitter: conf.twitter,
        });
      }
    }
  }

  return results;
}

// ── Fetch from developers.events ───────────────────────────────────────────

async function fetchDevEvents() {
  const data = await fetchJSON(DEV_EVENTS_CFPS);
  if (!data || !Array.isArray(data)) {
    console.log("⚠ Could not fetch developers.events CFPs");
    return [];
  }

  const results = [];
  const now = Date.now();

  for (const cfp of data) {
    // Only include future CFPs
    if (!cfp.untilDate || cfp.untilDate < now) continue;
    if (!cfp.link) continue;
    if (!cfp.conf) continue;

    const confDates = cfp.conf.date || [];
    const startDate = confDates[0]
      ? new Date(confDates[0]).toISOString().split("T")[0]
      : undefined;
    const endDate = confDates[1]
      ? new Date(confDates[1]).toISOString().split("T")[0]
      : undefined;
    const cfpEndDate = cfp.untilDate
      ? new Date(cfp.untilDate).toISOString().split("T")[0]
      : undefined;

    // Parse location
    const location = cfp.conf.location || "";
    const locationParts = location.split(/[,(]/);
    const city = locationParts[0]?.trim() || "";
    const country = locationParts[locationParts.length - 1]?.replace(")", "").trim() || "";

    results.push({
      source: "developers.events",
      topic: "general",
      name: cfp.conf.name,
      url: cfp.conf.hyperlink,
      cfpUrl: cfp.link,
      startDate,
      endDate,
      cfpEndDate,
      city,
      country,
      online: location.toLowerCase().includes("online"),
    });
  }

  return results;
}

// ── Convert to our Conference format ───────────────────────────────────────

function toConferenceEntry(raw) {
  const location = raw.online
    ? "Online"
    : [raw.city, raw.country].filter(Boolean).join(", ") || "TBD";

  return {
    id: `conf-${slugify(raw.name)}`,
    name: raw.name,
    description: `${raw.name} — sourced from ${raw.source}. Submit your talk proposal before the CFP deadline.`,
    url: raw.url,
    cfpUrl: raw.cfpUrl,
    location,
    region: raw.online ? "online" : mapRegion(raw.country, raw.city),
    format: raw.online ? "virtual" : "in-person",
    audienceTypes: mapAudienceTypes(raw.topic),
    talkFormats: ["talk"],
    eventStartDate: raw.startDate,
    eventEndDate: raw.endDate,
    cfpCloseDate: raw.cfpEndDate,
    tags: [raw.topic].filter(Boolean),
    notes: `Auto-discovered from ${raw.source} on ${new Date().toISOString().split("T")[0]}`,
  };
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍 CFP Auto-Discovery — scanning public sources...\n");

  // Load existing data
  const existing = loadExistingConferences();
  console.log(`📊 Existing conferences: ${existing.names.size} names, ${existing.urls.size} URLs\n`);

  // Fetch from sources
  console.log("📡 Fetching from confs.tech...");
  const confsTech = await fetchConfsTech();
  console.log(`   Found ${confsTech.length} conferences with open CFPs\n`);

  console.log("📡 Fetching from developers.events...");
  const devEvents = await fetchDevEvents();
  console.log(`   Found ${devEvents.length} conferences with open CFPs\n`);

  // Combine and deduplicate
  const allRaw = [...confsTech, ...devEvents];

  // Deduplicate within fetched results (by URL)
  const seenUrls = new Set();
  const uniqueRaw = [];
  for (const conf of allRaw) {
    const normUrl = normalizeUrl(conf.url);
    if (seenUrls.has(normUrl)) continue;
    seenUrls.add(normUrl);
    uniqueRaw.push(conf);
  }
  console.log(`📋 Unique conferences after internal dedup: ${uniqueRaw.length}`);

  // Filter out existing conferences
  const newConfs = uniqueRaw.filter(conf => !isDuplicate(existing, conf));
  console.log(`🆕 New conferences not in existing data: ${newConfs.length}\n`);

  // Convert to our format
  const candidates = newConfs.map(toConferenceEntry);

  // Sort by CFP close date (soonest first)
  candidates.sort((a, b) => {
    if (!a.cfpCloseDate) return 1;
    if (!b.cfpCloseDate) return -1;
    return a.cfpCloseDate.localeCompare(b.cfpCloseDate);
  });

  // Write output
  const outputPath = resolve(__dirname, "cfp-discoveries.json");
  writeFileSync(outputPath, JSON.stringify(candidates, null, 2));
  console.log(`✅ Wrote ${candidates.length} new CFP candidates to scripts/cfp-discoveries.json`);

  // Summary by source
  const bySource = {};
  for (const c of newConfs) {
    bySource[c.source] = (bySource[c.source] || 0) + 1;
  }
  console.log("\n📊 Breakdown by source:");
  for (const [source, count] of Object.entries(bySource)) {
    console.log(`   ${source}: ${count}`);
  }

  // Summary by region
  const byRegion = {};
  for (const c of candidates) {
    byRegion[c.region] = (byRegion[c.region] || 0) + 1;
  }
  console.log("\n🌍 Breakdown by region:");
  for (const [region, count] of Object.entries(byRegion)) {
    console.log(`   ${region}: ${count}`);
  }

  return candidates;
}

main().catch(console.error);
