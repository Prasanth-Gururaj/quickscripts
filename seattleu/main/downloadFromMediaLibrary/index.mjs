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
// Local imports with relative paths
import { UI, exists } from '../promptUI/UI.mjs';
import { Client, batcher } from './node_modules/t4.ts/esm/index.js';


const rsUrl = 'https://cms.seattleu.edu/terminalfour/rs';
 
async function findRootParent(id, mediaCategory) {
  console.log('Inside findRootParent, starting with id:', id);
  let currentId = id;
  try {
    while (true) {
      const cat = await mediaCategory.get(currentId, 'en');
      console.log('findRootParent check:', cat);
      if (!cat.parent) break;
      currentId = cat.parent.id;
    }
  } catch (error) {
    console.error('Error in findRootParent:', error);
  }
  console.log('Exiting findRootParent with id:', currentId);
  return currentId;
}
 
 
 
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
  const {  profile, mediaCategory, media } = new Client(rsUrl, config['t4_token'], 'en', fetch)
  // if (!await isAuthorized()) {
  //   console.log('Failed to login to t4...')
  //   return null
  // }
  console.clear()
 
  const { firstName } = await profile.get()
  console.log(`Hello ${firstName},\n\nPlease enter the ID of the media category you'd like to download:`)
  const { mediaCategoryId } = await instance.ask([{
    name: 'mediaCategoryId', description: 'Enter media category ID, not name', required: true
  }])
 
  const rootParentId = await findRootParent(mediaCategoryId, mediaCategory);
 
  const collectionObjs = []
 
 
  const parseChildren = (parentPath, children, parentName = null) => {
    children.forEach(child => {
      const { id, name, children: childChildren } = child
      const currentPath = `${parentPath}/${name}`
      console.log(`Parsing ${name} (Parent: ${parentName || 'Root'})...${id}....${currentPath}`)
      collectionObjs.push({ id, name, parent: parentName, path: currentPath })
      if (childChildren.length > 0) parseChildren(currentPath, childChildren, name)
    })
  }
 
  if (!await exists('./output/')) {
    await mkdir('./output/', { recursive: true })
  }
  try {
    // Start from root parent
    const categoryData = (await mediaCategory.list(rootParentId, 'en'))[0]
    const children = categoryData.children
    const categoryName = categoryData.name
 
    const rootPath = `./output/${categoryName}`
    // const tempVal = (await media.list(mediaCategoryId)).mediaRows
    // await batcher(tempVal, 10, 1000, async(row) => {
    //   try {
    //     // await downloadMedia(media, row, resolve(`${collectionObj.path}/${collectionObj.name}`))
    //     console.log(`Downloaded ${row.name}`)
    //   } catch(e) {
    //     console.log(`Failed to download ${row.name} due to `, e)
    //   }
    // })
    collectionObjs.push({ id: rootParentId, name: categoryName, parent: null, path: rootPath })
 
    console.log('Downloading media...')
    parseChildren(rootPath, children, categoryName)
 
    // Create folders even if empty
    await Promise.all(collectionObjs.map(async obj => {
      try {
        await mkdir(resolve(obj.path), { recursive: true })
      } catch (e) {}
    }))
  } catch(error) {
    console.log('Failed to get category children due to ', error)
  }
 
  for (let collectionObj of collectionObjs) {
    let offset = 0;
    const limit = 10;
    let total_media = 0;
 
    do {
      const req = await media.list(collectionObj.id, 'en', offset, limit);
      const mediaRows = req.mediaRows;
      total_media = req.recordsTotal;
 
      await batcher(mediaRows, 20, 1000, async(row) => {
        try {
          await downloadMedia(media, row, resolve(collectionObj.path));
          console.log(`Downloaded ${row.name} to ${collectionObj.name}`);
        } catch(e) {
          console.log(`Failed to download ${row.name} to ${collectionObj.name} due to `, e);
        }
      });
 
      offset += limit;
    } while (offset < total_media);
  }
 
  console.log('Creating Zip file...')
  await zip(resolve(`./output/${collectionObjs[0].name}`), resolve(`./${collectionObjs[0].id}.zip`))
  console.log('Deleting output folder...')
  await rm(resolve('./output'), { recursive: true, force: true })
  console.log('Finished!')
}
 
async function downloadMedia(media, mediaObj, folder) {
  const buffer = await media.downloadSingle(mediaObj.id, 'media')
  if (!await exists(folder)) await mkdir(folder, { recursive: true })
  await writeFile(`${folder}/${mediaObj.fileName}`, Buffer.from(buffer))
}