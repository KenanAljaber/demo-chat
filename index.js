const http = require('http');
const socketio = require('socket.io');

const app = http.createServer();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: '*'
    }
});

const activeSockets = {};

io.on('connection', (socket) => {
    console.log('a user connected');
    if(activeSockets[socket.id]) {
        console.log('socket already exists');
        return;
    }
    socket.on('join-room', ({username, chatRoomName,id}) => {
        socket.join(chatRoomName);
        socket.to(chatRoomName).emit('user-connected', username);
    });

    socket.on('message', (message) => {
        console.log('message: ', message);
        socket.in(message.chatRoomName).emit('createMessage', message);
    });

    socket.on('typing', (data) => {
        console.log('typing: ', data.username);
        socket.in(data.chatRoomName).emit('user-typing', data);
    });
    socket.on('stopTyping', (data) => {
        console.log('stopped-typing: ', data.username);
        socket.in(data.chatRoomName).emit('user-stopTyping', data);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        delete activeSockets[socket.id];
    });

    // Store the socket reference in the activeSockets object
    activeSockets[socket.id] = socket;
});

const port = process.env.PORT || 4500;

server.listen(port, () => {
    console.log('listening on *:'+port);
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
    console.log('Server is shutting down.');
    shutdownServer();
});

process.on('SIGTERM', () => {
    console.log('Server received termination signal.');
    shutdownServer();
});

function shutdownServer() {
    // Close all active socket connections
    Object.keys(activeSockets).forEach((socketId) => {
        const socket = activeSockets[socketId];
        if (socket) {
            socket.disconnect(true); // Disconnect with force (true)
        }
    });

    // Close the server
    server.close(() => {
        console.log('Server has been shut down.');
        process.exit(0);
    });
}
