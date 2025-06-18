#!/usr/bin/env node

import path, { resolve } from 'path';
import { writeFile, mkdir, rm } from 'fs/promises';
import fetch from 'node-fetch';
import fs from 'fs';
import { UI, exists } from '../promptUI/UI.mjs';
import { Client, batcher } from '../../../../t4apiwrapper/t4.ts/esm/index.js';
import * as XLSX from 'xlsx';
import { decode } from 'html-entities';
import { stat } from 'fs/promises';
import chalk from 'chalk'; // Add this package for colored console output

const rsUrl = 'https://cms.seattleu.edu/terminalfour/rs';
const DEBUG = process.env.DEBUG === 'true';

// Enhanced logging functions
function log(message, ...args) {
    console.log(chalk.blue('INFO:'), message, ...args);
}

function success(message, ...args) {
    console.log(chalk.green('✓'), message, ...args);
}

function warn(message, ...args) {
    console.log(chalk.yellow('⚠️'), message, ...args);
}

function error(message, ...args) {
    console.error(chalk.red('✗'), message, ...args);
}

function debugLog(...args) {
    if (DEBUG) {
        console.log(chalk.gray('[DEBUG]'), ...args);
    }
}

// Main execution function
const run = async () => {
    try {
        while (true) {
            const instance = new UI({ keys: ['t4_token'] });
            await main(instance);
            await instance.closeQuestion();
        }
    } catch (err) {
        error('Fatal error occurred:', err.message);
        process.exit(1);
    }
};

run();

