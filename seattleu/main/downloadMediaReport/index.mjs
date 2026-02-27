#!/usr/bin/env node

import path, { resolve } from 'path';
import fetch from 'node-fetch';
import ExcelJS from 'exceljs';
import { UI, exists } from '../promptUI/UI.mjs';
import { Client, batcher } from './node_modules/t4.ts/esm/index.js';

const rsUrl = 'https://cms.seattleu.edu/terminalfour/rs';

/**
 * Get FULL category path including ALL parents
 */
async function getFullCategoryPath(categoryId, mediaCategory) {
  const pathSegments = [];
  let currentId = categoryId;

  while (currentId) {
    try {
      const category = await mediaCategory.get(currentId, 'en');
      pathSegments.unshift(category.name);
      currentId = category.parentId || category.parent || null;
    } catch (error) {
      console.error(`Failed to fetch category ${currentId}:`, error.message);
      break;
    }
  }

  return pathSegments.join(' > ');
}

function getDocumentType(mediaItem) {
  if (mediaItem.mediaTypeName) return mediaItem.mediaTypeName;

  const directName =
    mediaItem.typeName ||
    mediaItem.mediaType?.name ||
    mediaItem.type?.name;
  if (directName) return directName;

  const fileName = mediaItem.fileName || mediaItem.name || '';
  const extension = fileName.split('.').pop()?.toUpperCase() || 'UNKNOWN';

  const typeMap = {
    PDF:  'Adobe PDF Document',
    DOC:  'Word Document',
    DOCX: 'Word Document',
    XLS:  'Excel Spreadsheet',
    XLSX: 'Excel Spreadsheet',
    PPT:  'PowerPoint',
    PPTX: 'PowerPoint',
    JPG:  'Image',
    JPEG: 'Image',
    PNG:  'Image',
    GIF:  'Image',
    SVG:  'Image',
    WEBP: 'Image',
    MP4:  'Video',
    MOV:  'Video',
    AVI:  'Video',
    MP3:  'Audio',
    WAV:  'Audio',
    TXT:  'Text File',
    CSV:  'CSV File',
    JSON: 'JSON File',
    XML:  'XML File',
    ZIP:  'Archive',
    RAR:  'Archive',
    TAR:  'Archive',
    GZ:   'Archive'
  };

  return typeMap[extension] || `File (${extension})`;
}


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

