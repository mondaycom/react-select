import React from 'react';
import { TransitionGroup } from 'react-transition-group';

// make ValueContainer a transition group
const AnimatedValueContainer = WrappedComponent => props => (
  <TransitionGroup component={WrappedComponent} {...props} />
);

export default AnimatedValueContainer;
