#!/usr/bin/env node
import fetch from 'node-fetch';
import lodash from 'lodash';
import { writeFile } from 'fs/promises';
import * as XLSX from 'xlsx';
// Local imports with relative paths
import { UI, exists } from '../promptUI/UI.mjs';
import { Client, batcher } from '../../../../t4apiwrapper/t4.ts/esm/index.js';

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

async function main(instance) {
  const startTime = Date.now();
  logger.info('Starting content export process...');
  
  const config = await instance.start()
  const { profile, content, hierarchy, contentType } = new Client(rsUrl, config['t4_token'], 'en', fetch)
  console.clear()

  const { firstName } = await profile.get()
  logger.info(`Authenticated as: ${firstName}`);

  const { contentTypeId } = await instance.ask([{
    name: 'contentTypeId', 
    description: 'Enter content type ID to download', 
    required: true
  }])
  logger.info(`Content Type ID: ${contentTypeId}`);
  
  const getContentTypes = await contentType.getReports(contentTypeId);
  // save the content type report to a json file
  const contentTypeReport = JSON.stringify(getContentTypes, null, 2);
  // const contentTypeReportPath = `./contentTypeReport_${contentTypeId}.json`;
  // await writeFile(contentTypeReportPath, contentTypeReport);
  // logger.info(`Content Type Report saved to ${contentTypeReportPath}`);
  
  // Extract content IDs from the report
  const contentItems = getContentTypes.rows || [];
  logger.info(`Found ${contentItems.length} content items in the report`);
  
  // Create a map of section IDs to prefetch
  const sectionIds = [...new Set(contentItems.map(item => item.section.parentId))];
  logger.info(`Found ${sectionIds.length} unique sections`);
  
  // Prefetch section names to avoid multiple API calls
  const sectionMap = new Map();
  for (const sectionId of sectionIds) {
    try {
      const section = await hierarchy.get(sectionId);
      sectionMap.set(section.id.toString(), section.name);
    } catch (error) {
      logger.error(`Failed to fetch section ${sectionId}: ${error.message}`);
      sectionMap.set(sectionId.toString(), 'Unknown Section');
    }
  }
  
  // Now download content details for each item
  let allData = [];
  let processedCount = 0;
  let errorCount = 0;
  
  for (const item of contentItems) {
    try {
      const contentItem = await content.get(item.content.id, item.section.parentId);
      processedCount++;
      logger.info(`Processed content ${item.content.id} in section ${item.section.parentId}`);
      
      allData.push({
        contentid: item.content.id || null,
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
        parentSectionId: item.section.parentId || null,
        sectionName: sectionMap.get(item.section.parentId.toString()) || 'Unknown Section',
        contentName: contentItem.contentType?.name || null
      });
    } catch (error) {
      errorCount++;
      logger.error(`Failed to process content ${item.content.id}: ${error.message}`);
    }
  }

  try {
    await createExcelFiles(allData);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.stats(`
Export Summary:
--------------
Content Type ID: ${contentTypeId}
Content Type Name: ${getContentTypes.details.contentTypeName || "Unknown"}
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
  if (!contentInfo || !Array.isArray(contentInfo)) return [];
  
  const header = contentInfo.map(element => {
    return {
      name: element.name,
      type: element.type,
      maxSize: element.maxSize
    }
  });
  return header;
}

function createExcelFiles(data) {
  if (!data || data.length === 0) {
    logger.warn('No data available to create Excel file');
    return;
  }
  
  logger.info(`Creating Excel file with ${data.length} content items`);
  const workbook = XLSX.utils.book_new();
  const groupedByContentID = groupBy(data, 'contentID');
  
  Object.entries(groupedByContentID).forEach(([contentID, entries]) => {
    if (!entries[0].headerInfo) {
      logger.warn(`Skipping content type ${contentID} - missing header info`);
      return;
    }
    
    const headers = [
      'ContentTypeID', 
      'Section ID', 
      'Section Name',
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
      '',
      'Plain Text',
      'Plain Text',
      'Plain Text',
      ...entries[0].headerInfo.map(header => 
        entries[0].types && entries[0].types.find(type => type.id === parseInt(header.type))?.name || header.type
      )
    ];
    
    const ws_data = [headerTypes, headers];
    
    entries.forEach(entry => {
      const elementValues = entries[0].headerInfo.map(header => {
        const elementKey = Object.keys(entry.elements || {}).find(key => key.startsWith(header.name + '#'));
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
        entry.sectionName || 'Unknown Section',
        entry.id,
        convertTimestampToExcelDate(entry.publishDate),
        convertTimestampToExcelDate(entry.expiryDate),
        convertTimestampToExcelDate(entry.reviewDate),
        ...elementValues
      ];
      ws_data.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(ws_data);
    
    worksheet['!cols'] = [
      { wch: 15 },  // ContentTypeID
      { wch: 10 },  // Section ID
      { wch: 40 },  // Section Name (wider column for longer names)
      { wch: 10 },  // Content ID
      { wch: 12 },  // Publish Date
      { wch: 12 },  // Expiry Date
      { wch: 12 },  // Review Date
      ...Array(ws_data[0].length - 7).fill({ wch: 20 })
    ];
    
    const sheetName = sanitizeSheetName(`${entries[0].contentName || 'Content_' + contentID}`);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `contentType_export_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
  logger.info(`Excel file created: ${filename}`);
}

function convertTimestampToExcelDate(timestamp) {
  if (!timestamp) return '';
  try {
    const date = new Date(parseInt(timestamp));
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0]; // Returns yyyy-mm-dd format
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

// Fix IIFE with proper error handling
const run = async () => {
  try {
    logger.info('Starting the application...');
    const instance = new UI();
    await main(instance);
    await instance.closeQuestion();
  } catch (err) {
    logger.error(`Error: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
};

// Start the application
run();