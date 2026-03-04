# Simple HTTP server for receiving dispense commands
# Runs in a background thread alongside the main polling loop

import socket
import ujson
from hardware import dispense_from_silo, led_blink

SERVER_PORT = 8080


def parse_request(data):
    """Parse HTTP request and return method, path, and body."""
    try:
        text = data.decode('utf-8')
        lines = text.split('\r\n')
        first_line = lines[0].split(' ')
        method = first_line[0]
        path = first_line[1] if len(first_line) > 1 else '/'

        # Find body (after empty line)
        body = ''
        for i, line in enumerate(lines):
            if line == '' and i + 1 < len(lines):
                body = '\r\n'.join(lines[i + 1:])
                break

        return method, path, body
    except:
        return None, None, None


def send_response(client, status, body):
    """Send HTTP response."""
    response = f"HTTP/1.1 {status}\r\n"
    response += "Content-Type: application/json\r\n"
    response += "Access-Control-Allow-Origin: *\r\n"
    response += "Access-Control-Allow-Methods: POST, GET, OPTIONS\r\n"
    response += "Access-Control-Allow-Headers: Content-Type\r\n"
    response += f"Content-Length: {len(body)}\r\n"
    response += "\r\n"
    response += body
    client.send(response.encode('utf-8'))


def handle_dispense(body):
    """Handle dispense request."""
    try:
        data = ujson.loads(body) if body else {}
        silo = data.get('silo', 0)
        qty = data.get('qty', 1)

        print(f"[Server] Dispense request: silo={silo}, qty={qty}")

        success, dispensed = dispense_from_silo(silo, qty)

        return ujson.dumps({
            'success': success,
            'dispensed': dispensed,
            'requested': qty
        })
    except Exception as e:
        print(f"[Server] Dispense error: {e}")
        return ujson.dumps({
            'success': False,
            'error': str(e)
        })


def handle_client(client):
    """Handle a single client connection."""
    try:
        data = client.recv(1024)
        if not data:
            return

        method, path, body = parse_request(data)
        print(f"[Server] {method} {path}")

        # Handle CORS preflight
        if method == 'OPTIONS':
            send_response(client, '200 OK', '')
            return

        # Route requests
        if path == '/dispense' and method == 'POST':
            result = handle_dispense(body)
            send_response(client, '200 OK', result)
        elif path == '/ping':
            send_response(client, '200 OK', '{"status":"ok"}')
        else:
            send_response(client, '404 Not Found', '{"error":"Not found"}')

    except Exception as e:
        print(f"[Server] Client error: {e}")
    finally:
        client.close()


def start_server():
    """Start the HTTP server (blocking - run in a thread)."""
    addr = socket.getaddrinfo('0.0.0.0', SERVER_PORT)[0][-1]
    server = socket.socket()
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(addr)
    server.listen(1)

    print(f"[Server] Listening on port {SERVER_PORT}")

    while True:
        try:
            client, client_addr = server.accept()
            print(f"[Server] Connection from {client_addr}")
            handle_client(client)
        except Exception as e:
            print(f"[Server] Accept error: {e}")
