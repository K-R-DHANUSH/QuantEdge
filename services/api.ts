/**
 * api.ts — API Service Layer v2.1
 *
 * Changes from v2.0:
 *  - BASE_URL now points to Render deployment (works on mobile data, any network)
 *  - Adaptive URL: uses EXPO_PUBLIC_API_URL env var if set, falls back per platform
 *  - All types and interfaces unchanged from v2.0
 */

import axios    from "axios";
import { Platform } from "react-native";

// ── Base URL Resolution ───────────────────────────────────────────────────────
// Priority:
//  1. EXPO_PUBLIC_API_URL in .env (set this for any custom deployment)
//  2. Production Render URL (default — works on mobile data, any Wi-Fi, anywhere)
//  3. Local dev fallback (only used if you manually switch to __DEV__ mode)

function getBaseUrl(): string {
  // If you ever move to a different server, just update .env — no code change needed
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Local dev fallback (uncomment if testing locally without .env)
  // if (__DEV__) {
  //   return Platform.OS === "android"
  //     ? "http://10.0.2.2:5000"   // Android emulator → host machine
  //     : "http://localhost:5000";  // iOS simulator
  // }

  // Production — Render deployment (reachable from anywhere)
  return "https://quantedge-github-io.onrender.com";
}

export const BASE_URL = getBaseUrl();

// ── Types ─────────────────────────────────────────────────────────────────────
export type SignalType   = "BUY" | "SELL" | "HOLD";
export type ExchangeType = "NSE" | "BSE";

export interface StockSignal {
  symbol:            string;
  exchange:          ExchangeType;
  price:             number;
  signal:            SignalType;
  score:             number;           // 0–100 weighted confidence
  reasons:           string[];
  stopLoss:          number | null;
  target:            number | null;
  rsi:               number | null;
  mfi:               number | null;    // Money Flow Index
  cci:               number | null;    // Commodity Channel Index
  trendStrength:     number | null;    // ADX
  vwap:              number | null;    // Today's VWAP
  vwapDeviation:     number | null;    // % deviation from VWAP
  macdHistogram:     number | null;    // MACD histogram value
  stochK:            number | null;    // Stochastic %K
  atr:               number | null;    // Average True Range
  confluence:        boolean;          // 5+ indicators agree
  projectedSellTime: string | null;    // "11:45 AM" — estimated target hit time
  isNewSignal:       boolean;
  exitReason:        string | null;
  profitLoss:        string | null;
  entryPrice:        number | null;
  entryTime:         string | null;
  recentPrices:      number[];         // Last 30 prices for mini chart
}

export interface ApiResponse {
  marketOpen:     boolean;
  message?:       string;
  signals:        StockSignal[];
  bestStock:      string | null;       // Symbol of the #1 recommended stock
  timestamp?:     string;
  openPositions?: number;
}

export interface StatusResponse {
  marketOpen:    boolean;
  openPositions: number;
  totalStocks:   number;
  timestamp:     string;
}

// ── API Calls ─────────────────────────────────────────────────────────────────

/**
 * Fetch all stock signals from the server.
 * Pass force=true to bypass market hours check (useful for testing).
 */
export const fetchSignals = async (force = false): Promise<ApiResponse> => {
  try {
    const url = force ? `${BASE_URL}/signals?force=true` : `${BASE_URL}/signals`;
    const res = await axios.get<ApiResponse>(url, { timeout: 15000 });
    return res.data;
  } catch (err: any) {
    console.error("fetchSignals error:", err.message);
    return {
      marketOpen: false,
      message:    "Cannot connect to server. Check your internet connection.",
      signals:    [],
      bestStock:  null,
    };
  }
};

/**
 * Fetch server + market status (lightweight, use for polling).
 */
export const fetchStatus = async (): Promise<StatusResponse | null> => {
  try {
    const res = await axios.get<StatusResponse>(`${BASE_URL}/status`, { timeout: 5000 });
    return res.data;
  } catch (err: any) {
    console.error("fetchStatus error:", err.message);
    return null;
  }
};

/**
 * Health check — use to verify server is reachable before full signal fetch.
 * Returns true if server is up, false otherwise.
 */
export const checkHealth = async (): Promise<boolean> => {
  try {
    const res = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    return res.data?.status === "ok";
  } catch {
    return false;
  }
};
