
const WebSocket = require("ws");
const queryString = require("query-string");

let CLIENTS = [];

module.exports = async (expressServer) => {
    const websocketServer = new WebSocket.Server({
        noServer: true,
        path: "/websockets",
    });

    expressServer.on("upgrade", (request, socket, head) => {
        websocketServer.handleUpgrade(request, socket, head, (websocket) => {
            websocketServer.emit("connection", websocket, request);
        });
    });

    websocketServer.on(
        "connection",
        function connection(websocketConnection, connectionRequest) {
            const [_path, params] = connectionRequest.url.split("?");
            const connectionParams = queryString.parse(params);

            console.log(connectionParams);

            websocketConnection.userId = connectionParams.userId;

            CLIENTS.push(websocketConnection);


            websocketConnection.on("message", (message) => {
                handleMessage(message);
                websocketConnection.send(JSON.stringify({ message: 'acknowledged!' }));
            });

            websocketConnection.on("close", () => {
                console.log("Client disconnected");
                CLIENTS = CLIENTS.filter((client) => client.userId !== websocketConnection.userId);
            });
        }
    );

    return websocketServer;
};


const handleMessage = (message) => {
    const parsedMessage = JSON.parse(message);
    console.log(message);
    const { data, clientId, timestamp } = parsedMessage;
    // TODO: Decrypt data and ensure it is valid

    const verifiedData = data + ": VERIFIED";

    // TODO: Encrpyt data and send back to client

    const receiver = CLIENTS.find((client) => client.userId === clientId);

    if (receiver) {
        receiver.send(JSON.stringify({
            data: verifiedData,
            timestamp,
        }));
    }
}