import React, { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Clock, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { billingService, WalletTransaction } from '../../services/billing.service';
import { Button } from '../ui/button';

const TYPE_LABELS: Record<string, string> = {
  subscription_allocation: 'Credit Allocation',
  purchase: 'Credit Purchase',
  consumption: 'Used',
  expiry: 'Expired',
  refund: 'Refund',
};

const TYPE_COLORS: Record<string, string> = {
  subscription_allocation: 'text-green-600 bg-green-100',
  purchase: 'text-blue-600 bg-blue-100',
  consumption: 'text-red-600 bg-red-100',
  expiry: 'text-gray-500 bg-gray-100',
  refund: 'text-purple-600 bg-purple-100',
};

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await billingService.getTransactions({ page, limit: 10, type: typeFilter || undefined });
      if (res.success && res.data) {
        setTransactions(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, typeFilter]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All types</option>
            <option value="subscription_allocation">Allocations</option>
            <option value="purchase">Purchases</option>
            <option value="consumption">Usage</option>
            <option value="expiry">Expiry</option>
            <option value="refund">Refunds</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>No transactions yet</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-1.5 rounded-full ${TYPE_COLORS[tx.type] || 'text-gray-500 bg-gray-100'}`}>
                    {tx.amount >= 0 ? (
                      <ArrowDownCircle className="h-4 w-4" />
                    ) : (
                      <ArrowUpCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(tx.createdAt)} at {formatTime(tx.createdAt)}
                      {tx.creditPool && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          {tx.creditPool}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount}
                  </p>
                  <p className="text-xs text-gray-400">
                    bal: {tx.balanceAfter}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
