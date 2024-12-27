using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Collections.Generic;

namespace VideoCallSignalServer.Hubs
{
    public class CallHub : Hub
    {
        // Dictionary to store meeting IDs and a HashSet of connection IDs
        private static readonly ConcurrentDictionary<string, HashSet<string>> Meetings = new();

        // Dictionary to store connection IDs and usernames
        private static readonly ConcurrentDictionary<string, string> OnlineUsers = new();

        // Create a meeting and add the creator to the meeting
        public async Task CreateMeeting(string meetingId)
        {
            if (!Meetings.ContainsKey(meetingId))
                Meetings[meetingId] = new HashSet<string>();

            Meetings[meetingId].Add(Context.ConnectionId);
            await Groups.AddToGroupAsync(Context.ConnectionId, meetingId);

            // Notify the creator that the meeting is created
            await Clients.Caller.SendAsync("MeetingCreated", meetingId);

            // Broadcast active meetings to all connected clients
            await BroadcastActiveMeetings();
        }

        // Add a user to the online users list
        public async Task AddUser(string userName)
        {
            if (!string.IsNullOrEmpty(userName))
            {
                OnlineUsers[Context.ConnectionId] = userName;

                
                // Notify all clients about the updated online users list
                await BroadcastOnlineUsers();

                await Clients.Caller.SendAsync("SetOwnId", userName);
            }
        }

        // Join an existing meeting
        public async Task JoinMeeting(string meetingId)
        {
            if (Meetings.TryGetValue(meetingId, out var connections))
            {
                Meetings[meetingId].Add(Context.ConnectionId);
                await Groups.AddToGroupAsync(Context.ConnectionId, meetingId);

                // Notify others in the meeting about the new user
                await Clients.OthersInGroup(meetingId).SendAsync("UserJoined", Context.ConnectionId);
            }
            else
            {
                // Meeting doesn't exist
                await Clients.Caller.SendAsync("Error", "Meeting not found.");
            }

            // Broadcast active meetings to all connected clients
            await BroadcastActiveMeetings();
        }

        // Send signal data to other users in the meeting
        public async Task SendSignal(string meetingId, string signalData)
        {
            await Clients.OthersInGroup(meetingId).SendAsync("ReceiveSignal", Context.ConnectionId, signalData);
        }

        // On disconnection, clean up the user's data
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            // Remove the user from any meetings they were part of
            foreach (var meeting in Meetings)
            {
                if (meeting.Value.Remove(Context.ConnectionId) && meeting.Value.Count == 0)
                    Meetings.TryRemove(meeting.Key, out _); // Remove empty meeting
            }

            // Remove the user from the online users list
            OnlineUsers.TryRemove(Context.ConnectionId, out _);

            // Broadcast updated active meetings and online users
            await BroadcastActiveMeetings();
            await BroadcastOnlineUsers();

            await base.OnDisconnectedAsync(exception);
        }

        // Broadcast the active meetings to all connected clients
        private async Task BroadcastActiveMeetings()
        {
            var activeMeetings = Meetings.Keys.ToList();
            await Clients.All.SendAsync("ActiveMeetingsList", activeMeetings);
        }

        // Broadcast the online users list to all connected clients
        private async Task BroadcastOnlineUsers()
        {
            var onlineUsers = OnlineUsers.Values.ToList();
            await Clients.All.SendAsync("OnlineUsersList", onlineUsers);
        }

        public async Task TriggerOnlineUsersList()
        {
            await BroadcastOnlineUsers();
        }

        public async Task EndCall(string userId)
        {
            // Find the room ID by looking for the user in the rooms
            var roomId = Meetings.FirstOrDefault(r => r.Value.Contains(userId)).Key;

            if (!string.IsNullOrEmpty(roomId))
            {
                // Try to get the HashSet of users in the room
                if (Meetings.TryGetValue(roomId, out var users))
                {
                    // Remove the user from the room's HashSet
                    users.Remove(userId);

                    // If no users remain in the room, remove the room from the dictionary
                    if (users.Count == 0)
                    {
                        Meetings.TryRemove(roomId, out _); // Remove the empty room
                        await Clients.All.SendAsync("RoomDestroyed", roomId);
                    }
                }
            }
        }






        // End all active calls and notify all participants
        public async Task EndAllCalls()
        {
            foreach (var meeting in Meetings)
            {
                foreach (var connectionId in meeting.Value)
                {
                    await Clients.Client(connectionId).SendAsync("StopCall");
                }
            }

            Meetings.Clear();

            await Clients.All.SendAsync("AllCallsEnded");
        }

        public async Task DestroyMeeting(string meetingId)
        {
            if (Meetings.TryRemove(meetingId, out var connections))
            {
                foreach (var connectionId in connections)
                {
                    // Notify all participants of the destroyed meeting
                    await Clients.Client(connectionId).SendAsync("MeetingDestroyed", meetingId);
                    await Groups.RemoveFromGroupAsync(connectionId, meetingId);
                }
            }
            else
            {
                // Meeting doesn't exist
                await Clients.Caller.SendAsync("Error", "Meeting not found.");
            }

            // Broadcast updated active meetings
            await BroadcastActiveMeetings();
        }
    }
}
