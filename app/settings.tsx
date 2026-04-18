/**
 * SettingsScreen.tsx — Daily Goals & Budget Settings Page
 *
 * User can configure:
 *  - Daily profit target (₹)
 *  - Daily loss limit (₹)
 *  - Total trading budget (₹)
 *  - Risk per trade (%)
 *  - Preferred exchange (NSE / BSE / BOTH)
 *  - Max open trades
 */

import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Switch, Alert,
} from "react-native";
import { useColorScheme } from "react-native";
import { lightTheme, darkTheme } from "../constants/theme";
import { loadGoals, saveGoals, DEFAULT_GOALS, UserGoals } from "../services/storage";

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const theme  = scheme === "dark" ? darkTheme : lightTheme;

  const [goals, setGoals] = useState<UserGoals>(DEFAULT_GOALS);
  const [saved,  setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals().then(g => { setGoals(g); setLoading(false); });
  }, []);

  const update = (key: keyof UserGoals, val: any) => {
    setGoals(g => ({ ...g, [key]: val }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (goals.totalBudget < 1000) {
      Alert.alert("Invalid Budget", "Minimum budget is ₹1,000");
      return;
    }
    if (goals.riskPerTrade < 0.5 || goals.riskPerTrade > 10) {
      Alert.alert("Invalid Risk", "Risk per trade must be between 0.5% and 10%");
      return;
    }
    await saveGoals(goals);
    setSaved(true);
  };

  const handleReset = () => {
    Alert.alert("Reset to Defaults", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: () => { setGoals(DEFAULT_GOALS); setSaved(false); } },
    ]);
  };

  if (loading) return null;

  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>⚙️ Settings</Text>
        <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
          Goals · Budget · Risk Management
        </Text>
      </View>

      {/* ── Section: Daily Goals ────────────────────────────────────────── */}
      <SectionHeader label="🎯 Daily Goals" theme={theme} />

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <InputRow
          label="Daily Profit Target"
          hint="₹ you want to make today"
          value={goals.dailyProfitTarget}
          prefix="₹"
          onchange={v => update("dailyProfitTarget", v)}
          theme={theme}
        />
        <Divider theme={theme} />
        <InputRow
          label="Daily Loss Limit"
          hint="Stop trading when loss hits this"
          value={goals.dailyLossLimit}
          prefix="₹"
          onchange={v => update("dailyLossLimit", v)}
          theme={theme}
          accent={theme.sell}
        />
      </View>

      {/* ── Section: Capital & Risk ──────────────────────────────────────── */}
      <SectionHeader label="💰 Capital & Risk" theme={theme} />

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <InputRow
          label="Total Trading Budget"
          hint="Your total capital for trading"
          value={goals.totalBudget}
          prefix="₹"
          onchange={v => update("totalBudget", v)}
          theme={theme}
        />
        <Divider theme={theme} />
        <InputRow
          label="Risk Per Trade"
          hint="% of capital to risk per trade"
          value={goals.riskPerTrade}
          suffix="%"
          onchange={v => update("riskPerTrade", v)}
          theme={theme}
          decimal
        />
        <Divider theme={theme} />
        <InputRow
          label="Max Open Positions"
          hint="Max trades at the same time"
          value={goals.maxOpenTrades}
          onchange={v => update("maxOpenTrades", v)}
          theme={theme}
          integer
        />
      </View>

      {/* ── Section: Exchange Preference ────────────────────────────────── */}
      <SectionHeader label="🏛️ Exchange Preference" theme={theme} />

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.rowLabel, { color: theme.textSecondary, marginBottom: 10 }]}>
          Preferred exchange for recommendations
        </Text>
        <View style={styles.segRow}>
          {(["NSE", "BSE", "BOTH"] as UserGoals["preferredExchange"][]).map(ex => (
            <TouchableOpacity
              key={ex}
              onPress={() => update("preferredExchange", ex)}
              style={[
                styles.segBtn,
                { borderColor: theme.border },
                goals.preferredExchange === ex && {
                  backgroundColor: theme.accent + "22",
                  borderColor: theme.accent,
                },
              ]}
            >
              <Text style={[
                styles.segText,
                { color: goals.preferredExchange === ex ? theme.accent : theme.textSecondary },
              ]}>
                {ex}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Risk Preview ─────────────────────────────────────────────────── */}
      <SectionHeader label="📊 Risk Preview" theme={theme} />
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <StatRow
          label="Max risk per trade"
          value={`₹${fmt((goals.totalBudget * goals.riskPerTrade) / 100)}`}
          color={theme.sell}
          theme={theme}
        />
        <Divider theme={theme} />
        <StatRow
          label="Daily profit target"
          value={`₹${fmt(goals.dailyProfitTarget)}`}
          color={theme.buy}
          theme={theme}
        />
        <Divider theme={theme} />
        <StatRow
          label="Stop trading if loss reaches"
          value={`₹${fmt(goals.dailyLossLimit)}`}
          color={theme.sell}
          theme={theme}
        />
        <Divider theme={theme} />
        <StatRow
          label="Capital per trade (safe)"
          value={`₹${fmt(goals.totalBudget / goals.maxOpenTrades)}`}
          color={theme.accent}
          theme={theme}
        />
      </View>

      {/* ── Buttons ──────────────────────────────────────────────────────── */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          onPress={handleReset}
          style={[styles.resetBtn, { borderColor: theme.border }]}
        >
          <Text style={[styles.resetText, { color: theme.textSecondary }]}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          style={[
            styles.saveBtn,
            { backgroundColor: saved ? theme.buy : theme.accent },
          ]}
        >
          <Text style={styles.saveText}>
            {saved ? "✓ Saved!" : "Save Settings"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ label, theme }: { label: string; theme: any }) {
  return (
    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
      {label}
    </Text>
  );
}

function Divider({ theme }: { theme: any }) {
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

function InputRow({
  label, hint, value, prefix, suffix, onchange, theme, decimal, integer, accent,
}: {
  label: string; hint: string; value: number; prefix?: string; suffix?: string;
  onchange: (n: number) => void; theme: any; decimal?: boolean; integer?: boolean; accent?: string;
}) {
  return (
    <View style={styles.inputRow}>
      <View style={styles.inputLeft}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.rowHint, { color: theme.textSecondary }]}>{hint}</Text>
      </View>
      <View style={[styles.inputBox, { backgroundColor: theme.pill, borderColor: theme.border }]}>
        {prefix && <Text style={[styles.inputAffix, { color: accent ?? theme.accent }]}>{prefix}</Text>}
        <TextInput
          style={[styles.input, { color: accent ?? theme.text }]}
          value={String(value)}
          keyboardType={decimal ? "decimal-pad" : "numeric"}
          onChangeText={t => {
            const n = decimal ? parseFloat(t) : parseInt(t, 10);
            if (!isNaN(n)) onchange(n);
          }}
          maxLength={10}
        />
        {suffix && <Text style={[styles.inputAffix, { color: theme.textSecondary }]}>{suffix}</Text>}
      </View>
    </View>
  );
}

function StatRow({ label, value, color, theme }: { label: string; value: string; color: string; theme: any }) {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.rowHint, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 54 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  headerSub:   { fontSize: 12, marginTop: 2 },

  sectionLabel: {
    fontSize: 11, fontWeight: "700", letterSpacing: 0.8,
    marginHorizontal: 16, marginTop: 18, marginBottom: 8, textTransform: "uppercase",
  },
  card: {
    marginHorizontal: 12, borderRadius: 14,
    borderWidth: 1, overflow: "hidden",
  },
  divider: { height: 1, marginHorizontal: 14 },

  inputRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 14, paddingVertical: 12,
  },
  inputLeft:  { flex: 1, marginRight: 12 },
  rowLabel:   { fontSize: 14, fontWeight: "600" },
  rowHint:    { fontSize: 11, marginTop: 2 },
  inputBox: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 90,
  },
  inputAffix: { fontSize: 13, fontWeight: "700", marginRight: 2 },
  input: { fontSize: 15, fontWeight: "700", minWidth: 50, textAlign: "right" },

  segRow: { flexDirection: "row", gap: 8 },
  segBtn: {
    flex: 1, alignItems: "center", paddingVertical: 9,
    borderRadius: 8, borderWidth: 1,
  },
  segText: { fontSize: 13, fontWeight: "700" },

  statRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 14, paddingVertical: 12,
  },
  statValue: { fontSize: 14, fontWeight: "800" },

  btnRow: {
    flexDirection: "row", gap: 12,
    marginHorizontal: 12, marginTop: 24,
  },
  resetBtn: {
    flex: 0.4, alignItems: "center", paddingVertical: 14,
    borderRadius: 12, borderWidth: 1,
  },
  resetText: { fontSize: 14, fontWeight: "600" },
  saveBtn: {
    flex: 1, alignItems: "center", paddingVertical: 14,
    borderRadius: 12,
  },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});