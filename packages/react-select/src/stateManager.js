import React, { Component } from 'react';

export const defaultProps = {
  defaultInputValue: '',
  defaultMenuIsOpen: false,
  defaultValue: null,
};

const manageState = SelectComponent =>
  class StateManager extends Component {
    static defaultProps = defaultProps;

    select;

    state = {
      inputValue:
        this.props.inputValue !== undefined
          ? this.props.inputValue
          : this.props.defaultInputValue,
      menuIsOpen:
        this.props.menuIsOpen !== undefined
          ? this.props.menuIsOpen
          : this.props.defaultMenuIsOpen,
      value:
        this.props.value !== undefined
          ? this.props.value
          : this.props.defaultValue,
    };
    focus() {
      this.select.focus();
    }
    blur() {
      this.select.blur();
    }
    // FIXME: untyped flow code, return any
    getProp(key) {
      return this.props[key] !== undefined ? this.props[key] : this.state[key];
    }
    // FIXME: untyped flow code, return any
    callProp(name, ...args) {
      if (typeof this.props[name] === 'function') {
        return this.props[name](...args);
      }
    }
    onChange = (value, actionMeta) => {
      this.callProp('onChange', value, actionMeta);
      this.setState({ value });
    };
    onInputChange = (value, actionMeta) => {
      // TODO: for backwards compatibility, we allow the prop to return a new
      // value, but now inputValue is a controllable prop we probably shouldn't
      const newValue = this.callProp('onInputChange', value, actionMeta);
      this.setState({
        inputValue: newValue !== undefined ? newValue : value,
      });
    };
    onMenuOpen = () => {
      this.callProp('onMenuOpen');
      this.setState({ menuIsOpen: true });
    };
    onMenuClose = () => {
      this.callProp('onMenuClose');
      this.setState({ menuIsOpen: false });
    };
    render() {
      const {
        defaultInputValue,
        defaultMenuIsOpen,
        defaultValue,
        ...props
      } = this.props;
      return (
        <SelectComponent
          {...props}
          ref={ref => {
            this.select = ref;
          }}
          inputValue={this.getProp('inputValue')}
          menuIsOpen={this.getProp('menuIsOpen')}
          onChange={this.onChange}
          onInputChange={this.onInputChange}
          onMenuClose={this.onMenuClose}
          onMenuOpen={this.onMenuOpen}
          value={this.getProp('value')}
        />
      );
    }
  };

export default manageState;
