import React, { Component } from 'react';
import rafSchedule from 'raf-schd';
import NodeResolver from 'react-node-resolver';

function getStyle(el, prop, numeric = true) {
  const val = window.getComputedStyle(el, null).getPropertyValue(prop);
  return numeric ? parseFloat(val) : val;
}
function isInView(el) {
  let rect = el.getBoundingClientRect();

  const topOffset =
    (getStyle(el, 'padding-top') + getStyle(el, 'margin-top')) * -1;

  if (rect.top >= topOffset && rect.bottom <= window.innerHeight) {
    return true;
  }

  return false;
}

export default class ScrollSpy extends Component {
  nav;
  allIds = [];
  state = { elements: [] };
  static defaultProps = { preserveHeight: false };
  componentDidMount() {
    window.addEventListener('scroll', this.handleScroll, false);
    this.buildNodeList();
  }
  componentWillUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
  }
  handleScroll = rafSchedule(event => {
    event.preventDefault();
    const { onChange } = this.props;
    const { elements } = this.state;
    if (!elements.length) return;

    const idsInView = elements.filter(isInView).map(i => i.getAttribute('id'));
    if (idsInView.length) {
      onChange(idsInView);
    }
  });
  getElements = ref => {
    if (!ref) return;
    this.nav = ref;
  };
  buildNodeList = () => {
    if (!this.nav) return;

    const anchorList = this.nav.querySelectorAll('[data-hash]');
    const els = Array.from(anchorList).map(i =>
      document.querySelector(`#${i.dataset.hash}`)
    );

    const elements = els; // suck it flow...

    this.setState({ elements });
  };
  render() {
    return (
      <NodeResolver innerRef={this.getElements}>
        {this.props.children}
      </NodeResolver>
    );
  }
}
