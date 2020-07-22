/** Dependencies */
const express = require("express");
const socketio = require("socket.io");
const http = require("http");

/** Basic App Setup */
const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = 4000;

// Use the public folder
app.use(express.static(__dirname + "/public"));

let streamer;

io.sockets.on("connection", (socket) => {
  socket.on("stream_online", () => {
    streamer = socket.id;
    socket.broadcast.emit("stream_online");
  });
  socket.on("watch_stream", () => {
    socket.to(streamer).emit("watch_stream", socket.id);
  });
  socket.on("disconnect_peer", () => {
    socket.to(streamer).emit("disconnect_peer", socket.id);
  });
  socket.on("sdp_offer", (id, description) => {
    socket.to(id).emit("sdp_offer", socket.id, description);
  });
  socket.on("sdp_answer", (id, description) => {
    socket.to(id).emit("sdp_answer", socket.id, description);
  });
  socket.on("ice_candidate", (id, message) => {
    socket.to(id).emit("ice_candidate", socket.id, message);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}.`);
});
