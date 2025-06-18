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
import { Client, batcher } from '../../../../t4apiwrapper/t4.ts/esm/index.js';

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

  const collectionObjs = []
  const parseChildren = (path, children) => {
    children.forEach(child => {
      const { id, name, children } = child
      console.log(`Parsing ${name}...${id}....${path}`)
      if (child.children.length > 0) parseChildren(`${path}/${name}/`, children)
      collectionObjs.push({ id, name, path })
    })
  }
  if (!await exists('./output/')) {
    await mkdir('./output/', { recursive: true })
  }
  try {
    const children = (await mediaCategory.list(mediaCategoryId, 'en'))[0].children
    const categoryName = (await mediaCategory.list(mediaCategoryId, 'en'))[0].name

    // const tempVal = (await media.list(mediaCategoryId)).mediaRows
    // await batcher(tempVal, 10, 1000, async(row) => {
    //   try {
    //     // await downloadMedia(media, row, resolve(`${collectionObj.path}/${collectionObj.name}`))
    //     console.log(`Downloaded ${row.name}`)
    //   } catch(e) {
    //     console.log(`Failed to download ${row.name} due to `, e)
    //   }
    // })
    collectionObjs.push({ id: mediaCategoryId, name: categoryName, path: './output/' })
    console.log('Downloading media...')
    parseChildren('./output/', children)
    await Promise.all(collectionObjs.map(async obj => {
      try {
        await mkdir(resolve(`${obj.path}/${obj.name}`))
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
          await downloadMedia(media, row, resolve(`${collectionObj.path}/${collectionObj.name}`));
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
  const buffer = await media.downloadSingle(mediaObj.id, 'media')
  if (!await exists(folder)) await mkdir(folder, { recursive: true })
  await writeFile(`${folder}/${mediaObj.fileName}`, Buffer.from(buffer))
}