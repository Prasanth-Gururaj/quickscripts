#!/usr/bin/env node

import path, { resolve } from 'path';
import { writeFile, mkdir, rm } from 'fs/promises';
import { zip } from 'zip-a-folder';
import fetch from 'node-fetch';
import { UI, exists } from '../promptUI/UI.mjs';
import { Client, batcher } from './node_modules/t4.ts/esm/index.js';

const rsUrl = 'https://cms.seattleu.edu/terminalfour/rs';

/**
 * Fetches a single page of media items from a T4 category using a direct
 * HTTP POST to the DataTables list endpoint. This bypasses the SDK's
 * media.list() wrapper which hardcodes start=0&length=10 and ignores
 * the offset/limit arguments, causing incomplete pagination.
 *
 * @param {string} token       - Bearer auth token for the T4 API
 * @param {number} categoryId  - ID of the media category to list
 * @param {string} language    - Language code e.g. 'en'
 * @param {number} start       - Pagination offset (0-based index to start from)
 * @param {number} length      - Number of items to fetch per page
 * @returns {Promise<{ mediaRows: Array, recordsTotal: number }>}
 */
async function listMediaPage(token, categoryId, language, start, length) {
  const url = `${rsUrl}/media/category/${categoryId}/${language}/list?showPending=true&showUntranslated=true`;

  const params = new URLSearchParams({
    draw: '1',
    'columns[0][data]': '0', 'columns[0][name]': '', 'columns[0][searchable]': 'true', 'columns[0][orderable]': 'false', 'columns[0][search][value]': '', 'columns[0][search][regex]': 'false',
    'columns[1][data]': '1', 'columns[1][name]': '', 'columns[1][searchable]': 'true', 'columns[1][orderable]': 'true',  'columns[1][search][value]': '', 'columns[1][search][regex]': 'false',
    'columns[2][data]': '2', 'columns[2][name]': '', 'columns[2][searchable]': 'true', 'columns[2][orderable]': 'true',  'columns[2][search][value]': '', 'columns[2][search][regex]': 'false',
    'columns[3][data]': '3', 'columns[3][name]': '', 'columns[3][searchable]': 'true', 'columns[3][orderable]': 'true',  'columns[3][search][value]': '', 'columns[3][search][regex]': 'false',
    'columns[4][data]': '4', 'columns[4][name]': '', 'columns[4][searchable]': 'true', 'columns[4][orderable]': 'true',  'columns[4][search][value]': '', 'columns[4][search][regex]': 'false',
    'columns[5][data]': '5', 'columns[5][name]': '', 'columns[5][searchable]': 'true', 'columns[5][orderable]': 'true',  'columns[5][search][value]': '', 'columns[5][search][regex]': 'false',
    'columns[6][data]': '6', 'columns[6][name]': '', 'columns[6][searchable]': 'true', 'columns[6][orderable]': 'false', 'columns[6][search][value]': '', 'columns[6][search][regex]': 'false',
    'columns[7][data]': '7', 'columns[7][name]': '', 'columns[7][searchable]': 'true', 'columns[7][orderable]': 'false', 'columns[7][search][value]': '', 'columns[7][search][regex]': 'false',
    'order[0][column]': '5', 'order[0][dir]': 'desc',
    start: String(start),
    length: String(length),
    'search[value]': '',
    'search[regex]': 'false'
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'Authorization': `Bearer ${token}`
    },
    body: params.toString()
  });

  return await response.json();
}

/**
 * Entry point — wraps main() in an infinite loop so the CLI
 * can be re-run for a new category without restarting the process.
 * Exits with code 1 on any unhandled error.
 */
