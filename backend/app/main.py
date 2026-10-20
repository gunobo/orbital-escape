from contextlib import asynccontextmanager

from fastapi import FastAPI

from .db import Base, engine
from .routers import auth, scores


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="궤도이탈 API", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(scores.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
