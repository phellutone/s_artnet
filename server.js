
'use strict'

const { Client } = require('node-osc')
const { Server } = require('ws')
const express = require('express')
var dmxlib = require('dmxnet')
var dmxnet = new dmxlib.dmxnet()

const HOST = 'localhost'
const PORT = process.env.PORT || 3000
const INDEX = '/index.html'

const httpServer = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`listening on ${PORT}`))
const wss = new Server({ sever: httpServer })

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
      ip: 'x.x.x.x',            //IP to send to, default 255.255.255.255
      subnet: 0,                //Destination subnet, default 0
      universe: 0,              //Destination universe, default 0
      net: 0,                   //Destination net, default 0
      port: 0000,               //Destination UDP Port, default 6454
      base_refresh_interval: 0  //Default interval for sending unchanged ArtDmx
    }
  },
]
*/
var artnetClientList = []

var oscServer = null
var artnetServer = null

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
              ip: 'x.x.x.x',            //IP to send to, default 255.255.255.255
              subnet: 0,                //Destination subnet, default 0
              universe: 0,              //Destination universe, default 0
              net: 0,                   //Destination net, default 0
              port: 0000,               //Destination UDP Port, default 6454
              base_refresh_interval: 0  //Default interval for sending unchanged ArtDmx
            }
          ]
        }
        */

        artnetClientList.push({
          client: dmxnet.newSender(msg.data[0]),
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
      }else if(type == 'art'){

        /*
        websocket format control artnet client
        {
          pfx: 'control',
          type: 'art',
          data: [
            'set | fill | prep | transmit | reset',
            {
              channel: 0, //channel to set [0, 511] note: only use 'set | prep'
              min: 0,     //channel to set [0, 511] note: only use 'fill'
              max: 511,    //channel to set [0, 511] note: only use 'fill'
              value: 0    //value to set [0, 255]
            }
          ]
        }
        */

        artnetClientList.forEach(c => {
          if(msg.data[0] == 'set'){
            c.client.setChannel(msg.data[1].channel, msg.data[1].value)
          }else if(msg.data[0] == 'fill'){
            c.client.fillChannels(msg.data[1].min, msg.data[1].max, msg.data[1].value)
          }else if(msg.data[0] == 'prep'){
            c.client.prepChannel(msg.data[1].channel, msg.data[1].value)
          }else if(msg.data[0] == 'transmit'){
            c.client.transmit()
          }else if(msg.data[0] == 'reset'){
            c.client.reset()
          }
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
              ip: 'x.x.x.x',            //IP to send to, default 255.255.255.255
              subnet: 0,                //Destination subnet, default 0
              universe: 0,              //Destination universe, default 0
              net: 0,                   //Destination net, default 0
              port: 0000,               //Destination UDP Port, default 6454
              base_refresh_interval: 0  //Default interval for sending unchanged ArtDmx
            }
          ]
        }
        */

        artnetClientList = artnetClientList.filter(c => !c.options == msg.data[0])
      }
    }

  })

  ws.on('error', err => {
    console.log(err.message)
  })

  ws.on('close', (code, reason) => {
    console.log(code)
    console.log(reason)
  })
})

wss.on('close', () => {
  console.log('close')
})

wss.on('error', err => {
  console.log(err.message)
})
