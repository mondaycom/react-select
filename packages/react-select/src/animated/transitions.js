import React, { Component } from 'react';
import { Transition } from 'react-transition-group';

// ==============================
// Fade Transition
// ==============================

export const Fade = ({
  component: Tag,
  duration = 1,
  in: inProp,
  onExited, // eslint-disable-line no-unused-vars
  ...props
}) => {
  const transition = {
    entering: { opacity: 0 },
    entered: { opacity: 1, transition: `opacity ${duration}ms` },
    exiting: { opacity: 0 },
    exited: { opacity: 0 },
  };

  return (
    <Transition mountOnEnter unmountOnExit in={inProp} timeout={duration}>
      {state => {
        const innerProps = {
          style: {
            ...transition[state],
          },
        };
        return <Tag innerProps={innerProps} {...props} />;
      }}
    </Transition>
  );
};

// ==============================
// Collapse Transition
// ==============================

export const collapseDuration = 260;

// wrap each MultiValue with a collapse transition; decreases width until
// finally removing from DOM
export class Collapse extends Component {
  duration = collapseDuration;
  rafID;
  state = { width: 'auto' };
  transition = {
    exiting: { width: 0, transition: `width ${this.duration}ms ease-out` },
    exited: { width: 0 },
  };
  componentWillUnmount() {
    if (this.rafID) {
      window.cancelAnimationFrame(this.rafID);
    }
  }

  // width must be calculated; cannot transition from `undefined` to `number`
  getWidth = ref => {
    if (ref && isNaN(this.state.width)) {
      /*
        Here we're invoking requestAnimationFrame with a callback invoking our
        call to getBoundingClientRect and setState in order to resolve an edge case
        around portalling. Certain portalling solutions briefly remove children from the DOM
        before appending them to the target node. This is to avoid us trying to call getBoundingClientrect
        while the Select component is in this state.
      */
      // cannot use `offsetWidth` because it is rounded
      this.rafID = window.requestAnimationFrame(() => {
        const { width } = ref.getBoundingClientRect();
        this.setState({ width });
      });
    }
  };

  // get base styles
  getStyle = width => ({
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    width,
  });

  // get transition styles
  getTransition = state => this.transition[state];

  render() {
    const { children, in: inProp } = this.props;
    const { width } = this.state;

    return (
      <Transition
        enter={false}
        mountOnEnter
        unmountOnExit
        in={inProp}
        timeout={this.duration}
      >
        {state => {
          const style = {
            ...this.getStyle(width),
            ...this.getTransition(state),
          };
          return (
            <div ref={this.getWidth} style={style}>
              {children}
            </div>
          );
        }}
      </Transition>
    );
  }
}
