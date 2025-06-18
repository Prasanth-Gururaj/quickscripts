#!/usr/bin/env node
import path, { resolve } from 'path';
import { writeFile, mkdir, rm } from 'fs/promises';
import { zip } from 'zip-a-folder';
import fetch from 'node-fetch';
import lodash from 'lodash';
import fs from 'fs';
// Local imports with relative paths
import { UI, exists } from '../promptUI/UI.mjs';
import { Client, batcher } from '../../../../t4apiwrapper/t4.ts/esm/index.js';
import * as XLSX from 'xlsx';
const { groupBy } = lodash;

const rsUrl = 'https://cms.seattleu.edu/terminalfour/rs';

// Add logger utility
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  debug: (msg) => process.env.DEBUG && console.log(`[DEBUG] ${msg}`),
  stats: (msg) => console.log(`[STATS] ${msg}`)
};

// Fix IIFE with proper error handling
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

// Start the application
run();

async function main(instance) {
  const startTime = Date.now();
  logger.info('Starting content export process...');
  
  const config = await instance.start()
  const { profile, content, hierarchy } = new Client(rsUrl, config['t4_token'], 'en', fetch)
  console.clear()

  const { firstName } = await profile.get()
  logger.info(`Authenticated as: ${firstName}`);

  const { sectionIds } = await instance.ask([{
    name: 'sectionIds', description: 'Enter section IDs separated by commas (e.g., 123,456,789)', required: true
  }])
  const { maxSectionDepth } = await instance.ask([{
    name: 'maxSectionDepth', description: 'Enter maximum level in the section tree (0 will give current section, 1 will give from current section and its children, etc)', required: true
  }])

  let allData = [];
  let processedCount = 0;
  let errorCount = 0;
  const sectionIdList = sectionIds.split(',').map(id => id.trim());
  logger.info(`Processing ${sectionIdList.length} sections with max depth ${maxSectionDepth}`);

  for (const sectionId of sectionIdList) {
    try {
      const parentSection = await hierarchy.getSection(sectionId);
      logger.info(`Processing section ${sectionId}: ${parentSection.name}`);
      const sectionContents = await getAllContents(parentSection, hierarchy, 0, parseInt(maxSectionDepth));
      
      for (const item of sectionContents) {
        try {
          const contentItem = await content.get(item.id, item.parentSectionId);
          processedCount++;
          logger.debug(`Processed content ${item.id} in section ${item.parentSectionId}`);
          
          allData.push({
            contentid: item.id || null,
            id: contentItem.id || null,
            publishDate: contentItem.publishDate || null,
            expiryDate: contentItem.expiryDate || null,
            reviewDate: contentItem.reviewDate || null,
            contentID: contentItem.contentTypeID || null,
            status: item.status || null,
            name: contentItem.name || null,
            elements: contentItem.elements || null,
            types: contentItem.types || null,
            headerInfo: createHeader(contentItem.contentType?.contentTypeElements) || null,
            parentSectionId: item.parentSectionId || null,
            contentName: contentItem.contentType?.name || null
          });
        } catch (error) {
          errorCount++;
          logger.error(`Failed to process content ${item.id}: ${error.message}`);
        }
      }
    } catch (error) {
      errorCount++;
      logger.error(`Failed to process section ${sectionId}: ${error.message}`);
    }
  }

  try {
    await createExcelFiles(allData);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.stats(`
Export Summary:
--------------
Total sections processed: ${sectionIdList.length}
Total content items: ${processedCount}
Errors encountered: ${errorCount}
Time taken: ${duration} seconds
    `);
  } catch (error) {
    logger.error(`Failed to create Excel file: ${error.message}`);
    throw error;
  }
}

function createHeader(contentInfo){
  const header = contentInfo.map(element=>{
    return {
      name: element.name,
      type: element.type,
      maxSize: element.maxSize
    }
  })
  return header;
}

async function getFields(contentInfo){
  let fields = [null,null, "ID"];
  Object.keys(contentInfo.elements).map(element=>{
     fields.push(element.split('#')[0] );
  })
  return fields;
}

