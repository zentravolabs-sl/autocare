"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  CreditCard,
  Banknote,
  Receipt,
  Layers,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { formatCurrencyLKR } from "@/lib/utils";

interface Part {
  id: string;
  sku: string;
  name: string;
  brand: string;
  sellingPrice: number;
  totalAvailable: number;
  stocks: Array<{
    warehouseId: string;
    warehouseName: string;
    quantityAvailable: number;
  }>;
}

interface CartItem {
  partId: string;
  name: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalAvailable: number;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  customerCode: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  branchName: string;
}

export default function PosPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);

  // Split payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [draftInvoiceId, setDraftInvoiceId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Array<{ method: string; amount: number; referenceNumber?: string }>>([
    { method: "CASH", amount: 0, referenceNumber: "" },
  ]);

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [whRes, custRes] = await Promise.all([
          fetch("/api/inventory/warehouses"),
          fetch("/api/customers?limit=100"),
        ]);
        const whData = await whRes.json();
        const custData = await custRes.json();

        if (whData.warehouses && whData.warehouses.length > 0) {
          setWarehouses(whData.warehouses);
          setSelectedWarehouseId(whData.warehouses[0].id);
        }
        if (custData.customers) {
          setCustomers(custData.customers);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    async function searchParts() {
      try {
        const res = await fetch(`/api/inventory/parts?search=${encodeURIComponent(searchQuery)}&limit=25`);
        const data = await res.json();
        if (data.parts) setParts(data.parts);
      } catch (err) {
        console.error(err);
      }
    }
    const timer = setTimeout(() => searchParts(), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addToCart = (part: Part) => {
    setErrorMsg(null);
    const whStock = part.stocks.find((s) => s.warehouseId === selectedWarehouseId);
    const available = whStock ? whStock.quantityAvailable : part.totalAvailable;
    const currentWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);

    const existingIndex = cart.findIndex(
      (item) => item.partId === part.id && item.warehouseId === selectedWarehouseId
    );

    if (existingIndex >= 0) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > available) {
        setErrorMsg(`Cannot add more than available warehouse stock (${available}) for ${part.name}`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      if (available < 1) {
        setErrorMsg(`No stock available in ${currentWarehouse?.name || "selected warehouse"} for ${part.name}`);
        return;
      }
      setCart([
        ...cart,
        {
          partId: part.id,
          name: part.name,
          sku: part.sku,
          warehouseId: selectedWarehouseId,
          warehouseName: currentWarehouse ? `${currentWarehouse.code} - ${currentWarehouse.name}` : "Main",
          quantity: 1,
          unitPrice: part.sellingPrice,
          discountAmount: 0,
          totalAvailable: available,
        },
      ]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    if (newQty > updated[index].totalAvailable) {
      setErrorMsg(`Stock ceiling reached (${updated[index].totalAvailable} max)`);
      return;
    }
    updated[index].quantity = newQty;
    setCart(updated);
  };

  const updateDiscount = (index: number, discount: number) => {
    const updated = [...cart];
    const lineGross = updated[index].quantity * updated[index].unitPrice;
    updated[index].discountAmount = Math.max(0, Math.min(lineGross, discount));
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // 18% Sri Lanka VAT calculations
  const subtotal = cart.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const totalDiscount = cart.reduce((acc, item) => acc + item.discountAmount, 0);
  const netAmount = subtotal - totalDiscount;
  const taxAmount = Math.round(netAmount * 0.18 * 100) / 100;
  const grandTotal = Math.round((netAmount + taxAmount) * 100) / 100;

  const handleStartCheckout = async () => {
    if (cart.length === 0) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      // 1. Create DRAFT POS invoice
      const payload = {
        customerId: selectedCustomerId || undefined,
        notes: "Direct Counter POS Checkout",
        items: cart.map((item) => ({
          itemType: "PART" as const,
          partId: item.partId,
          warehouseId: item.warehouseId,
          description: `${item.sku} - ${item.name}`,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
        })),
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create POS invoice");

      setDraftInvoiceId(data.invoice.id);
      // Initialize payment with full grand total
      setPayments([{ method: "CASH", amount: data.invoice.totalAmount, referenceNumber: "" }]);
      setShowPaymentModal(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompletePayment = async () => {
    if (!draftInvoiceId) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      // 2. Finalize invoice (commits stock reduction & posts Sales Journal Entry)
      const finalizeRes = await fetch(`/api/invoices/${draftInvoiceId}/finalize`, {
        method: "POST",
      });
      const finalizeData = await finalizeRes.json();
      if (!finalizeRes.ok) throw new Error(finalizeData.error || "Failed to finalize invoice");

      // 3. Receive split tender payments (posts Cash/Bank Journal Entry)
      const validPayments = payments
        .filter((p) => p.amount > 0)
        .map((p) => ({
          method: p.method as any,
          amount: Number(p.amount),
          referenceNumber: p.referenceNumber || undefined,
        }));

      if (validPayments.length > 0) {
        const payRes = await fetch(`/api/invoices/${draftInvoiceId}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payments: validPayments }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) throw new Error(payData.error || "Failed to process payment");
      }

      // Fetch full completed invoice for receipt
      const detailRes = await fetch(`/api/invoices/${draftInvoiceId}`);
      const detailData = await detailRes.json();
      setCompletedInvoice(detailData.invoice);
      setShowPaymentModal(false);
      setCart([]);
      setDraftInvoiceId(null);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentTotal = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const paymentDiff = Math.round((grandTotal - paymentTotal) * 100) / 100;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </span>
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
              RETAIL & WORKSHOP COUNTER
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Point of Sale (POS) Fast Terminal</h1>
          <p className="text-xs text-slate-400">Real-time stock deduction, WAC COGS journalization & 18% VAT auto-calculation</p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <Building2 className="h-4 w-4 text-blue-400" />
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id} className="bg-slate-900 text-slate-200">
                  {w.code} - {w.name} ({w.branchName})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <User className="h-4 w-4 text-purple-400" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-400">Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                  {c.firstName} {c.lastName} ({c.phone || c.customerCode})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold hover:text-white">✕</button>
        </div>
      )}

      {/* Main POS Layout: Left 60% Catalog, Right 40% Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Fast Item Catalog */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Scan Barcode or Search Part by SKU, OEM, Brand or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Parts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {parts.map((part) => {
              const whStock = part.stocks.find((s) => s.warehouseId === selectedWarehouseId);
              const available = whStock ? whStock.quantityAvailable : 0;
              const isOutOfStock = available <= 0;

              return (
                <div
                  key={part.id}
                  onClick={() => !isOutOfStock && addToCart(part)}
                  className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
                    isOutOfStock
                      ? "border-slate-800/40 bg-slate-900/30 opacity-60 cursor-not-allowed"
                      : "border-slate-800 bg-[#0B132B]/80 hover:border-blue-500/60 hover:bg-slate-850 cursor-pointer shadow-sm"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-blue-400 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800/50">
                        {part.sku}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          available > 5
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                            : available > 0
                            ? "bg-amber-950/80 text-amber-400 border border-amber-800/50"
                            : "bg-rose-950/80 text-rose-400 border border-rose-800/50"
                        }`}
                      >
                        {available} in stock
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-200 line-clamp-1">{part.name}</h3>
                    <p className="text-[11px] text-slate-400">{part.brand}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Unit Price</span>
                    <span className="text-sm font-mono font-bold text-white">
                      {formatCurrencyLKR(part.sellingPrice)}
                    </span>
                  </div>
                </div>
              );
            })}
            {parts.length === 0 && !isLoading && (
              <div className="col-span-2 py-12 text-center text-slate-500 text-xs">
                No spare parts found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Checkout Cart & Order Calculation */}
        <div className="lg:col-span-5 bg-[#0B132B] border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-400" />
              <h2 className="text-base font-bold text-white">Current Cart</h2>
              <span className="text-xs font-mono bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full border border-blue-700/50">
                {cart.reduce((acc, i) => acc + i.quantity, 0)} items
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {cart.map((item, index) => (
              <div
                key={`${item.partId}-${item.warehouseId}`}
                className="p-3 rounded-xl border border-slate-800/90 bg-slate-900/60 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold text-white line-clamp-1">{item.name}</h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.sku} • {item.warehouseName}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFromCart(index)}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(index, -1)}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-mono font-bold text-white px-2">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(index, 1)}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-white">
                      {formatCurrencyLKR(item.quantity * item.unitPrice - item.discountAmount)}
                    </div>
                    {item.discountAmount > 0 && (
                      <span className="text-[10px] text-amber-400">
                        -{formatCurrencyLKR(item.discountAmount)} disc
                      </span>
                    )}
                  </div>
                </div>

                {/* Optional Line Discount Input */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-[11px]">
                  <span className="text-slate-400">Discount (LKR):</span>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity * item.unitPrice}
                    value={item.discountAmount || ""}
                    onChange={(e) => updateDiscount(index, Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-20 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-right font-mono text-xs text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-xs">
                Your cart is empty. Click any spare part on the left to add it.
              </div>
            )}
          </div>

          {/* Pricing Breakdown */}
          <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal Gross</span>
              <span className="font-mono text-slate-300">{formatCurrencyLKR(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Discounts Applied</span>
                <span className="font-mono">-{formatCurrencyLKR(totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>Net Taxable</span>
              <span className="font-mono text-slate-300">{formatCurrencyLKR(netAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Sri Lanka VAT (18%)</span>
              <span className="font-mono text-slate-300">{formatCurrencyLKR(taxAmount)}</span>
            </div>
            <div className="border-t border-slate-800/80 pt-2 flex justify-between items-baseline">
              <span className="text-sm font-bold text-white">Grand Total</span>
              <span className="text-xl font-mono font-black text-emerald-400">
                {formatCurrencyLKR(grandTotal)}
              </span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleStartCheckout}
            disabled={cart.length === 0 || isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-sm"
          >
            {isSubmitting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>Proceed to Fast Payment</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Split Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Multi-Tender Payment</h3>
                <p className="text-xs text-slate-400">Split payment across cash, card, and bank transfers</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-400">Invoice Total Due:</span>
              <span className="text-base font-mono font-black text-emerald-400">
                {formatCurrencyLKR(grandTotal)}
              </span>
            </div>

            {/* Payment Rows */}
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
                  setPayments([...payments, { method: "CREDIT_CARD", amount: paymentDiff > 0 ? paymentDiff : 0 }])
                }
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Tender Split</span>
              </button>
            </div>

            {/* Split Balance Validator */}
            <div className="flex items-center justify-between text-xs border-t border-slate-800 pt-3">
              <span className="text-slate-400">Total Tendered:</span>
              <span
                className={`font-mono font-bold ${
                  paymentDiff === 0 ? "text-emerald-400" : paymentDiff > 0 ? "text-amber-400" : "text-rose-400"
                }`}
              >
                {formatCurrencyLKR(paymentTotal)}
                {paymentDiff !== 0 && ` (${paymentDiff > 0 ? "Due: " : "Change: "} ${formatCurrencyLKR(Math.abs(paymentDiff))})`}
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCompletePayment}
                disabled={isSubmitting || paymentTotal < grandTotal}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & Print Receipt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Invoice Receipt Screen */}
      {completedInvoice && (
        <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">
                  Sale Finalized & Paid: {completedInvoice.invoiceNumber}
                </h3>
                <p className="text-xs text-emerald-400">Stock deducted with COUNTER_SALE ledger & Journal Entry posted</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs px-3 py-2 rounded-lg font-semibold"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setCompletedInvoice(null)}
                className="bg-emerald-600 hover:bg-emerald-500 text-xs px-3 py-2 rounded-lg font-bold"
              >
                New POS Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
