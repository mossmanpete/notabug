import commandLineArgs from "command-line-args";
import { pick } from "ramda";
// import { gunCleric } from "gun-cleric";
// import { gunClericSharedScope as gunCleric } from "gun-cleric-scope";
import { gunCleric, oracleState, createWorker } from "gun-cleric-bee-queue";
import indexerOracle from "./oracles/indexer";
import spaceIndexerOracle from "./oracles/space-indexer";
import tabulatorOracle from "./oracles/tabulator";
const Gun = (global.Gun = require("gun/gun"));

let nab;
const options = commandLineArgs([
  { name: "persist", alias: "P", type: Boolean, defaultValue: false },
  { name: "redis", alias: "r", type: Boolean, defaultValue: false },
  { name: "disableValidation", alias: "D", type: Boolean, defaultValue: false },
  { name: "evict", alias: "e", type: Boolean, defaultValue: false },
  { name: "debug", alias: "d", type: Boolean, defaultValue: false },
  { name: "render", alias: "z", type: Boolean, defaultValue: false },
  { name: "port", alias: "p", type: Number, defaultValue: null },
  { name: "pistol", alias: "i", type: Boolean, defaultValue: false },
  { name: "host", alias: "h", type: String, defaultValue: "127.0.0.1" },
  { name: "peer", alias: "c", multiple: true, type: String },
  { name: "leech", type: Boolean, defaultValue: false },
  { name: "until", alias: "u", type: Number, defaultValue: 1000 },
  { name: "listings", alias: "v", type: Boolean, defaultValue: false },
  { name: "spaces", alias: "s", type: Boolean, defaultValue: false },
  { name: "tabulate", alias: "t", type: Boolean, defaultValue: false }
]);

const peerOptions = {
  ...pick(["localStorage", "persist", "disableValidation", "until"], options),
  peers: options.peer || [],
  super: !options.leech
};

process.env.GUN_ENV = options.debug ? "debug" : undefined;
require("gun/nts");
require("gun/lib/store");
require("gun/lib/rs3");
require("gun/lib/wire");
require("gun/lib/verify");
require("gun/lib/then");
require("gun/sea");
if (options.evict) require("gun/lib/les");
if (options.debug) require("gun/lib/debug");
if (options.redis) require("gun-redis").attachToGun(Gun);

if (options.port) {
  nab = require("./http").initServer({
    ...peerOptions,
    ...pick(["pistol", "render", "redis", "host", "port"], options)
  });
} else {
  nab = require("./notabug-peer").default(peerOptions);
  nab.gun.get("~@").once(() => null);
}

if (options.redis) nab.gun.redis = Gun.redis;

const oracles = [
  ...(options.listings ? [indexerOracle] : []),
  ...(options.tabulate ? [tabulatorOracle] : []),
  ...(options.spaces ? [spaceIndexerOracle] : [])
];

if (oracles.length) {
  const { username, password } = require("../server-config.json");
  nab.login(username, password).then(({ pub }) => {
    console.log("logged in", username, pub);
    const state = oracleState({
      db: 2
    });
    const worker = createWorker(oracles, {
      queue: require("./worker").cleric
    });
    oracles.forEach(oracle =>
      oracle.config({
        pub,
        state,
        worker,
        write: (soul, node) => nab.gun.get(soul).put(node)
      })
    );
    gunCleric(nab.gun, oracles);
    if (nab.receiver) {
      nab.receiver.onIn(msg => {
        if (msg.fromCluster) return;
        if (msg.json.get) {
          oracles.forEach(orc => orc.onMsg(msg.json));
        }
      });
    }
  });
}
if (options.redis) {
  Gun.redis.onChange(soul => {
    require("./worker")
      .cleric.createJob({
        soul,
        method: "onChange",
        latest: new Date().getTime()
      })
      .save();
    console.log("onChange", soul);
  });
}