function createExcelFiles(data) {
  logger.info(`Creating Excel file with ${data.length} content items`);
  const workbook = XLSX.utils.book_new();
  const groupedByContentID = groupBy(data, 'contentID');
  
  Object.entries(groupedByContentID).forEach(([contentID, entries]) => {
    const headers = [
      'ContentTypeID', 
      'Section ID', 
      'Content ID', 
      'Publish Date',
      'Expiry Date',
      'Review Date',
      ...entries[0].headerInfo.map(header => header.name)
    ];
    const headerTypes = [
      '', 
      '', 
      '',
      'Plain Text',  // Changed from 'Date' to 'Text'
      'Plain Text',  // Changed from 'Date' to 'Text'
      'Plain Text',  // Changed from 'Date' to 'Text'
      ...entries[0].headerInfo.map(header => 
        entries[0].types.find(type => type.id === parseInt(header.type))?.name || header.type
      )
    ];
    
    const ws_data = [headerTypes, headers];
    
    entries.forEach(entry => {
      const elementValues = entries[0].headerInfo.map(header => {
        const elementKey = Object.keys(entry.elements).find(key => key.startsWith(header.name + '#'));
        let cellData = elementKey ? entry.elements[elementKey] : '';
        cellData = (cellData != null) ? String(cellData) : '';
        
        if (cellData.length > 32767) {
          logger.warn(`Data truncated for cell: ${header.name}, original length: ${cellData.length}`);
          cellData = cellData.substring(0, 32767);
        }
        return cellData;
      });
      
      const row = [
        contentID, 
        entry.parentSectionId, 
        entry.id,
        convertTimestampToExcelDate(entry.publishDate),
        convertTimestampToExcelDate(entry.expiryDate),
        convertTimestampToExcelDate(entry.reviewDate),
        ...elementValues
      ];
      ws_data.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Remove date formatting section since we're using strings now
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },  // Adjusted width for date string
      { wch: 12 },  // Adjusted width for date string
      { wch: 12 },  // Adjusted width for date string
      ...Array(ws_data[0].length - 6).fill({ wch: 20 })
    ];
    
    const sheetName = sanitizeSheetName(`${entries[0].contentName}`);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `sections_export_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
  logger.info(`Excel file created: ${filename}`);
}

function convertTimestampToExcelDate(timestamp) {
  if (!timestamp) return '';
  try {
    const date = new Date(parseInt(timestamp));
    if (isNaN(date.getTime())) return '';
    return date.toISOString(); // Returns yyyy-mm-dd format
  } catch (error) {
    logger.warn(`Invalid date conversion for timestamp: ${timestamp}`);
    return '';
  }
}

function sanitizeSheetName(name, maxLength = 31) {
  if (!name) return 'Sheet';
  let safeName = name.replace(/[\[\]\*\/\\?:]/g, '');
  if (safeName.length > maxLength) {
    logger.warn(`Sheet name truncated: "${name}" -> "${safeName.substring(0, maxLength)}"`);
    return safeName.substring(0, maxLength);
  }
  return safeName;
}

async function getAllContents(section, hierarchy, currentDepth = 0, maxDepth = 3) {
  let allContentList = [];

  try {
    const sectionContents = await hierarchy.getContents(section.id);
    const contentList = sectionContents.contents.map(content => ({
      id: content.id,
      name: content.name,
      status: content.status,
      parentSectionId: sectionContents.id
    }));
    allContentList = allContentList.concat(contentList);
    logger.debug(`Found ${contentList.length} items in section ${section.id} (depth ${currentDepth})`);

    if (currentDepth < maxDepth && section.subsections && section.subsections.length > 0) {
      logger.debug(`Processing ${section.subsections.length} subsections for section ${section.id}`);
      for (const subsection of section.subsections) {
        const subsectionContents = await getAllContents(subsection, hierarchy, currentDepth + 1, maxDepth);
        allContentList = allContentList.concat(subsectionContents);
      }
    }
  } catch (error) {
    logger.error(`Error getting contents for section ${section.id}: ${error.message}`);
  }

  return allContentList;
}