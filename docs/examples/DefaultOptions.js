import React, { Component } from 'react';

import AsyncSelect from 'react-select/async';
import { colourOptions } from '../data';

const filterColors = inputValue => {
  return colourOptions.filter(i =>
    i.label.toLowerCase().includes(inputValue.toLowerCase())
  );
};

const promiseOptions = inputValue =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve(filterColors(inputValue));
    }, 1000);
  });

export default class WithPromises extends Component {
  state = { inputValue: '' };
  handleInputChange = newValue => {
    const inputValue = newValue.replace(/\W/g, '');
    this.setState({ inputValue });
    return inputValue;
  };
  render() {
    return (
      <AsyncSelect
        cacheOptions
        defaultOptions={colourOptions}
        loadOptions={promiseOptions}
      />
    );
  }
}
