# notifications.py
"""Email delivery for newly-opened low-stock alerts (IMPROVEMENT_PLAN.md
Change 11.7). Uses stdlib smtplib — no new dependency. Deliberately scoped
to email only, not webhooks: webhook delivery is meaningfully more scope
(retries, payload versioning, delivery tracking) for unclear demand at this
app's scale — revisit if that need actually shows up.
"""
import logging
import smtplib
from email.message import EmailMessage
from typing import Dict, List

import database
from config import settings
from models import Alert, Product, Warehouse

logger = logging.getLogger(__name__)


def _build_email_body(alerts: List[Alert], products_by_id: Dict[int, Product], warehouses_by_id: Dict[int, Warehouse]) -> str:
    lines = [f"{len(alerts)} new low-stock alert(s) opened:", ""]
    for alert in alerts:
        product = products_by_id.get(alert.product_id)
        warehouse = warehouses_by_id.get(alert.warehouse_id)
        product_label = product.name if product else f"product #{alert.product_id}"
        warehouse_label = warehouse.name if warehouse else f"warehouse #{alert.warehouse_id}"
        lines.append(
            f"- {product_label} at {warehouse_label}: {alert.current_value} on hand "
            f"(reorder point {alert.threshold_value})"
        )
    return "\n".join(lines)


def send_new_alert_notifications(alert_ids: List[int]) -> None:
    """Scheduled via BackgroundTasks from routers/alerts.py's recompute
    endpoint — see run_forecast_training_in_background for why this opens
    its own DB session via database.SessionLocal (module-qualified, not a
    frozen `from database import SessionLocal`) rather than reusing the
    request's.

    Only called with a non-empty alert_ids when at least one alert was
    genuinely newly opened by that recompute (never on a recompute that
    changes nothing, and never for alerts that already existed and just
    had current_value refreshed) — see routers/alerts.py's
    newly_created_alerts tracking.

    A send failure is logged, not raised: there's no HTTP request left to
    propagate an exception to by the time this runs, and a notification
    failure is not the same kind of problem as the alert recompute itself
    failing (which already succeeded and committed by the time this task
    is scheduled).
    """
    if not alert_ids or not settings.alert_notification_emails:
        return

    db = database.SessionLocal()
    try:
        alerts = db.query(Alert).filter(Alert.id.in_(alert_ids)).all()
        if not alerts:
            return

        products_by_id = {
            p.id: p for p in db.query(Product).filter(Product.id.in_({a.product_id for a in alerts}))
        }
        warehouses_by_id = {
            w.id: w for w in db.query(Warehouse).filter(Warehouse.id.in_({a.warehouse_id for a in alerts}))
        }

        message = EmailMessage()
        message["Subject"] = f"{len(alerts)} new low-stock alert(s)"
        message["From"] = settings.smtp_from_address
        message["To"] = ", ".join(settings.alert_notification_emails)
        message.set_content(_build_email_body(alerts, products_by_id, warehouses_by_id))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except Exception:
        logger.exception("Failed to send alert notification email for alert_ids=%s", alert_ids)
    finally:
        db.close()
