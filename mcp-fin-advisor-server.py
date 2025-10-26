"""
MCP Financial Advisor Server
----------------------------

This MCP server exposes finance-related tools (cashflow analysis, budget planning,
FX conversion, risk profiling, and simple retirement projection).

Built with the official MCP Python SDK using FastMCP for concise tool definitions.

Requirements (choose one):
    A) **uv (projectless)**: uv pip install 'mcp[cli]>=1.2.0' httpx python-dateutil
    B) **pip/venv**: python3 -m venv .venv && source .venv/bin/activate && pip install 'mcp[cli]>=1.2.0' httpx python-dateutil

Run (STDIO transport):
    # using uv without a pyproject
    uv run python mcp-fin-advisor-server.py
    # or plain Python
    python3 mcp-fin-advisor-server.py

Notes:
- Avoid printing to stdout in MCP servers (it breaks JSON-RPC). We log to stderr.
- Network calls use httpx. External APIs are optional and gated by env vars.
- Tools are synchronous from the model's standpoint; many are async under the hood.

Integrations:
- Exchangerate.host (no key) for FX rates.
- Optional: Finnhub stock quotes if FINNHUB_API_KEY is set.
"""
from __future__ import annotations

import os
import json
import math
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

import httpx
from dateutil.relativedelta import relativedelta
from mcp.server.fastmcp import FastMCP

# -------------------------
# Logging (stderr-safe)
# -------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mcp-fin-advisor")

# -------------------------
# MCP server instance
# -------------------------
mcp = FastMCP("mcp-fin-advisor")

# -------------------------
# Utilities
# -------------------------
ISO_CURRENCY_SET = {
    "USD","EUR","MXN","GBP","JPY","CAD","AUD","BRL","CHF","CNY","INR","CLP","COP","ARS"
}

async def fx_rate(from_ccy: str, to_ccy: str) -> Optional[float]:
    """Fetch FX rate via exchangerate.host (no API key). Returns None on failure."""
    url = f"https://api.exchangerate.host/convert?from={from_ccy}&to={to_ccy}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
            if data.get("result") is None:
                return None
            return float(data["result"])
    except Exception as e:
        logger.warning("fx_rate error: %s", e)
        return None

async def get_stock_quote(symbol: str) -> Optional[Dict[str, Any]]:
    """Fetch a stock quote using Finnhub if FINNHUB_API_KEY is present. Otherwise None.

    Environment:
        FINNHUB_API_KEY: optional
    """
    api_key = os.getenv("FINNHUB_API_KEY")
    if not api_key:
        return None
    url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={api_key}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
            # Expected keys: c (current), h (high), l (low), o (open), pc (prevClose), t (timestamp)
            return data
    except Exception as e:
        logger.warning("get_stock_quote error: %s", e)
        return None

# -------------------------
# Tools
# -------------------------
@mcp.tool()
async def fx_convert(amount: float, from_currency: str, to_currency: str) -> str:
    """
    Convierte monto entre divisas usando proveedores públicos (sin API key).
    Fallback: exchangerate.host -> frankfurter.app
    """
    import httpx

    from_currency = from_currency.upper().strip()
    to_currency = to_currency.upper().strip()
    timeout = httpx.Timeout(5.0, connect=5.0)

    # 1) exchangerate.host /convert (intenta resultado directo)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(
                "https://api.exchangerate.host/convert",
                params={"from": from_currency, "to": to_currency, "amount": amount},
            )
            r.raise_for_status()
            data = r.json()
            # algunos responses devuelven 'result' y otros solo rates
            if isinstance(data, dict) and data.get("result") is not None:
                result = float(data["result"])
                rate = result / float(amount) if amount else None
                rate_txt = f" @ {rate:.6f}" if rate else ""
                return f"{amount:,.2f} {from_currency} ≈ {result:,.2f} {to_currency}{rate_txt}"
            # fallback interno: calcular con /latest
            base = from_currency
            r2 = await client.get(
                "https://api.exchangerate.host/latest",
                params={"base": base, "symbols": to_currency},
            )
            r2.raise_for_status()
            d2 = r2.json()
            rate = d2.get("rates", {}).get(to_currency)
            if rate:
                result = float(amount) * float(rate)
                return f"{amount:,.2f} {from_currency} ≈ {result:,.2f} {to_currency} @ {rate:.6f}"
    except Exception:
        pass  # intenta siguiente proveedor

    # 2) frankfurter.app
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(
                "https://api.frankfurter.app/latest",
                params={"amount": amount, "from": from_currency, "to": to_currency},
            )
            r.raise_for_status()
            d = r.json()
            rate = d.get("rates", {}).get(to_currency)
            if rate is not None:
                result = float(rate)
                # frankfurter devuelve ya 'amount' convertido en 'rates[to]'
                eff_rate = result / float(amount) if amount else None
                rate_txt = f" @ {eff_rate:.6f}" if eff_rate else ""
                return f"{amount:,.2f} {from_currency} ≈ {result:,.2f} {to_currency}{rate_txt}"
    except Exception as e:
        # continúa a error final
        err = str(e)

    return f"Unable to fetch FX rate for {from_currency}->{to_currency} right now."