async function main(instance) {
    try {
        const config = await instance.start();
        const client = new Client(rsUrl, config['t4_token'], 'en', fetch);
        const { content, contentType, list, serverSideLink, upload, hierarchy, profile } = client;

        // Check authorization
        if (!await client.isAuthorized()) throw Error('Invalid T4 token');
        const { firstName } = await profile.get()
        console.log(`Hello ${firstName},\n\n`)
        const filePath = await getFilePath(instance);
        const { sheets } = await loadExcelFile(instance, filePath);

        log(`Available sheets: ${sheets.join(', ')}`);

        const response = await instance.ask([{
            name: 'sheetName',
            description: 'Enter the sheet name (press Enter for first sheet, or type "all" for all sheets)',
            required: false
        }]);

        const sheetName = response.sheetName || sheets[0];
        const sheetsToProcess = sheetName === 'all' ? sheets : [sheetName];

        log(`Will process ${sheetsToProcess.length} sheet(s): ${sheetsToProcess.join(', ')}`);

        // Track global objects for performance
        const listObjs = {};
        const totalStats = { success: 0, error: 0 };

        // Process each sheet
        for (const currentSheet of sheetsToProcess) {
            log(`\nProcessing sheet: ${currentSheet}`);
            const results = await parseExcelWithDataTypes(filePath, currentSheet);

            log(`Found ${results.length} row(s) to process`);
            let sheetStats = { success: 0, error: 0 };

            await batcher(results, 20, 2000, async (row) => {
                try {
                    // Extract section ID from row data
                    const sectionId = Number(row['Section ID']?.value);
                    if (!sectionId || isNaN(sectionId)) {
                        throw new Error('Invalid Section ID');
                    }

                    // Extract content type ID
                    const contentTypeId = Number(row['ContentTypeID']?.value);
                    if (!contentTypeId || isNaN(contentTypeId)) {
                        throw new Error('Invalid Content Type ID');
                    }

                    // Check if updating existing content or creating new
                    const contentId = row['Content ID']?.value ? Number(row['Content ID'].value) : null;

                    // Convert dates to ISO strings
                    const reviewDate = row['Review Date']?.value ? 
                      new Date(row['Review Date'].value).toISOString() : undefined;
                    const publishDate = row['Publish Date']?.value ? 
                      new Date(row['Publish Date'].value).toISOString() : undefined;
                    const expiryDate = row['Expiry Date']?.value ? 
                      new Date(row['Expiry Date'].value).toISOString() : undefined;

                    let ct = await contentType.get(contentTypeId);

                    // Create or update content
                    let result;
                    if (contentId) {
                        // For existing content - PROCESS ELEMENTS ONLY ONCE
                        const elements = await processRowElements(row, { 
                            content, list, serverSideLink, upload, hierarchy, 
                            contentType: ct, listObjs, sectionId, contentId 
                        });
                        
                        result = await content.modify(contentId, sectionId, {
                            elements: elements, 
                            publishDate: publishDate,
                            expiryDate: expiryDate, 
                            reviewDate: reviewDate
                        }, 'en');
                        
                        // Better error handling
                        if (result.errorText) {
                            throw new Error(`Failed to modify existing content ${contentId}: ${result.errorText}`);
                        }
                        
                        success(`Updated content ${contentId}. New version: ${result.version || 'unknown'}`);
                    } else {
                        // For new content - Fixed approach
                        const createResult = await content.create(sectionId, {
                            elements: {}, // Start with empty elements
                            contentTypeID: contentTypeId,
                            language: 'en',
                            status: 0,
                            publishDate: publishDate,
                            expiryDate: expiryDate, 
                            reviewDate: reviewDate
                        });

                        // Check for creation errors
                        if (createResult.errorText) {
                            throw new Error(`Failed to create content: ${createResult.errorText}`);
                        }

                        if (!createResult || !createResult.id) {
                            throw new Error('Failed to create initial content item - no ID returned');
                        }

                        const newContentId = createResult.id;
                        success(`Created initial content with ID: ${newContentId}`);

                        // Use the same content ID for both modify and element processing
                        const processContentId = Math.abs(newContentId);
                        
                        // PROCESS ELEMENTS with the correct content ID
                        const elements = await processRowElements(row, { 
                            content, list, serverSideLink, upload, hierarchy, 
                            contentType: ct, listObjs, sectionId, contentId: processContentId 
                        });

                        // Now modify the content with the processed elements using the ORIGINAL content ID
                        result = await content.modify(newContentId, sectionId, {
                            elements: elements
                        }, 'en');

                        // Better error handling for modification
                        if (result && result.errorText) {
                            console.error(`Modification error details:`, {
                                contentId: newContentId,
                                sectionId: sectionId,
                                errorText: result.errorText,
                                elements: Object.keys(elements)
                            });
                            throw new Error(`Failed to modify content ${newContentId}: ${result.errorText}`);
                        }

                        success(`Updated content with elements. ID: ${result.id}, Version: ${result.version || 'unknown'}`);

                        // Approve if content ID was negative (draft)
                        if (newContentId < 0) {
                            try {
                                const approveResult = await content.approve(processContentId, sectionId);
                                if (approveResult && approveResult.errorText) {
                                    warn(`Approval failed: ${approveResult.errorText}`);
                                } else {
                                    success(`Content ${processContentId} approved`);
                                }
                            } catch (e) {
                                warn(`Could not approve content: ${e.message}`);
                            }
                        }
                    }

                    sheetStats.success++;
                    totalStats.success++;
                } catch (error) {
                    console.error(`✗ Error processing row:`, error.message);
                    sheetStats.error++;
                    totalStats.error++;
                }
            });

            log(`\nSheet "${currentSheet}" Summary:
      Successful updates: ${sheetStats.success}
      Failed updates: ${sheetStats.error}
      Total processed: ${results.length}`);
        }

        log(`\nFinal Summary:
    Total successful updates: ${totalStats.success}
    Total failed updates: ${totalStats.error}
    Total sheets processed: ${sheetsToProcess.length}`);

    } catch (error) {
        console.error('Fatal error:', error.message);
        if (DEBUG) {
            console.error('Stack trace:', error.stack);
        }
        throw error;
    }
}

