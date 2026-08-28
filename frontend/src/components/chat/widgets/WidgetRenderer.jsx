import React from 'react';
import { KPISummaryWidget } from './KPISummaryWidget';
import { AlertsRadarWidget } from './AlertsRadarWidget';
import { ReorderActionWidget } from './ReorderActionWidget';
import { ForecastViewerWidget } from './ForecastViewerWidget';
import { POStepperWidget } from './POStepperWidget';
import { StockTableWidget } from './StockTableWidget';
import { EDAOverviewWidget } from './EDAOverviewWidget';

export const WidgetRenderer = ({ widget }) => {
  if (!widget || !widget.type) return null;

  switch (widget.type) {
    case 'kpi-summary':
      return <KPISummaryWidget data={widget.data} />;
    case 'alerts-radar':
      return <AlertsRadarWidget data={widget.data} />;
    case 'reorder-action':
      return <ReorderActionWidget data={widget.data} />;
    case 'forecast-viewer':
      return <ForecastViewerWidget data={widget.data} />;
    case 'po-stepper':
      return <POStepperWidget data={widget.data} />;
    case 'stock-table':
    case 'stock-adjusted':
      return <StockTableWidget data={widget.data} />;
    case 'eda-overview':
      return <EDAOverviewWidget data={widget.data} />;
    default:
      return null;
  }
};
