#!/usr/bin/env node
/**
 * Ámaxa CMS Watcher
 * Watches Obsidian CMS folder → syncs to Astro → commits + pushes to Git
 *
 * Start manually:  node scripts/watch-cms.mjs
 * Auto-start:      set up via scripts/setup-cms-watch.sh
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const CMS_DIR =
  "/Users/laurenmcmillen/Downloads/manager/amaxa/DOCS/Website/CMS";
const PAGES_SUBDIR = path.join(CMS_DIR, "pages");
const SHARED_SUBDIR = path.join(CMS_DIR, "shared");

const SYNC_SCRIPT = path.join(__dirname, "sync-cms.mjs");

let debounceTimer = null;
const DEBOUNCE_MS = 2000; // wait 2s after last change before syncing

function log(msg) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${msg}`);
}

async function runSync() {
  log("Change detected — running sync…");

  try {
    // 1. Run sync script
    const { syncAll } = await import(SYNC_SCRIPT + `?t=${Date.now()}`);
    const changed = syncAll();

    if (changed === 0) {
      log("No Astro files changed — skipping git push.");
      return;
    }

    // 2. Git add + commit + push
    log(`${changed} file(s) changed — committing and pushing…`);

    const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const commitMsg = `cms: update content from Obsidian (${timestamp})`;

    execSync(`git -C "${REPO_ROOT}" add apps/landing/src/pages/`, { stdio: "inherit" });
    execSync(`git -C "${REPO_ROOT}" commit -m "${commitMsg}"`, { stdio: "inherit" });
    execSync(`git -C "${REPO_ROOT}" push`, { stdio: "inherit" });

    log("✓ Pushed to GitHub — Vercel will redeploy automatically.");
  } catch (err) {
    console.error("[watch-cms] Error:", err.message);
  }
}

function scheduleSync() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runSync, DEBOUNCE_MS);
}

function watchDir(dir) {
  if (!fs.existsSync(dir)) {
    log(`Watching dir not found: ${dir}`);
    return;
  }
  fs.watch(dir, { recursive: true }, (event, filename) => {
    if (!filename || !filename.endsWith(".md")) return;
    log(`File ${event}: ${filename}`);
    scheduleSync();
  });
  log(`Watching: ${dir}`);
}

log("Ámaxa CMS Watcher starting…");
log(`CMS dir: ${CMS_DIR}`);
log(`Repo:    ${REPO_ROOT}`);
log("");

watchDir(PAGES_SUBDIR);
watchDir(SHARED_SUBDIR);

log("Ready — edit any CMS file in Obsidian to trigger a redeploy.\n");
