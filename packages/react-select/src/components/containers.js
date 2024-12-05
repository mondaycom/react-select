/** @jsx jsx */
import * as emotionCore from '@emotion/core';
const { jsx } = emotionCore;

// ==============================
// Root Container
// ==============================

export const containerCSS = ({ isDisabled, isRtl }) => ({
  label: 'container',
  direction: isRtl ? 'rtl' : null,
  pointerEvents: isDisabled ? 'none' : null, // cancel mouse events when disabled
  position: 'relative',
});
export const SelectContainer = props => {
  const {
    children,
    className,
    cx,
    getStyles,
    innerProps,
    isDisabled,
    isRtl,
  } = props;
  return (
    <div
      css={getStyles('container', props)}
      className={cx(
        {
          '--is-disabled': isDisabled,
          '--is-rtl': isRtl,
        },
        className
      )}
      {...innerProps}
    >
      {children}
    </div>
  );
};

// ==============================
// Value Container
// ==============================

export const valueContainerCSS = ({ theme: { spacing } }) => ({
  alignItems: 'center',
  display: 'flex',
  flex: 1,
  flexWrap: 'wrap',
  padding: `${spacing.baseUnit / 2}px ${spacing.baseUnit * 2}px`,
  WebkitOverflowScrolling: 'touch',
  position: 'relative',
  overflow: 'hidden',
});
export const ValueContainer = props => {
  const { children, className, cx, isMulti, getStyles, hasValue } = props;

  return (
    <div
      css={getStyles('valueContainer', props)}
      className={cx(
        {
          'value-container': true,
          'value-container--is-multi': isMulti,
          'value-container--has-value': hasValue,
        },
        className
      )}
    >
      {children}
    </div>
  );
};

// ==============================
// Indicator Container
// ==============================

export const indicatorsContainerCSS = () => ({
  alignItems: 'center',
  alignSelf: 'stretch',
  display: 'flex',
  flexShrink: 0,
});
export const IndicatorsContainer = props => {
  const { children, className, cx, getStyles } = props;

  return (
    <div
      css={getStyles('indicatorsContainer', props)}
      className={cx(
        {
          indicators: true,
        },
        className
      )}
    >
      {children}
    </div>
  );
};
