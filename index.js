const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");

const io = require("socket.io")(server, {
	cors: {
		origin: "*",
		methods: [ "GET", "POST" ]
	}
});

app.use(cors());

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
	res.send('Running');
});

const users = {};

const socketToRoom = {};


io.on("connection", (socket) => {
	socket.on("join room", (roomID,name,email) => {
        console.log("user connected: ", name)
        socket.join(roomID);

        if (users[roomID]) { // odada biri varsa
            let user = {
                ID: socket.id,
                name: name,
                email: email
            }
            users[roomID].push(user);
            console.log("users: ", users)
        } else { // odada biri yoksa
            let user = {
                ID: socket.id,
                name: name,
                email: email
            }
            users[roomID] = [user];
            console.log("users: ", users[roomID])
        }
        socketToRoom[socket.id] = roomID;
        //const usersInThisRoom = users[roomID].filter(user => user.ID != socket.id);
        //console.log("usersInThisRoom", usersInThisRoom)
        socket.emit("all users", users[roomID]);
        socket.emit('message', { user: 'admin', text: `${name}, welcome to room`});
        socket.broadcast.to(roomID).emit('message', { user: 'admin', text: `${name} has joined!` });
    
    });

    socket.on('sendMessage', (payload,callback) => {
        const user = users[payload.roomID].filter((user) => user.ID === socket.id)
        io.to(socketToRoom[socket.id]).emit('message', { user: user[0].name, text: payload.message });
        callback();
    });

    socket.on("sending signal", payload => {
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID, name: payload.name, email: payload.email});
    });

    socket.on("returning signal", payload => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        /* let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
        } */
        let Users = users[roomID];
        if(Users){
             Users.forEach((user) => {
                if(user.ID == socket.id){
                    Users = Users.filter(user => user.ID !== socket.id);
                    users[roomID] = Users;
                    socket.broadcast.emit('user left', user);
                }
            });
            console.log("user disconnected :",socket.id)
        }
        
    });
    
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));