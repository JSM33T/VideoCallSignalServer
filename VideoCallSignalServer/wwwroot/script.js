﻿const ownIdElement = document.getElementById('ownId');
const meetingIdInput = document.getElementById('meetingId');
const customIdInput = document.getElementById('customId'); // Add this input to your HTML
const createMeetingBtn = document.getElementById('createMeetingBtn');
const joinMeetingBtn = document.getElementById('joinMeetingBtn');
const endCallBtn = document.getElementById('endCallBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let connection, peerConnection, localStream;

const users = [
    {
        "user": "Jasmeet",
        "email" : "jasmeet.s@revalsys.com"
    },
    {
        "user": "Madhukar",
        "email":"madhukarreddy.b@revalsys.com"
    },
    {
        "user": "Sohail",
        "email": "madhukarreddy.b@revalsys.com"
    },
]
// Initialize SignalR connection
async function initializeSignalR() {
    connection = new signalR.HubConnectionBuilder()
        .withUrl("/enhancedCallHub")
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
                // Display both meeting ID and custom ID if available
                const displayText = meeting.customId ?
                    `${meeting.meetingId} (${meeting.customId})` :
                    meeting.meetingId;
                meetingElement.textContent = displayText;
                activeMeetingsSpan.appendChild(meetingElement);
            });
        } else {
            activeMeetingsSpan.textContent = 'No active meetings currently.';
        }
    });

    connection.on("CallRequest", function (customId) {
        // Handle incoming call request from related room
        const shouldAccept = confirm(`Incoming call request from room ${customId}. Accept?`);
        if (shouldAccept) {
            // You might want to automatically join the meeting or handle it differently
            console.log("Call request accepted from:", customId);
        }
    });

    connection.on("AllCallsEnded", function () {
        alert("All calls have been ended.");
        document.getElementById("activeMeetings").textContent = 'No active meetings currently.';
    });

    connection.on("StopCall", function () {
        stopCurrentCall();
    });

    connection.on("MeetingCreated", (meetingId, customId) => {
        const displayId = customId ? `${meetingId} (${customId})` : meetingId;
        alert(`Meeting created: ${displayId}. Share this ID to connect.`);
    });

    connection.on("UserJoined", (userId, customId) => {
        console.log(`User joined: ${userId}${customId ? ` with custom ID: ${customId}` : ''}`);
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
    const customId = customIdInput.value || ''; // Get custom ID if provided
    await connection.invoke("CreateMeeting", meetingId, customId);
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

// Rest of your existing WebRTC setup and handling code remains the same
async function setupWebRTC(isCaller) {
    if (peerConnection) return;

    peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" }
        ]
    });

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

    peerConnection.ontrack = (event) => {
        console.log("Received remote stream:", event.streams[0]);
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log("Sending ICE candidate:", event.candidate);
            connection.invoke("SendSignal", meetingIdInput.value, JSON.stringify(event.candidate));
        }
    };

    if (isCaller) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log("Sending offer:", offer);
        connection.invoke("SendSignal", meetingIdInput.value, JSON.stringify(offer));
    }

    endCallBtn.disabled = false;
}

function stopCurrentCall() {
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

    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
}

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