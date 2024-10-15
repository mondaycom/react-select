import React from 'react';
import { Fade } from './transitions';

// instant fade; all transition-group children must be transitions

const AnimatedSingleValue = WrappedComponent => props => (
  <Fade component={WrappedComponent} {...props} />
);

export default AnimatedSingleValue;