async function main(instance) {
  const config = await instance.start();
  const token = config['t4_token'];

  const { profile, mediaCategory, media } = new Client(
    rsUrl,
    token,
    'en',
    fetch
  );

  console.clear();

  const { firstName } = await profile.get();
  console.log(
    `Hello ${firstName},\n\nPlease enter the ID of the media category for usage report:`
  );

  const { mediaCategoryId } = await instance.ask([
    {
      name: 'mediaCategoryId',
      description: 'Enter media category ID',
      required: true
    }
  ]);

  console.log('Generating media usage report...');

  const rootPath = await getFullCategoryPath(mediaCategoryId, mediaCategory);

  let rootCategory;
  try {
    const selectedCategory = await mediaCategory.get(mediaCategoryId, 'en');
    rootCategory = {
      id: mediaCategoryId,
      name: selectedCategory.name,
      fullPath: rootPath
    };
  } catch (error) {
    console.log('Failed to fetch category:', error);
    return;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Build full category tree — same as working download script
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const collectionObjs = [];

  const parseChildren = (parentPath, children) => {
    children.forEach(child => {
      const { id, name, children: childChildren } = child;
      const fullPath = `${parentPath} > ${name}`;
      collectionObjs.push({ id, name, fullPath });
      if (childChildren && childChildren.length > 0) {
        parseChildren(fullPath, childChildren);
      }
    });
  };

  collectionObjs.push(rootCategory);

  try {
    const children = (await mediaCategory.list(rootCategory.id, 'en'))[0].children;
    parseChildren(rootPath, children);
  } catch (error) {
    console.log('Failed to get category children:', error.message);
  }

  console.log(`\nTotal categories found: ${collectionObjs.length}`);
  collectionObjs.forEach((c, i) => console.log(`  [${i + 1}] ${c.fullPath} (ID: ${c.id})`));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 1: Collect ALL unique media using direct API calls
  // with dynamic start + length (bypasses hardcoded start=0&length=10)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const uniqueMediaMap = new Map();
  const PAGE_SIZE = 50; // fetch 50 at a time 

  for (let cat of collectionObjs) {
    let start = 0;
    let total_media = 0;
    let pageCount = 0;

    do {
      const req = await listMediaPage(token, cat.id, 'en', start, PAGE_SIZE);
      const mediaRows = req.mediaRows || [];
      total_media = req.recordsTotal || 0;
      pageCount++;

      if (mediaRows.length === 0) break;

      for (const mediaItem of mediaRows) {
        if (!uniqueMediaMap.has(mediaItem.id)) {
          uniqueMediaMap.set(mediaItem.id, { mediaItem, cat });
        }
      }

      start += PAGE_SIZE;

    } while (start < total_media);

  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 2: Fetch usage for every unique media item
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const rows = [];
  const allMediaEntries = Array.from(uniqueMediaMap.values());

  await batcher(allMediaEntries, 10, 500, async ({ mediaItem, cat }) => {
    try {
      const usageData = await media.getMediaUsage(mediaItem.id, 'en');

      let usageArray = [];
      if (Array.isArray(usageData)) {
        usageArray = usageData;
      } else if (usageData?.data) {
        usageArray = usageData.data;
      } else if (usageData?.usages) {
        usageArray = usageData.usages;
      } else if (usageData) {
        usageArray = [usageData];
      }

      const documentType = getDocumentType(mediaItem);

      if (usageArray.length) {
        for (const usage of usageArray) {
          rows.push({
            categoryId:   cat.id,
            categoryName: cat.fullPath,
            mediaName:    mediaItem.name,
            mediaId:      mediaItem.id,
            documentType,
            fileName:     mediaItem.fileName  || 'N/A',
            contentName:  usage.contentName   || 'N/A',
            contentId:    usage.contentID     || 'N/A',
            status:       mediaItem.status    || 'Approved',
            lastModified: formatDate(mediaItem.lastModified),
            assetType:    usage.assetType     || 'content',
            variant:      usage.variant       || 'N/A',
            location:     (usage.location     || 'N/A').replace(/&raquo;/g, '>').trim(),
            occurrence:   usage.occurrences   || 1
          });
        }
      } else {
        rows.push({
          categoryId:   cat.id,
          categoryName: cat.fullPath,
          mediaName:    mediaItem.name,
          mediaId:      mediaItem.id,
          documentType,
          fileName:     mediaItem.fileName || 'N/A',
          contentName:  'N/A',
          contentId:    'N/A',
          status:       mediaItem.status   || 'Approved',
          lastModified: formatDate(mediaItem.lastModified),
          assetType:    'N/A',
          variant:      'N/A',
          location:     'Not used',
          occurrence:   0
        });
      }

    } catch {
      rows.push({
        categoryId:   cat.id,
        categoryName: cat.fullPath,
        mediaName:    mediaItem.name,
        mediaId:      mediaItem.id,
        documentType: getDocumentType(mediaItem),
        fileName:     mediaItem.fileName || 'N/A',
        contentName:  'N/A',
        contentId:    'N/A',
        status:       mediaItem.status   || 'Approved',
        lastModified: formatDate(mediaItem.lastModified),
        assetType:    'N/A',
        variant:      'N/A',
        location:     'Error fetching usage',
        occurrence:   0
      });
    }
  });


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 3: Write Excel
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Media Usage Report');

  sheet.columns = [
    { header: 'Category ID',   key: 'categoryId',   width: 12 },
    { header: 'Category Name', key: 'categoryName',  width: 50 },
    { header: 'Media Name',    key: 'mediaName',     width: 40 },
    { header: 'Media ID',      key: 'mediaId',       width: 12 },
    { header: 'Document Type', key: 'documentType',  width: 24 },
    { header: 'File Name',     key: 'fileName',      width: 30 },
    { header: 'Content Name',  key: 'contentName',   width: 40 },
    { header: 'Content ID',    key: 'contentId',     width: 12 },
    { header: 'Status',        key: 'status',        width: 15 },
    { header: 'Last Modified', key: 'lastModified',  width: 22 },
    { header: 'Asset Type',    key: 'assetType',     width: 15 },
    { header: 'Variant',       key: 'variant',       width: 25 },
    { header: 'Location',      key: 'location',      width: 60 },
    { header: 'Occurrence',    key: 'occurrence',    width: 12 }
  ];

  sheet.getRow(1).font = { bold: true };
  rows.forEach(r => sheet.addRow(r));

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const outPath = resolve(`./Media_Usage_Report_${timestamp}.xlsx`);
  await workbook.xlsx.writeFile(outPath);

  console.log(`\nMedia usage report downloaded successfully!`);
  console.log(`  Location           : ${outPath}`);
}

function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
