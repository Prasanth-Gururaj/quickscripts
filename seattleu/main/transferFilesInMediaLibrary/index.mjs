import { Client, batcher } from '../../../../t4apiwrapper/t4.ts/esm/index.js'
import { UI, exists } from '../promptUI/UI.mjs'
import { readdir, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import path from 'path'
import { readFile } from 'node:fs/promises'
import { writeFile, rm } from 'fs/promises';
import { zip } from 'zip-a-folder';



const rsUrl = 'https://cms.seattleu.edu/terminalfour/rs';
(async () => {
  while (true) {
    const instance = new UI({ keys: ['t4_token'] })
    await main(instance)
    await instance.closeQuestion()
  }
})()

async function main(instance) {
  const config = await instance.start()
  const { media, profile, isAuthorized } = new Client(rsUrl, config['t4_token'])
  if (!await isAuthorized()) throw Error('Invalid T4 token')
  const { firstName } = await profile.get()
  console.clear()
  console.log(`Hello ${firstName},\n\nPlease enter the path to the CSV or Excel file you'd like to use:`)
  const { filePath } = await instance.ask([{
    name: 'filePath', description: 'Enter the file path', required: true
  }])

  const { categoryID, description } = await instance.ask([{
    name: 'categoryID',
    description: 'Enter Backup media category ID',
    required: true,
  }, {
    name: 'description',
    description: 'Enter the Backup description for the images',
    required: true,
  }])
  const transferRows = await parseFile(filePath)
  try {
    if (!await exists('./media/')) {
      await mkdir('./media/', { recursive: true });
    }
  } catch (error) {
    throw new Error(`Failed to create media directory: ${error.message}`);
  }
  const failedDownloads = [];
  for (const row of transferRows) {
    if (!row['ID_Photo']) {
      console.log('No sourceId found in the row...')
      continue
    }
    try {
      const mediaObj = await media.get(parseInt(row['ID_Photo']))
      const fileName = await downloadMedia(media, mediaObj, './media/');
      row['fileName'] = fileName
    } catch (error) {
      console.error(`Failed to download media for ID ${row['ID_Photo']}: ${error.message}`)
      failedDownloads.push({
        mediaID: row['ID_Photo'],
        error: error.message,
        categoryID: row['Target Category ID'] || 'N/A'
      });
      continue
    }
  }
  if (failedDownloads.length > 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonContent = JSON.stringify(failedDownloads, null, 2);
    await writeFile(`failed_downloads_${timestamp}.json`, jsonContent);
    console.log(`Failed downloads saved to failed_downloads_${timestamp}.json`);
  }

  const folderPath = await setupDir(instance)


  await uploadMedia(folderPath, media, categoryID, description, transferRows)
  const { backup } = await instance.ask([{
    name: 'backup',
    description: 'Do you want to backup the media folder? (Y/N)',
    required: true
  }]);

  if (backup.toLowerCase() === 'y') {
    try {
      await mkdir('./media backup', { recursive: true });
      await zip('./media', './media backup.zip');
      await rm('./media', { recursive: true });
      console.log('Media folder backed up and removed successfully');
    } catch (error) {
      console.error('Failed to backup media:', error);
    }
  } else {
    try {
      await rm('./media', { recursive: true });
      console.log('Media folder removed successfully');
    } catch (error) {
      console.error('Failed to remove media folder:', error);
    }
  }
}

async function setupDir(instance) {
  const folderPath = resolve('./media')
  if (!await exists(folderPath)) {
    console.log('No directory named "media" found in current directory... Creating')
    await mkdir(folderPath)
    await instance.ask([{
      name: 'confirmDir',
      description: 'Place media in the "media" folder. Press enter when you\'re ready',
      required: false,
    }])
  }
  return folderPath
}

async function uploadMedia(folderPath, media, categoryID, description, transferRows) {
  if (!await exists(folderPath)) {
    throw new Error('Media folder not found');
  }
  const errors = [];
  const fileNames = await readdir(folderPath)
  await batcher(fileNames, 10, 1000, async (fileName) => {
    try {

      let mediaID = null
      const matchingRow = transferRows.find(row => row.fileName === fileName)
      if (matchingRow && matchingRow['Target Category ID']) {
        categoryID = parseInt(matchingRow['Target Category ID'])
        description = matchingRow['Description']
        mediaID = parseInt(matchingRow['ID_Photo'])
      }
      console.log(`Uploading ${fileName}...`)
      const _split = fileName.split('.')
      const type = getType(_split[_split.length - 1].toLocaleLowerCase())
      const imageID = await media.modify(mediaID, {
        file: `${folderPath}/${fileName}`,
        categoryID,
        fileName,
        id: mediaID,
        name: fileName,
        type,
        description
      })
      console.log(`${imageID} - ${fileName}`)
      if (imageID === 500) {
        errors.push({
          mediaID: mediaID || 'N/A',
          fileName,
          categoryID
        });
      }
    } catch (error) {
      errors.push({
        mediaID: mediaID || 'N/A',
        fileName,
        error: error.message,
        categoryID
      });
    }
  })
  if (errors.length > 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonContent = JSON.stringify(errors, null, 2);
    await writeFile(`status_500_errors_${timestamp}.json`, jsonContent);
    console.log(`Status 500 errors saved to status_500_errors_${timestamp}.json`);
  }
}

function getType(extention) {
  const imageTypes = ['gif', 'jpg', 'jpeg', 'jfif', 'webp', 'png']
  if (imageTypes.includes(extention.toLocaleLowerCase())) return 1
  return 3
}


async function parseFile(filePath) {
  const rows = [];
  const fileExtension = path.extname(filePath).toLowerCase();

  if (fileExtension === '.csv') {
    const fileContent = await readFile(filePath, 'utf8');
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue;
      const values = line.split(',');
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index].trim();
      });
      rows.push(row);
    }
  } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
    const XLSX = await import('xlsx');
    const workbook = XLSX.default.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.default.utils.sheet_to_json(worksheet);
    rows.push(...json);
  } else {
    throw new Error('Unsupported file format. Please provide a CSV or Excel file.');
  }

  return rows;
}

async function downloadMedia(media, mediaObj, folder) {
  console.log(`Downloading ${mediaObj.fileName}...`);
  const buffer = await media.downloadSingle(mediaObj.id, 'media');
  const targetPath = resolve(folder, mediaObj.fileName);
  await writeFile(targetPath, Buffer.from(buffer));
  console.log(`Downloaded to ${targetPath}`);
  console.log('-------------------------------------------------');
  return mediaObj.fileName;
}