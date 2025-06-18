import fetch from 'node-fetch'
// import { t4_token, api } from './config.js'
// import {t4_token, api} from './config.js'
import * as config from './config.json' assert { type: 'json' }


export async function call(method, endpoint, options) {
  const { t4_token, url } = config.default
  if (!t4_token) throw Error('Token not specified')
  try {
    const request = await fetch(`${url}/${endpoint}`, {
      headers: {
        'authorization': `Bearer ${t4_token}`
      },
      method,
      ...options
    })
    return request.ok ? request : null
  } catch (error) {
    console.log(error)
    return null
  }
}