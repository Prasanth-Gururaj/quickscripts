#!/usr/bin/env node

import path from 'path';
import { writeFile, rm } from 'fs/promises';
import { zip } from 'zip-a-folder';
import fetch from 'node-fetch';
// Local imports with relative paths
import { UI, exists } from '../promptUI/UI.mjs';
import { Client, batcher } from '../../../../t4apiwrapper/t4.ts/esm/index.js';
import csv from 'csv-parser';
import { readdir, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

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
  const {  isAuthorized,profile, mediaCategory, media } = new Client(rsUrl, config['t4_token'], 'en', fetch)
  if (!await isAuthorized()) {
    console.log('Failed to login to t4...')
    return null
  }
  console.clear()
  const { firstName } = await profile.get()
  // console.log(`Hello ${firstName},\n\nPlease enter the path to the CSV or Excel file you'd like to use:`)
  // const { filePath } = await instance.ask([{
  //   name: 'filePath', description: 'Enter the file path', required: true
  // }])

  // const rows = [];
  // const fileExtension = path.extname(filePath).toLowerCase();
  // if (fileExtension === '.csv') {
  //   const fileContent = await readFile(filePath, 'utf8');
  //   const lines = fileContent.split('\n');
  //   const headers = lines[0].split(',');

  //   for (let i = 1; i < lines.length; i++) {
  //     const line = lines[i];
  //     if (line.trim() === '') continue;
  //     const values = line.split(',');
  //     const row = {};
  //     headers.forEach((header, index) => {
  //       row[header.trim()] = values[index].trim();
  //     });
  //     rows.push(row);
  //   }
  // } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
  //   const xlsx = await import('xlsx');
  //   const workbook = xlsx.readFile(filePath);
  //   const sheetName = workbook.SheetNames[0];
  //   const worksheet = workbook.Sheets[sheetName];
  //   const json = xlsx.utils.sheet_to_json(worksheet);
  //   rows.push(...json);
  // } else {
  //   console.log('Unsupported file format. Please provide a CSV or Excel file.');
  //   return null;
  // }
  // console.log('Parsed rows:', rows);
  if (!await exists('./media/')) {
    await mkdir('./media/', { recursive: true })
  }
  
  console.log(`Hello ${firstName},\n\nPlease enter the ID of the media you'd like to download:`)
  const { mediaId } = await instance.ask([{
    name: 'mediaId', description: 'Enter media ID, not name', required: true
  }])
  const mediaObj = await media.get(mediaId)
  

//   const collectionObjs = []
//   const parseChildren = (path, children) => {
//     children.forEach(child => {
//       const { id, name, children } = child
//       console.log(`Parsing ${name}...${id}....${path}`)
//       if (child.children.length > 0) parseChildren(`${path}/${name}/`, children)
//       collectionObjs.push({ id, name, path })
//     })
//   }
  
  const categoryID = 213063
  
  try {
    // Download media first
    console.log('Downloading media...');
    await downloadMedia(media, mediaObj, './media/');
    
    const __dirname = new URL('.', import.meta.url).pathname;
    await uploadMedia(path.resolve(__dirname, './media/'), media, categoryID, 'Uploaded from script');
    // Prepare upload parameters with full path
   
  } catch (error) {
    console.error('Media transfer failed:', {
      message: error.message,
      type: error.type,
      status: error.status
    });
    
    if (error.type === 'invalid-json') {
      console.error('Server returned invalid response. Please check:');
      console.error('1. File exists and is readable');
      console.error('2. Category ID is valid');
      console.error('3. Authentication token is valid');
    }
    
    throw error;
  } finally {
    // Optional: Clean up downloaded file
    // await rm('./output/', { recursive: true, force: true });
  }


//   try {
//     const children = (await mediaCategory.list(mediaCategoryId, 'en'))[0].children
//     const categoryName = (await mediaCategory.list(mediaCategoryId, 'en'))[0].name

//     // const tempVal = (await media.list(mediaCategoryId)).mediaRows
//     // await batcher(tempVal, 10, 1000, async(row) => {
//     //   try {
//     //     // await downloadMedia(media, row, resolve(`${collectionObj.path}/${collectionObj.name}`))
//     //     console.log(`Downloaded ${row.name}`)
//     //   } catch(e) {
//     //     console.log(`Failed to download ${row.name} due to `, e)
//     //   }
//     // })
//     collectionObjs.push({ id: mediaCategoryId, name: categoryName, path: './output/' })
//     console.log('Downloading media...')
//     parseChildren('./output/', children)
//     await Promise.all(collectionObjs.map(async obj => {
//       try {
//         await mkdir(resolve(`${obj.path}/${obj.name}`))
//       } catch (e) {}
//     }))
//   } catch(error) {
//     console.log('Failed to get category children due to ', error)
//   }

//   for (let collectionObj of collectionObjs) {
//     let offset = 0;
//     const limit = 10;
//     let total_media = 0;

//     do {
//       const req = await media.list(collectionObj.id, 'en', offset, limit);
//       const mediaRows = req.mediaRows;
//       total_media = req.recordsTotal;

//       await batcher(mediaRows, 20, 1000, async(row) => {
//         try {
//           await downloadMedia(media, row, resolve(`${collectionObj.path}/${collectionObj.name}`));
//           console.log(`Downloaded ${row.name} to ${collectionObj.name}`);
//         } catch(e) {
//           console.log(`Failed to download ${row.name} to ${collectionObj.name} due to `, e);
//         }
//       });

//       offset += limit;
//     } while (offset < total_media);
//   }

//   console.log('Creating Zip file...')
//   await zip(resolve('./output'), resolve(`./${mediaCategoryId}.zip`))
//   console.log('Deleting output folder...')
//   await rm(resolve('./output'), { recursive: true, force: true })
//   console.log('Finished!')
}
async function uploadMedia(folderPath, media, categoryID, description) {
  const fileNames = await readdir(folderPath)
  await batcher(fileNames, 10, 1000, async (fileName) => {
    try {
      console.log(`Uploading ${fileName}...`)

      const _split = fileName.split('.')
      const type = getType(_split[_split.length - 1].toLocaleLowerCase())
      const imageID = await media.add({
        file: `${folderPath}/${fileName}`,
        categoryID,
        fileName,
        name: fileName,
        type,
        description
      })
      console.log({
        file: `${folderPath}/${fileName}`,
        categoryID,
        fileName,
        name: fileName,
        type,
        description
      })
      console.log(`${imageID} - ${fileName}`)
    } catch (error) {
      console.log(`Failed to upload ${fileName} due to`, error)
    }
  })
}
async function downloadMedia(media, mediaObj, folder) {
  console.log(`Downloading ${mediaObj.fileName}...`);
  const buffer = await media.downloadSingle(mediaObj.id, 'media');
  const targetPath = resolve(folder, mediaObj.fileName);
  await writeFile(targetPath, Buffer.from(buffer));
  console.log(`Downloaded to ${targetPath}`);
}
function getType(extention) {
  const imageTypes = ['gif', 'jpg', 'jpeg', 'jfif', 'webp', 'png']
  if (imageTypes.includes(extention.toLocaleLowerCase())) return 1
  return 3
}