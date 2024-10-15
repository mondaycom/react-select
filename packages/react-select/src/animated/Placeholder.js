import React from 'react';
import { Fade, collapseDuration } from './transitions';

// fade in when last multi-value removed, otherwise instant
const AnimatedPlaceholder = WrappedComponent => props => (
  <Fade
    component={WrappedComponent}
    duration={props.isMulti ? collapseDuration : 1}
    {...props}
  />
);

export default AnimatedPlaceholder;
