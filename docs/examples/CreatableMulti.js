import React, { Component } from 'react';

import CreatableSelect from 'react-select/creatable';
import { colourOptions } from '../data';

export default class CreatableMulti extends Component {
  handleChange = (newValue, actionMeta) => {
    console.group('Value Changed');
    console.log(newValue);
    console.log(`action: ${actionMeta.action}`);
    console.groupEnd();
  };
  render() {
    return (
      <CreatableSelect
        isMulti
        onChange={this.handleChange}
        options={colourOptions}
      />
    );
  }
}
