from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException

from app.api.routes import router
from app.core.config import get_settings
from app.core.body_limit import BodyLimitMiddleware
from app.exceptions import AppError


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Lectura API", version="1.0.0")
    app.add_middleware(BodyLimitMiddleware, max_bytes=settings.max_upload_bytes + 65536)
    app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=False, allow_methods=["GET", "POST", "DELETE"], allow_headers=["Content-Type"])

    @app.exception_handler(AppError)
    async def app_error(request: Request, error: AppError):
        return JSONResponse(status_code=error.status, content={"message": error.message, "code": error.code}, headers={"Retry-After": "30"} if error.status == 429 else None)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError):
        # Do not echo submitted answers or document data in validation messages.
        return JSONResponse(status_code=422, content={"message": "Invalid request. Check the fields, IDs and allowed values.", "code": "validation_error"})

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request: Request, error: SQLAlchemyError):
        return JSONResponse(status_code=503, content={"message": "Database unavailable. Check PostgreSQL and run the database migrations.", "code": "database_unavailable"})

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, error: HTTPException):
        return JSONResponse(status_code=error.status_code, content={"message": str(error.detail), "code": "http_error"}, headers=error.headers)

    app.include_router(router, prefix=settings.api_prefix)
    return app


app = create_app()
