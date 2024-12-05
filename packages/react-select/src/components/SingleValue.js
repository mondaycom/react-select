/** @jsx jsx */
import * as emotionCore from '@emotion/core';
const { jsx } = emotionCore;

export const css = ({ isDisabled, theme: { spacing, colors } }) => ({
  label: 'singleValue',
  color: isDisabled ? colors.neutral40 : colors.neutral80,
  marginLeft: spacing.baseUnit / 2,
  marginRight: spacing.baseUnit / 2,
  maxWidth: `calc(100% - ${spacing.baseUnit * 2}px)`,
  overflow: 'hidden',
  position: 'absolute',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  top: '50%',
  transform: 'translateY(-50%)',
});

const SingleValue = props => {
  const { children, className, cx, getStyles, isDisabled, innerProps } = props;
  return (
    <div
      css={getStyles('singleValue', props)}
      className={cx(
        {
          'single-value': true,
          'single-value--is-disabled': isDisabled,
        },
        className
      )}
      {...innerProps}
    >
      {children}
    </div>
  );
};

export default SingleValue;
