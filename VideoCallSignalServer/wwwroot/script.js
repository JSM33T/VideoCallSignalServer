const ownIdElement = document.getElementById('ownId');
const meetingIdInput = document.getElementById('meetingId');
const createMeetingBtn = document.getElementById('createMeetingBtn');
const joinMeetingBtn = document.getElementById('joinMeetingBtn');
const endCallBtn = document.getElementById('endCallBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const loginUserBtn = document.getElementById("loginUser");
const userName = document.getElementById("loginId");
const onlineUsersContainer = document.getElementById("onlineUsers");

const ringer = document.getElementById("ringer");


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

// Add user to the server's online user list
function addUser(userNameInput) {
    const userNameValue = userNameInput.value;
    if (!userNameValue) {
        alert("Please enter a username.");
        return;
    }
    connection.invoke("AddUser", userNameValue).catch(err => console.error("Error adding user:", err));
    connection.invoke("AddUser", userNameValue).catch(err => console.error("Error adding user:", err));
}

// SignalR event handlers
function setupSignalHandlers() {

    //connection.on("ActiveMeetingsList", function (meetings) {
    //    const activeMeetingsSpan = document.getElementById("activeMeetings");
    //    activeMeetingsSpan.innerHTML = '';

    //    if (meetings.length > 0) {
    //        meetings.forEach(meeting => {
    //            const meetingElement = document.createElement("span");
    //            meetingElement.classList.add('badge', 'bg-primary', 'me-2');
    //            meetingElement.textContent = meeting;
    //            activeMeetingsSpan.appendChild(meetingElement);

    //            const meetingParts = meeting.split("_");

    //            console.log("meeting part 1" + meetingParts[0]);
    //            console.log("meeting part 2" + meetingParts[1]);
    //            console.log(ownIdElement.innerText)
    //            //if (meetingParts[0] === ownIdElement.innerText)
    //            //{
    //            //    alert(`incoming call from ${meetingParts[1]}`);
    //            //}
    //            if (meetingParts[0] === ownIdElement.innerText) {
    //                const confirmed = confirm(`Incoming call from ${meetingParts[1]}. Do you want to join?`);

    //                if (confirmed) {
    //                    console.log(`User chose to join the call from ${meetingParts[1]}`);
    //                    joinMeeting2(meeting);

    //                    // Add logic to join the meeting here
    //                } else {
    //                    console.log(`User chose to cancel the call from ${meetingParts[1]}`);
    //                }

    //                break;
    //            }

    //        });
    //    } else {
    //        activeMeetingsSpan.textContent = 'No active meetings currently.';
    //    }
    //});
    connection.on("ActiveMeetingsListBAK", function (meetings) {
        const activeMeetingsSpan = document.getElementById("activeMeetings");
        activeMeetingsSpan.innerHTML = '';

        //if (meetings.length > 0) {
        //    for (const meeting of meetings) {  // Use 'for...of' to break out of the loop
        //        const meetingElement = document.createElement("span");
        //        meetingElement.classList.add('badge', 'bg-primary', 'me-2');
        //        meetingElement.textContent = meeting;
        //        activeMeetingsSpan.appendChild(meetingElement);

        //        const meetingParts = meeting.split("_");

        //        console.log("meeting part 1: " + meetingParts[0]);
        //        console.log("meeting part 2: " + meetingParts[1]);
        //        console.log(ownIdElement.innerText);

        //        if (meetingParts[0] === ownIdElement.innerText) {
        //            const confirmed = confirm(`Incoming call from ${meetingParts[1]}. Do you want to join?`);

        //            if (confirmed) {
        //                console.log(`User chose to join the call from ${meetingParts[1]}`);
        //                activeMeetingsSpan.addEventListener("click", joinMeeting2(meeting));
        //                break;  // Break out of the loop once the meeting is joined
        //            } else {
        //                console.log(`User chose to cancel the call from ${meetingParts[1]}`);
        //            }
        //        }
        //    }
        //} else {
        //    activeMeetingsSpan.textContent = 'No active meetings currently.';
        //}
        if (meetings.length > 0) {
            for (const meeting of meetings) {  // Use 'for...of' to break out of the loop
                const meetingElement = document.createElement("span");
                meetingElement.classList.add('badge', 'bg-primary', 'me-2');
                meetingElement.textContent = meeting;
                activeMeetingsSpan.appendChild(meetingElement);

                const meetingParts = meeting.split("_");

                console.log("meeting part 1: " + meetingParts[0]);
                console.log("meeting part 2: " + meetingParts[1]);
                console.log(ownIdElement.innerText);

                if (meetingParts[0] === ownIdElement.innerText) {
                    ringer.play();
                    const confirmed = confirm(`Incoming call from ${meetingParts[1]}. Do you want to join?`);
                   
                    if (confirmed) {
                        console.log(`User chose to join the call from ${meetingParts[1]}`);
                        // Correctly attach the event listener, use an anonymous function to call joinMeeting2

                        console.log(meeting);

                        ringer.pause();
                        joinMeeting2(meeting);
                        break;
                        // Break out of the loop once the meeting is joined
                    } else {
                        continue;
                    }

                }
            }
        } else {
            activeMeetingsSpan.textContent = 'No active meetings currently.';
        }

    });


    let processedMeetings = new Set();

    //connection.on("ActiveMeetingsList", function (meetings) {
    //    const activeMeetingsSpan = document.getElementById("activeMeetings");
    //    activeMeetingsSpan.innerHTML = '';

    //    if (meetings.length > 0) {
    //        meetings.forEach(meeting => {
    //            const meetingElement = document.createElement("span");
    //            meetingElement.classList.add('badge', 'bg-primary', 'me-2');
    //            meetingElement.textContent = meeting;
    //            activeMeetingsSpan.appendChild(meetingElement);

    //            const meetingParts = meeting.split("_");

    //            if (meetingParts[0] === ownIdElement.textContent && !processedMeetings.has(meeting)) {
    //                processedMeetings.add(meeting);
    //                const confirmed = confirm(`Incoming call from ${meetingParts[1]}. Do you want to join?`);
    //                if (confirmed) {
    //                    meetingIdInput.value = meeting;
    //                    joinMeeting2(meeting);
    //                } else {
    //                    connection.invoke("EndCall", meetingParts[1]);
    //                }
    //            }
    //        });
    //    } else {
    //        activeMeetingsSpan.textContent = 'No active meetings currently.';
    //        processedMeetings.clear();
    //    }
    //});


    connection.on("ActiveMeetingsList", function (meetings) {
        const activeMeetingsSpan = document.getElementById("activeMeetings");
        activeMeetingsSpan.innerHTML = '';

        if (meetings.length > 0) {
            meetings.forEach(meeting => {
                const meetingElement = document.createElement("span");
                meetingElement.classList.add('badge', 'bg-primary', 'me-2');
                meetingElement.textContent = meeting;
                activeMeetingsSpan.appendChild(meetingElement);

                const meetingParts = meeting.split("_");
              
                if (meetingParts[0] === ownIdElement.textContent && !processedMeetings.has(meeting)) {
                    processedMeetings.add(meeting);
                    ringer.play();
                    const confirmed = confirm(`Incoming call from ${meetingParts[1]}. Do you want to join?`);
                    if (confirmed) {
                        meetingIdInput.value = meeting;
                        joinMeeting2(meeting);
                        ringer.pause();
                    } else {
                        connection.invoke("EndCall", meetingParts[1]);
                    }
                } else if (meetingParts[1] === ownIdElement.textContent && !processedMeetings.has(meeting)) {
                    processedMeetings.add(meeting);
                    meetingIdInput.value = meeting;
                    joinMeeting2(meeting);
                }
            });
        } else {
            activeMeetingsSpan.textContent = 'No active meetings currently.';
            processedMeetings.clear();
        }
    });

    // Listen for a notification that all calls have ended
    connection.on("AllCallsEnded", function () {
        alert("All calls have been ended.");
        document.getElementById("activeMeetings").textContent = 'No active meetings currently.';
    });

    // Listen for online users list
    //connection.on("OnlineUsersList", function (users) {
    //    onlineUsersContainer.innerHTML = ''; // Clear previous list
    //    if (users.length > 0) {
    //        users.forEach(user => {
    //            const userElement = document.createElement('li');
    //            userElement.textContent = user;
    //            onlineUsersContainer.appendChild(userElement);
    //        });
    //    } else {
    //        onlineUsersContainer.textContent = 'No users online.';
    //    }
    //});




    //connection.on("OnlineUsersList", function (users) {
    //   /* const onlineUsersContainer = document.getElementById("activeUsers");*/
    //    onlineUsersContainer.innerHTML = ''; // Clear previous list

    //    if (users.length > 0) {
    //        users.forEach(user => {
    //            const userElement = document.createElement('button');
    //            //userElement.classList.add("btn btn-sm",)


    //            // Add click event to create a meeting with the clicked user as the meeting ID

    //            if (userElement.textContent !== ownIdElement.textContent) {
    //                userElement.className = "btn btn-primary";
    //                userElement.textContent = user;
    //                console.log(userName.value);
    //                    userElement.addEventListener('click', function () {
    //                        createMeetingWithUser(user);
    //                        joinMeeting2();
    //                    });
    //                onlineUsersContainer.appendChild(userElement);
    //            }


    //        });
    //    } else {
    //        onlineUsersContainer.textContent = 'No users online.';
    //    }
    //});
    connection.on("OnlineUsersList", function (users) {
        onlineUsersContainer.innerHTML = ''; // Clear previous list

        if (users.length > 0) {
            users.forEach(user => {
                if (user !== ownIdElement.textContent) {  // Only process users that aren't the current user
                    const userElement = document.createElement('button');
                    userElement.className = "btn btn-primary";
                    userElement.textContent = user;

                    userElement.addEventListener('click', function () {
                        createMeetingWithUser(user);

                    });

                    onlineUsersContainer.appendChild(userElement);
                }
            });
        } else {
            onlineUsersContainer.textContent = 'No users online.';
        }
    });

    function createMeetingWithUser(user) {
        connection.invoke("CreateMeeting", user + "_" + ownId.innerHTML);


        console.log(`Meeting created with ID: ${user} and ${ownId.innerHTML}`);

    }


    // Button click to end all calls
    document.getElementById('endAllCallsBtn').addEventListener('click', function () {
        connection.invoke("EndAllCalls").catch(err => console.error(err));
    });

    connection.on("StopCall", function () {
        stopCurrentCall(); // Stop the current call and close the video stream
    });

    connection.on("MeetingCreated", (meetingId) => {
        //  alert(`Meeting created: ${meetingId}. Share this ID to connect.`);
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

    connection.on("SetOwnId", function (userName) {
        document.getElementById("ownId").textContent = userName;
    });

}

// Create a new meeting
async function createMeeting(remoteUsername) {
    const meetingId = userName + "_" + remoteUsername;

    await connection.invoke("CreateMeeting", meetingId);
    meetingIdInput.value = meetingId;
}

// Join an existing meeting
async function joinMeeting() {
    const meetingId = meetingIdInput.value;
    alert(meetingId)
    if (!meetingId) {
        alert("Enter a meeting ID to join.");
        return;
    }
    await connection.invoke("JoinMeeting", meetingId);
    document.getElementById("videoContainer").classList.remove('disabled');
}

function joinMeeting2(meetingId) {

    connection.invoke("JoinMeeting", meetingId);
    document.getElementById("videoContainer").classList.remove('disabled');
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

function refreshOnlineUsers() {
    //   await connection.invoke("TriggerOnlineUsersList").catch(err => console.error("Error adding user:", err));
}


// End the call
//function endCall() {
//    if (peerConnection) {
//        peerConnection.close();
//        peerConnection = null;
//    }
//    if (localStream) {
//        localStream.getTracks().forEach((track) => track.stop());
//    }
//   // endCallBtn.disabled = true;
//}
function endCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
    }

    const userId = ownIdElement.textContent; // Use your ID
    connection.invoke("EndCall", userId).catch(err => console.error(err));
}



createMeetingBtn.addEventListener("click", createMeeting);
joinMeetingBtn.addEventListener("click", joinMeeting);
endCallBtn.addEventListener("click", endCall);

loginUserBtn.addEventListener("click", () => addUser(userName));
refreshOnlineUsers();
// Initialize SignalR
initializeSignalR();
