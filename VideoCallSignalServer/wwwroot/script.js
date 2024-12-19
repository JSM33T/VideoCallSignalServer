const ownIdElement = document.getElementById('ownId');
const meetingIdInput = document.getElementById('meetingId');
const createMeetingBtn = document.getElementById('createMeetingBtn');
const joinMeetingBtn = document.getElementById('joinMeetingBtn');
const endCallBtn = document.getElementById('endCallBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let connection, peerConnection, localStream;

// Initialize SignalR connection
async function initializeSignalR() {
    connection = new signalR.HubConnectionBuilder()
        .withUrl("/callHub")
        .build();

    await connection.start();
    ownIdElement.textContent = connection.connectionId;

    setupSignalHandlers();
}

// SignalR event handlers
function setupSignalHandlers() {

    connection.on("ActiveMeetingsList", function (meetings) {
        const activeMeetingsSpan = document.getElementById("activeMeetings");
        activeMeetingsSpan.innerHTML = ''; // Clear previous list

        if (meetings.length > 0) {
            meetings.forEach(meeting => {
                const meetingElement = document.createElement("span");
                meetingElement.classList.add('badge', 'bg-primary', 'me-2');
                meetingElement.textContent = meeting;
                activeMeetingsSpan.appendChild(meetingElement);
            });
        } else {
            activeMeetingsSpan.textContent = 'No active meetings currently.';
        }
    });

    // Listen for a notification that all calls have ended
    connection.on("AllCallsEnded", function () {
        alert("All calls have been ended.");
        document.getElementById("activeMeetings").textContent = 'No active meetings currently.';
    });


    // Button click to end all calls
    document.getElementById('endAllCallsBtn').addEventListener('click', function () {
        connection.invoke("EndAllCalls").catch(err => console.error(err));
    });


    connection.on("StopCall", function () {
        stopCurrentCall(); // Stop the current call and close the video stream
    });


    connection.on("MeetingCreated", (meetingId) => {
        alert(`Meeting created: ${meetingId}. Share this ID to connect.`);
    });

    connection.on("UserJoined", (userId) => {
        console.log(`User joined: ${userId}`);
        setupWebRTC(true); // Initialize WebRTC as caller
    });

    connection.on("ReceiveSignal", async (senderId, signal) => {
        const message = JSON.parse(signal);

        if (message.type === "offer") {
            console.log("Received offer:", message);
            await setupWebRTC(false); // Initialize WebRTC as joiner
            await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            connection.invoke("SendSignal", meetingIdInput.value, JSON.stringify(answer));
        } else if (message.type === "answer") {
            console.log("Received answer:", message);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
        } else if (message.candidate) {
            console.log("Received ICE candidate:", message.candidate);
            await peerConnection.addIceCandidate(new RTCIceCandidate(message));
        }
    });

    connection.on("Error", (error) => {
        alert(error);
    });
}

// Create a new meeting
async function createMeeting() {
    const meetingId = meetingIdInput.value || Math.random().toString(36).substring(2, 10);
    await connection.invoke("CreateMeeting", meetingId);
    meetingIdInput.value = meetingId;
}

// Join an existing meeting
async function joinMeeting() {
    const meetingId = meetingIdInput.value;
    if (!meetingId) {
        alert("Enter a meeting ID to join.");
        return;
    }
    await connection.invoke("JoinMeeting", meetingId);
}

// Set up WebRTC
async function setupWebRTC(isCaller) {
    if (peerConnection) return; // Avoid multiple initializations

    peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" }
        ]
    });

    // Add local stream to PeerConnection

    const mediaSpecs = {
        video: {
            width: { ideal: 480 }, 
            height: { ideal: 360 },  
            frameRate: { ideal: 12 }, 
        },
        audio: true
    };


    localStream = await navigator.mediaDevices.getUserMedia(mediaSpecs);
    localVideo.srcObject = localStream;

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
        console.log("Received remote stream:", event.streams[0]);
        remoteVideo.srcObject = event.streams[0];
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log("Sending ICE candidate:", event.candidate);
            connection.invoke("SendSignal", meetingIdInput.value, JSON.stringify(event.candidate));
        }
    };

    // Create and send SDP offer if caller
    if (isCaller) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log("Sending offer:", offer);
        connection.invoke("SendSignal", meetingIdInput.value, JSON.stringify(offer));
    }

    endCallBtn.disabled = false;
}

function stopCurrentCall() {
    // Stop local video and remote video
    const localVideo = document.getElementById("localVideo");
    const remoteVideo = document.getElementById("remoteVideo");

    if (localVideo.srcObject) {
        let stream = localVideo.srcObject;
        let tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }

    if (remoteVideo.srcObject) {
        let stream = remoteVideo.srcObject;
        let tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }

    // Reset the video elements to blank
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;

    // Optionally, you can disconnect from the meeting or group here
    // If you're using SignalR groups, you may want to remove the user from the group as well.
    // connection.invoke("LeaveMeeting", meetingId);
}

// End the call
function endCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
    }
    endCallBtn.disabled = true;
}

createMeetingBtn.addEventListener("click", createMeeting);
joinMeetingBtn.addEventListener("click", joinMeeting);
endCallBtn.addEventListener("click", endCall);

// Initialize SignalR
initializeSignalR();
