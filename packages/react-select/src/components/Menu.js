/** @jsx jsx */
import { createContext, Component } from 'react';
import * as emotionCore from '@emotion/core';
import { createPortal } from 'react-dom';
const { jsx } = emotionCore;

import {
  animatedScrollTo,
  getBoundingClientObj,
  getScrollParent,
  getScrollTop,
  scrollTo,
} from '../utils';

// ==============================
// Menu
// ==============================

// Get Menu Placement
// ------------------------------

export function getMenuPlacement({
  maxHeight,
  menuEl,
  minHeight,
  placement,
  shouldScroll,
  isFixedPosition,
  theme,
}) {
  const { spacing } = theme;
  const scrollParent = getScrollParent(menuEl);
  const defaultState = { placement: 'bottom', maxHeight };

  // something went wrong, return default state
  if (!menuEl || !menuEl.offsetParent) return defaultState;

  // we can't trust `scrollParent.scrollHeight` --> it may increase when
  // the menu is rendered
  const { height: scrollHeight } = scrollParent.getBoundingClientRect();
  const {
    bottom: menuBottom,
    height: menuHeight,
    top: menuTop,
  } = menuEl.getBoundingClientRect();

  const { top: containerTop } = menuEl.offsetParent.getBoundingClientRect();
  const viewHeight = window.innerHeight;
  const scrollTop = getScrollTop(scrollParent);

  const marginBottom = parseInt(getComputedStyle(menuEl).marginBottom, 10);
  const marginTop = parseInt(getComputedStyle(menuEl).marginTop, 10);
  const viewSpaceAbove = containerTop - marginTop;
  const viewSpaceBelow = viewHeight - menuTop;
  const scrollSpaceAbove = viewSpaceAbove + scrollTop;
  const scrollSpaceBelow = scrollHeight - scrollTop - menuTop;

  const scrollDown = menuBottom - viewHeight + scrollTop + marginBottom;
  const scrollUp = scrollTop + menuTop - marginTop;
  const scrollDuration = 160;

  switch (placement) {
    case 'auto':
    case 'bottom':
      // 1: the menu will fit, do nothing
      if (viewSpaceBelow >= menuHeight) {
        return { placement: 'bottom', maxHeight };
      }

      // 2: the menu will fit, if scrolled
      if (scrollSpaceBelow >= menuHeight && !isFixedPosition) {
        if (shouldScroll) {
          animatedScrollTo(scrollParent, scrollDown, scrollDuration);
        }

        return { placement: 'bottom', maxHeight };
      }

      // 3: the menu will fit, if constrained
      if (
        (!isFixedPosition && scrollSpaceBelow >= minHeight) ||
        (isFixedPosition && viewSpaceBelow >= minHeight)
      ) {
        if (shouldScroll) {
          animatedScrollTo(scrollParent, scrollDown, scrollDuration);
        }

        // we want to provide as much of the menu as possible to the user,
        // so give them whatever is available below rather than the minHeight.
        const constrainedHeight = isFixedPosition
          ? viewSpaceBelow - marginBottom
          : scrollSpaceBelow - marginBottom;

        return {
          placement: 'bottom',
          maxHeight: constrainedHeight,
        };
      }

      // 4. Forked beviour when there isn't enough space below

      // AUTO: flip the menu, render above
      if (placement === 'auto' || isFixedPosition) {
        // may need to be constrained after flipping
        let constrainedHeight = maxHeight;
        const spaceAbove = isFixedPosition ? viewSpaceAbove : scrollSpaceAbove;

        if (spaceAbove >= minHeight) {
          constrainedHeight = Math.min(
            spaceAbove - marginBottom - spacing.controlHeight,
            maxHeight
          );
        }

        return { placement: 'top', maxHeight: constrainedHeight };
      }

      // BOTTOM: allow browser to increase scrollable area and immediately set scroll
      if (placement === 'bottom') {
        scrollTo(scrollParent, scrollDown);
        return { placement: 'bottom', maxHeight };
      }
      break;
    case 'top':
      // 1: the menu will fit, do nothing
      if (viewSpaceAbove >= menuHeight) {
        return { placement: 'top', maxHeight };
      }

      // 2: the menu will fit, if scrolled
      if (scrollSpaceAbove >= menuHeight && !isFixedPosition) {
        if (shouldScroll) {
          animatedScrollTo(scrollParent, scrollUp, scrollDuration);
        }

        return { placement: 'top', maxHeight };
      }

      // 3: the menu will fit, if constrained
      if (
        (!isFixedPosition && scrollSpaceAbove >= minHeight) ||
        (isFixedPosition && viewSpaceAbove >= minHeight)
      ) {
        let constrainedHeight = maxHeight;

        // we want to provide as much of the menu as possible to the user,
        // so give them whatever is available below rather than the minHeight.
        if (
          (!isFixedPosition && scrollSpaceAbove >= minHeight) ||
          (isFixedPosition && viewSpaceAbove >= minHeight)
        ) {
          constrainedHeight = isFixedPosition
            ? viewSpaceAbove - marginTop
            : scrollSpaceAbove - marginTop;
        }

        if (shouldScroll) {
          animatedScrollTo(scrollParent, scrollUp, scrollDuration);
        }

        return {
          placement: 'top',
          maxHeight: constrainedHeight,
        };
      }

      // 4. not enough space, the browser WILL NOT increase scrollable area when
      // absolutely positioned element rendered above the viewport (only below).
      // Flip the menu, render below
      return { placement: 'bottom', maxHeight };
    default:
      throw new Error(`Invalid placement provided "${placement}".`);
  }

  // fulfil contract with flow: implicit return value of undefined
  return defaultState;
}

