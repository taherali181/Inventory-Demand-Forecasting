# eda.py
"""Exploratory data analysis over the processed sales CSV.

Renders charts server-side to base64 PNGs (no interactive plt.show()) so this
is safe to call from a request handler. Supersedes the old eda2.py — that
file duplicated this logic as a second, never-mounted FastAPI app.
"""
import base64
import io
import logging

import matplotlib

matplotlib.use("Agg")  # must be set before pyplot is imported, and before any server-side plotting
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

logger = logging.getLogger(__name__)


def _fig_to_base64(fig) -> str:
    buffer = io.BytesIO()
    fig.savefig(buffer, format="png", bbox_inches="tight")
    buffer.seek(0)
    encoded = base64.b64encode(buffer.read()).decode("utf-8")
    plt.close(fig)
    return encoded


def perform_eda(file_path: str) -> dict:
    """Run EDA over the processed CSV at file_path and return stats + chart images."""
    data = pd.read_csv(file_path)

    summary_statistics = data.describe().to_dict()
    missing_values = data.isnull().sum().to_dict()

    plot_data = data.copy()
    plot_data["date"] = pd.to_datetime(plot_data[["year", "month", "day"]])
    plot_data.set_index("date", inplace=True)

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.plot(plot_data["sales"], label="Sales Trend")
    ax.set_xlabel("Date")
    ax.set_ylabel("Sales")
    ax.set_title("Sales Trend Over Time")
    ax.legend()
    sales_trend_image = _fig_to_base64(fig)

    correlation_matrix = plot_data.corr(numeric_only=True)
    fig, ax = plt.subplots(figsize=(10, 6))
    sns.heatmap(correlation_matrix, annot=True, cmap="coolwarm", linewidths=0.5, ax=ax)
    ax.set_title("Correlation Heatmap")
    correlation_heatmap_image = _fig_to_base64(fig)

    fig, ax = plt.subplots(figsize=(10, 6))
    sns.histplot(plot_data["sales"], kde=True, ax=ax)
    ax.set_xlabel("Sales")
    ax.set_title("Sales Distribution")
    sales_distribution_image = _fig_to_base64(fig)

    fig, ax = plt.subplots(figsize=(10, 6))
    sns.boxplot(x=plot_data["sales"], ax=ax)
    ax.set_title("Sales Boxplot")
    sales_boxplot_image = _fig_to_base64(fig)

    logger.info("EDA computed over %d rows", len(data))

    return {
        "summary_statistics": summary_statistics,
        "missing_values": missing_values,
        "unique_stores": int(data["store"].nunique()),
        "unique_items": int(data["item"].nunique()),
        "sales_trend_image": sales_trend_image,
        "correlation_heatmap_image": correlation_heatmap_image,
        "sales_distribution_image": sales_distribution_image,
        "sales_boxplot_image": sales_boxplot_image,
    }
