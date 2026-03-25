import { renderHook } from '@testing-library/react-native';
import { useColorScheme } from 'react-native';
import { useResolvedTheme } from '../../utils/theme';

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return { ...actual, useColorScheme: jest.fn() };
});

const mockUseColorScheme = useColorScheme as jest.Mock;

describe('useResolvedTheme', () => {
  it('systeme + dark system → dark theme', () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { result } = renderHook(() => useResolvedTheme('systeme'));
    expect(result.current.resolved).toBe('dark');
    expect(result.current.colors.bg).toBe('#0B0B0F');
  });

  it('systeme + light system → light theme', () => {
    mockUseColorScheme.mockReturnValue('light');
    const { result } = renderHook(() => useResolvedTheme('systeme'));
    expect(result.current.resolved).toBe('light');
    expect(result.current.colors.bg).toBe('#F6F6F6');
  });

  it('systeme + null system → light theme (fallback)', () => {
    mockUseColorScheme.mockReturnValue(null);
    const { result } = renderHook(() => useResolvedTheme('systeme'));
    expect(result.current.resolved).toBe('light');
  });

  it('sombre → dark theme regardless of system', () => {
    mockUseColorScheme.mockReturnValue('light');
    const { result } = renderHook(() => useResolvedTheme('sombre'));
    expect(result.current.resolved).toBe('dark');
    expect(result.current.colors.card).toBe('#15151C');
  });

  it('clair → light theme regardless of system', () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { result } = renderHook(() => useResolvedTheme('clair'));
    expect(result.current.resolved).toBe('light');
    expect(result.current.colors.card).toBe('#FFFFFF');
  });

  it('returns correct dark color palette', () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { result } = renderHook(() => useResolvedTheme('systeme'));
    const { colors } = result.current;
    expect(colors).toEqual({
      bg: '#0B0B0F',
      card: '#15151C',
      text: '#FFFFFF',
      subtext: '#A0A0AA',
      border: '#262633',
      accent: 'blue',
      subaccent: 'deepskyblue',
    });
  });

  it('returns correct light color palette', () => {
    mockUseColorScheme.mockReturnValue('light');
    const { result } = renderHook(() => useResolvedTheme('systeme'));
    const { colors } = result.current;
    expect(colors).toEqual({
      bg: '#F6F6F6',
      card: '#FFFFFF',
      text: '#111111',
      subtext: '#777777',
      border: '#E6E6E6',
      accent: 'blue',
      subaccent: 'deepskyblue',
    });
  });
});