// Process row data into proper elements format for T4
async function processRowElements(row, services) {
    const { content, list, serverSideLink, upload, hierarchy, contentType, listObjs, sectionId, contentId } = services;
    const elements = {};

    // Process each field in the row
    for (const key in row) {
        // Skip metadata fields
        if (['ContentTypeID', 'Section ID', 'Content ID',"Publish Date", "Expiry Date", "Review Date" ].includes(key)) continue;

        const value = row[key].value;
        const datatype = row[key].datatype;

        if (value === "" || value === null || value === undefined) continue;

        try {
            // Generate the element key with type info
            const element = findElementInContentType(contentType, key);

            if (!element) {
                warn(`Could not find element "${key}" in content type`);
                continue;
            }

            const elementKey = `${key}#${element.id}:${element.type}`;

            // Process based on element type
            debugLog(`Processing field "${key}" with type ${element.type}`);
            switch (element.type) {
                case 5: // Date type
                    // Convert date strings to numeric timestamp
                    if (typeof value === 'string') {
                        try {
                            // If it's already a numeric string representing a timestamp
                            if (/^\d+$/.test(value)) {
                                let timestamp = Number(value);
                                // Ensure timestamp is 13 digits (milliseconds since epoch)
                                while (timestamp.toString().length < 13) {
                                    timestamp = timestamp * 10;
                                }
                                elements[elementKey] = timestamp;
                            } else {
                                // If it's a date string, parse it to timestamp
                                let timestamp = new Date(value).getTime();
                                if (!isNaN(timestamp)) {
                                    // Ensure timestamp is 13 digits (milliseconds since epoch)
                                    while (timestamp.toString().length < 13) {
                                        timestamp = timestamp * 10;
                                    }
                                    elements[elementKey] = timestamp;
                                } else {
                                    warn(`Invalid date format for ${key}: ${value}`);
                                    elements[elementKey] = value; // Keep original if parsing fails
                                }
                            }
                        } catch (err) {
                            warn(`Error converting date ${value}: ${err.message}`);
                            elements[elementKey] = value;
                        }
                    } else if (typeof value === 'number') {
                        // Already a number, ensure it's 13 digits
                        let timestamp = value;
                        while (timestamp.toString().length < 13) {
                            timestamp = timestamp * 10;
                        }
                        elements[elementKey] = timestamp;
                    } else {
                        // Fall back to original value
                        elements[elementKey] = value;
                    }
                    break;

                case 11: // Media/Image
                    // Check if the value is already a media ID (like "8998965")
                  if ( /^\d+$/.test(value)) {
                        // Already a media ID, use directly
                        elements[elementKey] = String(value);
                        debugLog(`Using existing media ID: ${value}`);
                    } else {
                        // Try to upload as a file
                        const imageResult = await parseImageUpload(value, element.id, upload);
                        if (imageResult !== null) {
                            elements[elementKey] = imageResult;
                        }
                    }
                    break;

                case 6: // Radio button
                case 8: // Multiple selection
                case 9: // Dropdown
                case 10: // Checkbox
                case 15: // Button
                    elements[elementKey] = await parseListValue(value, {
                        ct: contentType,
                        type: element.type,
                        id: element.id,
                        list,
                        listObjs
                    });
                    break;

                case 14: // Server-side link
                    elements[elementKey] = await parseServerSideLink(
                        value,
                        sectionId,
                        hierarchy,
                        serverSideLink,
                        content,
                        contentId // Use the contentId from services
                    );
                    break;

                default: // Text, HTML, etc.
                    elements[elementKey] = value;
            }
        } catch (error) {
            console.error(`Error processing field "${key}" with value "${value}":`, error.message);
            // Decide if you want to re-throw the error or continue with other fields
        }
    }

    return elements;
}

// Helper functions for different element types
async function parseImageUpload(fileName, id, upload) {
    // Ensure fileName is a string and valid
    if (!fileName || typeof fileName !== 'string' || fileName === 'exists' || !fileName.includes('.') || fileName === '') {
        debugLog(`Skipping image upload for "${fileName}" - invalid filename`);
        return null;
    }

    try {
        const path = resolve(`./media/${fileName}`);

        // Check if file exists
        if (!await exists(path)) {
            warn(`Image file not found at ${path}`);
            return null;
        }

        debugLog(`Processing image upload: ${fileName}`);

        // Upload the image
        const uploadData = await upload.add({
            file: path,
            filename: fileName,
            elementID: id
        });

        if (!uploadData || !uploadData.code) {
            warn(`Upload failed for ${fileName}`);
            return null;
        }

        success(`Uploaded image ${fileName} successfully`);
        return {
            existingFile: false,
            preferredFilename: uploadData.name,
            code: uploadData.code
        };
    } catch (error) {
        error(`Error uploading image ${fileName}:`, error.message);
        return null;
    }
}

async function parseListValue(str, { ct, type, id, list, listObjs }) {
    if (str === '') return '';

    const strSplit = str.split(':');
    if (strSplit.length >= 2 && !strSplit[0].match('[a-z]')) return str;

    const contentElement = ct.contentTypeElements.find(element => element.id === id && element.type === type);
    if (!contentElement) throw Error(`No contentElement exists with ${id}:${type}`);

    if (!listObjs[contentElement.listId]) {
        listObjs[contentElement.listId] = await list.get(contentElement.listId);
        debugLog(`Loaded list ${contentElement.listId} for element ${contentElement.name}`);
    }

    str = String(str).toLowerCase();
    let options = [];
    const checkOption = (opt) => listObjs[contentElement.listId].items.filter(item =>
        item.name.toLowerCase() === opt.trim() || item.value.toLowerCase() === opt.trim()
    );

    if (str.includes('|')) {
        const values = str.split('|');
        values.forEach(name => {
            const checkedOpt = checkOption(name);
            if (checkedOpt.length) {
                options.push(checkedOpt[0].id);
            } else {
                warn(`Couldn't add ${name} to content element ${contentElement.name}`);
            }
        });
    } else {
        const checkedOpt = checkOption(str);
        if (checkedOpt.length) {
            options.push(checkedOpt[0].id);
        }
    }

    if (!options.length) throw Error(`No list value exists with value ${str}`);

    return `${contentElement.listId}:${options.shift()}${formatMultiSelect(options, type, contentElement.listId)}`;
}

