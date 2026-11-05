"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  FileText,
  DollarSign,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Printer,
  Ban,
  Building2,
  User,
  CreditCard,
  Layers,
  Activity,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { formatCurrencyLKR, formatDateLK, formatDateTimeLK } from "@/lib/utils";

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  type: string;
  status: "DRAFT" | "FINALIZED" | "PAID" | "PARTIAL" | "CANCELLED" | "REFUNDED";
  notes?: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  createdAt: string;
  finalizedAt?: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    companyName?: string | null;
    phone: string;
    email?: string | null;
    customerCode: string;
  };
  jobCard?: {
    id: string;
    jobNumber: string;
  } | null;
  items: Array<{
    id: string;
    itemType: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    netAmount: number;
    taxAmount: number;
    totalAmount: number;
  }>;
  payments: Array<{
    id: string;
    paymentNumber: string;
    amount: number;
    paymentMethod: string;
    referenceNumber?: string | null;
    paymentDate: string;
  }>;
  journalEntries: Array<{
    id: string;
    entryNumber: string;
    date: string;
    description: string;
    lines: Array<{
      id: string;
      accountCode: string;
      accountName: string;
      debit: number;
      credit: number;
    }>;
  }>;
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Multi-tender payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [payments, setPayments] = useState<Array<{ method: string; amount: number; referenceNumber?: string }>>([
    { method: "CASH", amount: 0, referenceNumber: "" },
  ]);

  const fetchInvoice = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`);
      const data = await res.json();
      if (data.invoice) {
        setInvoice(data.invoice);
        setPayments([{ method: "CASH", amount: data.invoice.balanceAmount, referenceNumber: "" }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleFinalize = async () => {
    setActionError(null);
    setIsFinalizing(true);
    try {
      const res = await fetch(`/api/invoices/${id}/finalize`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to finalize invoice");
      fetchInvoice();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this draft invoice?")) return;
    setActionError(null);
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/invoices/${id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel invoice");
      fetchInvoice();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReceivePayments = async () => {
    setActionError(null);
    setIsSubmittingPayment(true);
    try {
      const validPayments = payments
        .filter((p) => p.amount > 0)
        .map((p) => ({
          method: p.method as any,
          amount: Number(p.amount),
          referenceNumber: p.referenceNumber || undefined,
        }));

      const res = await fetch(`/api/invoices/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payments: validPayments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");

      setShowPaymentModal(false);
      fetchInvoice();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (isLoading || !invoice) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-400 text-xs">
        Loading tax invoice details...
      </div>
    );
  }

  const paymentTotal = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const diffFromBalance = Math.round((invoice.balanceAmount - paymentTotal) * 100) / 100;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <Link
            href="/dashboard/invoices"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Invoices Master</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-white">{invoice.invoiceNumber}</h1>
            <span
              className={`font-mono text-xs px-2.5 py-0.5 rounded-full font-bold ${
                invoice.status === "PAID"
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                  : invoice.status === "FINALIZED"
                  ? "bg-amber-950/80 text-amber-400 border border-amber-800/50"
                  : invoice.status === "PARTIAL"
                  ? "bg-blue-950/80 text-blue-400 border border-blue-800/50"
                  : invoice.status === "DRAFT"
                  ? "bg-slate-800 text-slate-300"
                  : "bg-rose-950/80 text-rose-400 border border-rose-800/50"
              }`}
            >
              {invoice.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print Invoice</span>
          </button>

          {invoice.status === "DRAFT" && (
            <>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-800/60 hover:bg-rose-900/60 text-xs text-rose-300 font-semibold px-3 py-2 rounded-xl transition-colors"
              >
                <Ban className="h-4 w-4" />
                <span>Cancel Draft</span>
              </button>

              <button
                onClick={handleFinalize}
                disabled={isFinalizing}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold px-4 py-2 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
              >
                {isFinalizing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Finalize & Post JE</span>
                  </>
                )}
              </button>
            </>
          )}

          {(invoice.status === "FINALIZED" || invoice.status === "PARTIAL") && invoice.balanceAmount > 0 && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
            >
              <DollarSign className="h-4 w-4" />
              <span>Receive Payment</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Invoice Card / Printable View */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Invoice Header Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-800 pb-6">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase">
              BILLED TO CUSTOMER
            </span>
            <h3 className="text-lg font-bold text-white mt-1">
              {invoice.customer.firstName} {invoice.customer.lastName}
            </h3>
            {invoice.customer.companyName && (
              <p className="text-xs text-slate-300 font-semibold">{invoice.customer.companyName}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">Phone: {invoice.customer.phone}</p>
            {invoice.customer.email && <p className="text-xs text-slate-400">Email: {invoice.customer.email}</p>}
            <p className="text-[10px] font-mono text-slate-500 mt-1">Code: {invoice.customer.customerCode}</p>
          </div>

          <div className="sm:text-right space-y-1">
            <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              INVOICE SPECIFICATIONS
            </span>
            <div className="text-xs text-slate-300">
              <span className="text-slate-400">Date Issued: </span>
              <span className="font-mono">{formatDateLK(invoice.createdAt)}</span>
            </div>
            {invoice.jobCard && (
              <div className="text-xs text-slate-300">
                <span className="text-slate-400">Job Card Reference: </span>
                <Link
                  href={`/dashboard/job-cards/${invoice.jobCard.id}`}
                  className="font-mono text-purple-400 hover:underline"
                >
                  {invoice.jobCard.jobNumber}
                </Link>
              </div>
            )}
            <div className="text-xs text-slate-300">
              <span className="text-slate-400">Type: </span>
              <span className="font-mono font-bold text-slate-200">{invoice.type}</span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#080E20] border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2.5">Item & Description</th>
                <th className="px-3 py-2.5 text-center">Type</th>
                <th className="px-3 py-2.5 text-center">Qty</th>
                <th className="px-3 py-2.5 text-right">Unit Price</th>
                <th className="px-3 py-2.5 text-right">Discount</th>
                <th className="px-3 py-2.5 text-right">VAT (18%)</th>
                <th className="px-3 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2.5 font-medium text-white">{item.description}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="font-mono text-[10px] bg-slate-850 px-1.5 py-0.5 rounded text-slate-300">
                      {item.itemType}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono">{item.quantity}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{formatCurrencyLKR(item.unitPrice)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-amber-400">
                    {item.discountAmount > 0 ? `-${formatCurrencyLKR(item.discountAmount)}` : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-400">
                    {formatCurrencyLKR(item.taxAmount)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-white">
                    {formatCurrencyLKR(item.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="text-xs text-slate-400 max-w-sm">
            {invoice.notes && <p className="italic">&quot;{invoice.notes}&quot;</p>}
          </div>

          <div className="w-full sm:w-72 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal Gross</span>
              <span className="font-mono text-slate-200">{formatCurrencyLKR(invoice.subtotal)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Total Discount</span>
                <span className="font-mono">-{formatCurrencyLKR(invoice.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>Output VAT (18%)</span>
              <span className="font-mono text-slate-200">{formatCurrencyLKR(invoice.taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-white text-sm border-t border-slate-800 pt-2">
              <span>Grand Total</span>
              <span className="font-mono text-emerald-400">{formatCurrencyLKR(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Total Paid</span>
              <span className="font-mono text-emerald-400">{formatCurrencyLKR(invoice.paidAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-amber-400 text-sm border-t border-slate-800/80 pt-1">
              <span>Balance Due</span>
              <span className="font-mono">{formatCurrencyLKR(invoice.balanceAmount)}</span>
            </div>
          </div>
        </div>

        {/* Payments Ledger Section */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="border-t border-slate-800 pt-6 space-y-3">
            <h4 className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
              PAYMENTS RECEIVED
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {invoice.payments.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-emerald-400">{p.paymentNumber}</span>
                    <div className="text-[11px] text-slate-300 font-semibold mt-0.5">
                      {p.paymentMethod} {p.referenceNumber && `• Ref: ${p.referenceNumber}`}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatDateTimeLK(p.paymentDate)}
                    </span>
                  </div>
                  <span className="text-sm font-mono font-black text-white">
                    {formatCurrencyLKR(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Double-Entry Journal Audit Trail */}
        {invoice.journalEntries && invoice.journalEntries.length > 0 && (
          <div className="border-t border-slate-800 pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" />
              <h4 className="text-xs font-mono font-bold tracking-wider text-blue-400 uppercase">
                DOUBLE-ENTRY JOURNAL ENTRIES POSTED
              </h4>
            </div>

            <div className="space-y-3">
              {invoice.journalEntries.map((je) => (
                <div key={je.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-purple-400">{je.entryNumber}</span>
                    <span className="text-slate-400 font-mono">{formatDateTimeLK(je.date)}</span>
                  </div>
                  <p className="text-xs text-slate-300">{je.description}</p>

                  <div className="pt-2">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800">
                          <th className="py-1">Account</th>
                          <th className="py-1 text-right">Debit</th>
                          <th className="py-1 text-right">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {je.lines.map((line) => (
                          <tr key={line.id}>
                            <td className="py-1 text-slate-300">
                              <span className="text-blue-400 font-bold">{line.accountCode}</span> - {line.accountName}
                            </td>
                            <td className="py-1 text-right text-emerald-400">
                              {line.debit > 0 ? formatCurrencyLKR(line.debit) : "-"}
                            </td>
                            <td className="py-1 text-right text-amber-400">
                              {line.credit > 0 ? formatCurrencyLKR(line.credit) : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Multi-Tender Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Receive Payment</h3>
                <p className="text-xs text-slate-400">Accept single or split tender against outstanding balance</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-400">Current Balance Due:</span>
              <span className="text-base font-mono font-black text-amber-400">
                {formatCurrencyLKR(invoice.balanceAmount)}
              </span>
            </div>

            <div className="space-y-3">
              {payments.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={p.method}
                    onChange={(e) => {
                      const updated = [...payments];
                      updated[idx].method = e.target.value;
                      setPayments(updated);
                    }}
                    className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-2 outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="DEBIT_CARD">Debit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>

                  <input
                    type="number"
                    value={p.amount || ""}
                    onChange={(e) => {
                      const updated = [...payments];
                      updated[idx].amount = Number(e.target.value) || 0;
                      setPayments(updated);
                    }}
                    placeholder="Amount"
                    className="flex-1 bg-slate-900 border border-slate-800 text-xs text-white rounded-lg px-3 py-2 font-mono"
                  />

                  {p.method !== "CASH" && (
                    <input
                      type="text"
                      value={p.referenceNumber || ""}
                      onChange={(e) => {
                        const updated = [...payments];
                        updated[idx].referenceNumber = e.target.value;
                        setPayments(updated);
                      }}
                      placeholder="Card/Ref #"
                      className="w-28 bg-slate-900 border border-slate-800 text-xs text-white rounded-lg px-2 py-2"
                    />
                  )}

                  {payments.length > 1 && (
                    <button
                      onClick={() => setPayments(payments.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() =>
                  setPayments([...payments, { method: "BANK_TRANSFER", amount: diffFromBalance > 0 ? diffFromBalance : 0 }])
                }
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Tender Split</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-slate-800 pt-3">
              <span className="text-slate-400">Total Tendered:</span>
              <span className="font-mono font-bold text-emerald-400">{formatCurrencyLKR(paymentTotal)}</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReceivePayments}
                disabled={isSubmittingPayment || paymentTotal <= 0 || paymentTotal > invoice.balanceAmount}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                {isSubmittingPayment ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm Receipt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
