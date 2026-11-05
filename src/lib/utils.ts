import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyLKR(amount: number | string | { toString(): string } | null | undefined): string {
  if (amount === null || amount === undefined) {
    return "LKR 0.00";
  }
  const numeric = typeof amount === "object" ? parseFloat(amount.toString()) : typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numeric)) {
    return "LKR 0.00";
  }
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function formatDateLK(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Colombo",
  }).format(d);
}

export const formatDate = formatDateLK;

export function formatDateTimeLK(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Colombo",
  }).format(d);
}
