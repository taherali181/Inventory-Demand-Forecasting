import React from 'react';
import { StudioHeader } from './StudioHeader';
import { DashboardStudio } from './DashboardStudio';
import { ForecastStudio } from './ForecastStudio';
import { InventoryStudio } from './InventoryStudio';
import { PurchaseOrdersStudio } from './PurchaseOrdersStudio';
import { AlertsStudio } from './AlertsStudio';
import { EDAStudio } from './EDAStudio';
import { useAppStore } from '../../store/useAppStore';

export const StudioContainer = () => {
  const { activeStudioView } = useAppStore();

  const renderView = () => {
    switch (activeStudioView) {
      case 'dashboard':
        return <DashboardStudio />;
      case 'forecast':
        return <ForecastStudio />;
      case 'inventory':
        return <InventoryStudio />;
      case 'purchase-orders':
        return <PurchaseOrdersStudio />;
      case 'alerts':
        return <AlertsStudio />;
      case 'eda':
        return <EDAStudio />;
      default:
        return <DashboardStudio />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-canvas/95 border-l border-hairline overflow-hidden">
      <StudioHeader />
      <div className="flex-1 overflow-hidden">
        {renderView()}
      </div>
    </div>
  );
};
