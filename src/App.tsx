import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import {
  Dashboard,
  Finance,
  CashFlow,
  Goals,
  Debt,
  Payments,
  Budget,
  Optimizer,
  Settings,
} from '@/screens/_placeholders';

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/"           element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/finance"    element={<Finance />} />
          <Route path="/cashflow"   element={<CashFlow />} />
          <Route path="/goals"      element={<Goals />} />
          <Route path="/debt"       element={<Debt />} />
          <Route path="/payments"   element={<Payments />} />
          <Route path="/budget"     element={<Budget />} />
          <Route path="/optimizer"  element={<Optimizer />} />
          <Route path="/settings"   element={<Settings />} />
          <Route path="*"           element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
