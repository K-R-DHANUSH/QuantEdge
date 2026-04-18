/**
 * theme.ts — App Theme Tokens
 *
 * All color/style tokens used across every component.
 * Both light and dark themes defined here.
 */

export interface Theme {
  background:     string;
  surface:        string;
  card:           string;
  border:         string;
  text:           string;
  textSecondary:  string;
  accent:         string;
  buy:            string;
  sell:           string;
  hold:           string;
  positive:       string;
  negative:       string;
  pill:           string;
  shadow:         string;
  mfi:            string;           // MFI oversold color (purple)
  confluenceGlow: string;           // Confluence badge color
}

export const darkTheme: Theme = {
  background:     "#080D12",
  surface:        "#0F1923",
  card:           "#0F1923",
  border:         "#1E2D3D",
  text:           "#FFFFFF",
  textSecondary:  "#7A8FA6",
  accent:         "#3D7AFF",
  buy:            "#00D060",
  sell:           "#FF4560",
  hold:           "#FFB700",
  positive:       "#00D060",
  negative:       "#FF4560",
  pill:           "#1E2D3D",
  shadow:         "#000000",
  mfi:            "#9B5DE5",
  confluenceGlow: "#00D060",
};

export const lightTheme: Theme = {
  background:     "#F0F4F8",
  surface:        "#FFFFFF",
  card:           "#FFFFFF",
  border:         "#E2E8F0",
  text:           "#0D1B2A",
  textSecondary:  "#64748B",
  accent:         "#2563EB",
  buy:            "#16A34A",
  sell:           "#DC2626",
  hold:           "#D97706",
  positive:       "#16A34A",
  negative:       "#DC2626",
  pill:           "#F1F5F9",
  shadow:         "#CBD5E1",
  mfi:            "#7C3AED",
  confluenceGlow: "#16A34A",
};
