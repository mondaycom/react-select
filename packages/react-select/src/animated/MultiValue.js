import React from 'react';
import { Collapse } from './transitions';

// strip transition props off before spreading onto actual component

const AnimatedMultiValue = WrappedComponent => {
  return ({ in: inProp, onExited, ...props }) => (
    <Collapse in={inProp} onExited={onExited}>
      <WrappedComponent cropWithEllipsis={inProp} {...props} />
    </Collapse>
  );
};

export default AnimatedMultiValue;
