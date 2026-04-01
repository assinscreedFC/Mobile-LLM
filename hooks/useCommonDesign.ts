import { useMemo } from 'react';
import { useUIScale } from '../hooks/useUIScale'
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';
import { StyleSheet } from "react-native";


export const useCommonDesign = () => {
    const { themeMode } = useSettingsStore()
    const { colors } = useResolvedTheme(themeMode);
    const scaled16 = useUIScale(16);
    const scaled48 = useUIScale(48);
    const scaled22 = useUIScale(22);
    const scaled14 = useUIScale(14);
    const scaleFactor = useUIScale(1);

    return useMemo(() => ({
                 //useMemo means this will be recalculated on change, but also,
                 //lets us declare styles with a hook, which lets us use variables
                 screen: {
                     flex: 1,
                   },
                   container: {
                     flex: 1,
                     paddingHorizontal: 20,
                     marginTop: 60,
                   },
                   header: {
                     alignItems: "flex-start",
                   },
                   content: {
                     display: "flex",
                     flexDirection: "row",
                     alignItems: "center",
                     flex: 1,
                     justifyContent: "space-between",
                   },
                   backButton: {
                     width: 40*scaleFactor,
                     height: 40*scaleFactor,
                     borderRadius: 20*scaleFactor,
                     backgroundColor: "#FFFFFF",
                     alignItems: "center",
                     justifyContent: "center",
                     borderWidth: StyleSheet.hairlineWidth,
                     borderColor: "rgba(0,0,0,0.08)",
                     shadowColor: "#000",
                     shadowOffset: { width: 0, height: 4 },
                     shadowOpacity: 0.08,
                     shadowRadius: 10,
                     elevation: 3,
                     backgroundColor: colors.card,
                     borderColor: colors.border
                   },
                   title: {
                     color: colors.text,
                     fontSize: scaled22,
                     fontWeight: "600",
                     marginTop: 20,
                     marginBottom: 24,
                     textAlign: "center",
                   },
                   item: {
                     borderRadius: 16,
                     paddingHorizontal: 18,
                     paddingVertical: 18,
                     marginBottom: 14,
                     flexDirection: "row",
                     justifyContent: "space-between",
                     alignItems: "center",
                     backgroundColor: colors.card
                   },
                   item_start: {
                     borderRadius: 16,
                     paddingHorizontal: 18,
                     paddingVertical: 18,
                     marginBottom: 14,
                     flexDirection: "row",
                     justifyContent: "start",
                     alignItems: "center",
                     backgroundColor: colors.card
                   },
                   label: {
                     fontSize: scaled16,
                     fontWeight: "500",
                     textAlign: "left",
                     color: colors.text
                   },
                   right: {
                     flexDirection: "row",
                     alignItems: "center",
                     gap: 6,
                   },
                   value: {
                     fontSize: scaled14,
                   },
                   footer: {
                     paddingBottom: 20,
                     alignItems: "center",
                   },
                   saveButton: {
                     paddingVertical: 14,
                     paddingHorizontal: 40,
                     borderRadius: 999,
                     borderWidth: 1,
                     backgroundColor: colors.card,
                     borderColor: colors.border,
                   },
                   saveButtonText: {
                     fontSize: scaled16,
                     fontWeight: "700",
                     color: colors.text,
                   },
                   overlay: {
                     flex: 1,
                     backgroundColor: "rgba(0,0,0,0.3)",
                     justifyContent: "center",
                     padding: 30,
                   },
                   modal: {
                     borderRadius: 16,
                     paddingVertical: 10,
                   },
                   option: {
                     paddingHorizontal: 20,
                     paddingVertical: 16,
                     flexDirection: "row",
                     justifyContent: "space-between",
                     alignItems: "center",
                   },
                   optionText: {
                     fontSize: scaled16,
                   },
               }), [scaled16, colors, themeMode]);

}