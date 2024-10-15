import React from 'react';

// strip transition props off before spreading onto select component
// note we need to be explicit about innerRef for flow
const AnimatedInput = WrappedComponent => {
  return ({ in: inProp, onExited, appear, enter, exit, ...props }) => (
    <WrappedComponent {...props} />
  );
};

export default AnimatedInput;
