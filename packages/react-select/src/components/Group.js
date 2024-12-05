/** @jsx jsx */
import * as emotionCore from '@emotion/core';
const { jsx } = emotionCore;

export const groupCSS = ({ theme: { spacing } }) => ({
  paddingBottom: spacing.baseUnit * 2,
  paddingTop: spacing.baseUnit * 2,
});

const Group = props => {
  const {
    children,
    className,
    cx,
    getStyles,
    Heading,
    headingProps,
    label,
    theme,
    selectProps,
  } = props;
  return (
    <div
      css={getStyles('group', props)}
      className={cx({ group: true }, className)}
    >
      <Heading
        {...headingProps}
        selectProps={selectProps}
        theme={theme}
        getStyles={getStyles}
        cx={cx}
      >
        {label}
      </Heading>
      <div>{children}</div>
    </div>
  );
};

export const groupHeadingCSS = ({ theme: { spacing } }) => ({
  label: 'group',
  color: '#999',
  cursor: 'default',
  display: 'block',
  fontSize: '75%',
  fontWeight: '500',
  marginBottom: '0.25em',
  paddingLeft: spacing.baseUnit * 3,
  paddingRight: spacing.baseUnit * 3,
  textTransform: 'uppercase',
});

export const GroupHeading = props => {
  const { className, cx, getStyles, theme, selectProps, ...cleanProps } = props;
  return (
    <div
      css={getStyles('groupHeading', { theme, ...cleanProps })}
      className={cx({ 'group-heading': true }, className)}
      {...cleanProps}
    />
  );
};

export default Group;
