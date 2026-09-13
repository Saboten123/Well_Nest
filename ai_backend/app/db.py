import psycopg2
from psycopg2.extras import RealDictCursor, Json
from psycopg2.pool import SimpleConnectionPool
from .config import DATABASE_URL

_pool = SimpleConnectionPool(1, 10, dsn=DATABASE_URL)


def _init_schema():
    conn = _pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS conversations (
                    user_id TEXT PRIMARY KEY,
                    summary TEXT NOT NULL DEFAULT '',
                    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
                    turns INTEGER NOT NULL DEFAULT 0,
                    updated_at DOUBLE PRECISION NOT NULL DEFAULT 0
                )
                """
            )
        conn.commit()
    finally:
        _pool.putconn(conn)


_init_schema()


def find_conversation(user_id: str):
    """Returns a dict like {"summary", "messages", "turns", "updated_at"} or None."""
    conn = _pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT summary, messages, turns, updated_at "
                "FROM conversations WHERE user_id = %s",
                (user_id,),
            )
            return cur.fetchone()
    finally:
        _pool.putconn(conn)


def insert_conversation(user_id: str, summary: str, messages: list, turns: int, updated_at: float):
    conn = _pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO conversations (user_id, summary, messages, turns, updated_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id) DO NOTHING
                """,
                (user_id, summary, Json(messages), turns, updated_at),
            )
        conn.commit()
    finally:
        _pool.putconn(conn)


def upsert_conversation(user_id: str, summary: str, messages: list, turns: int, updated_at: float):
    conn = _pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO conversations (user_id, summary, messages, turns, updated_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id) DO UPDATE SET
                    summary = EXCLUDED.summary,
                    messages = EXCLUDED.messages,
                    turns = EXCLUDED.turns,
                    updated_at = EXCLUDED.updated_at
                """,
                (user_id, summary, Json(messages), turns, updated_at),
            )
        conn.commit()
    finally:
        _pool.putconn(conn)