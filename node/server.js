const express = require('express');
const http = require('http');
const socketio = require('socket.io');

//routes
const users = require('./routes/user');
const auth = require('./routes/auth');
const groups = require('./routes/group');
const {messageRouter, createUserMessage, createGroupMessage, startMessage} = require('./routes/message');
const history = require('connect-history-api-fallback');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const bodyParser = require('body-parser')
const cors = require('cors');
app.use(cors({origin:true,credentials: true}));

function setupCORS(req, res, next) {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With, Content-type,Accept,X-Access-Token,X-Key');
    res.header("Access-Control-Allow-Credentials", true);
    if (req.method === 'OPTIONS') {
        res.status(200).end();
    } else {
        next();
    }
}

app.all('/*', setupCORS)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));

//db setup
const db = require("./models");

const dbConfig = require("./config/database");
db.mongoose
    .connect(dbConfig.URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log("Successfully connected to MongoDB.");
    })
    .catch(err => {
        console.error("Connection error", err);
        process.exit();
    });

app.use('/users', users);
app.use('/auth', auth);
app.use('/groups', groups);
app.use('/messages', messageRouter);
app.use(history());
app.listen(8080);

const jwt = require("jsonwebtoken");
const config = require("./config/auth.js");
const {addUser, removeUser, addUserIntoGroup} = require('./routes/online');
io.use((socket, next) =>{
    if (socket.handshake.query && socket.handshake.query.token){
        jwt.verify(socket.handshake.query.token, config.secret, (err, decoded) => {
            if (err) return next(new Error('Authentication error'));
            socket.decoded = decoded;
            next();
        });
    }
    else {
        next(new Error('Authentication error'));
    }
})
    .on('connection', socket => {
        // Connection now authenticated to receive further events

        socket.on('disconnect', () => {
            removeUser(socket.id);
        })

        socket.on('startMessage', ({sender, recipient, senderEmail}) => {
            startMessage(sender, recipient);
            addUser({id: socket.id, email: senderEmail})
        })

        socket.on('sendMessage', ({sender, recipient, message}) => {
            createUserMessage(sender, recipient, message)
                .then(res => {
                    io.emit('message', res)
                })
        })

        socket.on('sendGroupMessage', ({sender, recipient, message}) => {
            createGroupMessage(sender, recipient, message)
                .then(res => {
                    io.to(res.recipient.code).emit('groupMessage', res)
                })
        })

        socket.on('joinGroup', ({group, userInfo}) => {
            socket.join(group);
            addUserIntoGroup({group, userInfo});
        })
    });