from starlette.exceptions import HTTPException


class BodyLimitMiddleware:
    """Bound incoming multipart data before Starlette spools it to disk."""
    def __init__(self, app, max_bytes: int):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        consumed = 0

        async def limited_receive():
            nonlocal consumed
            message = await receive()
            if message["type"] == "http.request":
                consumed += len(message.get("body", b""))
                if consumed > self.max_bytes:
                    raise HTTPException(413, "The request exceeds the upload size limit.")
            return message

        await self.app(scope, limited_receive, send)
