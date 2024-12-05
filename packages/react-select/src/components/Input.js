/** @jsx jsx */
import * as emotionCore from '@emotion/core';
const { jsx } = emotionCore;
import AutosizeInput from 'react-input-autosize';

export const inputCSS = ({ isDisabled, theme: { spacing, colors } }) => ({
  margin: spacing.baseUnit / 2,
  paddingBottom: spacing.baseUnit / 2,
  paddingTop: spacing.baseUnit / 2,
  visibility: isDisabled ? 'hidden' : 'visible',
  color: colors.neutral80,
});
const inputStyle = isHidden => ({
  label: 'input',
  background: 0,
  border: 0,
  fontSize: 'inherit',
  opacity: isHidden ? 0 : 1,
  outline: 0,
  padding: 0,
  color: 'inherit',
});

const Input = ({
  className,
  cx,
  getStyles,
  innerRef,
  isHidden,
  isDisabled,
  theme,
  selectProps,
  ...props
}) => {
  const AutosizeInputComponent = AutosizeInput.default
    ? AutosizeInput.default
    : AutosizeInput;
  return (
    <div css={getStyles('input', { theme, ...props })}>
      <AutosizeInputComponent
        className={cx({ input: true }, className)}
        inputRef={innerRef}
        inputStyle={inputStyle(isHidden)}
        disabled={isDisabled}
        {...props}
      />
    </div>
  );
};

export default Input;
