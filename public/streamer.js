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

const socket = io.connect(window.location.origin);
//const socket = io.connect();

/** Function that will get the Streamer's camera */
async function startVideo() {
  console.log("Requesting Local Media");
  try {
    // TODO: Add checking for camera and audio
    const userMedia = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    });

    console.log("Recieved Local Media");

    stream = userMedia;
    videoElementHTML.srcObject = stream;
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
  console.log(
    `Streamer RTCPeerConnection created. Configuration: ${configuration}`
  );

  // Saving it into the list of Peer Connections
  peerConnections[id] = peerConnection;

  // Ensuring the stream will show up on the webpage
  let stream = videoElementHTML.srcObject;

  // Not exactly sure what's going on here...
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  // ICE Candidate Step
  // onicecandidate is a type of event handler. It is called when an ICE candidate is recieved.
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice_candidate", id, event.candidate);
    }
    console.log("Streamer ICECandidate");
  };

  // SDP Offer Step
  peerConnection
    .createOffer()
    .then((sdp) => peerConnection.setLocalDescription(sdp))
    .then(() => {
      socket.emit("sdp_offer", id, peerConnection.localDescription);
      console.log("Streamer SDP offer sent to viewer");
    });
});

socket.on("sdp_answer", (id, description) => {
  peerConnections[id].setRemoteDescription(description);
  console.log(`Streamer - SDP answer recieved from viewer. ID: ${id}`);
});

// Adding an Ice Candidate
socket.on("ice_candidate", (id, candidate) => {
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});

// Closing the connection when a client disconnects and removing them from the list of peers
socket.on("disconnect_peer", (id) => {
  peerConnections[id].close();
  delete peerConnections[id];
});

window.onunload = window.onbeforeunload = () => {
  socket.close();
};
