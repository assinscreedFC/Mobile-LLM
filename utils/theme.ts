import { useColorScheme } from "react-native";
import type { ThemeMode } from "../store/useSettingsStore";

export function useResolvedTheme(themeMode: ThemeMode) {
  const system = useColorScheme(); // "light" | "dark" | null

  const resolved =
    themeMode === "systeme"
      ? system === "dark"
        ? "dark"
        : "light"
      : themeMode === "sombre"
        ? "dark"
        : "light";

  const colors =
    resolved === "dark"
      ? {
          bg: "#0B0B0F",
          card: "#15151C",
          text: "#FFFFFF",
          subtext: "#A0A0AA",
          border: "#262633",
          accent: "blue",
          subaccent: "deepskyblue",
        }
      : {
          bg: "#F6F6F6",
          card: "#FFFFFF",
          text: "#111111",
          subtext: "#777777",
          border: "#E6E6E6",
          accent: "blue",
          subaccent: "deepskyblue",
        };

  return { resolved, colors };
}
