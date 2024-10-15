import { Component } from 'react';
import { findDOMNode } from 'react-dom';

export default class NodeResolver extends Component {
  componentDidMount() {
    this.props.innerRef(findDOMNode(this));
  }
  componentWillUnmount() {
    this.props.innerRef(null);
  }
  render() {
    return this.props.children;
  }
}