const run = async () => {
  try {
    while (true) {
      const instance = new UI();
      await main(instance);
      await instance.closeQuestion();
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();

/**
 * Main orchestrator — handles the full download workflow:
 *   1. Authenticates and prompts user for a media category ID
 *   2. Builds the full category tree (root + all nested children)
 *   3. Phase 1: Collects ALL unique media items across every category
 *      using paginated listMediaPage() calls and a Map for deduplication
 *   4. Phase 2: Downloads every unique media item via batcher(),
 *      with SDK-first and chained direct HTTP fallback strategy
 *   5. Zips the output folder and cleans up
 *   6. Prints a summary of any failed downloads at the end
 *
 * @param {UI} instance - UI prompt instance used to read user input
 */
async function main(instance) {
  const config = await instance.start();
  const token = config['t4_token'];

  const { profile, mediaCategory, media } = new Client(rsUrl, token, 'en', fetch);

  console.clear();

  const { firstName } = await profile.get();
  console.log(`Hello ${firstName},\n\nPlease enter the ID of the media category you'd like to download:`);

  const { mediaCategoryId } = await instance.ask([{
    name: 'mediaCategoryId',
    description: 'Enter media category ID, not name',
    required: true
  }]);

  // ─────────────────────────────────────────────────────────────
  // Get root category
  // ─────────────────────────────────────────────────────────────
  let rootCategories = [];
  try {
    const selectedCategory = await mediaCategory.get(mediaCategoryId, 'en');
    rootCategories.push({
      id: mediaCategoryId,
      name: selectedCategory.name,
      path: `./output/${selectedCategory.name}`
    });
  } catch (error) {
    console.log('Failed to fetch category or parent due to ', error);
  }

  const collectionObjs = [];

  /**
   * Recursively walks the category tree and pushes every descendant
   * category into collectionObjs with its full nested folder path.
   * Called once per root category after fetching its children.
   *
   * @param {string} parentPath - Folder path of the parent category so far
   * @param {Array}  children   - Array of child category objects from mediaCategory.list()
   */
  const parseChildren = (parentPath, children) => {
    children.forEach(child => {
      const { id, name, children: childChildren } = child;
      const currentPath = `${parentPath}/${name}`;
      collectionObjs.push({ id, name, path: currentPath });
      if (childChildren.length > 0) parseChildren(currentPath, childChildren);
    });
  };

  if (!await exists('./output/')) {
    await mkdir('./output/', { recursive: true });
  }

  try {
    for (let cat of rootCategories) {
      collectionObjs.push(cat);
      const children = (await mediaCategory.list(cat.id, 'en'))[0].children;
      parseChildren(cat.path, children);
    }

    // Create all category folders upfront, even if they end up empty
    await Promise.all(collectionObjs.map(async obj => {
      try {
        await mkdir(resolve(obj.path), { recursive: true });
      } catch (e) {}
    }));
  } catch (error) {
    console.log('Failed to get category children due to ', error);
  }

  console.log(`Total categories found: ${collectionObjs.length}`);

  // ─────────────────────────────────────────────────────────────
  // PHASE 1: Collect ALL unique media using listMediaPage()
  // Iterates every category with paginated requests (PAGE_SIZE=50).
  // Uses a Map keyed by media ID to deduplicate items that appear
  // in multiple categories.
  // ─────────────────────────────────────────────────────────────
  const uniqueMediaMap = new Map();
  const PAGE_SIZE = 50;

  for (let cat of collectionObjs) {
    let start = 0;
    let total_media = 0;

    do {
      const req = await listMediaPage(token, cat.id, 'en', start, PAGE_SIZE);
      const mediaRows = req.mediaRows || [];
      total_media = req.recordsTotal || 0;

      if (mediaRows.length === 0) break;

      for (const mediaItem of mediaRows) {
        if (!uniqueMediaMap.has(mediaItem.id)) {
          uniqueMediaMap.set(mediaItem.id, { mediaItem, cat });
        }
      }

      start += PAGE_SIZE;
    } while (start < total_media);
  }

  console.log(`Total unique media items found: ${uniqueMediaMap.size}`);

  // ─────────────────────────────────────────────────────────────
  // PHASE 2: Download all unique media via batcher()
  // Processes 10 items concurrently with a 500ms delay between
  // batches to avoid overwhelming the T4 API.
  // Failures are collected and printed as a summary at the end.
  // ─────────────────────────────────────────────────────────────
  const allMediaEntries = Array.from(uniqueMediaMap.values());
  const failedItems = [];

  await batcher(allMediaEntries, 10, 500, async ({ mediaItem, cat }) => {
    try {
      await downloadMedia(token, media, mediaItem, resolve(cat.path));
    } catch (e) {
      // Build "Parent > Child > ..." location string from the folder path
      const locationPath = cat.path
        .replace('./output/', '')
        .replace(/\//g, ' > ');

      failedItems.push({
        name:     mediaItem.name,
        id:       mediaItem.id,
        location: locationPath,
        reason:   e.message
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Failed items summary — printed after all downloads complete.
  // Shows file name, media ID, full category location path, and reason.
  // ─────────────────────────────────────────────────────────────
  if (failedItems.length > 0) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`FAILED DOWNLOADS SUMMARY (${failedItems.length} item${failedItems.length > 1 ? 's' : ''})`);
    console.log(`${'─'.repeat(70)}`);
    failedItems.forEach((item, i) => {
      console.log(`\n  [${i + 1}] File     : ${item.name}`);
      console.log(`       Media ID : ${item.id}`);
      console.log(`       Location : ${item.location}`);
      console.log(`       Reason   : ${item.reason}`);
    });
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`NOTE: These files could not be downloaded from any endpoint.`);
    console.log(`      They are likely missing, corrupted, or pending approval`);
    console.log(`      in the T4 CMS and cannot be retrieved via the API.`);
    console.log(`${'─'.repeat(70)}\n`);
  } else {
    console.log('\nAll media downloaded successfully!');
  }

  // ─────────────────────────────────────────────────────────────
  // ZIP and cleanup
  // ─────────────────────────────────────────────────────────────
  console.log('Creating Zip file...');
  await zip(resolve('./output'), resolve(`./${mediaCategoryId}.zip`));
  console.log('Deleting output folder...');
  await rm(resolve('./output'), { recursive: true, force: true });
  console.log('Finished!');
}

/**
 * Downloads a single media item to the given folder.
 * Strategy — SDK first, then chains through 3 direct HTTP fallback
 * endpoints in order. Only throws (marks as failed) if ALL attempts fail.
 *
 *   Attempt 1 — media.downloadSingle() via T4 SDK
 *   Attempt 2 — GET /media/{id}/en/download  (language-scoped)
 *   Attempt 3 — GET /media/{id}/download     (without language)
 *   Attempt 4 — GET /media/{id}/content      (raw binary endpoint)
 *
 * @param {string} token    - Bearer auth token for direct HTTP fallback calls
 * @param {object} media    - T4 SDK media client (from new Client())
 * @param {object} mediaObj - Media item object containing id and fileName
 * @param {string} folder   - Absolute folder path to write the file into
 */
async function downloadMedia(token, media, mediaObj, folder) {
  let buffer;

  try {
    // Attempt 1 — SDK (works for most current/approved items)
    buffer = await media.downloadSingle(mediaObj.id, 'media');
  } catch (e) {
    // SDK failed (missing .version on old/pending/archived assets)
    // — try each fallback endpoint in order until one succeeds
    const fallbackUrls = [
      `${rsUrl}/media/${mediaObj.id}/en/download`, // Attempt 2 — language-scoped
      `${rsUrl}/media/${mediaObj.id}/download`,    // Attempt 3 — without language
      `${rsUrl}/media/${mediaObj.id}/content`      // Attempt 4 — raw binary
    ];

    let downloaded = false;

    for (const url of fallbackUrls) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          buffer = await response.arrayBuffer();
          downloaded = true;
          break; // success — stop trying further endpoints
        }
      } catch (fetchErr) {
        // This endpoint threw entirely — continue to next
        continue;
      }
    }

    if (!downloaded) {
      throw new Error(
        `All download attempts failed — file is likely missing, corrupted, or pending approval in T4 CMS`
      );
    }
  }

  if (!await exists(folder)) await mkdir(folder, { recursive: true });
  await writeFile(`${folder}/${mediaObj.fileName}`, Buffer.from(buffer));
}
