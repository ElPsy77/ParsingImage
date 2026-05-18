#!/usr/bin/env python3
"""Статический сервер + прокси для AI API (обход CORS в браузере)."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"


def load_dotenv() -> None:
    env_path = ROOT / ".env"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_dotenv()
PORT = int(os.environ.get("PORT", "8787"))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/api/bootstrap-profiles":
            self._bootstrap_profiles()
            return
        super().do_GET()

    def do_POST(self) -> None:
        if self.path == "/api/chat":
            self._proxy_chat()
            return
        self.send_error(404)

    def _is_localhost(self) -> bool:
        remote = self.client_address[0]
        if remote in ("127.0.0.1", "::1", "localhost"):
            return True
        host = (self.headers.get("Host") or "").split(":")[0].lower()
        return host in ("localhost", "127.0.0.1", "::1")

    def _bootstrap_profiles(self) -> None:
        if not self._is_localhost():
            self._json_response(403, {"error": "Доступно только с localhost"})
            return

        profiles: list[dict] = []

        or_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
        if or_key:
            profiles.append(
                {
                    "name": "OpenRouter",
                    "provider": "openrouter",
                    "baseUrl": "https://openrouter.ai/api/v1",
                    "model": "google/gemini-2.0-flash-exp:free",
                    "apiKey": or_key,
                }
            )

        gem_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if gem_key:
            profiles.append(
                {
                    "name": "Gemini (нужен платный план)",
                    "provider": "gemini",
                    "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai",
                    "model": "gemini-2.0-flash-lite",
                    "apiKey": gem_key,
                }
            )

        groq_key = os.environ.get("GROQ_API_KEY", "").strip()
        if groq_key:
            profiles.append(
                {
                    "name": "Groq (без vision)",
                    "provider": "groq",
                    "baseUrl": "https://api.groq.com/openai/v1",
                    "model": "llama-3.3-70b-versatile",
                    "apiKey": groq_key,
                }
            )

        active_name = None
        if or_key:
            active_name = "OpenRouter"
        elif gem_key:
            active_name = "Gemini"
        elif profiles:
            active_name = profiles[0]["name"]

        self._json_response(200, {"profiles": profiles, "activeName": active_name})

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8"))

    def _proxy_chat(self) -> None:
        try:
            body = self._read_json()
            base_url = (body.get("baseUrl") or "").rstrip("/")
            api_key = body.get("apiKey") or ""
            model = body.get("model") or "gpt-4o"
            messages = body.get("messages") or []
            extra_headers = body.get("headers") or {}

            if not base_url or not api_key:
                self._json_response(400, {"error": "Нужны baseUrl и apiKey"})
                return

            payload = json.dumps(
                {"model": model, "messages": messages, "max_tokens": 4096},
                ensure_ascii=False,
            ).encode("utf-8")

            url = f"{base_url}/chat/completions"
            req = urllib.request.Request(
                url,
                data=payload,
                method="POST",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                    **{str(k): str(v) for k, v in extra_headers.items()},
                },
            )

            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            self._json_response(200, data)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            try:
                detail = json.loads(err_body)
            except json.JSONDecodeError:
                detail = {"error": err_body or str(e)}
            self._json_response(e.code, detail)
        except Exception as e:
            self._json_response(500, {"error": str(e)})

    def _json_response(self, code: int, data: dict) -> None:
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format: str, *args) -> None:
        if args and str(args[0]).startswith(("POST /api/chat", "GET /api/bootstrap")):
            return
        super().log_message(format, *args)


def main() -> None:
    server = ThreadingHTTPServer(("", PORT), Handler)
    print(f"Матан: http://localhost:{PORT}")
    print("AI: POST /api/chat · GET /api/bootstrap-profiles (localhost)")
    server.serve_forever()


if __name__ == "__main__":
    main()
