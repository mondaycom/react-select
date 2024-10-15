

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import routes from './routes';

const API = ({ match }) => {
  const { path, Component } = routes[match.params.section];
  return (
    <Switch>
      <Route exact path={path} component={Component} />
    </Switch>
  );
};

export default API;
