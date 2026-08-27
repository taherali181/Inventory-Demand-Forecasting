import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import DashboardPage from './pages/DashboardPage';
import EdaPage from './pages/EdaPage';
import ForecastPage from './pages/ForecastPage';
import AlertsPage from './pages/AlertsPage';
import LoginPage from './pages/LoginPage';
import ProductsPage from './pages/ProductsPage';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import RegisterPage from './pages/RegisterPage';
import StockMovementsPage from './pages/StockMovementsPage';
import StockPage from './pages/StockPage';
import SuppliersPage from './pages/SuppliersPage';
import UploadPage from './pages/UploadPage';
import WarehousesPage from './pages/WarehousesPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Navbar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/forecast" element={<ForecastPage />} />
              <Route path="/eda" element={<EdaPage />} />
              <Route path="/warehouses" element={<WarehousesPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/stock" element={<StockPage />} />
              <Route path="/stock/movements" element={<StockMovementsPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
