// WEBSOCKET BLOCK
import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import { nanoid } from 'nanoid'

const appWebSocket = express()
const server = createServer(appWebSocket)
server.listen(3001, () => {
    console.log('WebSocket server listening on port 3001')
})
const io = new Server(server, {
    transports: ['websocket'],
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
})

const roomIdToMessagesMapping = {}
//send rendered msg + username back to every room (client)
io.on('connection', (socket) => {
    socket.on('sendMessage', (message) => { //room is created when there is a msg and then stored
        const roomId = message.roomId

        const finalMessage = {
            ...message,
            messageId: nanoid(),
        }

        roomIdToMessagesMapping[roomId] = roomIdToMessagesMapping[roomId] || []
        roomIdToMessagesMapping[roomId].push(finalMessage)

        io.to(roomId).emit('roomMessage', finalMessage) //emit to all in the room
    })
    //to show whos typing
    socket.on('sendTypingIndicator', message => { 
        const { roomId } = message

        io.to(roomId).emit('userTyping', message) //broadcast whos typing
    })

    socket.on('joinRoomExclusively', (room) => {
        if (room >= 1 && room <= 50) {
            // ok
        } else {
            socket.emit('error-from-server', 'invalid-roomid')
            return
        }

        socket.rooms.forEach((roomIdIAmPartOf) => {
            socket.leave(roomIdIAmPartOf)
        })

        socket.join(room)
        const messages = roomIdToMessagesMapping[room] || []

        for (const message of messages) {
            socket.emit('roomMessage', message)
        }
    })
})
