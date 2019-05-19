/*
global
  eventsList,
  eventsToFormat,
  tokenAuth,
  decks,
  rstore,
  loadPlayerConfig,
  cardsDb,
  playerData,
  ipc_send,
  debugNet,
  store,
  makeId,
  debugLog,
  ranked_events,
  setsList,
  syncUserData,
  sha1
*/
const async = require("async");
const qs = require("qs");
let metadataState = false;

var httpAsync = [];
httpBasic();
httpGetDatabase();
htttpGetStatus();

const serverAddress = "mtgatool.com";

function beginSSE() {
  var source = new EventSource(
    "https://" + serverAddress + "/api/pull?token=" + tokenAuth
  );
  source.onmessage = function(e) {
    ipc_send("ipc_log", ">> " + e.data);

    let parsed = undefined;
    try {
      parsed = JSON.parse(e.data);
    } catch (e) {
      //
    }

    console.log("> ", parsed);

    if (parsed) {
      parsed.forEach(str => {
        console.log("heartbeat message:", str);
        if (typeof str == "string") {
          //console.log("Notification string:", str);
          new Notification("MTG Arena Tool", {
            body: str
          });
        } else if (typeof str == "object") {
          if (str.task) {
            if (str.task == "sync") {
              syncUserData(str.value);
            } else {
              ipc_send(str.task, str.value);
            }
          }
        }
      });
    }
  };

  source.onopen = function(e) {
    console.log(">> Connection was opened", e);
  };

  source.onerror = function(e) {
    if (e.eventPhase == 2) {
      //EventSource.CLOSED
      console.log(">> Connection was closed", e);
    }
  };
}

