#!/usr/bin/env node
var Gun = require("gun/gun");
//require("./src/sea");
var compress = require("compression");
var commandLineArgs = require("command-line-args");
var blocked = require("./blocked");

var options = commandLineArgs([
  { name: "persist", alias: "P", type: Boolean },
  { name: "disableValidation", alias: "D", type: Boolean },
  { name: "score", alias: "s", type: Boolean },
  { name: "evict", alias: "e", type: Boolean },
  { name: "debug", alias: "d", type: Boolean },
  { name: "port", alias: "p", type: Number, defaultValue: null },
  { name: "host", alias: "h", type: String, defaultValue: "127.0.0.1" },
  { name: "peer", alias: "c", multiple: true, type: String },
  { name: "until", alias: "u", multiple: true, type: Number, defaultValue: 5000 }
]);

process.env.GUN_ENV = process.env.GUN_ENV || options.debug ? "debug" : undefined;
Gun.serve = require("gun/lib/serve");
require("gun/nts");
require("gun/lib/store");
require("gun/lib/rs3");
//try{require('./ws');}catch(e){require('./wsp/server');}
require("gun/lib/wire");
require("gun/lib/verify");
require("gun/lib/file");
require("gun/lib/bye");
Gun.on("opt", function(root){
  this.to.next(root);
  if(root.once){ return; }
  root.opt.super = true;
});
if (options.evict) require("gun/lib/evict");
if (options.debug) require("gun/lib/debug");

global.Gun = Gun;
require("babel-core/register");
require("babel-polyfill");
var path = require("path");
var express = require("express");
var router = express.Router();
var init = require("notabug-peer").default;
var web;

if (options.port) {
  var app = express();
  web = app.listen(options.port, options.host);

  router.use(compress());
  router.use(express.static(path.join(__dirname, "build")));
  app.use(router);

  app.get("/*", function (req, res) {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

var nab = init({
  blocked,
  peers: options.peer,
  persist: options.persist,
  disableValidation: options.disableValidation,
  scoreThingsForPeers: options.score,
  until: options.until,
  super: true,
  web
});

if (options.persist || !options.port) {
  nab.watchListing({ days: 1 });
  setInterval(function() {
    nab.watchListing({ days: 1 });
  }, 1000*60*60);
}

if(options.persist) {
  nab.gun.get("nab/things").map().get("data").on(function () { });
}
