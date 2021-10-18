
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
  log: { level: 'info' },
  listen: 6454,
  oem: 0x2908,
  sName: 'artnet receiver',
  lName: 'artnet receiver',
  hosts: [ HOST ]
})

/**
 * Art-Net receive server list
 * @type {Array<{ client: dmxlib.receiver, options: dmxlib.ReceiverOptions }>}
 */
var anServerList = []

/**
 * WebSocket client list
 * @type {Array<{ client: WebSocket, address: String }>}
 */
var wsClientList = []

const dmxpipeline = dmx => {
  let _sart = sart(dmx)
  wsClientList.forEach(({client}) => {
    if(client.readyState != WebSocket.OPEN) return
    client.send(_sart)
  })
}

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

/**
 * check equal
 * @param {} a 
 * @param {} b
 * @returns {Boolean} 
 */
const eq = (a, b) => {
  return Object.keys(a).every(k => {
    if(!(k in b)) return false
    return a[k] == b[k]
  })
}

wss.on('connection', (ws, req) => {
  console.log(`connected ${req.socket.remoteAddress}:${req.socket.remotePort} > ${req.socket.localAddress}:${req.socket.localPort}${req.url}`)
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
        anServerList.push({
          client: dmxnet.newReceiver(data[0]).on('data', dmxpipeline),
          options: data[0]
        })
      }else if(type == 'ws'){
        console.log('add ws')
        let wsc = new WebSocket(new URL('ws://'+data[0]))
        wsc.on('open', () => console.log('open'))
        wsc.on('message', (rd, ib) => console.log(`rd: ${rd}, ib: ${ib}`))
        wsc.on('error', err => console.log(err.message))
        wsc.on('close', (c, r) => console.log(`c: ${c}, r: ${r}`))
        wsClientList.push({
          client: wsc,
          address: data[0]
        })
      }
    }
    if(pfx == 'remove'){
      if(type == 'art'){
        console.log('remove art')
        let rt = anServerList.find(({ options }) => eq(options, data[0]))
        if(!rt){
          console.log('can not find')
          return
        }
        rt.client.off('data', dmxpipeline)
        anServerList = anServerList.filter(c => c != rt)
      }else if(type == 'ws'){
        console.log('remove ws')
        wsClientList = wsClientList.filter(c => c.address != data[0])
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
