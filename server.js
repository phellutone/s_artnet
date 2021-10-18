
const { WebSocketServer, WebSocket } = require('ws')
const express = require('express')

const HOST = 'localhost'
const PORT = process.env.PORT || 3000
const INDEX = '/index.html'

const httpServer = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`listening on ${PORT}`))
const wss = new WebSocketServer({ server: httpServer})

var dmxlib = require('dmxnet')
var dmxnet = new dmxlib.dmxnet({
  log: {
    level: 'info'
  },
  oem: 0,
  sName: 'artnet receiver',
  lName: 'artnet receiver',
  hosts: [
    HOST
  ]
})

/**
 * Art-Net receive server list
 * @type {Array<{ client: dmxlib.receiver, options: dmxlib.ReceiverOptions }>}
 */
var artnetServerList = []

/**
 * WebSocket client list
 * @type {Array<{ client: WebSocket, address: String }>}
 */
var wsClientList = []

/**
 * convert dmx to string format sart
 * @param {Array<Number>} dmx dmx
 * @returns {String} sart
 */
const sart = dmx => {
  /**
   * support functions
   *  dimmer: d
   *  red:    r
   *  green:  g
   *  blue:   b
   *  pan:    p
   *  tilt:   t
   * 
   * 
   */
  let sart = JSON.stringify(dmx)
  console.log(sart)
  return sart
}

wss.on('connection', (ws, req) => {
  console.log('connected '+req.socket.remoteAddress)

  ws.on('open', () => console.log('open'))

  ws.on('message', (RawData, isBinary) => {
    /** @param {String} pfx prefix */
    let pfx = ''
    /** @param {String} type type */
    let type = ''
    /** @param {Array} data data */
    let data = []

    try{
      const msg = JSON.parse(RawData)

      if(!typeof msg.pfx === 'string') throw new Error('message.prefix is not string')
      if(!['add', 'control', 'remove'].includes(msg.pfx)) throw new Error('messgage.pfx is valid value')
      pfx = msg.pfx

      if(!typeof msg.type === 'string') throw new Error('message.type is not string')
      if(!['ws', 'art'].includes(msg.type)) throw new Error('message.type is valid value')
      type = msg.type

      if(!Array.isArray(msg.data)) throw new Error('message.data is not array')
      if(msg.data.length == 0) throw new Error('message.data is empty')
      data = msg.data
    }catch(e){
      console.log(e)
      return
    }

    if(pfx == 'add'){
      if(type == 'art'){
        console.log('add art')
        let ans = dmxnet.newReceiver(data[0]).on('data', dmx => {
          let _sart = sart(dmx)
          wsClientList.forEach(c => { c.client.send(_sart) })
        })
        artnetServerList.push({
          client: ans,
          options: data[0]
        })
      }else if(type == 'ws'){
        console.log('add ws')
        let wsc = new WebSocket(new URL('ws://'+data[0]))
        wsClientList.push({
          client: wsc,
          address: data[0]
        })
      }
    }
    if(pfx == 'remove'){
      if(type == 'art'){
        artnetServerList = artnetServerList.filter(c => c.options != data[0])
      }else if(type == 'ws'){
        wsClientList = wsClientList.filter(c => c.address != data[0] )
      }
    }
  })

  ws.on('close', (code, reason) => {
    console.log('close')
    console.log(code)
    console.log(reason)
  })

  ws.on('error', err => {
    console.log('error')
    console.log(err.message)
  })
})

wss.on('close', () => console.log('server close'))

wss.on('error', err => {
  console.log('server error')
  console.log(err.message)
})
