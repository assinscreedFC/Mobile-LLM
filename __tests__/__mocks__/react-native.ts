// Minimal react-native mock for unit tests (non-component tests)
export const useColorScheme = jest.fn(() => 'light');
export const Platform = { OS: 'ios', select: (obj: any) => obj.ios };
export const StyleSheet = { create: (styles: any) => styles };
export const View = 'View';
export const Text = 'Text';
export const TextInput = 'TextInput';
export const TouchableOpacity = 'TouchableOpacity';
export const FlatList = 'FlatList';
export const Alert = { alert: jest.fn() };
export const Keyboard = {
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  dismiss: jest.fn(),
};
export const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 812 })),
};
