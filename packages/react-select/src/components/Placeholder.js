/** @jsx jsx */
import * as emotionCore from '@emotion/core';
const { jsx } = emotionCore;

export const placeholderCSS = ({ theme: { spacing, colors } }) => ({
  label: 'placeholder',
  color: colors.neutral50,
  marginLeft: spacing.baseUnit / 2,
  marginRight: spacing.baseUnit / 2,
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
});

const Placeholder = props => {
  const { children, className, cx, getStyles, innerProps } = props;
  return (
    <div
      css={getStyles('placeholder', props)}
      className={cx(
        {
          placeholder: true,
        },
        className
      )}
      {...innerProps}
    >
      {children}
    </div>
  );
};

export default Placeholder;
