import React, { Component } from 'react';
import * as emotionCore from '@emotion/core';
import createCache from '@emotion/cache';
import memoizeOne from 'memoize-one';
const { CacheProvider } = emotionCore;

export default class NonceProvider extends Component {
  constructor(props) {
    super(props);
    this.createEmotionCache = memoizeOne(this.createEmotionCache);
  }
  createEmotionCache = nonce => {
    return createCache({ nonce });
  };
  render() {
    const emotionCache = this.createEmotionCache(this.props.nonce);
    return (
      <CacheProvider value={emotionCache}>{this.props.children}</CacheProvider>
    );
  }
}
