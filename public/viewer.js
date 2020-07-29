/***
 *          viewer.js
 */

// Only one peer connection is needed
let peerConnection;

const config = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302"],
    },
  ],
};

//const socket = io.connect(window.location.origin);
//const socket = io.connect("fw.gameclient.me:4000");
const socket = io.connect();

const videoElementHTML = document.querySelector("video");

// SDP Offer & ICE Candidate
// This occurs when the Streamer sends an SDP offer
// We will reply with an SDP answer
socket.on("sdp_offer", (id, description) => {

  // Creating a new RTC Peer Connection
  peerConnection = new RTCPeerConnection(config);

  // Creating the proper remote and local descriptions for that peer connection
  // then sending the answer back to the streamer.
  peerConnection
    .setRemoteDescription(description)
    .then(() => peerConnection.createAnswer())
    .then((sdp) => peerConnection.setLocalDescription(sdp))
    .then(() => {
      socket.emit("sdp_answer", id, peerConnection.localDescription);
      console.log("Viewer - SDP offer from streamer recieved. Answer sent to streamer.");
    });

  // Getting the stream video and assigning it to the html video element
  peerConnection.ontrack = (event) => {
    videoElementHTML.srcObject = event.streams[0];
    console.log("Viewer - Video stream recieved.")
  };

  // ICE Candidate Event Handler
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice_candidate", id, event.candidate);
      console.log("(1) Viewer ICECandidate Event Recieved");
    }
  };
});

// ICE Candidate signal handler
socket.on("ice_candidate", (id, candidate) => {
  peerConnection
    .addIceCandidate(new RTCIceCandidate(candidate))
    .catch((err) => console.error(err));

  console.log("(2) Viewer ICECandidate added")
});

// When a viewer connects, automatically begin the process to watch the stream
socket.on("connect", () => {
  socket.emit("watch_stream");
});

// When a stream is seen as online, the viewer should automatically begin to watch it
socket.on("stream_online", () => {
  socket.emit("watch_stream");
});

socket.on("disconnect_peer", () => {
  peerConnection.close();
});

window.onunload = window.onbeforeunload = () => {
  socket.close();
};
