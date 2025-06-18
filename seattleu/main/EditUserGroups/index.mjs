import { call, put } from './api.mjs'
import { UI } from '../promptUI/UI.mjs'
import { Client } from '../../../../t4apiwrapper/t4.ts/esm/index.js'
import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'

const userAuthLevels = {
  50: "visitor",
  2: "contributor",
  1: "moderator",
  40: "power user",
  0: "administrator",
}

const getAllUserList = async () => {
  try {
    // console.log('Fetching all users...')
    const response = await call('GET', `/userSearch?` + new URLSearchParams({allUsers: true}).toString())
    if (!response.ok) {
      console.log('Failed to fetch users list')
      return null
    }
    const json = await response.json()
    // console.log(`Successfully fetched ${json.userList.length} users`)
    const userDB = json.userList
    return userDB
  } catch (error) {
    console.error('Error fetching user list:', error)
    return null
  }
}

const getUserDetails = async (userId) => {
  try {
    // console.log(`Fetching details for user ID: ${userId}...`)
    const response = await call('GET', `/user/${userId}`)
    if (!response.ok) {
      console.log(`Failed to fetch details for user ID: ${userId}`)
      return null
    }
    const json = await response.json()
    // console.log('Successfully fetched user details')
    return json
  } catch (error) {
    console.error(`Error fetching user details for ID ${userId}:`, error)
    return null
  }
}

const findUserInfo = async (emailId) => {
  // console.log(`Looking up user with email: ${emailId}...`)
  const userDB = await getAllUserList()
  const user = userDB.find(user => user.emailAddress === emailId)
  if (!user) {
    console.log(`No user found with email: ${emailId}`)
    return null
  }
  // console.log(`Found user: ${user.firstName} ${user.lastName}`)
  return user
}


const getAllGroups = async () => {
  try {
    // console.log('Fetching all groups...')
    const response = await call('GET', `/group`)
    if (!response.ok) {
      console.log('Failed to fetch groups')
      return null
    }
    const json = await response.json()
    // console.log(`Successfully fetched ${json.length} groups`)
    return json
  } catch (error) {
    console.error('Error fetching groups:', error)
    return null
  }
}
    

const getGroup = async (groupId) => {
  try {
    // console.log(`Fetching group with ID: ${groupId}...`)
    const response = await call('GET', `/group/${groupId}`)
    if (!response.ok) {
      console.log(`Failed to fetch group with ID: ${groupId}`)
      return null
    }
    const json = await response.json()
    // console.log(`Successfully fetched group with ID: ${groupId}`)
    return json
  } catch (error) {
    console.error(`Error fetching group with ID: ${groupId}:`, error)
    return null
  }
}


// Update the updateGroupMembers function:
const updateGroupMembers = async (groupId, groupDetails) => {
  try {
    console.log(`Updating group members for group ID: ${groupId}...`)
    
    // Clean up member objects to only include necessary fields
    const cleanMembers = groupDetails.members.map(member => ({
      id: member.id,
      username: member.username,
      emailAddress: member.emailAddress,
      firstName: member.firstName,
      lastName: member.lastName
    }));

    // Prepare clean payload
    const payload = {
      id: groupDetails.id,
      name: groupDetails.name,
      description: groupDetails.description || '',
      emailAddress: groupDetails.emailAddress || '',
      enabled: groupDetails.enabled,
      ldap: groupDetails.ldap || false,
      defaultChannel: groupDetails.defaultChannel,
      members: cleanMembers
    };

    const response = await put(`group/${groupId}`, {
      body: JSON.stringify(payload),
    });

    if (!response.ok) { 
      const errorText = await response.text();
      console.log(`Failed to update group ${groupId}. Status: ${response.status}`);
      console.log('Error details:', errorText);
      return null;
    }

    console.log(`Successfully updated group members for group ID: ${groupId}`);
    return true;
  } catch (error) {
    console.error(`Error updating group members for group ID: ${groupId}:`, error);
    return null;
  }
}


const rsUrl = 'https://cms.seattleu.edu/terminalfour/rs'

; (async function main() {
  const instance = new UI({ keys: ['t4_token'] })
  const config = await instance.start()
  const { profile, user } = new Client(rsUrl, config['t4_token'])
  const { firstName } = await profile.get()
  console.clear()
  console.log(`Hello ${firstName},\n\n:`)
  const { filePath } = await instance.ask([{
    name: 'filePath', description: `Please enter the file path of the Excel file`, required: true
  }])
  const fileContent = readFileSync(filePath)
  const workbook = XLSX.read(fileContent, { type: 'buffer' })
  const firstSheetName = workbook.SheetNames[0]
  const firstSheet = workbook.Sheets[firstSheetName]
  const sheetData = XLSX.utils.sheet_to_json(firstSheet)
  console.log('First sheet data:', sheetData)

  const allGroups = await getAllGroups()

  // get all group info based on groupName
  // const groupInfo = allGroups.filter(group => sheetData.map(row => row.groupName).includes(group.name))
  // console.log('Group info:', groupInfo)
  // Update the main loop:
  for (const row of sheetData) {
    try {
      const userDetails = await findUserInfo(row.username);
      if (!userDetails) {
        console.log(`Skipping - User not found for email: ${row.username}`);
        continue;
      }
  
      const matchingGroup = allGroups.find(group => group.name === row.groupName);
      if (!matchingGroup) {
        console.log(`Skipping - Group not found: ${row.groupName}`);
        continue;
      }
  
      const groupDetails = await getGroup(matchingGroup.id);
      if (!groupDetails) {
        console.log(`Failed to get group details for: ${row.groupName}`);
        continue;
      }
  
      if (row.userAction.toLowerCase() === 'add') {
        // Check if user is already in group
        const existingMember = groupDetails.members.find(m => m.id === userDetails.id);
        if (!existingMember) {
          groupDetails.members.push(userDetails);
        }
      } else if (row.userAction.toLowerCase() === 'remove') {
        groupDetails.members = groupDetails.members.filter(m => m.id !== userDetails.id);
      } else {
        console.log(`Invalid action ${row.userAction} for user ${row.username}`);
        continue;
      }
  
      const success = await updateGroupMembers(groupDetails.id, groupDetails);
      if (!success) {
        console.log(`Failed to update group: ${matchingGroup.name}`);
      } else {
        console.log(`Successfully ${row.userAction}ed user ${row.username} ${row.userAction === 'add' ? 'to' : 'from'} group ${row.groupName}`);
      }
  
    } catch (error) {
      console.error(`Error processing row:`, error);
      continue;
    }
  }

 
})()