function formatMultiSelect(options, type, id) {
    if (type !== 8) {
        return options.length > 0 ? ';' + options.map(optionId => `${id}:${optionId}`).join(';') : '';
    }
    return options.length > 0 ? ', ' + options.join(', ') : '';
}

async function parseServerSideLink(str, sectionId, hierarchy, serverSideLink, content, currentContentId) {
    try {
        if (str.includes('type="sslink"')) return str;
        if (!str) return '';

        const [targetSectionId, contentId] = String(str).split(',').map(s => s.trim()).map(Number);
        if (!targetSectionId) return '';

        let name;
        try {
            name = contentId ?
                (await content.getWithoutSection(contentId, 'en')).name :
                (await hierarchy.get(targetSectionId)).name;
        } catch (err) {
            warn(`Could not fetch name for link. Using default text.`);
            name = contentId ? `Content ${contentId}` : `Section ${targetSectionId}`;
        }

        // Create the initial server-side link
        let response = await serverSideLink.set({
            active: true,
            attributes: null,
            fromSection: sectionId,
            fromContent: currentContentId,
            toContent: contentId || 0, // Fix: set toContent to the target content ID if provided
            language: 'en',
            toSection: targetSectionId,
            linkText: name,
            useDefaultLinkText: true
        });

        if (!response || !response.id) {
            throw Error(`Failed to create SSL for ${currentContentId}`);
        }

        // Instead of using the original response, create a new request with just the ID
        const linkId = response.id;
        
        // If you need to make a second call, create a new object instead of reusing response
        const updatedResponse = await serverSideLink.get(linkId, sectionId, currentContentId);
        
        return `<t4 sslink_id="${linkId}" type="sslink" />`;
    } catch (err) {
        error(`Error creating server-side link: ${err.message}`);
        // Make this a non-fatal error by returning a comment instead of throwing
        return `<!-- Failed to create server-side link: ${err.message} -->`;
    }
}

// Find element definition in content type
function findElementInContentType(contentType, elementName) {
    return contentType.contentTypeElements.find(el => el.name === elementName);
}

// Other utility functions
async function getFilePath(instance) {
    const response = await instance.ask([{
        name: 'filePath',
        description: 'Enter the file path for Excel workbook',
        required: true
    }]);

    if (!fs.existsSync(response.filePath)) {
        throw new Error(`File not found: ${response.filePath}`);
    }
    return response.filePath;
}

async function loadExcelFile(instance, filePath) {
    const workbook = XLSX.default.readFile(filePath);
    const sheets = workbook.SheetNames;

    if (sheets.length === 0) {
        throw new Error('Excel file contains no sheets');
    }

    return { workbook, sheets };
}

// Parse Excel with data types
async function parseExcelWithDataTypes(filePath, selectedSheet = null) {
    try {
        const XLSX = await import('xlsx');
        const workbook = XLSX.default.readFile(filePath);
        const sheetName = selectedSheet || workbook.SheetNames[0];

        if (!workbook.SheetNames.includes(sheetName)) {
            throw new Error(`Sheet "${sheetName}" not found`);
        }

        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.default.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 3) {
            throw new Error("Excel file must have at least 3 rows (data types, keys, and data)");
        }

        const dataTypes = rows[0];
        const keys = rows[1];
        const results = [];

        for (let i = 2; i < rows.length; i++) {
            if (!rows[i] || rows[i].length === 0) continue; // Skip empty rows

            const rowData = rows[i];
            const rowObject = {};

            for (let colIndex = 0; colIndex < keys.length; colIndex++) {
                if (!keys[colIndex]) continue;
                const key = keys[colIndex];
                rowObject[key] = {
                    value: rowData[colIndex] ?? "",
                    datatype: dataTypes[colIndex] ?? "String"
                };
            }

            results.push(rowObject);
        }

        return results;
    } catch (error) {
        throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
}