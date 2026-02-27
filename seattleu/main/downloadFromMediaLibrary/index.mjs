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
  const { profile, mediaCategory, media } = new Client(rsUrl, config['t4_token'], 'en', fetch)

  console.clear()

  const { firstName } = await profile.get()
  console.log(`Hello ${firstName},\n\nPlease enter the ID of the media category you'd like to download:`)
  const { mediaCategoryId } = await instance.ask([{
    name: 'mediaCategoryId', description: 'Enter media category ID, not name', required: true
  }])

  // ---------------------------
  // Get category 
  // ---------------------------
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

  // ---------------------------
  // Parse children recursively
  // ---------------------------
  const parseChildren = (parentPath, children) => {
    children.forEach(child => {
      const { id, name, children: childChildren } = child;
      const currentPath = `${parentPath}/${name}`;
      console.log(`Parsing ${name}...${id}....${currentPath}`);

      // Push current child first
      collectionObjs.push({ id, name, path: currentPath });

      // Recursively parse children if any
      if (childChildren.length > 0) parseChildren(currentPath, childChildren);
    });
  };

  if (!await exists('./output/')) {
    await mkdir('./output/', { recursive: true });
  }

  try {
    for (let cat of rootCategories) {

      // Ensure selected category itself gets downloaded
      collectionObjs.push(cat);

      const children = (await mediaCategory.list(cat.id, 'en'))[0].children;
      console.log('Downloading media...');
      parseChildren(cat.path, children);
    }

    // Create folders even if empty
    await Promise.all(collectionObjs.map(async obj => {
      try {
        await mkdir(resolve(obj.path), { recursive: true });
      } catch (e) {}
    }));
  } catch(error) {
    console.log('Failed to get category children due to ', error);
  }

  // ---------------------------
  // Download media
  // ---------------------------
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
  await zip(resolve('./output'), resolve(`./${mediaCategoryId}.zip`))
  console.log('Deleting output folder...')
  await rm(resolve('./output'), { recursive: true, force: true })
  console.log('Finished!')
}

async function downloadMedia(media, mediaObj, folder) {
  const buffer = await media.downloadSingle(mediaObj.id, 'media');
  if (!await exists(folder)) await mkdir(folder, { recursive: true });
  await writeFile(`${folder}/${mediaObj.fileName}`, Buffer.from(buffer));
}
 