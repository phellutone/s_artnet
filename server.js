
const { WebSocketServer, WebSocket } = require('ws')
const express = require('express')

const HOST = 'localhost'
const PORT = process.env.PORT
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

wss.on('connection', (ws, req) => {
  console.log('connected '+req.headers)

  ws.on('open', () => {
    console.log('open')
  })

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

      if(!msg.data.isArray) throw new Error('message.data is not array')
      if(msg.data.length == 0) throw new Error('message.data is empty')
      data = msg.data
    }catch(e){
      console.log(e)
      return
    }

    if(pfx == 'add'){
      if(type == 'art'){
        var server = dmxnet.newReceiver(data[0]).on('data', dmx => {
          wsClientList.forEach(c => { c.client.send(dmx) })
        })
        artnetServerList.push({
          client: server,
          options: data[0]
        })
      }else if(type == 'ws'){

        /*
        {
          pfx: 'add',
          type: 'ws',
          data: [
            'x.x.x.x:0000/yyy'  //uri to send
          ]
        }
        */

        var wsc = new WebSocket()
        wsClientList.push(wsc)
      }
    }
    if(msg.pfx == 'remove'){
      if(msg.type == 'art'){
        //TODO
      }
    }
  })
})
