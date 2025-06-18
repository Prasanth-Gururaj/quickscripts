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
  const {  profile, user } = new Client(rsUrl, config['t4_token'], 'en', fetch)
  // if (!await isAuthorized()) {
  //   console.log('Failed to login to t4...')
  //   return null
  // }
  console.clear()

  const { firstName } = await profile.get()
  console.log(`Hello ${firstName},\n\nPlease enter the ID of the user you'd like to see (0 for all users) :`)
  const { userId } = await instance.ask([{
    name: 'userId', description: 'Enter userID, not name', required: true
  }])

  const userDetails = await user.get(userId)
  console.log(userDetails)


}