// Menu Component
// ------------------------------

function alignToControl(placement) {
  const placementToCSSProp = { bottom: 'top', top: 'bottom' };
  return placement ? placementToCSSProp[placement] : 'bottom';
}
const coercePlacement = p => (p === 'auto' ? 'bottom' : p);

export const menuCSS = ({
  placement,
  theme: { borderRadius, spacing, colors },
}) => ({
  label: 'menu',
  [alignToControl(placement)]: '100%',
  backgroundColor: colors.neutral0,
  borderRadius: borderRadius,
  boxShadow: '0 0 0 1px hsla(0, 0%, 0%, 0.1), 0 4px 11px hsla(0, 0%, 0%, 0.1)',
  marginBottom: spacing.menuGutter,
  marginTop: spacing.menuGutter,
  position: 'absolute',
  width: '100%',
  zIndex: 1,
});

const PortalPlacementContext = createContext({ getPortalPlacement: null });

// NOTE: internal only
export class MenuPlacer extends Component {
  state = {
    maxHeight: this.props.maxMenuHeight,
    placement: null,
  };
  static contextType = PortalPlacementContext;

  getPlacement = ref => {
    const {
      minMenuHeight,
      maxMenuHeight,
      menuPlacement,
      menuPosition,
      menuShouldScrollIntoView,
      theme,
    } = this.props;

    if (!ref) return;

    // DO NOT scroll if position is fixed
    const isFixedPosition = menuPosition === 'fixed';
    const shouldScroll = menuShouldScrollIntoView && !isFixedPosition;

    const state = getMenuPlacement({
      maxHeight: maxMenuHeight,
      menuEl: ref,
      minHeight: minMenuHeight,
      placement: menuPlacement,
      shouldScroll,
      isFixedPosition,
      theme,
    });

    const { getPortalPlacement } = this.context;
    if (getPortalPlacement) getPortalPlacement(state);

    this.setState(state);
  };
  getUpdatedProps = () => {
    const { menuPlacement } = this.props;
    const placement = this.state.placement || coercePlacement(menuPlacement);

    return { ...this.props, placement, maxHeight: this.state.maxHeight };
  };
  render() {
    const { children } = this.props;

    return children({
      ref: this.getPlacement,
      placerProps: this.getUpdatedProps(),
    });
  }
}

