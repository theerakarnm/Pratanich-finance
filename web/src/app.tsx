import { Route, Switch } from 'wouter';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AdminAuthGuard } from '@/components/layout/admin-auth-guard';
import { Dashboard } from '@/pages/Dashboard';
import { ClientManagement } from '@/pages/ClientManagement';
import { LoanContractManagement } from '@/pages/LoanContractManagement';
import { Transaction } from '@/pages/Transaction';
import { ClientCreate } from '@/pages/ClientCreate';
import { ClientEdit } from '@/pages/ClientEdit';
import { LoanContractCreate } from '@/pages/LoanContractCreate';
import { LoanContractEdit } from '@/pages/LoanContractEdit';
import { LoanContractDetail } from '@/pages/LoanContractDetail';
import AdminLogin from '@/pages/login';
import { NotFoundPage } from './pages/404NotFound';
import { LiffClient } from '@/pages/LiffClient';
import { LiffConnect } from '@/pages/LiffConnect';
import { LiffLoanSummary } from '@/pages/LiffLoanSummary';
import { LiffPaymentHistory } from '@/pages/LiffPaymentHistory';
import ApiClientTest from '@/pages/ApiClientTest';
import { Toaster } from 'sonner';

export function App() {
  return (
    <>
      <Toaster />
      <Switch>
        <Route path="/auth/login" component={AdminLogin} />
        <Route path="/api-test" component={ApiClientTest} />

        {/* LIFF Routes */}
        <Route path="/liff/connect" component={LiffConnect} />
        <Route path="/liff/loans/:clientId">
          {(params: { clientId: string }) => <LiffLoanSummary clientId={params.clientId} />}
        </Route>
        <Route path="/liff/loans/:loanId/payments">
          {(params: { loanId: string }) => <LiffPaymentHistory loanId={params.loanId} />}
        </Route>
        <Route path="/" component={LiffClient} />

        <Route path="/admin/*">
          <AdminAuthGuard>
            <AdminLayout>
              <Switch>
                <Route path="/admin/dashboard" component={Dashboard} />
                <Route path="/admin/clients" component={ClientManagement} />
                <Route path="/admin/clients/new" component={ClientCreate} />
                <Route path="/admin/clients/:id/edit" component={ClientEdit} />
                <Route path="/admin/loans" component={LoanContractManagement} />
                <Route path="/admin/loans/new" component={LoanContractCreate} />
                <Route path="/admin/loans/:id" component={LoanContractDetail} />
                <Route path="/admin/loans/:id/edit" component={LoanContractEdit} />
                <Route path="/admin/transactions" component={Transaction} />
                <Route>404: No such page!</Route>
              </Switch>
            </AdminLayout>
          </AdminAuthGuard>
        </Route>

        {/* Redirect root to admin dashboard or login? For now, let's just have a 404 or redirect */}
        <Route component={NotFoundPage} />
      </Switch></>
  );
}
