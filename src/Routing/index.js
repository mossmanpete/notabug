import React from "react";
import { Route, Switch, Redirect } from "react-router-dom";
//import { Helmet } from "react-helmet";
import { ScrollToTop } from "utils";
import { routes } from "./routes";
export { routes } from "./routes";

export const Routing = () => (
  <React.Fragment>
    {/*<Helmet>
      <title>notabug: the back page of the internet</title>
      <body class="loggedin subscriber" />
    </Helmet>*/}
    <ScrollToTop>
      <Switch>
        {routes.map(route => (
          <Route {...route} key={route.path} />
        ))}
      </Switch>
    </ScrollToTop>
    <Switch>
      <Redirect from="/user/~:user(.+)" to="/user/:user" />
    </Switch>
  </React.Fragment>
);
