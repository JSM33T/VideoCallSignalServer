
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace VideoCallSignalServer.Hubs
{
    public class CallHub : Hub
    {
        // Dictionary to store meeting IDs and a HashSet of connection IDs
        private static readonly ConcurrentDictionary<string, HashSet<string>> Meetings = new();

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
            foreach (var meeting in Meetings)
            {
                if (meeting.Value.Remove(Context.ConnectionId) && meeting.Value.Count == 0)
                    Meetings.TryRemove(meeting.Key, out _); // Remove empty meeting
            }

            // Broadcast active meetings to all connected clients
            await BroadcastActiveMeetings();

            await base.OnDisconnectedAsync(exception);
        }

        // Broadcast the active meetings to all connected clients
        private async Task BroadcastActiveMeetings()
        {
            var activeMeetings = Meetings.Keys.ToList();
            await Clients.All.SendAsync("ActiveMeetingsList", activeMeetings);
        }

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
    }
}
