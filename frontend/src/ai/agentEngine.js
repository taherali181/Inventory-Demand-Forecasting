import { toolRegistry } from './toolRegistry';

export class AgentEngine {
  /**
   * Route a user query to the matching inventory tool.
   *
   * This is deterministic keyword routing over the backend API — there is no
   * language model involved. Slash commands take a direct fast path; free text
   * falls through the intent checks below.
   */
  static async processQuery(userInput, context = {}) {
    const query = userInput.trim().toLowerCase();

    // 1. Slash Command Fast-Path Dispatcher
    if (query.startsWith('/')) {
      return this.handleSlashCommand(query, context);
    }

    // 2. Keyword intent routing
    try {
      if (query.includes('alert') || query.includes('low stock') || query.includes('out of stock') || query.includes('stockout')) {
        const alertRes = await toolRegistry.get_alerts.execute({ status: 'open' });
        const count = alertRes.data?.items?.length || alertRes.data?.length || 0;
        return {
          text: count > 0
            ? `**${count} open low-stock alert(s).**`
            : `**No open low-stock alerts.** Every tracked product is above its reorder point.`,
          widgets: [alertRes.widget],
          quickActions: [
            { label: "Reorder suggestions", query: "/reorder" },
            { label: "Recalculate alerts", query: "/recompute-alerts" },
          ]
        };
      }

      if (query.includes('reorder') || query.includes('restock') || query.includes('order suggestion') || query.includes('buy')) {
        const reorderRes = await toolRegistry.get_reorder_suggestions.execute();
        const items = reorderRes.data || [];
        return {
          text: items.length > 0
            ? `**${items.length} product(s)** are projected to fall below their reorder point.`
            : `**Nothing to reorder.** No product is projected to fall below its reorder point.`,
          widgets: [reorderRes.widget],
          quickActions: [
            { label: "Purchase orders", query: "/po" },
            { label: "Compare forecasts", query: "/forecast" },
          ]
        };
      }

      if (query.includes('forecast') || query.includes('predict') || query.includes('demand') || query.includes('ml model')) {
        // Try comparing or running forecast for product 1 & warehouse 1 as default, or extract IDs
        const productMatch = query.match(/product\s*#?(\d+)/i) || query.match(/sku\s*#?(\d+)/i);
        const warehouseMatch = query.match(/warehouse\s*#?(\d+)/i);

        const productId = productMatch ? parseInt(productMatch[1]) : (context.productId || 1);
        const warehouseId = warehouseMatch ? parseInt(warehouseMatch[1]) : (context.warehouseId || 1);

        const forecastRes = await toolRegistry.compare_forecasts.execute({
          product_id: productId,
          warehouse_id: warehouseId
        });

        return {
          text: `Forecast runs for **Product #${productId}** at **Warehouse #${warehouseId}**.`,
          widgets: [forecastRes.widget],
          quickActions: [
            { label: "Sales analysis", query: "/eda" },
            { label: "Reorder suggestions", query: "/reorder" },
          ]
        };
      }

      if (query.includes('purchase order') || query.includes('po') || query.includes('orders') || query.includes('pending delivery')) {
        const poRes = await toolRegistry.list_purchase_orders.execute({ limit: 5 });
        const count = poRes.data?.length || 0;
        return {
          text: `**${count} recent purchase order(s).**`,
          widgets: [poRes.widget],
          quickActions: [
            { label: "New purchase order", query: "/new-po" },
            { label: "Low stock alerts", query: "/alerts" },
          ]
        };
      }

      if (query.includes('stock') || query.includes('inventory') || query.includes('on hand') || query.includes('available')) {
        const stockRes = await toolRegistry.get_stock_levels.execute({ limit: 8 });
        return {
          text: `Current **stock levels** by product and warehouse.`,
          widgets: [stockRes.widget],
          quickActions: [
            { label: "Low stock alerts", query: "/alerts" },
            { label: "Reorder suggestions", query: "/reorder" },
          ]
        };
      }

      if (query.includes('kpi') || query.includes('metrics') || query.includes('turnover') || query.includes('dashboard') || query.includes('performance')) {
        const kpiRes = await toolRegistry.get_kpis.execute({ period_days: 30 });
        return {
          text: `**Inventory KPIs**, last 30 days.`,
          widgets: [kpiRes.widget],
          quickActions: [
            { label: "Demand forecast", query: "/forecast" },
            { label: "Low stock alerts", query: "/alerts" },
          ]
        };
      }

      if (query.includes('eda') || query.includes('sales data') || query.includes('distribution') || query.includes('upload')) {
        const edaRes = await toolRegistry.get_eda.execute();
        return {
          text: `**Sales analysis** from your most recent upload.`,
          widgets: [edaRes.widget],
          quickActions: [
            { label: "Demand forecast", query: "/forecast" },
            { label: "Stock levels", query: "/stock" },
          ]
        };
      }

      // No keyword matched — say so plainly and show what is available.
      return {
        text: `No match for "${userInput}".\n\nThis is a command surface over your inventory data — ask about stock levels, demand forecasts, reorder points, or purchase orders, or use a slash command.`,
        quickActions: [
          { label: "Low stock alerts", query: "/alerts" },
          { label: "Reorder suggestions", query: "/reorder" },
          { label: "Demand forecast", query: "/forecast" },
          { label: "Purchase orders", query: "/po" },
        ]
      };
    } catch (err) {
      console.error("Agent execution error:", err);
      return {
        text: `That request failed: ${err?.response?.data?.detail || err.message || 'Unknown network error'}. Check that the backend is reachable and try again.`,
        quickActions: [
          { label: "Retry KPIs", query: "/kpi" },
          { label: "Open alerts", query: "/alerts" },
        ]
      };
    }
  }

  /**
   * Handle structured slash commands
   */
  static async handleSlashCommand(commandStr, context = {}) {
    const parts = commandStr.split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case '/alerts':
      case '/alert': {
        const res = await toolRegistry.get_alerts.execute({ status: 'open' });
        return {
          text: `**Open alerts**`,
          widgets: [res.widget],
          quickActions: [
            { label: "Recalculate alerts", query: "/recompute-alerts" },
            { label: "Reorder suggestions", query: "/reorder" },
          ]
        };
      }

      case '/recompute-alerts': {
        const res = await toolRegistry.recompute_alerts.execute();
        return {
          text: res.message,
          quickActions: [
            { label: "Open alerts", query: "/alerts" },
            { label: "Reorder suggestions", query: "/reorder" },
          ]
        };
      }

      case '/reorder':
      case '/reorders': {
        const res = await toolRegistry.get_reorder_suggestions.execute();
        return {
          text: `**Reorder suggestions**`,
          widgets: [res.widget],
          quickActions: [
            { label: "Purchase orders", query: "/po" },
            { label: "Compare forecasts", query: "/forecast" },
          ]
        };
      }

      case '/forecast': {
        const productId = parts[1] ? parseInt(parts[1]) : (context.productId || 1);
        const warehouseId = parts[2] ? parseInt(parts[2]) : (context.warehouseId || 1);
        const res = await toolRegistry.compare_forecasts.execute({
          product_id: productId,
          warehouse_id: warehouseId
        });
        return {
          text: `**Forecast models** for Product #${productId} at Warehouse #${warehouseId}`,
          widgets: [res.widget],
          quickActions: [
            { label: "Sales analysis", query: "/eda" },
            { label: "Reorder suggestions", query: "/reorder" },
          ]
        };
      }

      case '/po':
      case '/purchase-orders': {
        const res = await toolRegistry.list_purchase_orders.execute({ limit: 6 });
        return {
          text: `**Purchase orders**`,
          widgets: [res.widget],
          quickActions: [
            { label: "Reorder suggestions", query: "/reorder" },
            { label: "Stock levels", query: "/stock" },
          ]
        };
      }

      case '/stock':
      case '/inventory': {
        const res = await toolRegistry.get_stock_levels.execute({ limit: 10 });
        return {
          text: `**Stock levels**`,
          widgets: [res.widget],
          quickActions: [
            { label: "Low stock alerts", query: "/alerts" },
            { label: "Reorder suggestions", query: "/reorder" },
          ]
        };
      }

      case '/kpi':
      case '/dashboard': {
        const res = await toolRegistry.get_kpis.execute({ period_days: 30 });
        return {
          text: `**Inventory KPIs**, last 30 days`,
          widgets: [res.widget],
          quickActions: [
            { label: "Demand forecast", query: "/forecast" },
            { label: "Low stock alerts", query: "/alerts" },
          ]
        };
      }

      case '/eda': {
        const res = await toolRegistry.get_eda.execute();
        return {
          text: `**Sales analysis**`,
          widgets: [res.widget],
          quickActions: [
            { label: "Demand forecast", query: "/forecast" },
            { label: "Stock levels", query: "/stock" },
          ]
        };
      }

      default:
        return {
          text: `Unknown command \`${cmd}\`. Available commands:\n- \`/alerts\` — open low-stock alerts\n- \`/reorder\` — reorder suggestions\n- \`/forecast [productId] [warehouseId]\` — compare forecast models\n- \`/po\` — purchase orders\n- \`/stock\` — stock levels\n- \`/kpi\` — inventory KPIs\n- \`/eda\` — sales analysis`,
          quickActions: [
            { label: "/alerts", query: "/alerts" },
            { label: "/reorder", query: "/reorder" },
            { label: "/forecast", query: "/forecast" },
          ]
        };
    }
  }

  /**
   * Action triggered directly from a result card (e.g. approve a PO or adjust stock)
   */
  static async executeDirectAction(actionType, payload) {
    try {
      if (actionType === 'create_po') {
        const res = await toolRegistry.create_purchase_order.execute(payload);
        return {
          success: true,
          message: `Created purchase order **#${res.data.id}** for Supplier #${payload.supplier_id}.`,
          data: res.data
        };
      }

      if (actionType === 'adjust_stock') {
        const res = await toolRegistry.adjust_stock.execute(payload);
        return {
          success: true,
          message: `Adjusted Product #${payload.product_id} stock by ${payload.quantity_delta > 0 ? '+' : ''}${payload.quantity_delta} units.`,
          data: res.data
        };
      }

      if (actionType === 'run_new_forecast') {
        const res = await toolRegistry.run_forecast.execute(payload);
        return {
          success: true,
          message: `Forecast run #${res.data.id || res.data.run_id} scheduled. Training runs in the background.`,
          data: res.data
        };
      }

      throw new Error(`Unknown action type: ${actionType}`);
    } catch (err) {
      console.error("Direct action error:", err);
      return {
        success: false,
        message: `Action failed: ${err?.response?.data?.detail || err.message}`
      };
    }
  }
}
