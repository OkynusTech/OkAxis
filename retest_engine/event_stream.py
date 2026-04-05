"""
Event streaming for real-time retest progress.

Provides an EventBus that the orchestrator emits events to,
and subscribers (like the SSE endpoint) consume from.
"""

import json
import queue
import threading
from typing import Any

from .logger import get_logger

log = get_logger(__name__)


class EventBus:
    """
    Thread-safe event bus for streaming retest progress.

    The orchestrator calls emit() as the agent loop runs.
    The SSE endpoint calls subscribe() to get a queue of events.
    """

    def __init__(self):
        self._subscribers: list[queue.Queue] = []
        self._lock = threading.Lock()

    def subscribe(self) -> queue.Queue:
        """Create a new subscriber queue. Returns a Queue that receives events."""
        q: queue.Queue = queue.Queue()
        with self._lock:
            self._subscribers.append(q)
        return q

    def unsubscribe(self, q: queue.Queue) -> None:
        """Remove a subscriber queue."""
        with self._lock:
            try:
                self._subscribers.remove(q)
            except ValueError:
                pass

    def emit(self, event_type: str, data: dict[str, Any]) -> None:
        """Emit an event to all subscribers."""
        event = {"type": event_type, "data": data}
        with self._lock:
            for q in self._subscribers:
                try:
                    q.put_nowait(event)
                except queue.Full:
                    log.warning(f"Subscriber queue full, dropping event: {event_type}")

    def format_sse(self, event: dict) -> str:
        """Format an event as an SSE message string."""
        event_type = event.get("type", "message")
        data = json.dumps(event.get("data", {}))
        return f"event: {event_type}\ndata: {data}\n\n"
