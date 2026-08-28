import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/shell/AppShell';
import { RequireAuth } from './components/shell/RequireAuth';
import { NotFoundPage } from './components/shell/NotFoundPage';
import { MainLayout } from './components/MainLayout';
import { LegacyRoute } from './components/LegacyRoute';
import { ModernLoginPage } from './pages/ModernLoginPage';
import { ModernRegisterPage } from './pages/ModernRegisterPage';

// Pages not yet converted to the design system — they render inside
// <LegacyRoute>, which scopes App.css to them.
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage';
import StockPage from './pages/StockPage';
import StockMovementsPage from './pages/StockMovementsPage';
import ReorderSuggestionsPage from './pages/ReorderSuggestionsPage';
import SuppliersPage from './pages/SuppliersPage';
import ProductsPage from './pages/ProductsPage';
import WarehousesPage from './pages/WarehousesPage';
import AuditLogPage from './pages/AuditLogPage';
import UsersPage from './pages/UsersPage';
import UploadPage from './pages/UploadPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Auth screens are the only routes outside the shell — a sidebar full of
          destinations you cannot use yet is noise on a sign-in page. */}
      <Route path="/login" element={<ModernLoginPage />} />
      <Route path="/register" element={<ModernRegisterPage />} />

      {/* Everything else renders inside the shell, so the sidebar and topbar
          are present on every screen. Eight of these routes previously had no
          chrome at all: bare light-theme markup on a dark body, with no way to
          navigate anywhere else. */}
      <Route element={<AppShell />}>
        {/* Chat-first split canvas. MainLayout syncs the pathname to the
            active studio, so these are real deep-links, not five aliases for
            the same default view. */}
        <Route path="/" element={<MainLayout />} />
        <Route path="/dashboard" element={<MainLayout />} />
        <Route path="/forecast" element={<MainLayout />} />
        <Route path="/inventory" element={<MainLayout />} />
        <Route path="/purchase-orders" element={<MainLayout />} />
        <Route path="/alerts" element={<MainLayout />} />
        <Route path="/eda" element={<MainLayout />} />

        <Route element={<LegacyRoute />}>
          <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />

          {/* Reads are open to anonymous users by design — the backend gates
              writes, not reads, and the pages hide their write actions when
              signed out. Do NOT wrap these in RequireAuth. */}
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/warehouses" element={<WarehousesPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/stock/movements" element={<StockMovementsPage />} />
          <Route path="/reorder-suggestions" element={<ReorderSuggestionsPage />} />
          <Route path="/upload" element={<UploadPage />} />

          {/* The two that genuinely need a guard. */}
          <Route
            path="/audit-log"
            element={
              <RequireAuth>
                <AuditLogPage />
              </RequireAuth>
            }
          />
          <Route
            path="/users"
            element={
              <RequireAuth role="admin">
                <UsersPage />
              </RequireAuth>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Height chain: #root (100%) -> .App -> AppShell. Each link must be a
            flex container with min-h-0, or a descendant's h-full resolves
            against auto and the layout collapses. */}
        <div className="App flex min-h-0 flex-col bg-canvas text-content">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
