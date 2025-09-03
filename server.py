import asyncio
import json
import uuid
import websockets

# Store connected clients
clients = {}
# Predefined list of colors for users
colors = ['#ff7f50', '#6495ed', '#ff69b4', '#00ced1', '#ffd700', '#adff2f']
color_index = 0

def assign_color():
    """Assigns a color from the predefined list sequentially."""
    global color_index
    color = colors[color_index]
    color_index = (color_index + 1) % len(colors)
    return color

async def broadcast(message):
    """Broadcasts a message to all connected clients."""
    if clients:
        tasks = [asyncio.create_task(client.send(message)) for client in clients]
        await asyncio.wait(tasks)

async def handler(websocket):
    """Handles WebSocket connections."""
    client_id = str(uuid.uuid4())
    color = assign_color()
    username = f"Player-{client_id[:4]}"

    clients[websocket] = {"id": client_id, "color": color, "username": username}
    print(f"Client {username} ({client_id}) connected with color {color}")

    try:
        # Send initial info to the connected client
        await websocket.send(json.dumps({"type": "userColor", "color": color}))
        await websocket.send(json.dumps({"type": "userInfo", "username": username}))

        # Listen for messages from the client
        async for message in websocket:
            data = json.loads(message)

            if data.get("type") == "chatMessage":
                sender_info = clients[websocket]
                outgoing_message = {
                    "type": "chatMessage",
                    "text": data["text"],
                    "username": sender_info["username"],
                    "color": sender_info["color"]
                }
                await broadcast(json.dumps(outgoing_message))

    except websockets.exceptions.ConnectionClosedError:
        print(f"Client {clients[websocket]['username']} disconnected")
    finally:
        # Unregister client
        del clients[websocket]

async def main():
    """Starts the WebSocket server."""
    async with websockets.serve(handler, "localhost", 8080):
        print("WebSocket server started on ws://localhost:8080")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
