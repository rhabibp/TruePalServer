import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import RouterLayout from './components/RouterLayout';
import { 
  Dashboard, 
  Categories, 
  Parts, 
  Customers, 
  Transactions, 
  Invoices, 
  Stats, 
  HealthCheck,
  UserManagementPage 
} from './pages';

const App: React.FC = () => {
  return (
    <Router>
      <ProtectedRoute>
        <Routes>
          <Route path="/" element={<RouterLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="categories" element={<Categories />} />
            <Route path="parts" element={<Parts />} />
            <Route path="customers" element={<Customers />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="stats" element={<Stats />} />
            <Route path="health" element={<HealthCheck />} />
            <Route path="users" element={<UserManagementPage />} />
            {/* Redirect any unknown routes to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ProtectedRoute>
    </Router>
  );
};

export default App;