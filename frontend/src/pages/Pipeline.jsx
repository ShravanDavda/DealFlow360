import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { QuotationBoard } from '../components/quotations/QuotationBoard';
import { Button } from '../components/ui/Button';
import { getQuotations } from '../services/quotationService';

export const Pipeline = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPipeline = async () => {
    setIsLoading(true);
    try {
      setQuotations(await getQuotations());
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to load your pipeline.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardNavbar />
      <main className="flex-1 mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pipeline</h1>
            <p className="mt-1 text-sm text-slate-600">Track your quotations across the sales pipeline.</p>
          </div>
          <Button type="button" variant="outline" onClick={loadPipeline} className="sm:!w-auto px-3 gap-2">
            <RefreshCw className={isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            <span>Refresh</span>
          </Button>
        </header>

        {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">{error}</div>}
        {isLoading && quotations.length === 0 ? (
          <div className="py-16 text-center text-slate-500">Loading your pipeline...</div>
        ) : (
          <section aria-label="Sales pipeline">
            <QuotationBoard quotations={quotations} onQuotationClick={(quotationId) => navigate(`/quotations/${quotationId}`)} />
          </section>
        )}
      </main>
    </div>
  );
};

export default Pipeline;
