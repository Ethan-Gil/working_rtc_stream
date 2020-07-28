/***
 *          streamer.js
 */

// The actual html video element that will play the stream
const videoElementHTML = document.querySelector("video");

// The list of peer connections
const peerConnections = {};

// ICE Server configuration
const configuration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302"],
    },
  ],
};

//const socket = io.connect(window.location.origin);
const socket = io.connect("fw.gameclient.me:4000");

/** Function that will get the streamer's camera and begin the stream */
async function startVideo() {
  console.log("Requesting Local Media");
  try {
    // TODO: Add video quality options
    // TODO: Add error checking for missing/broken media devices

    // Accessing the user's media devices
    const userMedia = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    });

    console.log("Recieved Local Media");

    stream = userMedia;                     // The actual stream object
    videoElementHTML.srcObject = stream;    // HTML video element

    socket.emit("stream_online");
  } catch (err) {
    console.error(`Error getting local media: ${err}`);
  }
}

// Starting the stream
startVideo();

// When a viewer wants to watch the stream.
socket.on("watch_stream", (id) => {

  // Creating a new Peer Connection
  const peerConnection = new RTCPeerConnection(configuration);
  console.log("Streamer RTCPeerConnection created");

  // Saving it into the list of Peer Connections
  peerConnections[id] = peerConnection;

  // Sending the stream object to the remote peer
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

   // SDP Offer Step
   peerConnection
   .createOffer()
   .then((sdp) => peerConnection.setLocalDescription(sdp))
   .then(() => {
     socket.emit("sdp_offer", id, peerConnection.localDescription);
     console.log("Streamer SDP offer sent to viewer");
   });

  // Calling the ICE Candidate signal when an ICE candidate is recieved.
  // onicecandidate is a type of event handler. It is called when an ICE candidate is recieved.
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice_candidate", id, event.candidate);
    }
    console.log("(1) Streamer ICECandidate Event Recieved");
  };

});

// When the viewer sends an SDP answer
socket.on("sdp_answer", (id, description) => {
  peerConnections[id].setRemoteDescription(description);
  console.log(`Streamer - SDP answer recieved from viewer. ID: ${id}`);
});

// ICE Candidate signal handler
socket.on("ice_candidate", (id, candidate) => {
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
  console.log("(2) Streamer ICECandidate added")
});

// todo: stopStream()

// Closing the connection when a client disconnects and removing them from the list of peers
socket.on("disconnect_peer", (id) => {
  peerConnections[id].close();
  delete peerConnections[id];
  console.log(`Disconnected peer with ID: ${id}`);
});

window.onunload = window.onbeforeunload = () => {
  socket.close();
};
