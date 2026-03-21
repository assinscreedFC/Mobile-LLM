import { useState, useEffect, useRef } from 'react';
import { TextInput } from 'react-native';

type NumberInputProps = {
    value: number,
    onSubmitEditing: (value: number) => void,
    minValue: number,
    maxValue: number,
    defaultValue?: number,
    style?: any,
    size?: number,
    className?: string,
    }

/* Loosly inspired by https://medium.com/@FullStackSoftwareDeveloper/mastering-number-input-in-react-native-a-user-friendly-guide-for-seamless-numeric-input-handling-5c17d83b8f55 */
export default function NumberInput({value, onSubmitEditing, minValue, maxValue, defaultValue, ...rest}:NumberInputProps) {
        const [tempValue, setTempValue] = useState(value.toString());
        const fallbackValueRef = useRef(defaultValue ?? value);


        //According to Gemini, this will keep displayed text in sync if value is changed somewhere else.
        useEffect(() => {
            setTempValue(value.toString());
          }, [value]);

        const handleDone = () => {
               let numIn = parseFloat(tempValue);
                if (!isNaN(numIn) && numIn > minValue) {
                      if (numIn <= maxValue) {
                        setTempValue(numIn.toString());
                        onSubmitEditing(numIn);
                      } else {
                        setTempValue(maxValue.toString());
                        onSubmitEditing(maxValue);
                      }
                    } else {
                      setTempValue(fallbackValueRef.current.toString());
                      onSubmitEditing(fallbackValueRef.current);
                    }
            }

    return (<TextInput
        keyboardType='numeric'
        value={tempValue}
        onChangeText={setTempValue}
        onSubmitEditing={handleDone}
        onBlur={handleDone}
        style={[rest.size? {fontSize: rest.size}:null, rest.style]}
        {...rest}
        />)
    }