function httpBasic() {
  var httpAsyncNew = httpAsync.slice(0);
  //var str = ""; httpAsync.forEach( function(h) {str += h.reqId+", "; }); console.log("httpAsync: ", str);
  async.forEachOfSeries(
    httpAsyncNew,
    function(value, index, callback) {
      var _headers = value;

      if (
        store.get("settings").send_data == false &&
        _headers.method != "auth" &&
        _headers.method != "delete_data" &&
        _headers.method != "get_database" &&
        _headers.method != "get_status" &&
        debugLog == false
      ) {
        ipc_send("set_offline", true);
        callback({
          message: "Settings dont allow sending data! > " + _headers.method
        });
        removeFromHttp(_headers.reqId);
        return;
      }

      _headers.token = tokenAuth;

      var http = require("https");
      var options;
      if (_headers.method == "get_database") {
        options = {
          protocol: "https:",
          port: 443,
          hostname: serverAddress,
          path: "/database/database.json",
          method: "GET"
        };
      } else if (_headers.method == "get_ladder_decks") {
        options = {
          protocol: "https:",
          port: 443,
          hostname: serverAddress,
          path: "/top_ladder.json",
          method: "GET"
        };
      } else if (_headers.method == "get_ladder_traditional_decks") {
        options = {
          protocol: "https:",
          port: 443,
          hostname: serverAddress,
          path: "/top_ladder_traditional.json",
          method: "GET"
        };
      } else if (_headers.method == "get_status") {
        http = require("https");
        options = {
          protocol: "https:",
          port: 443,
          hostname: "magicthegatheringarena.statuspage.io",
          path: "/index.json",
          method: "GET"
        };
      } else if (_headers.method_path !== undefined) {
        options = {
          protocol: "https:",
          port: 443,
          hostname: serverAddress,
          path: _headers.method_path,
          method: "POST"
        };
      } else {
        options = {
          protocol: "https:",
          port: 443,
          hostname: serverAddress,
          path: "/api.php",
          method: "POST"
        };
      }

      if (debugNet && _headers.method !== "heartbeat") {
        console.log(
          "SEND >> " + index + ", " + _headers.method,
          _headers,
          options
        );
        ipc_send(
          "ipc_log",
          "SEND >> " +
            index +
            ", " +
            _headers.method +
            ", " +
            _headers.reqId +
            ", " +
            _headers.token
        );
      }

      console.log("POST", _headers);
      var post_data = qs.stringify(_headers);
      options.headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": post_data.length
      };

      var results = "";
      var req = http.request(options, function(res) {
        res.on("data", function(chunk) {
          results = results + chunk;
        });
        res.on("end", function() {
          if (debugNet) {
            if (_headers.method !== "heartbeat") {
              ipc_send(
                "ipc_log",
                "RECV << " +
                  index +
                  ", " +
                  _headers.method +
                  ", " +
                  _headers.reqId +
                  ", " +
                  _headers.token
              );
              ipc_send(
                "ipc_log",
                "RECV << " +
                  index +
                  ", " +
                  _headers.method +
                  ", " +
                  results.slice(0, 100)
              );
              console.log(
                "RECV << " + index,
                _headers.method,
                _headers.method == "auth" ? results : results.slice(0, 500)
              );
            }
          }
          try {
            var parsedResult = null;
            try {
              parsedResult = JSON.parse(results);
            } catch (e) {
              ipc_send("popup", {
                text: `Error parsing response. (${_headers.method})`,
                time: 2000
              });
            }

            if (_headers.method == "get_status") {
              delete parsedResult.page;
              delete parsedResult.incidents;
              parsedResult.components.forEach(function(ob) {
                delete ob.id;
                delete ob.page_id;
                delete ob.group_id;
                delete ob.showcase;
                delete ob.description;
                delete ob.position;
                delete ob.created_at;
              });
              ipc_send("set_status", parsedResult);
            }
            if (_headers.method == "get_explore") {
              ipc_send("set_explore_decks", parsedResult);
            }
            if (_headers.method == "get_ladder_decks") {
              ipc_send("set_ladder_decks", parsedResult);
            }
            if (_headers.method == "get_ladder_traditional_decks") {
              ipc_send("set_ladder_traditional_decks", parsedResult);
            }
            if (parsedResult && parsedResult.ok) {
              if (_headers.method == "auth") {
                tokenAuth = parsedResult.token;

                ipc_send("auth", parsedResult);
                //ipc_send("auth", parsedResult.arenaids);
                if (rstore.get("settings").remember_me) {
                  rstore.set("token", tokenAuth);
                  rstore.set("email", playerData.userName);
                }
                playerData.patreon = parsedResult.patreon;
                playerData.patreon_tier = parsedResult.patreon_tier;

                let serverData = {
                  matches: [],
                  courses: [],
                  drafts: [],
                  economy: []
                };
                if (playerData.patreon) {
                  serverData.matches = parsedResult.matches;
                  serverData.courses = parsedResult.courses;
                  serverData.drafts = parsedResult.drafts;
                  serverData.economy = parsedResult.economy;
                }
                ipc_send("set_player_data", playerData);
                loadPlayerConfig(playerData.arenaId, serverData);
                ipc_send("set_discord_tag", parsedResult.discord_tag);
                beginSSE();
              }
              if (
                _headers.method == "tou_join" ||
                _headers.method == "tou_drop"
              ) {
                httpTournamentGet(parsedResult.id);
              }
              if (_headers.method == "get_top_decks") {
                ipc_send("set_explore", parsedResult.result);
              }
              if (_headers.method == "get_course") {
                ipc_send("open_course_deck", parsedResult.result);
              }
              if (_headers.method == "share_draft") {
                ipc_send("set_draft_link", parsedResult.url);
              }
              if (_headers.method == "home_get") {
                ipc_send("set_home", parsedResult);
              }
              if (_headers.method == "tou_get") {
                ipc_send("tou_set", parsedResult.result);
              }
              if (_headers.method == "tou_check") {
                //ipc_send("tou_set_game", parsedResult.result);
              }
              if (_headers.method == "get_sync") {
                syncUserData(parsedResult.data);
              }

              if (_headers.method == "get_database") {
                //resetLogLoop(100);
                metadataState = true;
                delete parsedResult.ok;
                setsList = parsedResult.sets;
                eventsList = parsedResult.events;
                eventsToFormat = parsedResult.events_format;
                ranked_events = parsedResult.ranked_events;
                cardsDb.set(parsedResult);
                ipc_send("popup", {
                  text: "Metadata: Ok",
                  time: 1000
                });
                ipc_send("set_db", results);
                ipc_send("show_login", true);
              }
            } else if (_headers.method == "tou_join") {
              ipc_send("popup", {
                text: parsedResult.error,
                time: 10000
              });
            } else if (_headers.method == "tou_check") {
              let notif = new Notification("MTG Arena Tool", {
                body: parsedResult.state
              });
              //ipc_send("popup", {"text": parsedResult.state, "time": 10000});
            } else if (
              parsedResult &&
              parsedResult.ok == false &&
              parsedResult.error != undefined
            ) {
              if (_headers.method == "share_draft") {
                ipc_send("popup", {
                  text: parsedResult.error,
                  time: 3000
                });
              }
              if (_headers.method == "auth") {
                tokenAuth = undefined;
                rstore.set("email", "");
                rstore.set("token", "");
                ipc_send("auth", {});
                ipc_send("clear_pwd", 1);
                ipc_send("popup", {
                  text: `Error: ${parsedResult.error}`,
                  time: 3000
                });
              }
              // errors here
            } else if (!parsedResult && _headers.method == "auth") {
              ipc_send("auth", {});
              ipc_send("popup", {
                text: "Something went wrong, please try again",
                time: 5000
              });
            }
          } catch (e) {
            console.error(e.message);
          }
          try {
            callback();
          } catch (e) {
            //
          }

          removeFromHttp(_headers.reqId);
          if (debugNet && _headers.method !== "heartbeat") {
            var str = "";
            httpAsync.forEach(function(h) {
              str += h.reqId + ", ";
            });
            ipc_send("ipc_log", "httpAsync: " + str);
          }
        });
      });
      req.on("error", function(e) {
        if (_headers.method == "get_database") {
          ipc_send("show_login", true);
        }
        console.error(`problem with request: ${e.message}`);
        if (!metadataState) {
          ipc_send("popup", {
            text: "Server unreachable, try offline mode.",
            time: 0
          });
        }

        callback(e);
        removeFromHttp(_headers.reqId);
        ipc_send("ipc_log", e.message);
      });
      req.write(post_data);
      console.log(req);
      req.end();
    },
    function(err) {
      if (err) {
        ipc_send("ipc_log", "httpBasic() Error: " + err.message);
      }
      // do it again
      setTimeout(function() {
        httpBasic();
      }, 250);
    }
  );
}

