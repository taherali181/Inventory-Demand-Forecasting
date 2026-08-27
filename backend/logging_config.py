# logging_config.py
"""A small stdlib JSON log formatter — no structlog dependency needed at
this app's scale. Each log record becomes one JSON object per line
(timestamp, level, logger name, message, plus exception info when
present), which is what most log aggregators (CloudWatch, Datadog, a
plain `jq` pipeline) expect rather than logging's default free-text
format.
"""
import json
import logging


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def configure_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)
