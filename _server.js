
'use strict'

const { Client } = require('node-osc')
const { Server } = require('ws')
const express = require('express')

const HOST = 'localhost'
const PORT = process.env.PORT || 3000
const INDEX = '/index.html'

const httpServer = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`listening on ${PORT}`))
const wss = new Server({ server: httpServer })

var dmxlib = require('dmxnet')
var dmxnet = new dmxlib.dmxnet({
  log: {
    level: 'info'
  },
  oem: 0,
  sName: 'artnetServer',
  lName: 'Art-Net routing server',
  hosts: [
    HOST
  ]
})

/*
oscClientList format
[
  {
    client: node-osc.Client,
    host: 'x.x.x.x',  //host
    port: 0000,       //port
    address: 'xxxxx'  //address
  },
]
*/
var oscClientList = []
/*
artnetClientList format
[
  {
    client: dmxnet.Sender,

    //resource: https://www.npmjs.com/package/dmxnet?activeTab=readme
    options: {
      subnet: 0,    //Destination subnet, default 0
      universe: 0,  //Destination universe, default 0
      net: 0        //Destination net, default 0
    }
  },
]
*/
var artnetServerList = []

var oscServer = null
var artnetServer = dmxnet.newReceiver({
  subnet: 0,
  universe: 0,
  net: 0
})
artnetServer.on('data', data => {
  console.log(data)
})

wss.on('connection', (ws, req) => {
  console.log('connected '+req.headers)

  ws.on('open', () => {
    console.log('open')
  })

  ws.on('message', (data, isBinary) => {
    var msg = JSON.parse(data)
    console.log(msg)
    if(msg.pfx == 'add'){
      if(msg.type == 'osc'){

        /*
        websocket format add osc client
        {
          pfx: 'add',
          type: 'osc',
          data: [
            'x.x.x.x',  //host
            0000,       //port
            'xxxxx'     //address
          ]
        }
        */

        oscClientList.push({
          client: new Client(msg.data[0], msg.data[1]),
          host: msg.data[0],
          port: msg.data[1],
          address: msg.data[2]
        })
      }else if(msg.type == 'art'){

        /*
        websocket format add artnet client
        {
          pfx: 'add',
          type: 'art',
          data: [
            //resource: https://www.npmjs.com/package/dmxnet?activeTab=readme
            {
              subnet: 0,    //Destination subnet, default 0
              universe: 0,  //Destination universe, default 0
              net: 0        //Destination net, default 0
            }
          ]
        }
        */

        artnetServerList.push({
          client: dmxnet.newReceiver(msg.data[0]),
          options: msg.data[0]
        })
      }
    }
    if(msg.pfx == 'control'){
      if(type == 'osc'){

        /*
        websocket format control osc client
        {
          pfx: 'control',
          type: 'osc',
          data: [
            'xxx',  //any data
            000,    //any data
            'yyy'   //any data
          ]
        }
        */

        oscClientList.forEach(c => {
          c.client.send().apply(c.client, msg.data.unshift('/'+c.address))
        })
      }
    }
    if(msg.pfx == 'remove'){
      if(msg.type == 'osc'){

        /*
        websocket format remove osc client
        {
          pfx: 'add',
          type: 'osc',
          data: [
            'x.x.x.x',  //host
            0000,       //port
            'xxxxx'     //address note: not use
          ]
        }
        */

        var rtrg = oscClientList.filter(c => c.host == msg.data[0] && c.port == msg.data[1])
        rtrg.forEach(c => c.client.close())
        oscClientList = oscClientList.filter(c => !rtrg.includes(c))
      }else if(msg.type == 'art'){

        /*
        websocket format add artnet client
        {
          pfx: 'add',
          type: 'art',
          data: [
            //resource: https://www.npmjs.com/package/dmxnet?activeTab=readme
            {
              subnet: 0,    //Destination subnet, default 0
              universe: 0,  //Destination universe, default 0
              net: 0        //Destination net, default 0
            }
          ]
        }
        */

        artnetServerList = artnetServerList.filter(c => !c.options == msg.data[0])
      }
    }

  })

  ws.on('error', err => {
    console.log('error')
    console.log(err.message)
  })

  ws.on('close', (code, reason) => {
    console.log('close')
    console.log(code)
    console.log(reason)
  })
})

wss.on('close', () => {
  console.log('close')
})

wss.on('error', err => {
  console.log('error')
  console.log(err.message)
})
