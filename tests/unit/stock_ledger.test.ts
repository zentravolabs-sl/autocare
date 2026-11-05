import { describe, it, expect, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";

describe("Inventory Valuation & Stock Ledger Logic", () => {
  it("calculates Weighted Average Cost (WAC) accurately on incoming inventory", () => {
    // Current: 10 units @ 1,000 LKR = 10,000 LKR
    // Incoming: 20 units @ 1,300 LKR = 26,000 LKR
    // Total value: 36,000 LKR / 30 units = 1,200 LKR
    const currentQOH = new Decimal(10);
    const currentAvgCost = new Decimal(1000);

    const receivedQty = new Decimal(20);
    const receivedUnitCost = new Decimal(1300);

    const newQOH = currentQOH.add(receivedQty);
    const priorValue = currentQOH.mul(currentAvgCost);
    const incomingValue = receivedQty.mul(receivedUnitCost);
    const newAvgCost = priorValue.add(incomingValue).div(newQOH);

    expect(newQOH.toNumber()).toBe(30);
    expect(newAvgCost.toNumber()).toBe(1200);
  });

  it("handles zero prior stock WAC correctly", () => {
    const currentQOH = new Decimal(0);
    const currentAvgCost = new Decimal(0);

    const receivedQty = new Decimal(15);
    const receivedUnitCost = new Decimal(2450);

    const newQOH = currentQOH.add(receivedQty);
    const newAvgCost = currentQOH.greaterThan(0)
      ? currentQOH.mul(currentAvgCost).add(receivedQty.mul(receivedUnitCost)).div(newQOH)
      : receivedUnitCost;

    expect(newQOH.toNumber()).toBe(15);
    expect(newAvgCost.toNumber()).toBe(2450);
  });

  it("reconciles stock reservations and availability correctly", () => {
    // Initial: 50 on-hand, 0 reserved, 50 available
    const qoh = new Decimal(50);
    let reserved = new Decimal(0);
    let available = qoh.sub(reserved);

    expect(available.toNumber()).toBe(50);

    // Reserve 12 units for Job Card JC-001
    const requestedReservation = new Decimal(12);
    expect(available.greaterThanOrEqualTo(requestedReservation)).toBe(true);

    reserved = reserved.add(requestedReservation);
    available = qoh.sub(reserved);

    expect(reserved.toNumber()).toBe(12);
    expect(available.toNumber()).toBe(38);

    // Issue 12 units to the mechanic on workshop floor
    const issuedQty = new Decimal(12);
    const newQOH = qoh.sub(issuedQty);
    reserved = reserved.sub(issuedQty);
    available = newQOH.sub(reserved);

    expect(newQOH.toNumber()).toBe(38);
    expect(reserved.toNumber()).toBe(0);
    expect(available.toNumber()).toBe(38);
  });

  it("computes purchase order 18% Sri Lankan VAT accurately", () => {
    // Line 1: 10 units @ 4,500 LKR = 45,000 LKR
    // Line 2: 5 units @ 12,000 LKR = 60,000 LKR
    // Subtotal: 105,000 LKR
    // VAT (18%): 18,900 LKR
    // Total: 123,900 LKR
    const line1 = new Decimal(10).mul(new Decimal(4500));
    const line2 = new Decimal(5).mul(new Decimal(12000));
    const subtotal = line1.add(line2);
    const vatRate = new Decimal(18).div(100);
    const taxAmount = subtotal.mul(vatRate);
    const totalAmount = subtotal.add(taxAmount);

    expect(subtotal.toNumber()).toBe(105000);
    expect(taxAmount.toNumber()).toBe(18900);
    expect(totalAmount.toNumber()).toBe(123900);
  });
});
