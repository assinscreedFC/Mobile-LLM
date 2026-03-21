import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import useInterfaceSettingsStore from '../store/interfaceSettingsStore'; // Assuming you store scale here

export const useUIScale = (baseSize) => {
  const uiScale = useInterfaceSettingsStore(state => state.optionsList?.['1'].value);

  return useMemo(() => {
    return uiScale? baseSize * (uiScale/100) : baseSize; //Otherwise an 'undefined' can propagate. //UI Scale is stored as a percentage value
  }, [uiScale, baseSize]);
};