@mcp.tool()
async def analyze_cashflow(
    csv_text: str,
    currency: str = "MXN",
    has_header: bool = True,
) -> str:
    """Analyze a simple cashflow CSV and summarize totals by type/category.

    CSV format (comma-separated):
        date, description, amount, type, category
    Where:
        - date: YYYY-MM-DD (ignored if absent)
        - amount: positive for income, negative for expense (or use `type`)
        - type: optional: INCOME or EXPENSE (case-insensitive)
        - category: e.g., Rent, Food, Transport, Salary, etc.

    Args:
        csv_text: The CSV contents as text.
        currency: ISO currency code for display (default MXN)
        has_header: Whether the first line is a header row.

    Returns:
        Markdown with totals, per-category breakdown, and savings rate.
    """
    import csv
    from io import StringIO

    reader = csv.reader(StringIO(csv_text))
    rows = list(reader)
    if has_header and rows:
        rows = rows[1:]

    total_income = 0.0
    total_expense = 0.0
    by_category: Dict[str, float] = {}

    for row in rows:
        if not row:
            continue
        # Expect len>=3; be defensive
        amount = 0.0
        typ = ""
        category = "Uncategorized"
        try:
            if len(row) >= 3:
                amount = float(row[2])
            if len(row) >= 4 and row[3]:
                typ = str(row[3]).strip().upper()
            if len(row) >= 5 and row[4]:
                category = str(row[4]).strip() or category
        except Exception:
            continue

        # Determine sign/type
        if typ == "INCOME":
            total_income += abs(amount)
            by_category[category] = by_category.get(category, 0.0) + abs(amount)
        elif typ == "EXPENSE":
            total_expense += abs(amount)
            by_category[category] = by_category.get(category, 0.0) - abs(amount)
        else:
            # fallback by sign
            if amount >= 0:
                total_income += amount
                by_category[category] = by_category.get(category, 0.0) + amount
            else:
                total_expense += abs(amount)
                by_category[category] = by_category.get(category, 0.0) + amount  # negative

    net = total_income - total_expense
    savings_rate = (net / total_income * 100.0) if total_income > 0 else 0.0

    # Build Markdown
    lines = []
    lines.append(f"**Currency:** {currency.upper()}")
    lines.append("")
    lines.append(f"**Total income:** {total_income:,.2f} {currency}")
    lines.append(f"**Total expenses:** {total_expense:,.2f} {currency}")
    lines.append(f"**Net (income - expenses):** {net:,.2f} {currency}")
    lines.append(f"**Savings rate:** {savings_rate:.2f}%")
    lines.append("")
    lines.append("### Category breakdown (positive=net inflow, negative=net outflow)")
    for cat, amt in sorted(by_category.items(), key=lambda x: x[0].lower()):
        lines.append(f"- {cat}: {amt:,.2f} {currency}")

    # Simple envelope suggestion
    if total_income > 0:
        baseline_50 = total_income * 0.50
        baseline_30 = total_income * 0.30
        baseline_20 = total_income * 0.20
        lines.append("")
        lines.append("### 50/30/20 baseline suggestion")
        lines.append(f"- Needs (≈50%): {baseline_50:,.2f} {currency}")
        lines.append(f"- Wants (≈30%): {baseline_30:,.2f} {currency}")
        lines.append(f"- Savings/Debt (≈20%): {baseline_20:,.2f} {currency}")

    return "\n".join(lines)


