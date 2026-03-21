import { Text, Pressable, } from 'react-native';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { useHaptics } from '../utils/useHaptics';
import {useUIScale} from '../utils/useUIScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ActionSheetTrigger = ({ value, validValues, setter, id, style, textColor, backgroundColor, ...rest}) =>{
    const { showActionSheetWithOptions } = useActionSheet();
    const { haptics } = useHaptics();
    const scaleFactor = useUIScale(1);
    const insets = useSafeAreaInsets();

  return <Pressable
    onPress={ () => {
        showActionSheetWithOptions({
        options: validValues,
        containerStyle: {
            paddingBottom: insets.bottom
        }
        }, (selectedIndex) => {
            if (selectedIndex !== undefined) {
                setter(id, validValues[selectedIndex]);
                haptics('medium');
            }
          } );
      }
    }
    style={[style, {flexShrink: 1, flexDirection: 'row', justifyContent:'right', marginRight: 16*scaleFactor, borderRadius: 10}]}
    backgroundColor={backgroundColor}
  >
    <Text style={[style, {textAlign: 'right', width: '100%', color: textColor, paddingRight: 5*scaleFactor}]} ellipsizeMode='tail'>
      {value}
    </Text>
  </Pressable>
  ;
}