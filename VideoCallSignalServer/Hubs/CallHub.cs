//using Microsoft.AspNetCore.SignalR;

//namespace VideoCallSignalServer.Hubs
//{
//    using Microsoft.AspNetCore.SignalR;
//    using System.Collections.Concurrent;

//    public class CallHub : Hub
//    {
//        private static readonly ConcurrentDictionary<string, HashSet<string>> Rooms = new();

//        public async Task CreateRoom(string roomId)
//        {
//            // Add the user to the specified room
//            if (!Rooms.ContainsKey(roomId))
//                Rooms[roomId] = new HashSet<string>();

//            Rooms[roomId].Add(Context.ConnectionId);
//            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

//            // Notify the creator that the room is ready
//            await Clients.Caller.SendAsync("RoomCreated", roomId);
//        }

//        public async Task JoinRoom(string roomId)
//        {
//            if (Rooms.TryGetValue(roomId, out var connections))
//            {
//                Rooms[roomId].Add(Context.ConnectionId);
//                await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

//                // Notify others in the room about the new connection
//                await Clients.OthersInGroup(roomId).SendAsync("UserJoined", Context.ConnectionId);
//            }
//            else
//            {
//                // Room doesn't exist
//                await Clients.Caller.SendAsync("Error", "Room not found.");
//            }
//        }

//        public async Task SendSignal(string roomId, string signalData)
//        {
//            // Relay signaling data to other users in the room
//            await Clients.OthersInGroup(roomId).SendAsync("ReceiveSignal", Context.ConnectionId, signalData);
//        }

//        public override async Task OnDisconnectedAsync(Exception? exception)
//        {
//            // Remove user from all rooms they belong to
//            foreach (var room in Rooms)
//            {
//                if (room.Value.Remove(Context.ConnectionId) && room.Value.Count == 0)
//                    Rooms.TryRemove(room.Key, out _); // Remove empty room
//            }

//            await base.OnDisconnectedAsync(exception);
//        }
//    }
//}
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace VideoCallSignalServer.Hubs
{
    public class CallHub : Hub
    {
        // Dictionary to store room IDs and a HashSet of connection IDs
        private static readonly ConcurrentDictionary<string, HashSet<string>> Rooms = new();

        // Create a room and add the creator to the room
        public async Task CreateRoom(string roomId)
        {
            if (!Rooms.ContainsKey(roomId))
                Rooms[roomId] = new HashSet<string>();

            Rooms[roomId].Add(Context.ConnectionId);
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

            // Notify the creator that the room is created
            await Clients.Caller.SendAsync("RoomCreated", roomId);

            // Broadcast active rooms to all connected clients
            await BroadcastActiveRooms();
        }

        // Join an existing room
        public async Task JoinRoom(string roomId)
        {
            if (Rooms.TryGetValue(roomId, out var connections))
            {
                Rooms[roomId].Add(Context.ConnectionId);
                await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

                // Notify others in the room about the new user
                await Clients.OthersInGroup(roomId).SendAsync("UserJoined", Context.ConnectionId);
            }
            else
            {
                // Room doesn't exist
                await Clients.Caller.SendAsync("Error", "Room not found.");
            }

            // Broadcast active rooms to all connected clients
            await BroadcastActiveRooms();
        }

        // Send signal data to other users in the room
        public async Task SendSignal(string roomId, string signalData)
        {
            await Clients.OthersInGroup(roomId).SendAsync("ReceiveSignal", Context.ConnectionId, signalData);
        }

        // On disconnection, clean up the user's data
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            foreach (var room in Rooms)
            {
                if (room.Value.Remove(Context.ConnectionId) && room.Value.Count == 0)
                    Rooms.TryRemove(room.Key, out _); // Remove empty room
            }

            // Broadcast active rooms to all connected clients
            await BroadcastActiveRooms();

            await base.OnDisconnectedAsync(exception);
        }

        // Broadcast the active rooms to all connected clients
        private async Task BroadcastActiveRooms()
        {
            var activeRooms = Rooms.Keys.ToList();
            await Clients.All.SendAsync("ActiveRoomsList", activeRooms);
        }

        public async Task EndAllCalls()
        {
            foreach (var room in Rooms)
            {
                foreach (var connectionId in room.Value)
                {
                    await Clients.Client(connectionId).SendAsync("StopCall");
                }
            }

            Rooms.Clear();

            await Clients.All.SendAsync("AllCallsEnded");
        }
    }
}
