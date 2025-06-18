#!/usr/bin/env node
// const path = require('path');
// const { resolve } = require('path')
// const { writeFile, mkdir, rm } = require('fs/promises');
// const { zip } = require('zip-a-folder');
// const fetch = require('node-fetch');
// // const fetch = global.fetch;
// // const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
// // Local imports with relative paths
// const { UI, exists } = require('../promptUI/UI.mjs');
// const { Client, batcher } = require('../../../../t4apiwrapper/t4.ts/esm/index.js');
// // const { UI, exists } = require('./promptUI/UI.mjs');
// // const { Client, batcher } = require('./t4apiwrapper/t4.ts/esm/index.js');

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
  const config = await instance.start()
  const { profile, content, hierarchy } = new Client(rsUrl, config['t4_token'], 'en', fetch)
  // if (!await isAuthorized()) {
  //   console.log('Failed to login to t4...')
  //   return null
  // }
  console.clear()

  const { firstName } = await profile.get()
  console.log(`Hello ${firstName},\n\nPlease enter the ID of the section you'd like to download:`)
  const { sectionId } = await instance.ask([{
    name: 'sectionId', description: 'Enter section ID, not name', required: true
  }])
  const { maxSectionDepth } = await instance.ask([{
    name: 'maxSectionDepth', description: 'Enter maximum level in the section tree (0 will give current section, 1 will give from current section and its children, etc)', required: true
  }])
  const parentSection = await hierarchy.getSection(sectionId)
  const allContents = await getAllContents(parentSection, hierarchy, 0, parseInt(maxSectionDepth)); 
  console.log(allContents)// Limit to 3 levels deep
  // const mainWorkbook = XLSX.utils.book_new(); //Create a new workbook

  // const worksheet = XLSX.utils.json_to_sheet(allContents); //Create a worksheet

  // XLSX.utils.book_append_sheet(mainWorkbook, worksheet, "Contents Extracted"); //Append the worksheet to the workbook
  // XLSX.writeFile(mainWorkbook, `extracted_sections_id.xlsx`);
  // console.log(`Excel file created for metadata of all contents in section ${sectionId}`);


  const contentItem = await content.get(allContents[allContents.length - 1].id, allContents[allContents.length - 1].parentSectionId)
  let allData = [];
  await batcher(allContents, 20,1000, async (item) => {
  // for (const item of allContents) {
    const contentItem = await content.get(item.id, item.parentSectionId);

    allData.push({id : contentItem.id, contentID : contentItem.contentTypeID, status : item.status, name : contentItem.name, elements : contentItem.elements, types : contentItem.types, 
      headerInfo: createHeader(contentItem.contentType.contentTypeElements), parentSectionId: item.parentSectionId, contentName:contentItem.contentType.name});
  });
  console.log('First 5 rows of allData:', allData.slice(0, 5));
  createExcelFiles(allData);

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
    //  + " (max size: " + element.split('#')[1].split(':')[0]+")" // 
  })
  return fields;
}

function createExcelFiles(data) {
  const groupedBySection = groupBy(data, 'parentSectionId');
  Object.entries(groupedBySection).forEach(([parentSectionId, records]) => {
    const workbook = XLSX.utils.book_new();
    const groupedByContentID = groupBy(records, 'contentID');
    Object.entries(groupedByContentID).forEach(([contentID, entries]) => {
      const headers = entries[0].headerInfo.map(header => header.name);

      const headerTypes = entries[0].headerInfo.map(header => 
        entries[0].types.find(type => type.id === parseInt(header.type))?.name || header.type
      );
      const ws_data = [headerTypes, headers];
      
      entries.forEach(entry => {
        const row = headers.map(header => {
          const elementKey = Object.keys(entry.elements).find(key => key.startsWith(header + '#'));
          let cellData = elementKey ? entry.elements[elementKey] : '';
          // Handle null/undefined values and ensure string type
          cellData = (cellData != null) ? String(cellData) : '';
          
          if (cellData.length > 32767) {
            console.warn(`Data truncated for cell: ${header}, original length: ${cellData.length}`);
            cellData = cellData.substring(0, 32767);
          }
          return cellData;
        });
        ws_data.push(row);
      });

      ws_data[0].unshift(contentID);  
      ws_data.slice(1).forEach(row => row.unshift(null));
      const worksheet = XLSX.utils.aoa_to_sheet(ws_data);
      worksheet['!cols'] = [{ wch: 10 }, { wch: 10 }].concat(Array(ws_data[0].length).fill({ wch: 20 }));
      XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(`${entries[0].contentName}`));
    });

    XLSX.writeFile(workbook, `output_${parentSectionId}.xlsx`);
    console.log(`Excel file created for section ${parentSectionId}`);
  });
}


function sanitizeSheetName(name, maxLength = 31) {
  if (!name) return 'Sheet';
  // Remove invalid characters and trim
  let safeName = name.replace(/[\[\]\*\/\\?:]/g, '');
  if (safeName.length > maxLength) {
    console.warn(`Sheet name truncated: "${name}" -> "${safeName.substring(0, maxLength)}"`);
    return safeName.substring(0, maxLength);
  }
  return safeName;
}


async function getAllContents(section, hierarchy, currentDepth = 0, maxDepth = 3) {
  let allContentList = [];

  // Get contents for current section
  const sectionContents = await hierarchy.getContents(section.id);
  const contentList = sectionContents.contents.map(content => ({
    id: content.id,
    name: content.name,
    status: content.status,
    parentSectionId: sectionContents.id
  }));
  allContentList = allContentList.concat(contentList);

  // Only recurse if we haven't hit the depth limit
  if (currentDepth < maxDepth && section.subsections && section.subsections.length > 0) {
    for (const subsection of section.subsections) {
      const subsectionContents = await getAllContents(subsection, hierarchy, currentDepth + 1, maxDepth);
      allContentList = allContentList.concat(subsectionContents);
    }
  }

  return allContentList;
}