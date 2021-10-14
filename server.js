
const { Server } = require('ws')
const express = require('express')

const HOST = 'localhost'
const PORT = process.env.PORT
const INDEX = '/index.html'

const httpServer = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`listening on ${PORT}`))
const wss = new Server({ server: httpServer})

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


wss.on('connection', (ws, req) => {
  console.log('connected '+req.headers)

  ws.on('open', () => {
    console.log('open')
  })

  ws.on('message', (RawData, isBinary) => {
    var msg = ''
    try{
      msg = JSON.parse(RawData)
    }catch(e){
      console.log(e)
    }

    if(msg.pfx == 'add'){
      if(msg.type == 'art'){

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

        var server = dmxnet.newReceiver(msg.data[0])
        server.on('data', data => {
          oscClientList.forEach(c => {
            c.client.send('/'+c.address, data)
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
        var wsc = new Server({
          
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
