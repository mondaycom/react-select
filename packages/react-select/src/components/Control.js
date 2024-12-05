/** @jsx jsx */
import * as emotionCore from '@emotion/core';
const { jsx } = emotionCore;

export const css = ({
  isDisabled,
  isFocused,
  theme: { colors, borderRadius, spacing },
}) => ({
  label: 'control',
  alignItems: 'center',
  backgroundColor: isDisabled ? colors.neutral5 : colors.neutral0,
  borderColor: isDisabled
    ? colors.neutral10
    : isFocused
    ? colors.primary
    : colors.neutral20,
  borderRadius: borderRadius,
  borderStyle: 'solid',
  borderWidth: 1,
  boxShadow: isFocused ? `0 0 0 1px ${colors.primary}` : null,
  cursor: 'default',
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  minHeight: spacing.controlHeight,
  outline: '0 !important',
  position: 'relative',
  transition: 'all 100ms',

  '&:hover': {
    borderColor: isFocused ? colors.primary : colors.neutral30,
  },
});

const Control = props => {
  const {
    children,
    cx,
    getStyles,
    className,
    isDisabled,
    isFocused,
    innerRef,
    innerProps,
    menuIsOpen,
  } = props;
  return (
    <div
      ref={innerRef}
      css={getStyles('control', props)}
      className={cx(
        {
          control: true,
          'control--is-disabled': isDisabled,
          'control--is-focused': isFocused,
          'control--menu-is-open': menuIsOpen,
        },
        className
      )}
      {...innerProps}
    >
      {children}
    </div>
  );
};

export default Control;
