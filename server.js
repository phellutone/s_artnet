
const { WebSocketServer } = require('ws')
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

var artnetServerList = []
var wsClientList = []


wss.on('connection', (ws, req) => {
  console.log('connected '+req.headers)

  ws.on('open', () => {
    console.log('open')
  })

  ws.on('message', (RawData, isBinary) => {
    var msg = ''
    var pfx = ''
    var type = ''
    var data = []
    try{
      msg = JSON.parse(RawData)

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

        /*
        {
          pfx: 'add',
          type: 'art',
          data: [
            //resource: https://www.npmjs.com/package/dmxnet?activeTab=readme
            {
              subnet: 0,    //Destination universe, default 0
              universe: 0,  //Destination universe, default 0
              net: 0        //Destination universe, default 0
            }
          ]
        }
        */

        var server = dmxnet.newReceiver(data[0])
        server.on('data', dmx => {
          wsClientList.forEach(c => {
            c.client.send('/'+c.address, dmx)
          })
        })
        artnetServerList.push({
          client: server,
          ooptions: msg.data[0]
        })
      }else if(msg.type == 'ws'){

        /*
        {
          pfx: 'add',
          type: 'ws',
          data: [
            'x.x.x.x',  //host
            0000,       //port
            'yyy'       //address
          ]
        }
        */
        var wsc = new WebSocketServer({
          
        })
      }
    }
    if(msg.pfx == 'remove'){
      if(msg.type == 'art'){
        //TODO
      }
    }
  })
})