function removeFromHttp(req) {
  httpAsync.forEach(function(h, i) {
    if (h.reqId == req) {
      httpAsync.splice(i, 1);
    }
  });
}

function httpAuth(user, pass) {
  var _id = makeId(6);
  playerData.userName = user;
  httpAsync.push({
    reqId: _id,
    method: "auth",
    method_path: "/api/login.php",
    email: user,
    password: pass,
    playerid: playerData.arenaId,
    playername: encodeURIComponent(playerData.name),
    mtgaversion: playerData.arenaVersion,
    version: window.electron.remote.app.getVersion()
  });
}

function httpSubmitCourse(course) {
  var _id = makeId(6);
  if (store.get("settings").anon_explore == true) {
    course.PlayerId = "000000000000000";
    course.PlayerName = "Anonymous";
  }
  course.playerRank = playerData.rank.limited.rank;
  course = JSON.stringify(course);
  httpAsync.push({
    reqId: _id,
    method: "submit_course",
    method_path: "/api/send_course.php",
    course: course
  });
}

function httpSetPlayer() {
  // useless I think
  //var _id = makeId(6);
  //httpAsync.push({'reqId': _id, 'method': 'set_player', 'name': name, 'rank': rank, 'tier': tier});
}

function httpGetExplore(query, collection) {
  var _id = makeId(6);
  collection = JSON.stringify(collection);
  httpAsync.unshift({
    reqId: _id,
    method: "get_explore",
    method_path: "/api/get_explore.php",
    filter_wcc: query.filterWCC,
    filter_wcu: query.filterWCU,
    filter_wcr: query.filterWCR,
    filter_wcm: query.filterWCM,
    filter_owned: query.onlyOwned,
    filter_type: query.filterType,
    filter_event: query.filterEvent,
    filter_sort: query.filterSort,
    filter_sortdir: query.filterSortDir,
    filter_mana: query.filteredMana,
    filter_ranks: query.filteredranks,
    filter_skip: query.filterSkip,
    collection: collection
  });
}

function httpGetTopLadderDecks() {
  var _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "get_ladder_decks",
    method_path: "/top_ladder.json"
  });
}

