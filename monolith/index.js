const express= require("express");
const websockets= require('./websockets.js');

const app = express();
const port = process.env.PORT || 5001;

app.get('/', function(req, res, next){
    console.log('get route', req.testing);
    res.sendFile(__dirname + "/public/index.html");
});

const server = app.listen(port, () => {
    if (process.send) {
        process.send(`Server running at http://localhost:${port}\n\n`);
    }
});

websockets(server);

process.on("message", (message) => {
    console.log(message);
});