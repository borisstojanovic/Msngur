const express = require('express');

//routes
const users = require('./routes/user.routes');
const auth = require('./routes/auth.routes');
const history = require('connect-history-api-fallback');

const app = express();
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
const dbConfig = require("./config/database.config");
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
app.use(history());
app.listen(8080);