@mcp.tool()
async def budget_plan(
    monthly_income: float,
    fixed_costs: float,
    variable_costs: float,
    savings_goal_pct: float = 20.0,
    currency: str = "MXN",
) -> str:
    """Create a simple monthly budget plan.

    Args:
        monthly_income: Total take-home per month
        fixed_costs: Sum of fixed mandatory costs (rent, utilities, etc.)
        variable_costs: Sum of typical variable spending (food, transport, etc.)
        savings_goal_pct: Target savings as % of income (default 20)
        currency: ISO code for display

    Returns:
        A Markdown budget with targets and warnings if infeasible.
    """
    if monthly_income <= 0:
        return "Monthly income must be > 0."
    savings_target = monthly_income * (savings_goal_pct / 100.0)
    planned_total = fixed_costs + variable_costs + savings_target

    lines = []
    lines.append(f"**Income:** {monthly_income:,.2f} {currency}")
    lines.append(f"- Fixed costs: {fixed_costs:,.2f} {currency}")
    lines.append(f"- Variable costs: {variable_costs:,.2f} {currency}")
    lines.append(f"- Savings target ({savings_goal_pct:.1f}%): {savings_target:,.2f} {currency}")
    lines.append("")

    if planned_total > monthly_income:
        gap = planned_total - monthly_income
        lines.append(f"⚠️ Plan infeasible by {gap:,.2f} {currency}. Suggestions:")
        lines.append("- Reduce variable costs (start here).")
        lines.append("- Negotiate fixed bills or consider cheaper alternatives.")
        lines.append("- Lower savings target temporarily and ramp up later.")
    else:
        buffer = monthly_income - planned_total
        lines.append(f"✅ Plan feasible. Buffer: {buffer:,.2f} {currency} (unallocated)")
        lines.append("Tip: Allocate buffer to an emergency fund until 3–6 months of expenses.")

    return "\n".join(lines)


@mcp.tool()
async def risk_profile(answers_json: str) -> str:
    """Compute a basic risk profile (Conservative/Moderate/Aggressive).

    Args:
        answers_json: JSON array of integers 1–5 representing answers to 8–12
                      standard risk-tolerance questions (higher = more tolerant).

    Returns:
        The inferred risk profile and guidance.
    """
    try:
        answers = json.loads(answers_json)
        if not isinstance(answers, list) or not answers:
            return "answers_json must be a non-empty JSON array"
        scores = [int(x) for x in answers]
    except Exception:
        return "Invalid answers_json; must be JSON array of integers."

    avg = sum(scores) / len(scores)
    if avg < 2.5:
        profile = "Conservative"
        mix = "70% bonds / 25% equities / 5% cash"
    elif avg < 3.5:
        profile = "Moderate"
        mix = "40% bonds / 55% equities / 5% cash"
    else:
        profile = "Aggressive"
        mix = "15% bonds / 80% equities / 5% cash"

    return (
        f"**Risk profile:** {profile}\n"
        f"**Illustrative mix:** {mix}\n"
        "Note: This is educational, not investment advice. Consider your horizon, liquidity, and taxes."
    )


