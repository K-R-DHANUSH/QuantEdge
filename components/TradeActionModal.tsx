/**
 * TradeActionModal.tsx — Smart Buy Recommendation + Bought / Leave It Modal
 *
 * Shows when the app recommends a stock to buy:
 *  - Qty, investment amount, risk, potential profit
 *  - "I Bought It" → logs the trade, sets as active position
 *  - "Leave It"    → logs as SKIPPED, moves to next best pick
 */

import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Animated, TextInput, Alert,
} from "react-native";
import { StockSignal } from "../services/api";
import { Theme } from "../constants/theme";
import {
  UserGoals,
  TradeRecommendation,
  ActivePosition,
  TradeEntry,
  computeTradeRecommendation,
  addTradeEntry,
  saveActivePosition,
  getTodaySummary,
  loadTradeLog,
} from "../services/storage";

interface Props {
  visible:      boolean;
  stock:        StockSignal | null;
  goals:        UserGoals;
  todayPL:      number;
  openPositions: number;
  theme:        Theme;
  onBought:    (position: ActivePosition) => void;
  onSkip:      (symbol: string) => void;
  onClose:     () => void;
}

export default function TradeActionModal({
  visible, stock, goals, todayPL, openPositions, theme,
  onBought, onSkip, onClose,
}: Props) {
  const [rec, setRec]          = useState<TradeRecommendation | null>(null);
  const [customQty, setCustomQty] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible && stock) {
      const r = computeTradeRecommendation(
        stock.price, stock.target, stock.stopLoss,
        goals, todayPL, openPositions,
      );
      setRec(r);
      setCustomQty(String(r.recommendedQty));
      setUseCustom(false);
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true,
        tension: 65, friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600, duration: 250, useNativeDriver: true,
      }).start();
    }
  }, [visible, stock]);

  if (!stock || !rec) return null;

  const finalQty  = useCustom ? (parseInt(customQty) || rec.recommendedQty) : rec.recommendedQty;
  const finalAmt  = finalQty * stock.price;
  const finalProfit = stock.target ? finalQty * (stock.target - stock.price) : 0;
  const finalRisk   = stock.stopLoss ? finalQty * (stock.price - stock.stopLoss) : finalAmt * 0.02;

  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const ticker = stock.symbol.replace(".NS", "").replace(".BO", "");

  const handleBought = async () => {
    if (finalQty < 1) { Alert.alert("Invalid Qty", "Quantity must be at least 1"); return; }
    if (!rec.canAfford && goals.dailyLossLimit > 0) {
      Alert.alert(
        "Warning",
        "Daily loss limit reached. Still want to proceed?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Proceed", onPress: () => confirmBought() },
        ]
      );
      return;
    }
    confirmBought();
  };

  const confirmBought = async () => {
    const now = new Date().toISOString();
    const entryTime = new Date().toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit",
    });

    const position: ActivePosition = {
      symbol:          stock.symbol,
      exchange:        stock.exchange,
      entryPrice:      stock.price,
      qty:             finalQty,
      investedAmt:     finalAmt,
      entryTime:       entryTime,
      target:          stock.target,
      stopLoss:        stock.stopLoss,
      projectedSellTime: stock.projectedSellTime,
      score:           stock.score,
    };

    const entry: TradeEntry = {
      id:        `${stock.symbol}-${Date.now()}`,
      symbol:    stock.symbol,
      exchange:  stock.exchange,
      entryPrice: stock.price,
      qty:       finalQty,
      investedAmt: finalAmt,
      entryTime: now,
      status:    "OPEN",
      signal:    "BUY",
      target:    stock.target ?? undefined,
      stopLoss:  stock.stopLoss ?? undefined,
      projectedSellTime: stock.projectedSellTime ?? undefined,
      score:     stock.score,
    };

    await saveActivePosition(position);
    await addTradeEntry(entry);
    onBought(position);
  };

  const handleSkip = async () => {
    const entry: TradeEntry = {
      id:        `${stock.symbol}-skip-${Date.now()}`,
      symbol:    stock.symbol,
      exchange:  stock.exchange,
      entryPrice: stock.price,
      qty:       0,
      investedAmt: 0,
      entryTime: new Date().toISOString(),
      status:    "SKIPPED",
      signal:    "BUY",
      score:     stock.score,
      skipReason: "User chose to leave it",
    };
    await addTradeEntry(entry);
    onSkip(stock.symbol);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: theme.surface, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                🚀 Trade Recommendation
              </Text>
              <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
                Based on your ₹{goals.totalBudget.toLocaleString("en-IN")} budget · {goals.riskPerTrade}% risk
              </Text>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: theme.buy + "22" }]}>
              <Text style={[styles.scoreText, { color: theme.buy }]}>{stock.score}%</Text>
              <Text style={[styles.scoreLabel, { color: theme.buy + "88" }]}>conf</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Stock Info */}
            <View style={[styles.stockInfo, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.tickerLarge, { color: theme.text }]}>{ticker}</Text>
              <View>
                <Text style={[styles.priceLarge, { color: theme.text }]}>₹{fmt(stock.price)}</Text>
                <Text style={[styles.exchSmall, { color: theme.textSecondary }]}>{stock.exchange}</Text>
              </View>
            </View>

            {/* Recommended Qty Section */}
            <View style={[styles.recBox, { backgroundColor: theme.buy + "12", borderColor: theme.buy + "33" }]}>
              <Text style={[styles.recTitle, { color: theme.buy }]}>
                📦 Recommended Quantity
              </Text>

              <View style={styles.qtyRow}>
                <View style={styles.qtyDisplay}>
                  <Text style={[styles.qtyNum, { color: theme.text }]}>{rec.recommendedQty}</Text>
                  <Text style={[styles.qtyUnit, { color: theme.textSecondary }]}>shares</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setUseCustom(u => !u)}
                  style={[styles.customBtn, { borderColor: theme.border }]}
                >
                  <Text style={[styles.customBtnText, { color: theme.accent }]}>
                    {useCustom ? "Use recommended" : "Customise qty"}
                  </Text>
                </TouchableOpacity>
              </View>

              {useCustom && (
                <View style={[styles.customInput, { borderColor: theme.border, backgroundColor: theme.pill }]}>
                  <Text style={[styles.customLabel, { color: theme.textSecondary }]}>Custom qty:</Text>
                  <TextInput
                    value={customQty}
                    onChangeText={setCustomQty}
                    keyboardType="numeric"
                    style={[styles.customField, { color: theme.text }]}
                  />
                  <Text style={[styles.customLabel, { color: theme.textSecondary }]}>shares</Text>
                </View>
              )}
            </View>

            {/* Trade Math Grid */}
            <View style={[styles.mathGrid, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <MathRow label="Investment" value={`₹${fmt(finalAmt)}`} color={theme.text} theme={theme} />
              <MathRow label="Potential Profit" value={`₹${fmt(finalProfit)}`} color={theme.buy} theme={theme} />
              <MathRow label="Max Risk" value={`₹${fmt(finalRisk)}`} color={theme.sell} theme={theme} />
              <MathRow label="Risk:Reward" value={rec.riskRewardRatio} color={theme.accent} theme={theme} />
              <MathRow label="Budget Used" value={`${((finalAmt / goals.totalBudget) * 100).toFixed(1)}%`} color={theme.hold} theme={theme} />
            </View>

            {/* Target / Stop Loss */}
            {(stock.target || stock.stopLoss || stock.projectedSellTime) && (
              <View style={styles.tpslRow}>
                {stock.target && (
                  <View style={[styles.tpslBox, { backgroundColor: theme.buy + "15", borderColor: theme.buy + "33" }]}>
                    <Text style={[styles.tpslLabel, { color: theme.textSecondary }]}>Target</Text>
                    <Text style={[styles.tpslVal, { color: theme.buy }]}>₹{fmt(stock.target)}</Text>
                  </View>
                )}
                {stock.stopLoss && (
                  <View style={[styles.tpslBox, { backgroundColor: theme.sell + "15", borderColor: theme.sell + "33" }]}>
                    <Text style={[styles.tpslLabel, { color: theme.textSecondary }]}>Stop Loss</Text>
                    <Text style={[styles.tpslVal, { color: theme.sell }]}>₹{fmt(stock.stopLoss)}</Text>
                  </View>
                )}
                {stock.projectedSellTime && (
                  <View style={[styles.tpslBox, { backgroundColor: theme.hold + "15", borderColor: theme.hold + "33" }]}>
                    <Text style={[styles.tpslLabel, { color: theme.textSecondary }]}>Sell ~</Text>
                    <Text style={[styles.tpslVal, { color: theme.hold }]}>{stock.projectedSellTime}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Warnings */}
            {rec.warnings.length > 0 && (
              <View style={[styles.warnBox, { backgroundColor: theme.hold + "15", borderColor: theme.hold + "33" }]}>
                {rec.warnings.map((w, i) => (
                  <Text key={i} style={[styles.warnText, { color: theme.hold }]}>{w}</Text>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={handleSkip}
                style={[styles.skipBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.skipText, { color: theme.textSecondary }]}>✗  Leave It</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleBought}
                style={[
                  styles.buyBtn,
                  { backgroundColor: rec.canAfford ? theme.buy : theme.hold },
                ]}
              >
                <Text style={styles.buyText}>✓  I Bought It</Text>
                <Text style={styles.buySubText}>{finalQty} × ₹{fmt(stock.price)}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
              Confirm in your trading app first, then tap "I Bought It" to start tracking
            </Text>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function MathRow({ label, value, color, theme }: { label: string; value: string; color: string; theme: any }) {
  return (
    <View style={styles.mathRow}>
      <Text style={[styles.mathLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.mathVal, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#00000088" },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12,
    maxHeight: "92%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },

  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  modalTitle:  { fontSize: 18, fontWeight: "800" },
  modalSub:    { fontSize: 11, marginTop: 2 },
  scoreBadge:  { alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  scoreText:   { fontSize: 18, fontWeight: "900" },
  scoreLabel:  { fontSize: 10, fontWeight: "600" },

  stockInfo: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12,
  },
  tickerLarge: { fontSize: 26, fontWeight: "900" },
  priceLarge:  { fontSize: 22, fontWeight: "700", textAlign: "right" },
  exchSmall:   { fontSize: 11, textAlign: "right", marginTop: 2 },

  recBox: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  recTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginBottom: 10 },
  qtyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  qtyDisplay: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  qtyNum: { fontSize: 40, fontWeight: "900" },
  qtyUnit: { fontSize: 14, fontWeight: "600" },
  customBtn: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
  },
  customBtnText: { fontSize: 12, fontWeight: "600" },
  customInput: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 8, borderWidth: 1, padding: 10, marginTop: 10,
  },
  customLabel: { fontSize: 13 },
  customField: { fontSize: 20, fontWeight: "800", flex: 1 },

  mathGrid: {
    borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: "hidden",
  },
  mathRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#ffffff10",
  },
  mathLabel: { fontSize: 13 },
  mathVal:   { fontSize: 14, fontWeight: "800" },

  tpslRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tpslBox: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 10, alignItems: "center" },
  tpslLabel: { fontSize: 10, fontWeight: "600", marginBottom: 4 },
  tpslVal:   { fontSize: 14, fontWeight: "800" },

  warnBox: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 12, gap: 4 },
  warnText: { fontSize: 12, fontWeight: "600" },

  actionRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  skipBtn: {
    flex: 0.42, alignItems: "center", paddingVertical: 16,
    borderRadius: 14, borderWidth: 1,
  },
  skipText: { fontSize: 14, fontWeight: "700" },
  buyBtn: {
    flex: 1, alignItems: "center", paddingVertical: 14,
    borderRadius: 14, justifyContent: "center",
  },
  buyText:    { color: "#fff", fontSize: 16, fontWeight: "900" },
  buySubText: { color: "#ffffff99", fontSize: 11, marginTop: 2 },

  disclaimer: { fontSize: 10, textAlign: "center", lineHeight: 15 },
});
