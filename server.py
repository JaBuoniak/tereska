#!/usr/bin/env python3
import http.server
import socketserver
import os
import json
from pathlib import Path
from urllib.parse import quote

PORT = 8000
REPO_DIR = '/home/tereska/repo'
IMAGES_DIR = '/home/tereska/Obrazy'

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/images':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()

            # Skanuj rekursywnie
            images = []
            image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}

            try:
                for root, dirs, files in os.walk(IMAGES_DIR):
                    for file in sorted(files):
                        if Path(file).suffix.lower() in image_extensions:
                            full_path = os.path.join(root, file)
                            # Zwróć relative path z URL encoding (względem REPO_DIR gdzie serwer serwuje)
                            rel_path = os.path.relpath(full_path, REPO_DIR)
                            # URL-encode całą ścieżkę (safe='/' żeby nie encodować slashów)
                            encoded_path = quote(rel_path, safe='/')
                            images.append(f"http://localhost:{PORT}/{encoded_path}")

                self.wfile.write(json.dumps(images).encode())
            except Exception as e:
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            super().do_GET()

os.chdir(REPO_DIR)
with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
    print(f"Serwer startuje na http://localhost:{PORT}")
    print(f"API: http://localhost:8000/api/images")
    httpd.serve_forever()