function httpGetTopLadderTraditionalDecks() {
  var _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "get_ladder_traditional_decks",
    method_path: "/top_ladder_traditional.json"
  });
}

function httpGetCourse(courseId) {
  var _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "get_course",
    method_path: "/api/get_course.php",
    courseid: courseId
  });
}

function httpSetMatch(match) {
  var _id = makeId(6);
  match = JSON.stringify(match);
  httpAsync.push({
    reqId: _id,
    method: "set_match",
    method_path: "/api/send_match.php",
    match: match
  });
}

function httpSetDraft(draft) {
  var _id = makeId(6);
  draft = JSON.stringify(draft);
  httpAsync.push({
    reqId: _id,
    method: "set_draft",
    method_path: "/api/send_draft.php",
    draft: draft
  });
}

function httpSetEconomy(change) {
  var _id = makeId(6);
  change = JSON.stringify(change);
  httpAsync.push({
    reqId: _id,
    method: "set_economy",
    method_path: "/api/send_economy.php",
    change: change
  });
}

function httpDeleteData() {
  var _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "delete_data",
    method_path: "/api/delete_data.php"
  });
}

function httpGetDatabase() {
  var _id = makeId(6);
  ipc_send("popup", { text: "Downloading metadata", time: 0 });
  httpAsync.push({ reqId: _id, method: "get_database" });
}

function htttpGetStatus() {
  var _id = makeId(6);
  httpAsync.push({ reqId: _id, method: "get_status" });
}

function httpDraftShareLink(did, exp) {
  var _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "share_draft",
    method_path: "/api/get_share_draft.php",
    id: did,
    expire: exp
  });
}

function httpHomeGet(set) {
  var _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "home_get",
    set: set,
    method_path: "/api/get_home.php"
  });
}

function httpTournamentGet(tid) {
  var _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "tou_get",
    method_path: "/api/tournament_get.php",
    id: tid
  });
}

function httpTournamentJoin(tid, _deck, pass) {
  let _id = makeId(6);
  let deck = JSON.stringify(decks[_deck]);
  httpAsync.unshift({
    reqId: _id,
    method: "tou_join",
    method_path: "/api/tournament_join.php",
    id: tid,
    deck: deck,
    pass: pass
  });
}

function httpTournamentDrop(tid) {
  var _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "tou_drop",
    method_path: "/api/tournament_drop.php",
    id: tid
  });
}

function httpTournamentCheck(deck, opp, setCheck, bo3 = "", playFirst = "") {
  var _id = makeId(6);
  deck = JSON.stringify(deck);
  httpAsync.unshift({
    reqId: _id,
    method: "tou_check",
    method_path: "/api/check_match.php",
    deck: deck,
    opp: opp,
    setcheck: setCheck,
    bo3: bo3,
    play_first: playFirst
  });
}

function httpSetMythicRank(opp, rank) {
  var _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "mythicrank",
    method_path: "/api/send_mythic_rank.php",
    opp: opp,
    rank: rank
  });
}

function httpSetDeckTag(tag, cards, format) {
  var _id = makeId(6);
  cards.forEach(card => {
    card.quantity = 1;
  });
  cards = JSON.stringify(cards);
  httpAsync.push({
    reqId: _id,
    method: "set_deck_tag",
    method_path: "/api/send_deck_tag.php",
    tag: tag,
    cards: cards,
    format: format
  });
}

function httpSyncRequest(data) {
  var _id = makeId(6);
  data = JSON.stringify(data);
  httpAsync.push({
    reqId: _id,
    method: "get_sync",
    method_path: "/api/get_sync.php",
    data: data
  });
}

module.exports = {
  httpAuth,
  httpSubmitCourse,
  httpSetPlayer,
  httpGetExplore,
  httpGetTopLadderDecks,
  httpGetTopLadderTraditionalDecks,
  httpGetCourse,
  httpSetMatch,
  httpSetDraft,
  httpSetEconomy,
  httpDeleteData,
  httpGetDatabase,
  htttpGetStatus,
  httpHomeGet,
  httpDraftShareLink,
  httpTournamentGet,
  httpTournamentJoin,
  httpTournamentDrop,
  httpTournamentCheck,
  httpSetMythicRank,
  httpSetDeckTag,
  httpSyncRequest
};