const Menu = props => {
  const { children, className, cx, getStyles, innerRef, innerProps } = props;

  return (
    <div
      css={getStyles('menu', props)}
      className={cx({ menu: true }, className)}
      {...innerProps}
      ref={innerRef}
    >
      {children}
    </div>
  );
};

export default Menu;

// ==============================
// Menu List
// ==============================

export const menuListCSS = ({
  maxHeight,
  theme: {
    spacing: { baseUnit },
  },
}) => ({
  maxHeight,
  overflowY: 'auto',
  paddingBottom: baseUnit,
  paddingTop: baseUnit,
  position: 'relative', // required for offset[Height, Top] > keyboard scroll
  WebkitOverflowScrolling: 'touch',
});
export const MenuList = props => {
  const {
    children,
    className,
    cx,
    getStyles,
    isMulti,
    innerRef,
    innerProps,
  } = props;
  return (
    <div
      css={getStyles('menuList', props)}
      className={cx(
        {
          'menu-list': true,
          'menu-list--is-multi': isMulti,
        },
        className
      )}
      ref={innerRef}
      {...innerProps}
    >
      {children}
    </div>
  );
};

// ==============================
// Menu Notices
// ==============================

const noticeCSS = ({
  theme: {
    spacing: { baseUnit },
    colors,
  },
}) => ({
  color: colors.neutral40,
  padding: `${baseUnit * 2}px ${baseUnit * 3}px`,
  textAlign: 'center',
});
export const noOptionsMessageCSS = noticeCSS;
export const loadingMessageCSS = noticeCSS;

export const NoOptionsMessage = props => {
  const { children, className, cx, getStyles, innerProps } = props;
  return (
    <div
      css={getStyles('noOptionsMessage', props)}
      className={cx(
        {
          'menu-notice': true,
          'menu-notice--no-options': true,
        },
        className
      )}
      {...innerProps}
    >
      {children}
    </div>
  );
};
NoOptionsMessage.defaultProps = {
  children: 'No options',
};

export const LoadingMessage = props => {
  const { children, className, cx, getStyles, innerProps } = props;
  return (
    <div
      css={getStyles('loadingMessage', props)}
      className={cx(
        {
          'menu-notice': true,
          'menu-notice--loading': true,
        },
        className
      )}
      {...innerProps}
    >
      {children}
    </div>
  );
};
LoadingMessage.defaultProps = {
  children: 'Loading...',
};

// ==============================
// Menu Portal
// ==============================

export const menuPortalCSS = ({ rect, offset, position }) => ({
  left: rect.left,
  position: position,
  top: offset,
  width: rect.width,
  zIndex: 1,
});

export class MenuPortal extends Component {
  state = { placement: null };

  // callback for occassions where the menu must "flip"
  getPortalPlacement = ({ placement }) => {
    const initialPlacement = coercePlacement(this.props.menuPlacement);

    // avoid re-renders if the placement has not changed
    if (placement !== initialPlacement) {
      this.setState({ placement });
    }
  };
  render() {
    const {
      appendTo,
      children,
      controlElement,
      menuPlacement,
      menuPosition: position,
      getStyles,
    } = this.props;
    const isFixed = position === 'fixed';

    // bail early if required elements aren't present
    if ((!appendTo && !isFixed) || !controlElement) {
      return null;
    }

    const placement = this.state.placement || coercePlacement(menuPlacement);
    const rect = getBoundingClientObj(controlElement);
    const scrollDistance = isFixed ? 0 : window.pageYOffset;
    const offset = rect[placement] + scrollDistance;
    const state = { offset, position, rect };

    // same wrapper element whether fixed or portalled
    const menuWrapper = (
      <div css={getStyles('menuPortal', state)}>{children}</div>
    );

    return (
      <PortalPlacementContext.Provider
        value={{ getPortalPlacement: this.getPortalPlacement }}
      >
        {appendTo ? createPortal(menuWrapper, appendTo) : menuWrapper}
      </PortalPlacementContext.Provider>
    );
  }
}
