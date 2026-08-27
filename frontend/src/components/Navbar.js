import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkClass = ({ isActive }) => (isActive ? 'active' : undefined);

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <span className="navbar-brand">Restock</span>
      <div className="navbar-links">
        <NavLink to="/" end className={linkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/upload" className={linkClass}>
          Upload
        </NavLink>
        <NavLink to="/forecast" className={linkClass}>
          Forecast
        </NavLink>
        <NavLink to="/eda" className={linkClass}>
          EDA
        </NavLink>
        <NavLink to="/warehouses" className={linkClass}>
          Warehouses
        </NavLink>
        <NavLink to="/suppliers" className={linkClass}>
          Suppliers
        </NavLink>
        <NavLink to="/products" className={linkClass}>
          Products
        </NavLink>
        <NavLink to="/stock" className={linkClass}>
          Stock
        </NavLink>
        <NavLink to="/stock/movements" className={linkClass}>
          Movements
        </NavLink>
        <NavLink to="/alerts" className={linkClass}>
          Alerts
        </NavLink>
        <NavLink to="/reorder-suggestions" className={linkClass}>
          Reorder suggestions
        </NavLink>
        <NavLink to="/purchase-orders" className={linkClass}>
          Purchase orders
        </NavLink>
        <NavLink to="/audit-log" className={linkClass}>
          Audit log
        </NavLink>
        {user?.role === 'admin' && (
          <NavLink to="/users" className={linkClass}>
            Users
          </NavLink>
        )}
      </div>
      <div className="navbar-auth">
        {user ? (
          <>
            <span className="navbar-user">{user.email}</span>
            <button type="button" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={linkClass}>
              Log in
            </NavLink>
            <NavLink to="/register" className={linkClass}>
              Register
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