@mcp.tool()
async def retirement_projection(
    current_age: int,
    retirement_age: int,
    current_savings: float,
    monthly_contribution: float,
    expected_return_pct: float = 6.0,
    inflation_pct: float = 3.0,
    currency: str = "MXN",
) -> str:
    """Project retirement savings using a simple real-return model.

    Assumptions:
      - Contributions at month end.
      - Constant nominal return and inflation.
      - Real return ≈ ((1+r)/(1+i) - 1).

    Args:
        current_age: Your current age (years)
        retirement_age: Target age to stop contributing
        current_savings: Current portfolio balance
        monthly_contribution: Planned monthly contribution
        expected_return_pct: Annual nominal return (e.g., 6)
        inflation_pct: Annual inflation (e.g., 3)
        currency: ISO code

    Returns:
        Markdown summary with projected nominal and real balances.
    """
    if retirement_age <= current_age:
        return "retirement_age must be greater than current_age"

    years = retirement_age - current_age
    months = years * 12

    r_nominal = expected_return_pct / 100.0
    i = inflation_pct / 100.0
    r_real = (1 + r_nominal) / (1 + i) - 1

    # Future value of current savings (compounded monthly at nominal rate)
    r_m = (1 + r_nominal) ** (1 / 12) - 1
    fv_current = current_savings * ((1 + r_m) ** months)

    # Future value of a series (ordinary annuity) for contributions
    if r_m == 0:
        fv_contrib = monthly_contribution * months
    else:
        fv_contrib = monthly_contribution * (((1 + r_m) ** months - 1) / r_m)

    fv_nominal = fv_current + fv_contrib

    # Convert nominal FV to today's money using inflation
    fv_real = fv_nominal / ((1 + i) ** years)

    lines = []
    lines.append(f"**Horizon:** {years} years ({months} months)")
    lines.append(f"**Expected return (nominal):** {expected_return_pct:.2f}% | **Inflation:** {inflation_pct:.2f}%")
    lines.append(f"**Projected balance (nominal):** {fv_nominal:,.2f} {currency}")
    lines.append(f"**Projected balance (today's money):** {fv_real:,.2f} {currency}")
    lines.append("")
    lines.append("Tips:")
    lines.append("- Increase contributions annually at least with inflation.")
    lines.append("- Build an emergency fund separately (3–6 months of expenses).")
    lines.append("- Rebalance to your risk profile yearly.")

    return "\n".join(lines)


@mcp.tool()
async def quote(symbol: str) -> str:
    """Get a live stock quote if FINNHUB_API_KEY is configured; otherwise a notice.

    Args:
        symbol: Ticker symbol (e.g., AAPL, MSFT, NVDA)
    """
    data = await get_stock_quote(symbol.upper())
    if not data:
        return (
            "Live quotes disabled (missing FINNHUB_API_KEY). Set it and restart the server, "
            "or rely on historical/planned inputs instead."
        )
    # data keys: c (current), h, l, o, pc, t
    ts = int(data.get("t", 0))
    price = data.get("c")
    prev = data.get("pc")
    chg = (price - prev) if (price is not None and prev not in (None, 0)) else None
    chg_pct = (chg / prev * 100.0) if (chg is not None and prev not in (None, 0)) else None

    return (
        f"**{symbol.upper()}**\n"
        f"Price: {price} | Prev Close: {prev}\n"
        f"Change: {(chg if chg is not None else 'n/a')} "
        f"({(f'{chg_pct:.2f}%' if chg_pct is not None else 'n/a')})\n"
        f"Timestamp: {datetime.utcfromtimestamp(ts).isoformat()}Z"
    )


# -------------------------
# Resources & Prompts (optional but useful)
# -------------------------
@mcp.resource("memory://disclaimer")
async def disclaimer() -> str:
    """General-purpose financial disclaimer."""
    return (
        "This server provides educational information only and is not individualized "
        "investment, tax, or legal advice. Consider consulting a licensed professional."
    )


@mcp.prompt("budget_prompt")
async def budget_prompt() -> str:
    """A prompt template to help the model guide users through creating a budget."""
    return (
        "You are a budgeting assistant. Ask the user for: (1) monthly income, "
        "(2) fixed costs, (3) variable costs, and (4) desired savings %. Then call the "
        "`budget_plan` tool with those numbers and present a clear, friendly summary."
    )


# -------------------------
# Entrypoint
# -------------------------
def main() -> None:
    # Use STDIO transport for broad MCP host compatibility (Claude Desktop, bridges, etc.)
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
