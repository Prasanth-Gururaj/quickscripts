import { call } from './api.mjs'
import { UI } from '../promptUI/UI.mjs'
import { Client } from '../../../../t4apiwrapper/t4.ts/esm/index.js'
import * as XLSX from 'xlsx';


const userAuthLevels = {
  50: "visitor",
  2: "contributor",
  1: "moderator",
  40: "power user",
  0: "administrator",
}






const getAllUserList = async () => {
  try {
    console.log('Fetching all users...')
    const response = await call('GET', `/userSearch?` + new URLSearchParams({allUsers: true}).toString())
    if (!response.ok) {
      console.log('Failed to fetch users list')
      return null
    }
    const json = await response.json()
    console.log(`Successfully fetched ${json.userList.length} users`)
    const userDB = json.userList
    return userDB
  } catch (error) {
    console.error('Error fetching user list:', error)
    return null
  }
}

const getUserDetails = async (userId) => {
  try {
    const response = await call('GET', `/user/${userId}`)
    if (!response.ok) {
      console.log(`Failed to fetch details for user ID: ${userId}`)
      return null
    }
    const json = await response.json()
    return json
  } catch (error) {
    console.error(`Error fetching user details for ID ${userId}:`, error)
    return null
  }
}

const findUserInfo = async (emailId) => {
  console.log(`Looking up user with email: ${emailId}...`)
  const userDB = await getAllUserList()
  const user = userDB.find(user => user.emailAddress === emailId)
  if (!user) {
    console.log(`No user found with email: ${emailId}`)
    return null
  }
  console.log(`Found user: ${user.firstName} ${user.lastName}`)
  return user
}

const getUserGroups = async (userId) => {
  try {
    const userInfo = await getUserDetails(userId)
    let groupIDs = []
    let groupNames = []

  userInfo.groupUser.forEach(group => {
    groupIDs.push(group.id)
    groupNames.push(group.name)
  })
  return {"id":groupIDs,"name":groupNames}
  } catch (error) {
    console.log(error)
    return null
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
  const {downloadFlag} = await instance.ask([{
    name: 'downloadFlag', description: 'Do you want to download the entire user access list? (1/0)', required: true
  }])
  if (downloadFlag == 1) {
    console.log('Starting user access list download...')
    const userDB = await getAllUserList()
    
    console.log('Fetching group information for all users...')
    const total = userDB.length
    
    const userDBWithGroups = await Promise.all(userDB.map(async user => {
      const groups = await getUserGroups(user.id)
      return {
        ...user,
        groupIds: groups?.id?.join(', ') || [],
        
        groupNames: groups?.name?.join(', ') || [],
        authLevel: userAuthLevels[user.authLevel] || user.authLevel
      }
    }))

    console.log('Creating Excel file...')
    const ws = XLSX.utils.json_to_sheet(userDBWithGroups)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'User Access List')
    XLSX.writeFile(wb, 'UserList.xlsx')

    console.log('Successfully created UserList.xlsx')
    console.log(`Total users processed: ${userDBWithGroups.length}`)
    return
  }
  else {
  const { emailId } = await instance.ask([{
    name: 'emailId', description: `Please enter the email id of the user you'd like to see`, required: true
  }])
  const userDetails = await findUserInfo(emailId)
  if (!userDetails) {
    console.log('User not found...')
    return
  }
  const userInfo = await getUserDetails(userDetails.id)
  console.log(`The user ${emailId} is in the following groups:`)

  userInfo.groupUser.forEach(group => {
    console.log("Group ID:", group.id, "Group Name:", group.name)
  })
  }
})()