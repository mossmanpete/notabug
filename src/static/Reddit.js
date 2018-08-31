import React from "react";

export const Reddit = ({ location: { pathname, search } }) => (
  <div className="reddit-infobar">
    <h1>This isn't snew</h1>
    <h4>
      {"Yes they share some code, but you're looking for "}
      <a href={`https://snew.github.io${pathname}${search}`}>snew.github.io</a>
    </h4>
    <p>notabug does not rely on reddit's servers, api or content at all; it's its own network.</p>
    <p>Only the open-source UI code from reddit is used.</p>
  </div>
);