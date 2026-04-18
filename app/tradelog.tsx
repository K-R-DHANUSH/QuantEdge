/**
 * TradeLogScreen.tsx — Trade History & P&L Log
 *
 * Shows:
 *  - Today's summary: P&L, trades, win rate, goal progress
 *  - All trades: OPEN, CLOSED (profit/loss), SKIPPED
 *  - Filters: All / Today / Open / Closed
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, RefreshControl, Alert,
} from "react-native";
import { useColorScheme } from "react-native";
import { useFocusEffect } from "expo-router";
import { lightTheme, darkTheme } from "../constants/theme";
import {
  loadTradeLog, loadGoals, getTodaySummary,
  TradeEntry, UserGoals, DaySummary,
} from "../services/storage";

type LogFilter = "ALL" | "TODAY" | "OPEN" | "CLOSED";

export default function TradeLogScreen() {
  const scheme = useColorScheme();
  const theme  = scheme === "dark" ? darkTheme : lightTheme;

  const [log,      setLog]      = useState<TradeEntry[]>([]);
  const [goals,    setGoals]    = useState<UserGoals | null>(null);
  const [summary,  setSummary]  = useState<DaySummary | null>(null);
  const [filter,   setFilter]   = useState<LogFilter>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [g, l] = await Promise.all([loadGoals(), loadTradeLog()]);
    setGoals(g);
    setLog(l);
    setSummary(getTodaySummary(l, g));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = log.filter(t => {
    if (filter === "ALL")    return true;
    if (filter === "OPEN")   return t.status === "OPEN";
    if (filter === "CLOSED") return t.status === "CLOSED";
    if (filter === "TODAY")  return new Date(t.entryTime).toDateString() === new Date().toDateString();
    return true;
  });

  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>📋 Trade Log</Text>
        <Text style={[styles.headerSub, { color: theme.textSecondary }]}>All trades · P&L history</Text>
      </View>

      {/* Today Summary Card */}
      {summary && goals && (
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.summaryRow}>
            <SumStat
              label="Today's P&L"
              value={`${summary.totalPL >= 0 ? "+" : ""}₹${fmt(Math.abs(summary.totalPL))}`}
              color={summary.totalPL >= 0 ? theme.buy : theme.sell}
              theme={theme}
            />
            <SumStat label="Trades" value={String(summary.totalTrades)} color={theme.accent} theme={theme} />
            <SumStat label="Win Rate" value={`${summary.winRate.toFixed(0)}%`} color={theme.buy} theme={theme} />
            <SumStat label="Wins/Loss" value={`${summary.wins}/${summary.losses}`} color={theme.hold} theme={theme} />
          </View>

          {/* Goal Progress */}
          <View style={styles.goalSection}>
            <View style={styles.goalLabelRow}>
              <Text style={[styles.goalLabel, { color: theme.textSecondary }]}>Daily Goal Progress</Text>
              <Text style={[styles.goalPct, { color: summary.goalProgress >= 100 ? theme.buy : theme.accent }]}>
                {summary.goalProgress.toFixed(0)}% of ₹{goals.dailyProfitTarget.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={[styles.goalTrack, { backgroundColor: theme.border }]}>
              <View style={[
                styles.goalFill,
                {
                  width: `${Math.min(100, summary.goalProgress)}%`,
                  backgroundColor: summary.goalProgress >= 100 ? theme.buy :
                                   summary.goalProgress >= 50  ? theme.accent : theme.hold,
                },
              ]} />
            </View>
            {summary.totalPL < 0 && goals.dailyLossLimit > 0 && (
              <View style={styles.lossRow}>
                <Text style={[styles.lossLabel, { color: theme.textSecondary }]}>Loss Limit</Text>
                <View style={[styles.lossTrack, { backgroundColor: theme.border }]}>
                  <View style={[
                    styles.lossFill,
                    {
                      width: `${Math.min(100, (Math.abs(summary.totalPL) / goals.dailyLossLimit) * 100)}%`,
                      backgroundColor: theme.sell,
                    },
                  ]} />
                </View>
                <Text style={[styles.lossAmt, { color: theme.sell }]}>
                  ₹{fmt(Math.abs(summary.totalPL))} / ₹{goals.dailyLossLimit.toLocaleString("en-IN")}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: theme.border }]}>
        {(["ALL", "TODAY", "OPEN", "CLOSED"] as LogFilter[]).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.tab, filter === f && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, { color: filter === f ? theme.accent : theme.textSecondary }]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trade List */}
      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.buy} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 36 }}>📭</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No trades yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const ticker  = item.symbol.replace(".NS", "").replace(".BO", "");
          const isOpen  = item.status === "OPEN";
          const isSkip  = item.status === "SKIPPED";
          const pl      = item.profitLoss ?? 0;
          const plColor = pl > 0 ? theme.buy : pl < 0 ? theme.sell : theme.textSecondary;

          return (
            <View style={[
              styles.tradeCard,
              {
                backgroundColor: theme.surface,
                borderColor: isOpen ? theme.accent + "55" :
                             isSkip ? theme.border : (pl >= 0 ? theme.buy + "33" : theme.sell + "33"),
                borderLeftColor: isOpen ? theme.accent :
                                 isSkip ? theme.border : (pl >= 0 ? theme.buy : theme.sell),
                borderLeftWidth: 4,
              },
            ]}>
              <View style={styles.tradeRow}>
                <View>
                  <View style={styles.tradeTopRow}>
                    <Text style={[styles.tradeTicker, { color: theme.text }]}>{ticker}</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor:
                          isOpen ? theme.accent + "22" :
                          isSkip ? theme.border : (pl >= 0 ? theme.buy + "22" : theme.sell + "22"),
                      },
                    ]}>
                      <Text style={[styles.statusText, {
                        color: isOpen ? theme.accent : isSkip ? theme.textSecondary : plColor,
                      }]}>
                        {isOpen ? "● OPEN" : isSkip ? "✗ SKIPPED" : (pl >= 0 ? "✓ PROFIT" : "✗ LOSS")}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.tradeDetails, { color: theme.textSecondary }]}>
                    {isSkip ? "Skipped · " : `${item.qty} × ₹${fmt(item.entryPrice)} · `}
                    {formatDate(item.entryTime)}
                  </Text>
                  {item.exitTime && (
                    <Text style={[styles.tradeDetails, { color: theme.textSecondary }]}>
                      Closed: {formatDate(item.exitTime)}
                    </Text>
                  )}
                </View>

                {!isSkip && (
                  <View style={styles.tradePlBox}>
                    {isOpen ? (
                      <Text style={[styles.tradeInvested, { color: theme.textSecondary }]}>
                        ₹{fmt(item.investedAmt)}
                      </Text>
                    ) : (
                      <>
                        <Text style={[styles.tradePl, { color: plColor }]}>
                          {pl >= 0 ? "+" : ""}₹{fmt(Math.abs(pl))}
                        </Text>
                        {item.profitLossPct !== undefined && (
                          <Text style={[styles.tradePlPct, { color: plColor }]}>
                            {item.profitLossPct >= 0 ? "+" : ""}{item.profitLossPct.toFixed(2)}%
                          </Text>
                        )}
                      </>
                    )}
                    <Text style={[styles.tradeScore, { color: theme.textSecondary }]}>
                      {item.score}% conf
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

function SumStat({ label, value, color, theme }: { label: string; value: string; color: string; theme: any }) {
  return (
    <View style={styles.sumStat}>
      <Text style={[styles.sumVal, { color }]}>{value}</Text>
      <Text style={[styles.sumLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 54 : 16,
    paddingBottom: 14, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  headerSub:   { fontSize: 12, marginTop: 2 },

  summaryCard: {
    margin: 12, borderRadius: 14, borderWidth: 1, padding: 14,
  },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between", marginBottom: 14,
  },
  sumStat:  { alignItems: "center", flex: 1 },
  sumVal:   { fontSize: 16, fontWeight: "900" },
  sumLabel: { fontSize: 9, fontWeight: "600", marginTop: 2, textAlign: "center" },

  goalSection:   {},
  goalLabelRow:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  goalLabel:     { fontSize: 11 },
  goalPct:       { fontSize: 11, fontWeight: "700" },
  goalTrack:     { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 8 },
  goalFill:      { height: "100%", borderRadius: 3 },
  lossRow:       { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  lossLabel:     { fontSize: 10, width: 60 },
  lossTrack:     { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  lossFill:      { height: "100%", borderRadius: 2 },
  lossAmt:       { fontSize: 10, fontWeight: "700", width: 100, textAlign: "right" },

  tabRow:  { flexDirection: "row", borderBottomWidth: 1 },
  tab:     { flex: 1, alignItems: "center", paddingVertical: 10 },
  tabText: { fontSize: 12, fontWeight: "600" },

  tradeCard: {
    borderRadius: 12, borderWidth: 1, marginBottom: 8, padding: 12,
  },
  tradeRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  tradeTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  tradeTicker: { fontSize: 18, fontWeight: "800" },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  statusText:  { fontSize: 10, fontWeight: "700" },
  tradeDetails: { fontSize: 11, marginTop: 2 },

  tradePlBox:     { alignItems: "flex-end" },
  tradeInvested:  { fontSize: 14, fontWeight: "700" },
  tradePl:        { fontSize: 16, fontWeight: "900" },
  tradePlPct:     { fontSize: 12, fontWeight: "700" },
  tradeScore:     { fontSize: 10, marginTop: 4 },

  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
});
