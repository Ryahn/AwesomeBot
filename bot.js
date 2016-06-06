try {
    // Get all the basic modules and files setup
    const Discord = require("discord.js");
    var configs = require("./data/config.json");
    const configDefaults = require("./defaults.json");
    var AuthDetails = require("./auth.json");
    var profileData = require("./data/profiles.json");
    var stats = require("./data/stats.json");
    var filter = require("./filter.json");
    var reminders = require("./data/reminders.json");
    var logs = require("./data/logs.json");
    const emotes = require("./emotes.json");
    const memes = require("./memes.json");
    const manga = require("./manga.json").manga;

    // Hijack spawn for auto-update to work properly
    (function() {
        var childProcess = require("child_process");
        childProcess.spawn = require("cross-spawn");
    })();

    // Misc. modules to make everything work
    var domainRoot = require("domain");
    var domain = domainRoot.create();
    var express = require("express");
    var bodyParser = require("body-parser");
    const writeFileAtomic = require("write-file-atomic");
    const youtube_node = require("youtube-node");
    const unirest = require("unirest");
    const request = require("request");
    const levenshtein = require("fast-levenshtein");
    const qs = require("querystring");
    const fs = require("fs");
    const Wiki = require("wikijs");
    const feed = require("feed-read");
    const mitsuku = require("mitsuku-api")();
    const convert = require("convert-units");
    const imgur = require("imgur-node-api");
    var wolfram;
    const urban = require("urban");
    const base64 = require("node-base64-image");
    const weather = require("weather-js");
    const fx = require("money");
    const cheerio = require("cheerio");
    const util = require("util");
    const vm = require("vm");
    const readline = require("readline");
    const searcher = require("google-search-scraper");
    const urlInfo = require("url-info-scraper");
    const itunes = require("searchitunes");
    const googl = require("goo.gl");
    const emoji = require("emoji-dictionary");
    const removeMd = require("remove-markdown");
    const mathjs = require("mathjs");
    const jokesearch = require("jokesearch");
    const bingTranslate = require("bing-translate").init({
        client_id: AuthDetails.microsoft_client_id,
        client_secret: AuthDetails.microsoft_client_secret
    });
    const xmlparser = require("xml-parser");
} catch(startError) {
    console.log("Failed to start: ");
    console.log(startError);
    console.log("Exiting...");
    process.exit(1);
}

/**

    TODO:
     - default extensions for throw, slash, rip, etc
     - awesome self host builder
     - extension builder in admin console
     - public extension gallery
     - interface for gallery outside of admin console

 */


// Bot setup
var version = "3.4-Alpha";
var outOfDate = 0;
var readyToGo = false;
var disconnects = 0;
var openedweb = false;

// Set up message counter
var messages = {};
var voice = {}; 

// Chatterbot setup
var bots = {};

// Active select menus
var selectmenu = {};

// Room command setup
var rooms = {};

// Spam/NSFW detection stuff
var spams = {};
var cools = {};
var cooldowns = {};
var filterviolations = {};

// Stuff for ongoing polls, giveaways, trivia games, reminders, and admin console sessions
var polls = {};
var giveaways = {};
var trivia = {};
var adminconsole = {};
var admintime = {};
var updateconsole = false;
var maintainerconsole = false
var onlineconsole = {};

// Stuff for voting and lotteries
var novoting = {};
var pointsball = 20;
var lottery = {};

// Set up webserver for online bot status, optimized for RedHat OpenShift deployment
var app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get("/data", function(req, res) {
    var data = {};
    
    if(req.query.section=="list" && req.query.type) {
        if(req.query.type=="servers") {
            data.stream = [];
            for(var i=0; i<bot.servers.length; i++) {
                data.stream.push([bot.servers[i].name, bot.servers[i].id]);
            }
            data.stream.sort(function(a, b) {
                a = a[0].toUpperCase();
                b = b[0].toUpperCase();
                return a < b ? -1 : a > b ? 1 : 0;
            });
        } else if(req.query.type=="members" && req.query.svrid) {
            var svr = bot.servers.get("id", req.query.svrid);
            if(svr) {
                if(configs.servers[svr.id].showsvr && configs.servers[svr.id].showpub) {
                    data.stream = [];
                    for(var i=0; i<svr.members.length; i++) {
                        if(svr.members[i].username && svr.members[i].id && svr.members[i].id!=bot.user.id) {
                            data.stream.push([svr.members[i].username + (svr.members[i].bot ? " [BOT]" : ""), svr.members[i].id, svr.detailsOfUser(svr.members[i]).nick]);
                        }
                    }
                    data.stream.sort(function(a, b) {
                        a = a[0].toUpperCase();
                        b = b[0].toUpperCase();
                        return a < b ? -1 : a > b ? 1 : 0;
                    });
                }
            }
        } else if(req.query.type=="logids") {
            data.stream = getLogIDs().sort(function(a, b) {
                if(a[0] && b[0]) {
                    a = a[0][1].toUpperCase();
                    b = b[0][1].toUpperCase();
                    return a < b ? -1 : a > b ? 1 : 0;
                } else if(a[0] && !b[0]) {
                    return 1;
                } else if(!a[0] && b[0]) {
                    return -1;
                } else {
                    a = a[1][1].toUpperCase();
                    b = b[1][1].toUpperCase();
                    return a < b ? -1 : a > b ? 1 : 0;
                }
            });
        } else if(req.query.type=="bot") {
            data = {
                username: bot.user.username,
                id: bot.user.id,
                oauthurl: "https://discordapp.com/oauth2/authorize?&client_id=" + AuthDetails.client_id + "&scope=bot&permissions=0",
                uptime: secondsToString(bot.uptime/1000),
                version: version,
                disconnects: disconnects,
                avatar: bot.user.avatarURL || "http://i.imgur.com/fU70HJK.png",
                servers: bot.servers.length,
                users: bot.users.length
            };
        }
    } else if(req.query.section=="stats" && req.query.type && req.query.svrid) {
        var svr = bot.servers.get("id", req.query.svrid);
        if(svr) {
            if(configs.servers[svr.id].showsvr && configs.servers[svr.id].showpub) {
                if(req.query.type=="profile" && req.query.usrid) {
                    var usr = svr.members.get("id", req.query.usrid);
                    if(usr) {
                        data = getProfile(usr, svr);
                    }
                } else if(req.query.type=="server") {
                    data = getStats(svr);
                    data.name = svr.name;
                    data.icon = svr.iconURL || "http://i.imgur.com/fU70HJK.png";
                }
            }
        }
    } else if(req.query.section=="servers" && ["svrnm", "messages", "members"].indexOf(req.query.sort)>-1) {
        data.stream = [];
        for(var i=0; i<bot.servers.length; i++) {
            if(configs.servers[bot.servers[i].id].showsvr) {
                var icon = bot.servers[i].iconURL || "http://i.imgur.com/fU70HJK.png";
                var name = bot.servers[i].name;
                var owner = bot.servers[i].owner.username;
                var ms = messages[bot.servers[i].id] || 0;
                var total = bot.servers[i].members.length;
                var online = bot.servers[i].members.getAll("status", "online").length;
                var idle = bot.servers[i].members.getAll("status", "idle").length;
                var listing = configs.servers[bot.servers[i].id].listing.enabled ? configs.servers[bot.servers[i].id].listing : {enabled: false};
                data.stream.push([icon, name, owner, ms, total + " total, " + online + " online, " + idle + " idle", listing]);
            }
        }
        data.stream.sort(function(a, b) {
            if(req.query.sort=="svrnm") {
                a = a[1].toUpperCase();
                b = b[1].toUpperCase();
                return a < b ? -1 : a > b ? 1 : 0;
            }
            if(req.query.sort=="messages") {
                return b[3] - a[3];
            }
            if(req.query.sort=="members") {
                return parseInt(b[4].substring(0, b[4].indexOf(" "))) - parseInt(a[4].substring(0, a[4].indexOf(" ")));
            }
        });
    } else if(req.query.section=="log") {
        var id = [null, "null", undefined, "undefined"].indexOf(req.query.id)>-1 ? null : decodeURI(req.query.id);
        var level = [null, "null", undefined, "undefined"].indexOf(req.query.level)>-1 ? null : decodeURI(req.query.level);
        var logList = getLog(id, level);
        data.stream = logList;
    } else if(req.query.auth) {
        data = getOnlineConsole(req.query.auth);
        
        if(req.query.type=="maintainer" && Object.keys(data).length>0) {
            var consoleid = data.usrid.slice(0);
            clearTimeout(onlineconsole[data.usrid].timer);
            onlineconsole[data.usrid].timer = setTimeout(function() {
                logMsg(new Date().getTime(), "INFO", "General", null, "Timeout on online maintainer console");
                delete onlineconsole[consoleid];
            }, 300000);
            
            var servers = [];
            for(var i=0; i<bot.servers.length; i++) {
                var channels = [];
                for(var j=0; j<bot.servers[i].channels.length; j++) {
                    if(!(bot.servers[i].channels[j] instanceof Discord.VoiceChannel)) {
                        channels.push([bot.servers[i].channels[j].name, bot.servers[i].channels[j].id, bot.servers[i].channels[j].position]);
                    }
                }
                channels.sort(function(a, b) {
                    return a[2] - b[2];
                });
                servers.push([bot.servers[i].iconURL || "http://i.imgur.com/fU70HJK.png", bot.servers[i].name, bot.servers[i].id, "@" + bot.servers[i].owner.username, channels]);
            }
            servers.sort(function(a, b) {
                a = a[1].toUpperCase();
                b = b[1].toUpperCase();
                return a < b ? -1 : a > b ? 1 : 0;
            });
            
            var userList = [];
            for(var i=0; i<bot.users.length; i++) {
                if([bot.user.id, configs.maintainer].indexOf(bot.users[i].id)==-1 && bot.users[i].username && bot.users[i].id) {
                    userList.push([bot.users[i].username + (bot.users[i].bot ? " [BOT]" : ""), bot.users[i].id, profileData[bot.users[i].id] ? profileData[bot.users[i].id].points : 0]);
                }
            }
            userList.sort(function(a, b) {
                a = a[0].toUpperCase();
                b = b[0].toUpperCase();
                return a < b ? -1 : a > b ? 1 : 0;
            });
            
            var blockedUsers = [];
            for(var i=0; i<configs.botblocked.length; i++) {
                var usr = bot.users.get("id", configs.botblocked[i]);
                if(usr && usr.username) {
                    blockedUsers.push([usr.avatarURL || "http://i.imgur.com/fU70HJK.png", usr.username + (usr.bot ? " [BOT]" : ""), usr.id]);
                }
            }
            blockedUsers.sort(function(a, b) {
                a = a[1].toUpperCase();
                b = b[1].toUpperCase();
                return a < b ? -1 : a > b ? 1 : 0;
            });
            
            data = {
                maintainer: bot.users.get("id", configs.maintainer) ? bot.users.get("id", configs.maintainer).username : null,
                pmforward: configs.pmforward,
                commandusage: totalCommandUsage(),
                statsage: prettyDate(new Date(stats.timestamp)),
                username: bot.user.username,
                oauthurl: "https://discordapp.com/oauth2/authorize?&client_id=" + AuthDetails.client_id + "&scope=bot&permissions=0",
                avatar: bot.user.avatarURL || "http://i.imgur.com/fU70HJK.png",
                game: getGame(bot.user),
                defaultgame: configs.game=="default",
                status: bot.user.status,
                members: userList,
                botblocked: blockedUsers,
                servers: servers
            };
        } else if(req.query.type=="admin" && Object.keys(data).length>0) {
            var consoleid = data.usrid.slice(0);
            var svr = bot.servers.get("id", data.svrid);
            if(svr) {
                clearTimeout(onlineconsole[data.usrid].timer);
                var consoleid = data.usrid.slice(0);
                onlineconsole[data.usrid].timer = setTimeout(function() {
                    logMsg(new Date().getTime(), "INFO", null, consoleid, "Timeout on online admin console for " + svr.name);
                    delete adminconsole[consoleid];
                    delete onlineconsole[consoleid];
                }, 300000);
                data = {};
                
                var channels = [];
                for(var i=0; i<svr.channels.length; i++) {
                    if(!(svr.channels[i] instanceof Discord.VoiceChannel)) {
                        channels.push([svr.channels[i].name, svr.channels[i].id, svr.channels[i].position]);
                    }
                }
                channels.sort(function(a, b) {
                    return a[2] - b[2];
                });
                
                var roles = [];
                for(var i=0; i<svr.roles.length; i++) {
                    if(svr.roles[i].name!="@everyone" && svr.roles[i].name.indexOf("color-")!=0) {
                        roles.push([svr.roles[i].name, svr.roles[i].id, svr.roles[i].position, svr.roles[i].colorAsHex()]);
                    }
                }
                roles.sort(function(a, b) {
                    return a[2] - b[2];
                });
                
                var members = [];
                for(var i=0; i<svr.members.length; i++) {
                    if(configs.botblocked.indexOf(svr.members[i].id)==-1 && svr.members[i].id!=bot.user.id && svr.members[i].username && svr.members[i].id) {
                        members.push([svr.members[i].username + (svr.members[i].bot ? " [BOT]" : ""), svr.members[i].id, svr.detailsOfUser(svr.members[i]).nick]);
                    }
                }
                members.sort(function(a, b) {
                    a = a[0].toUpperCase();
                    b = b[0].toUpperCase();
                    return a < b ? -1 : a > b ? 1 : 0;
                });
                
                var currentConfig = {};
                for(var key in configs.servers[svr.id]) {
                    if(["admins", "blocked"].indexOf(key)>-1) {
                        currentConfig[key] = [];
                        for(var i=0; i<configs.servers[svr.id][key].length; i++) {
                            var usr = svr.members.get("id", configs.servers[svr.id][key][i]);
                            if(usr && configs.botblocked.indexOf(usr.id)==-1) {
                                currentConfig[key].push([usr.avatarURL || "http://i.imgur.com/fU70HJK.png", usr.username + (usr.bot ? " [BOT]" : ""), usr.id, false, checkUserMute(usr, svr)]);
                            }
                        }
                        if(key=="blocked") {
                            for(var i=0; i<configs.botblocked.length; i++) {
                                var usr = svr.members.get("id", configs.botblocked[i]);
                                if(usr && usr.username) {
                                    currentConfig[key].push([usr.avatarURL || "http://i.imgur.com/fU70HJK.png", usr.username + (usr.bot ? " [BOT]" : "") + " (global)", usr.id, true, checkUserMute(usr, svr)]);
                                }
                            }
                        }
                        currentConfig[key].sort(function(a, b) {
                            a = a[1].toUpperCase();
                            b = b[1].toUpperCase();
                            return a < b ? -1 : a > b ? 1 : 0;
                        });
                    } else if(key=="rankslist") {
                        currentConfig[key] = [];
                        for(var i=0; i<configs.servers[svr.id].rankslist.length; i++) {
                            var role = svr.roles.get("id", configs.servers[svr.id].rankslist[i].role);
                            currentConfig[key].push([configs.servers[svr.id].rankslist[i].name, configs.servers[svr.id].rankslist[i].max, role ? [role.name, role.colorAsHex()] : null, getMembersWithRank(svr, configs.servers[svr.id].rankslist[i]).length]);
                        }
                    } else if(key=="translated") {
                        currentConfig[key] = [];
                        for(var i=0; i<configs.servers[svr.id][key].list.length; i++) {
                            var usr = svr.members.get("id", configs.servers[svr.id][key].list[i]);
                            var channels = "";
                            for(var j=0; j<configs.servers[svr.id][key].channels[i].length; j++) {
                                var ch = svr.channels.get("id", configs.servers[svr.id][key].channels[i][j]);
                                if(ch) {
                                    channels += (channels.length==0 ? "" : ", ") + "#" + ch.name;
                                }
                            }
                            if(usr && configs.botblocked.indexOf(usr.id)==-1) {
                                currentConfig[key].push([usr.avatarURL || "http://i.imgur.com/fU70HJK.png", usr.username + (usr.bot ? " [BOT]" : ""), usr.id, configs.servers[svr.id][key].langs[i], channels]);
                            }
                        }
                        currentConfig[key].sort(function(a, b) {
                            a = a[1].toUpperCase();
                            b = b[1].toUpperCase();
                            return a < b ? -1 : a > b ? 1 : 0;
                        });
                    } else if(key=="triviasets") {
                        currentConfig[key] = [];
                        for(var tset in configs.servers[svr.id][key]) {
                            currentConfig[key].push([tset, configs.servers[svr.id][key][tset].length, configs.servers[svr.id][key][tset]]);
                        }
                        currentConfig[key].sort(function(a, b) {
                            a = a[0].toUpperCase();
                            b = b[0].toUpperCase();
                            return a < b ? -1 : a > b ? 1 : 0;
                        });
                    } else if(key=="extensions") {
                        currentConfig[key] = [];
                        for(var ext in configs.servers[svr.id][key]) {
                            currentConfig[key].push([ext, configs.servers[svr.id][key][ext].type, configs.servers[svr.id][key][ext].channels, configs.servers[svr.id][key][ext].process]);
                        }
                        currentConfig[key].sort(function(a, b) {
                            a = a[0].toUpperCase();
                            b = b[0].toUpperCase();
                            return a < b ? -1 : a > b ? 1 : 0;
                        });
                    } else if(["tags", "muted", "countdowns"].indexOf(key)==-1) {
                        currentConfig[key] = configs.servers[svr.id][key];
                    }
                }
                
                var strikeList = [];
                for(var usrid in stats[svr.id].members) {
                    if(stats[svr.id].members[usrid].strikes.length>0) {
                        var usr = bot.users.get("id", usrid);
                        if(usr) {
                            var s = [];
                            for(var i=0; i<stats[svr.id].members[usrid].strikes.length; i++) {
                                var m = svr.members.get("id", stats[svr.id].members[usrid].strikes[i][0]);
                                s.push([m ? (m.username + (m.bot ? " [BOT]" : "")) : stats[svr.id].members[usrid].strikes[i][0], stats[svr.id].members[usrid].strikes[i][1], stats[svr.id].members[usrid].strikes[i][2] ? prettyDate(new Date(stats[svr.id].members[usrid].strikes[i][2])) : "Unknown"]);
                            }
                            strikeList.push([usr.id, usr.avatarURL || "http://i.imgur.com/fU70HJK.png", usr.username, s]);
                        }
                    }
                }
                strikeList.sort(function(a, b) {
                    return a[3].length - b[3].length;
                });
                
                var closepolls = [];
                for(var usrid in polls) {
                    var usr = svr.members.get("id", usrid);
                    var ch = svr.channels.get("id", polls[usrid].channel);
                    if(polls[usrid].open && usr && ch) {
                        closepolls.push([usrid, "\"" + polls[usrid].title + "\" in #" + ch.name + " by @" + usr.username + " with " + polls[usrid].responses.length + " response" + (polls[usrid].responses.length==1 ? "" : "s") + ", started " + secondsToString((new Date().getTime() - polls[usrid].timestamp)/1000) + "ago"]);
                    }
                }
                
                var endtrivia = [];
                for(var chid in trivia) {
                    ch = svr.channels.get("id", chid);
                    if(ch) {
                        endtrivia.push([chid, "Game in #" + ch.name + " with " + (trivia[chid].tset || "default") + " set and current score " + trivia[chid].score + " out of " + (trivia[chid].possible==1 ? trivia[chid].possible : (trivia[chid].possible-1))]);
                    }
                }

                var endgiveaways = [];
                for(var usrid in giveaways) {
                    var usr = svr.members.get("id", usrid);
                    var ch = svr.channels.get("id", polls[usrid].channel);
                    if(usr && ch) {
                        endgiveaways.push([usrid, "<code>" + giveaways[usrid].name + "</code> started by @" + usr.username + " with " + giveaways[usrid].enrolled.length + " member" + (giveaways[usrid].enrolled.length==1 ? "" : "s") + " enrolled"]);
                    }
                }
                
                data = {
                    botnm: (svr.detailsOfUser(bot.user).nick || bot.user.username),
                    usrid: consoleid,
                    svrid: svr.id,
                    svrnm: svr.name,
                    joined: secondsToString((new Date() - new Date(svr.detailsOfUser(bot.user).joinedAt)) / 1000),
                    svricon: svr.iconURL || "http://i.imgur.com/fU70HJK.png",
                    channels: channels, 
                    roles: roles,
                    members: members,
                    configs: currentConfig,
                    strikes: strikeList,
                    polls: closepolls,
                    trivia: endtrivia,
                    giveaways: endgiveaways
                };
            } else {
                data = {};
            }
        } else if(req.query.type) {
            data = {};
        }
    }
    
    res.json(data);
});

app.get("/", function(req, res) {
    var html = fs.readFileSync("./web/index.html");
    res.writeHead(200, {"Content-Type": "text/html"});
    res.end(html);
});

app.get("/maintainer", function(req, res) {
    var html = fs.readFileSync("./web/maintainer.html");
    res.writeHead(200, {"Content-Type": "text/html"});
    res.end(html);
});

app.get("/admin", function(req, res) {
    var html = fs.readFileSync("./web/admin.html");
    res.writeHead(200, {"Content-Type": "text/html"});
    res.end(html);
});

app.use(express.static("web"));

app.post("/config", function(req, res) {
    if(req.query.auth && req.query.type) {
        var data = getOnlineConsole(req.query.auth);
        if(Object.keys(data).length>0 || req.body.logout) {
            var consoleid = data.usrid.slice(0);
            clearTimeout(onlineconsole[consoleid].timer);
            
            if(req.query.type=="maintainer") {
                onlineconsole[consoleid].timer = setTimeout(function() {
                    logMsg(new Date().getTime(), "INFO", "General", null, "Timeout on online maintainer console");
                    delete onlineconsole[consoleid];
                }, 300000);
                
                parseMaintainerConfig(req.body, consoleid, function(err) {
                    res.sendStatus(err ? 400 : 200);
                });
            } else if(req.query.type=="admin" && req.query.svrid && req.query.usrid) {
                onlineconsole[consoleid].timer = setTimeout(function() {
                    logMsg(new Date().getTime(), "INFO", null, consoleid, "Timeout on online admin console for " + svr.name);
                    delete adminconsole[consoleid];
                    delete onlineconsole[consoleid];
                }, 300000);
                
                svr = bot.servers.get("id", req.query.svrid);
                if(svr) {
                    parseAdminConfig(req.body, svr, req.query.usrid, function(err) {
                        res.sendStatus(err ? 400 : 200);
                    });
                } else {
                    res.sendStatus(400);
                }
            }
        } else {
            res.sendStatus(401);
        }
    } else {
        res.sendStatus(400);
    }
});

app.get("/archive", function(req, res) {
    if(Object.keys(getOnlineConsole(req.query.auth)).length>0) {
        if(req.query.type=="admin" && req.query.svrid && req.query.chid && req.query.num) {
            var svr = bot.servers.get("id", req.query.svrid)
            if(svr) {
                var ch = svr.channels.get("id", req.query.chid);
                if(ch && !isNaN(req.query.num)) {
                    archiveMessages(ch, parseInt(req.query.num), function(err, archive) {
                        if(err) {
                            res.json({});
                        } else {
                            res.json(archive);
                        }
                    });
                } else {
                    res.json({});
                }
            } else {
                res.json({});
            }
        }
    }
});

app.get("/file", function(req, res) {
    var c = getOnlineConsole(req.query.auth);
    if(c && req.query.type) {
        if(c.type=="maintainer" && ["stats", "logs", "reminders", "profiles", "config"].indexOf(req.query.type.toLowerCase())>-1) {
            res.sendFile(__dirname + "/data/" + req.query.type + ".json");
        }
    }
});

// List of bot commands along with usage and process for each
var commands = {
    // Eval for maintainer only
    "eval": {
        process: function(bot, msg, suffix) {
            if(msg.author.id==configs.maintainer) {
                if(suffix) {
                    try {
                        bot.sendMessage(msg.channel, "```" + eval(suffix) + "```");
                    } catch(err) {
                        bot.sendMessage(msg.channel, "```" + err + "```");
                    }
                }
            } else {
                bot.sendMessage(msg.channel, msg.author + " Who do you think you are?! LOL");
            }
        }
    },
    // Checks if bot is alive and shows version and uptime
    "ping": {
        process: function(bot, msg) {
            var info = "Pong! " + (msg.channel.server.detailsOfUser(bot.user).nick || bot.user.username) + " v" + version + " by **@BitQuote** running for " + secondsToString(bot.uptime/1000).slice(0, -1) + ". Serving in " + bot.servers.length + " server" + (bot.servers.length==1 ? "" : "s") + " and " + bot.users.length + " user" + (bot.users.length==1 ? "" : "s");
            if(configs.hosting!="") {
                info += ". Status: " + configs.hosting;
            }
            bot.sendMessage(msg.channel, info);
        }
    },
    // Provides OAuth URL for adding new server
    "join": {
        process: function(bot, msg) {
            bot.sendMessage(msg.channel, "https://discordapp.com/oauth2/authorize?&client_id=" + AuthDetails.client_id + "&scope=bot&permissions=0");
        }
    },
    // About AwesomeBot!
    "about": {
        usage: "[<\"bug\" or \"suggestion\">]",
        process: function(bot, msg, suffix) {
            if(["bug", "suggestion", "feature", "issue"].indexOf(suffix.toLowerCase())>-1) {
                bot.sendMessage(msg.channel, "Please file your " + suffix.toLowerCase() + " here: https://github.com/BitQuote/AwesomeBot/issues/new");
            } else {
                bot.sendMessage(msg.channel, "Use `" + getPrefix(msg.channel.server) + "help` to list commands. Created by **@BitQuote**. Built on NodeJS with DiscordJS. Go to http://awesomebot.xyz to learn more, or join http://discord.awesomebot.xyz/\n\n*This project is in no way affiliated with Alphabet, Inc., who does not own or endorse this product.*");
            }
        }
    },
    // Gets info for this server
    "info": {
        process: function(bot, msg) {
            bot.sendMessage(msg.channel, "__" + msg.channel.server.name + "__\n**ID:** " + msg.channel.server.id + "\n**Owner:** @" + getName(msg.channel.server, msg.channel.server.owner) + "\n**Members:** " + msg.channel.server.members.length + "\n**Icon:** " + (msg.channel.server.iconURL || "None"), function() {
                bot.sendMessage(msg.channel, "**Command Prefix:** " + (configs.servers[msg.channel.server.id].cmdtag=="tag" ? ("@" + (msg.channel.server.detailsOfUser(bot.user).nick || bot.user.username)) : configs.servers[msg.channel.server.id].cmdtag) + "\n**Messages:** " + messages[msg.channel.server.id] + (configs.servers[msg.channel.server.id].listing.enabled ? ("\n**Invite:** " + configs.servers[msg.channel.server.id].listing.invite + "\n**Description:** " + removeMd(configs.servers[msg.channel.server.id].listing.description)) : ""));
            });
        }
    },
    // Shows top 5 games and active members
    "stats": {
        usage: "[clear]",
        process: function(bot, msg, suffix) {
            if(!stats[msg.channel.server.id]) {
                logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to read stats");
                bot.sendMessage(msg.channel, "Somehow, some way, I don't have any stats for this server :worried:");
                return;
            }
            
            var data = getStats(msg.channel.server);
            var info = "**" + msg.channel.server.name + " (this week)**"
            for(var cat in data) {
                info += "\n__" + cat + "__:" + (cat=="Data since" ? (" " + data[cat]) : "");
                if(cat!="Data since") {
                    for(var i=0; i<data[cat].length; i++) {
                        info += "\n\t" + data[cat][i];
                    }
                }
            }
            bot.sendMessage(msg.channel, info);
            
            if(suffix.toLowerCase()=="clear" && configs.servers[msg.channel.server.id].admins.indexOf(msg.author.id)>-1) {
                stats.timestamp = new Date().getTime();
                clearServerStats(msg.channel.server.id);
                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Cleared stats for at admin's request");
            }
        }
    },
    // Admin-only todo list
    "list": {
        usage: "[<new entry, \"done\", or \"remove\">] [<no. to finish or remove>]",
        process: function(bot, msg, suffix) {
            if(!suffix) {
                var info = "";
                for(var i=0; i<configs.servers[msg.channel.server.id].listsrc.length; i++) {
                    info += "[" + (configs.servers[msg.channel.server.id].listsrc[i][0] ? "x" : "  ") + "] " + configs.servers[msg.channel.server.id].listsrc[i][1] + "\n";
                }
                if(!info) {
                    info = "There's nothing in the list. Add something with `" + getPrefix(msg.channel.server) + "list <new entry>`";
                }
                bot.sendMessage(msg.channel, info);
                return;
            } else if(suffix.toLowerCase().indexOf("done ")==0 && suffix.length>5 && !isNaN(suffix.substring(suffix.indexOf(" ")+1)) && parseInt(suffix.substring(suffix.indexOf(" ")+1))<configs.servers[msg.channel.server.id].listsrc.length) {
                configs.servers[msg.channel.server.id].listsrc[parseInt(suffix.substring(suffix.indexOf(" ")+1))][0] = true;
                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Marked item " + suffix.substring(suffix.indexOf(" ")+1) + " in list as done");
                bot.sendMessage(msg.channel, "Got it!");
            } else if(suffix.toLowerCase().indexOf("remove ")==0 && suffix.length>7 && !isNaN(suffix.substring(suffix.indexOf(" ")+1)) && parseInt(suffix.substring(suffix.indexOf(" ")+1))<configs.servers[msg.channel.server.id].listsrc.length) {
                configs.servers[msg.channel.server.id].listsrc.splice(parseInt(suffix.substring(suffix.indexOf(" ")+1)), 1);
                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Removed item " + suffix.substring(suffix.indexOf(" ")+1) + " from list");
                bot.sendMessage(msg.channel, "Removed!");
            } else {
                configs.servers[msg.channel.server.id].listsrc.push([false, suffix]);
                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Added item '" + suffix + "' to list");
                bot.sendMessage(msg.channel, "Added!");
            }
            saveData("./data/config.json", function(err) {
                if(err) {
                    logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save updated list for " + msg.channel.server.name);
                }
            });
        }
    },
    // Performs a calculation
    "calc": {
        usage: "<expression>",
        process: function(bot, msg, suffix) {
            if(suffix) {
                try {
                    bot.sendMessage(msg.channel, "```" + mathjs.eval(suffix) + "```");
                } catch(err) {
                    bot.sendMessage(msg.channel, "```" + err + "```");
                }
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Calc expresison not provided");
                bot.sendMessage(msg.channel, msg.author + " :rolling_eyes:");
            }
        }
    },
    // Sets a countdown for an event
    "countdown": {
        usage: "<time from now>|<event name>",
        process: function(bot, msg, suffix) {
            if(suffix) {
                if(suffix.indexOf("|")>0 && suffix.length>=3) {
                    var time = parseTime(suffix.substring(0, suffix.indexOf("|")));
                    var event = suffix.substring(suffix.indexOf("|")+1).toLowerCase().trim();
                    if(!time) {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Invalid time provided for countdown");
                        bot.sendMessage(msg.channel, msg.author + " That's not a valid time. Use the syntax `<no.> <\"s\", \"m\", \"h\", or \"d\">`");
                    } else if(configs.servers[msg.channel.server.id].countdowns[event]) {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " tried to overwrite a countdown");
                        bot.sendMessage(msg.channel, msg.author + " A countdown called `" + suffix.substring(suffix.indexOf("|")+1) + "` already exists. Try a different name.");
                    } else {
                        var timestamp = new Date().getTime() + time.countdown;
                        configs.servers[msg.channel.server.id].countdowns[event] = {
                            timestamp: timestamp,
                            chid: msg.channel.id,
                            name: suffix.substring(suffix.indexOf("|")+1)
                        };
                        setTimeout(function() {
                            if(stats[msg.channel.server.id].botOn[msg.channel.id]) {
                                bot.sendMessage(msg.channel, "3...2...1...**" + suffix.substring(suffix.indexOf("|")+1) + "**");
                                delete configs.servers[msg.channel.server.id].countdowns[event];
                                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Countdown " + event + " expired");
                            }
                        }, time.countdown);
                        bot.sendMessage(msg.channel, "I gotchu bro, countdown set to expire at " + prettyDate(new Date(timestamp)));
                        saveData("./data/config.json", function(err) {
                            if(err) {
                                logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save updated configs for " + msg.channel.server.name);
                            }
                        });
                    }
                } else {
                    if(configs.servers[msg.channel.server.id].countdowns[suffix.toLowerCase()]) {
                        bot.sendMessage(msg.channel, "**" + configs.servers[msg.channel.server.id].countdowns[suffix.toLowerCase()].name + "** set to expire in " + secondsToString((configs.servers[msg.channel.server.id].countdowns[suffix.toLowerCase()].timestamp - new Date().getTime()) / 1000));
                    } else {
                        var info = "Select from one of the following:";
                        var options = [];
                        var count = 0;
                        for(var event in configs.servers[msg.channel.server.id].countdowns) {
                            info += "\n\t" + count + ") " + configs.servers[msg.channel.server.id].countdowns[event].name;
                            options.push(event);
                            count++;
                        }
                        bot.sendMessage(msg.channel, options.length==0 ? ("No countdowns have been started. Use `" + getPrefix(msg.channel.server) + "countdown <time from now>|<event name>` to start one.") : info);
                        if(options.length>0) {
                            selectMenu(msg.channel, msg.author.id, function(i) {
                                bot.sendMessage(msg.channel, "**" + configs.servers[msg.channel.server.id].countdowns[options[i]].name + "** set to expire in " + secondsToString((configs.servers[msg.channel.server.id].countdowns[options[i]].timestamp - new Date().getTime()) / 1000));
                            }, count-1);
                        }
                    }
                }
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Invalid countdown parameters provided");
                bot.sendMessage(msg.channel, "Huh?");
            }
        }
    },
    // Finds the time in a city
    "time": {
        usage: "<city>",
        process: function(bot, msg, suffix) {
            var location = suffix;
            if(suffix.indexOf("in ")==0) {
                location = suffix.substring(3);
            }
            if(!location) {
                bot.sendMessage(msg.channel, "It's " + prettyDate(new Date()) + " for me");
                return;
            }
            unirest.get("http://maps.googleapis.com/maps/api/geocode/json?address=" + encodeURI(location.replace(/&/g, '')))
            .header("Accept", "application/json")
            .end(function(result) {
                if(result.status==200 && result.body.results.length>0) {
                    location = result.body.results[0].formatted_address;
                    unirest.get("https://maps.googleapis.com/maps/api/timezone/json?location=" + result.body.results[0].geometry.location.lat + "," + result.body.results[0].geometry.location.lng + "&timestamp=865871421&sensor=false")
                    .header("Accept", "application/json")
                    .end(function(result) {
                        var date = new Date(new Date().getTime() + (parseInt(result.body.rawOffset) * 1000) + (parseInt(result.body.dstOffset) * 1000));
                        bot.sendMessage(msg.channel, "It's " + prettyDate(date).slice(0, -4) + " in " + location + " (" + result.body.timeZoneName + ")");
                    });
                } else {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Invalid timezone city provided");
                    bot.sendMessage(msg.channel, msg.author + " A little birdie told me that place doesn't exist ;)");
                }
            });
        }
    },
    // Fetches a large emoji
    "emoji": {
        usage: "<emoji or name>",
        process: function(bot, msg, suffix) {
            if(!suffix || (!emoji.getName(suffix) && emoji.names.indexOf(suffix.toLowerCase())==-1)) {
                bot.sendFile(msg.channel, "http://emoji.fileformat.info/gemoji/tired_face.png");
            } else if(emoji.names.indexOf(suffix.toLowerCase())>-1) {
                bot.sendFile(msg.channel, "http://emoji.fileformat.info/gemoji/" + suffix.toLowerCase() + ".png", function(err) {
                    bot.sendFile(msg.channel, "http://emoji.fileformat.info/gemoji/tired_face.png");
                });
            } else {
                bot.sendFile(msg.channel, "http://emoji.fileformat.info/gemoji/" + emoji.getName(suffix) + ".png", function(err) {
                    bot.sendFile(msg.channel, "http://emoji.fileformat.info/gemoji/tired_face.png");
                });
            }
        }
    },
    // Generates a dank new meme
    "meme": {
        usage: "<image name>|<top text>|<bottom text>",
        process: function(bot, msg, suffix) {
            if(suffix && suffix.split("|").length==3) {
                var name = suffix.split("|")[0];
                var top = suffix.split("|")[1];
                var bottom = suffix.split("|")[2];
                if(!name || !top || !bottom) {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " did not provide proper syntax for meme");
                    bot.sendMessage(msg.channel, "http://i.imgur.com/IHqy8l6.jpg");
                } else {
                    var found = false;
                    for(var i=0; i<memes.length; i++) {
                        if(levenshtein.get(name.toLowerCase(), memes[i].toLowerCase())<3) {
                            name = memes[i];
                            found = true;
                            break;
                        }
                    }
                    if(found) {
                        var url = "http://apimeme.com/meme?meme=" + encodeURI(name.replace(/&/g, '')) + "&top=" + encodeURI(top.replace(/&/g, '')) + "&bottom=" + encodeURI(bottom.replace(/&/g, ''));
                        base64.encode(url, {filename: "meme.jpg"}, function(error, image) {
                            if(!error) {
                                bot.sendFile(msg.channel, image);
                            } else {
                                bot.sendMessage(msg.channel, url);
                            }
                        });
                    } else {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Meme '" + name + "' not found");
                        bot.sendMessage(msg.channel, "http://i.imgur.com/theaeKM.png");
                    }
                }
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " did not provide proper syntax for meme");
                bot.sendMessage(msg.channel, "http://i.imgur.com/5VKP1Yj.gifv");
            }
        }
    },
    // Searches anime
    "anime": {
        usage: "<query> [<count>]",
        process: function(bot, msg, suffix) {
            if(suffix) {
                var query = suffix.substring(0, suffix.lastIndexOf(" "));
                var count = parseInt(suffix.substring(suffix.lastIndexOf(" ")+1));

                if(query=="" || !query || isNaN(count)) {
                    query = suffix;
                    count = configs.servers[msg.channel.server.id].defaultcount;
                }
                if(count<1 || count>configs.servers[msg.channel.server.id].maxcount) {
                    count = configs.servers[msg.channel.server.id].defaultcount;
                }
                unirest.get("http://hummingbird.me/api/v1/search/anime?query=" + encodeURI(query.replace(/&/g, '')))
                .header("Accept", "application/json")
                .end(function(result) {
                    if(result.status==200 && result.body.length>0) {
                        var results = [];
                        for(var i=0; i<count; i++) {
                            if(i>=result.body.length) {
                                break;
                            }
                            var info = "__**" + result.body[i].title + "**__```" + result.body[i].synopsis + "```**Status:** " + result.body[i].status + "\n**Episodes:** " + result.body[i].episode_count + "\n**Length:** " + result.body[i].episode_length + " minutes" + (result.body[i].age_rating ? ("\n**Age Rating:** " + result.body[i].age_rating) : "") + "\n**Type:** " + result.body[i].show_type + "\n**Rating:** " + (Math.round(result.body[i].community_rating * 10)/10) + "\n**Genres:**";
                            for(var j=0; j<result.body[i].genres.length; j++) {
                                info += "\n\t" + result.body[i].genres[j].name;
                            }
                            info += (result.body[i].started_airing ? ("\n**Started Airing:** " + result.body[i].started_airing) : "") + (result.body[i].finished_airing ? ("\n**Finished Airing:** " + result.body[i].finished_airing) : "") + "\n" + result.body[i].url;
                            results.push(info);
                        }
                        var select = selectMenu(msg.channel, msg.author.id, function(i) {
                            bot.sendMessage(msg.channel, results[i]);
                        }, results.length-1);
                        if(select) {
                            var info = "Select one of the following:\n";
                            for(var i=0; i<results.length; i++) {
                                info += "\t" + i + ") " + results[i].substring(4, results[i].substring(4).indexOf("**")) + "\n";
                            }
                            bot.sendMessage(msg.channel, info);
                        } else {
                            sendArray(msg.channel, results);
                        }
                    } else {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "No anime found for '" + query + "'");
                        bot.sendMessage(msg.channel, "Nope, no anime found.");
                    }
                });
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "No anime search parameters");
                bot.sendMessage(msg.channel, msg.author + " Empty anime? Is that what you want?");
            }
        }
    },
    // Searches manga
    "manga": {
        usage: "<query> [<count>]",
        process: function(bot, msg, suffix) {
            if(suffix) {
                var query = suffix.substring(0, suffix.lastIndexOf(" "));
                var count = parseInt(suffix.substring(suffix.lastIndexOf(" ")+1));

                if(query=="" || !query || isNaN(count)) {
                    query = suffix;
                    count = configs.servers[msg.channel.server.id].defaultcount;
                }
                if(count<1 || count>configs.servers[msg.channel.server.id].maxcount) {
                    count = configs.servers[msg.channel.server.id].defaultcount;
                }

                var results = [];
                for(var i=0; i<manga.length; i++) {
                    if(results.length>=count) {
                        break;
                    }
                    if(manga[i].t.toLowerCase().indexOf(query.toLowerCase())>-1) {
                        results.push([manga[i].t, manga[i].i]);
                    }
                }
                if(results.length==0) {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "No manga found for '" + query + "'");
                    bot.sendMessage(msg.channel, "Nope, no manga found.");
                } else {
                    selectMenu(msg.channel, msg.author.id, function(i) {
                        unirest.get("https://www.mangaeden.com/api/manga/" + results[i][1])
                        .header("Accept", "application/json")
                        .end(function(result) {
                            if(result.status==200) {
                                bot.sendMessage(msg.channel, "__**" + result.body.title + "**__```" + result.body.description.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;") + "```**Chapters:** " + result.body.chapters_len + "\n**Author:** " + result.body.author + "\n**Artist:** " + result.body.artist + "\n**Released:** " + result.body.released + "\n**Genres:**\n\t" + result.body.categories.join("\n\t") + "\n" + result.body.url);
                            } else {
                                logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to fetch manga " + results[i][0]);
                                bot.sendMessage(msg.channel, "Uh-oh, something is wrong with this mango.");
                            }
                        });
                    }, results.length-1);
                    var info = "Select one of the following:";
                    for(var i=0; i<results.length; i++) {
                        var tmpinfo = "\n\t" + i + ") " + results[i][0];
                        if((tmpinfo.length + info.length)>2000) {
                            break;
                        } else {
                            info += tmpinfo;
                        }
                    }
                    bot.sendMessage(msg.channel, info);
                }
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "No manga search parameters");
                bot.sendMessage(msg.channel, msg.author + " Empty manga? Is that what you want?");
            }
        }
    },
    // Chooses from a set of options
    "choose": {
        usage: "<option 1>|<option 2>|...",
        process: function(bot, msg, suffix) {
            if(suffix && suffix.split("|").length>=2) {
                bot.sendMessage(msg.channel, suffix.split("|")[getRandomInt(0, suffix.split("|").length-1)]);
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " did not provide proper syntax for choose");
                bot.sendMessage(msg.channel, msg.author + " :thinking: I didn't quite get that. Make sure to use the syntax `choose <option 1>|<option 2>|...`");
            }
        }
    },
    // Database of easily accessible responses
    "tag": {
        usage: "<key or \"clear\">[|<value>][|command]",
        process: function(bot, msg, suffix) {
            if(suffix.indexOf("|")>-1) {
                var key = suffix.substring(0, suffix.indexOf("|")).toLowerCase().trim();
                var value = suffix.substring(suffix.indexOf("|")+1).trim();
                if(!key || !value) {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " did not provide proper key and value for tag command");
                    bot.sendMessage(msg.channel, msg.author + " `" + getPrefix(msg.channel.server) + "tag <key>|<value>` is the syntax I need");
                } else if((configs.servers[msg.channel.server.id].tags[key] || emotes[key]) && value!=".") {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " tried to set tag key that already exists");
                    bot.sendMessage(msg.channel, msg.author + " I already have a tag set for that. Try `" + getPrefix(msg.channel.server) + "tag " + key + "|.` to remove it");
                } else if(configs.servers[msg.channel.server.id].tags[key] && value==".") {
                    delete configs.servers[msg.channel.server.id].tags[key];
                    if(configs.servers[msg.channel.server.id].tagcommands.indexOf(key)>-1) {
                        configs.servers[msg.channel.server.id].tagcommands.splice(configs.servers[msg.channel.server.id].tagcommands.indexOf(key), 1);
                    }
                    logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Deleted tag '" + key + "'");
                    bot.sendMessage(msg.channel, "Deleted.");
                    saveData("./data/config.json", function(err) {
                        if(err) {
                            logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save updated tags for " + msg.channel.server.name);
                        }
                    });
                } else {
                    if(value.toLowerCase().indexOf("|command")==value.length-8) {
                        if(checkCommandConflicts(key, msg.channel.server)) {
                            logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " tried to set tag command key that already exists");
                            bot.sendMessage(msg.channel, msg.author + " I can't set that tag command because it's a default command!");
                            return;
                        } else if(key.indexOf(" ")>-1) {
                            logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " tried to set tag command with spaces");
                            bot.sendMessage(msg.channel, msg.author + " Tag commands can't have spaces...");
                            return;
                        }
                        configs.servers[msg.channel.server.id].tagcommands.push(key);
                        value = value.substring(0, value.toLowerCase().indexOf("|command"));
                    }
                    configs.servers[msg.channel.server.id].tags[key] = value;
                    logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Set new tag '" + key + "'");
                    bot.sendMessage(msg.channel, "Cool! *memesmemesmemes*");
                    saveData("./data/config.json", function(err) {
                        if(err) {
                            logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save updated tags for " + msg.channel.server.name);
                        }
                    });
                }
            } else if(suffix.toLowerCase()=="clear") {
                if(configs.servers[msg.channel.server.id].admins.indexOf(msg.author.id)>-1) {
                    configs.servers[msg.channel.server.id].tags = {};
                    logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Cleared all tags at admin's request");
                    bot.sendMessage(msg.channel, "RIP.");
                    saveData("./data/config.json", function(err) {
                        if(err) {
                            logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save updated tags for " + msg.channel.server.name);
                        }
                    });
                } else {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "User is not a bot admin and cannot clear tags");
                    bot.sendMessage(msg.channel, msg.author + " Only my friends can do that.");
                }
            } else if(configs.servers[msg.channel.server.id].tags[suffix.toLowerCase()]) {
                bot.sendMessage(msg.channel, configs.servers[msg.channel.server.id].tags[suffix.toLowerCase()]);
            } else if(emotes[suffix.toLowerCase()]) {
                bot.sendFile(msg.channel, "http://emote.3v.fi/2.0/" + emotes[suffix.toLowerCase()] + ".png");
            } else if(!suffix) {
                var info = ""
                for(var tag in configs.servers[msg.channel.server.id].tags) {
                    var tmpinfo = "**" + tag + "**: " + configs.servers[msg.channel.server.id].tags[tag] + "\n";
                    if((tmpinfo.length + info.length)>2000) {
                        break;
                    } else {
                        info += tmpinfo;
                    }
                }
                if(!info) {
                    info = "No tags found for this server. Use `" + getPrefix(msg.channel.server) + "tag <key>|<value>` to set one.";
                }
                bot.sendMessage(msg.channel, info);
            } else {
                var info = "Select one of the following options:";
                for(var i=0; i<Object.keys(configs.servers[msg.channel.server.id].tags).length; i++) {
                    var tmpinfo = "\n\t" + i + ") " + Object.keys(configs.servers[msg.channel.server.id].tags)[i];
                    if((tmpinfo.length + info.length)>2000) {
                        break;
                    } else {
                        info += tmpinfo;
                    }
                }
                bot.sendMessage(msg.channel, info);
                selectMenu(msg.channel, msg.author.id, function(i) {
                    bot.sendMessage(msg.channel, configs.servers[msg.channel.server.id].tags[Object.keys(configs.servers[msg.channel.server.id].tags)[i]]);
                }, Object.keys(configs.servers[msg.channel.server.id].tags).length-1);
            }
        }
    },
    // Sets an AFK message for this server 
    "afk": {
        usage: "<message>",
        process: function(bot, msg, suffix) {
            if(!suffix) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " did not provide AFK message");
                bot.sendMessage(msg.channel, msg.author + " What message should I send when you're AFK? Use the syntax `afk <message>`");
            } else if(suffix==".") {
                if(stats[msg.channel.server.id].members[msg.author.id]) {
                    delete stats[msg.channel.server.id].members[msg.author.id].AFK;
                    logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Removed AFK message for " + msg.author.username);
                    bot.sendMessage(msg.channel, msg.author + " OK, I won't show that message anymore.");
                } else {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " tried to delete nonexistent AFK message");
                    bot.sendMessage(msg.channel, msg.auhtor + " I didn't have an AFK message set for you in the first place. Use `afk <message>`");
                }
            } else {
                checkStats(msg.author.id, msg.channels.server.id);
                stats[msg.channel.server.id].members[msg.author.id].AFK = suffix;
                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Set AFK message for " + msg.author.username);
                bot.sendMessage(msg.channel, msg.author + " Thanks, I'll show that if/when someone tags you in a server. Reply with `" + getPrefix(msg.channel.server) + "afk .` when you come back :)");
            }
        }
    },
    // DuckDuckGo Instant Answers 
    "ddg": {
        usage: "<query>",
        process: function(bot, msg, suffix) {
            if(suffix) {
                unirest.get("http://api.duckduckgo.com/?format=json&q=" + encodeURI(suffix.replace(/&/g, '')))
                .header("Accept", "application/json")
                .end(function(result) {
                    
                    if(result.status==200 && JSON.parse(result.body).Results.length>0 && JSON.parse(result.body).AbstractText) {
                        bot.sendMessage(msg.channel, "```" + JSON.parse(result.body).AbstractText + "```" + JSON.parse(result.body).Results[0].FirstURL);
                    } else {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "No DDG answer for '" + suffix + "'");
                        bot.sendMessage(msg.channel, "DuckDuckGo can't answer that. Maybe try Google? :wink:");
                    }
                });
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "No parameters provided for ddg command");
                bot.sendMessage(msg.channel, msg.author + " Wtf am I supposed to do with that? #rekt");
            }
        }
    },
    // Searches Google for a given query
    "search": {
        usage: "<query> [<count>]",
        process: function(bot, msg, suffix) {
            if(suffix) {
                var query = suffix.substring(0, suffix.lastIndexOf(" "));
                var count = parseInt(suffix.substring(suffix.lastIndexOf(" ")+1));

                if(!query) {
                    query = suffix;
                }
                if(!count || isNaN(count) || count<0 || count>configs.servers[msg.channel.server.id].maxcount) {
                    count = configs.servers[msg.channel.server.id].defaultcount;
                }
                unirest.get("https://kgsearch.googleapis.com/v1/entities:search?query=" + encodeURI(query.replace(/&/g, '')) + "&key=" + (configs.servers[msg.channel.server.id].customkeys.google_api_key || AuthDetails.google_api_key) + "&limit=1&indent=True")
                .header("Accept", "application/json")
                .end(function(result) {
                    var doSearch = function() {
                        var options = {
                            query: query,
                            limit: count
                        };
                        var i = 0;
                        searcher.search(options, function(err, url) {
                            if(!err) {
                                urlInfo(url, function(error, linkInfo) {
                                    if(i<count) {
                                        i++;
                                        if(!error) {
                                            bot.sendMessage(msg.channel, "**" + linkInfo.title + "**\n" + url + "\n");
                                        } else {
                                            bot.sendMessage(msg.channel, url + "\n");
                                        }
                                    }
                                });
                            } else {
                                logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to search for '" + query + "'");
                                bot.sendMessage(msg.channel, "Oops, something went wrong!!");
                            }
                        });
                    }
                    if(result.status==200 && result.body.itemListElement[0]) {
                        bot.sendMessage(msg.channel, "```" + result.body.itemListElement[0].result.detailedDescription.articleBody + "```" + result.body.itemListElement[0].result.detailedDescription.url, function() {
                            if(count>0) {
                                doSearch();
                            }
                        });
                    } else if(count>0) {
                        doSearch();
                    }
                });
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "No search parameters");
                bot.sendMessage(msg.channel, msg.author + " ???");
            }
        }
    },
    // Gets TV and movie data from IMDB
    "imdb": {
        usage: "[<\"series\", \"episode\", or \"movie\">] <query>",
        process: function(bot, msg, suffix) {
            var query = suffix;
            var type = "";
            if(query.toLowerCase().indexOf("series ")==0 || query.toLowerCase().indexOf("episode ")==0 || query.toLowerCase().indexOf("movie ")==0) {
                type = "&type=" + query.substring(0, query.indexOf(" ")).toLowerCase();
                query = query.substring(query.indexOf(" ")+1);
            }
            if(query) {
                unirest.get("http://www.omdbapi.com/?t=" + encodeURI(query.replace(/&/g, '')) + "&r=json" + type)
                .header("Accept", "application/json")
                .end(function(result) {
                    if(result.status==200 && result.body.Response=="True") {
                        bot.sendMessage(msg.channel, "__**" + result.body.Title + (type ? "" : (" (" + result.body.Type.charAt(0).toUpperCase() + result.body.Type.slice(1) + ")")) + "**__```" + result.body.Plot + "```**Year:** " + result.body.Year + "\n**Rated:** " + result.body.Rated + "\n**Runtime:** " + result.body.Runtime + "\n**Actors:**\n\t" + result.body.Actors.replaceAll(", ", "\n\t") + "\n**Director:** " + result.body.Director + "\n**Writer:** " + result.body.Writer + "\n**Genre(s):**\n\t" + result.body.Genre.replaceAll(", ", "\n\t") + "\n**Rating:** " + result.body.imdbRating + " out of " + result.body.imdbVotes + " votes\n**Awards:** " + result.body.Awards + "\n**Country:** " + result.body.Country + "\nhttp://www.imdb.com/title/" + result.body.imdbID + "/");
                    } else {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "No IMBD entries for '" + query + "'");
                        bot.sendMessage(msg.channel, ":no_mouth: :no_entry_sign:");
                    }
                });
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Invalid IMDB parameters");
                bot.sendMessage(msg.channel, msg.author + " U WOT M8");
            }
        }
    },
    // Fetches Twitter user timelines
    "twitter": {
        usage: "<username> [<count>]",
        process: function(bot, msg, suffix) {
            if(suffix) {
                var user = suffix.substring(0, suffix.indexOf(" "));
                var count = parseInt(suffix.substring(suffix.indexOf(" ")+1));

                if(user=="" || !user) {
                    user = suffix;
                }
                if(!count || isNaN(count) || count<1 || count>configs.servers[msg.channel.server.id].maxcount) {
                    count = configs.servers[msg.channel.server.id].defaultcount;
                }
                getRSS(msg.channel.server.id, "http://twitrss.me/twitter_user_to_rss/?user=" + user, count, function(err, articles) {
                    if(err) {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Twitter user " + user + " not found");
                        bot.sendMessage(msg.channel, msg.author + " Twitter user `" + user + "` not found. Make sure not to include the `@`");
                    } else {
                        var info = "";
                        for(var i=0; i<articles.length; i++) {
                            var tmpinfo = "`" + prettyDate(articles[i].published) + "` " + articles[i].link + "\n";
                            if((tmpinfo.length + info.length)>2000) {
                                break;
                            } else {
                                info += tmpinfo;
                            }
                        }
                        bot.sendMessage(msg.channel, info);
                    }
                });
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Twitter parameters not provided");
                bot.sendMessage(msg.channel, msg.author + " You confuse me.");
            }
        }
    },
    // Gets YouTube link with given keywords
    "youtube": {
        usage: "<video tags>",
        process: function(bot, msg, suffix) {
            if(!suffix) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "User did not provide search term(s)");
                bot.sendMessage(msg.channel, msg.author + " What should I search YouTube for?");
                return;
            }
            ytSearch(suffix, msg.channel.server.id, function(link) {
                bot.sendMessage(msg.channel, link);
            });
        }
    },
    // New Year Countdown
    "year": {
        process: function(bot, msg) {
            var a = new Date();
            var e = new Date(a.getFullYear()+1, 0, 1, 0, 0, 0, 0);
            var info = secondsToString((e-a)/1000) + "until " + (a.getFullYear()+1) + "!";
            bot.sendMessage(msg.channel, info);
        }
    },
    // Admin-only: kick user
    "kick": {
        usage: "<username>",
        process: function(bot, msg, suffix) {
            var usr = userSearch(suffix, msg.channel.server);
            if(!suffix || !usr || [msg.author.id, bot.user.id].indexOf(usr.id)>-1) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Error using kick command");
                bot.sendMessage(msg.channel, "Do you want me to kick you? :open_mouth:");
            } else {
                bot.kickMember(usr, msg.channel.server, function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to kick " + usr.username);
                        bot.sendMessage(msg.channel, "I don't have permission to kick on this server :sob:");
                    } else {
                        bot.sendMessage(msg.channel, "kk");
                    }
                });
            }
        }
    },
    // Admin-only: ban user
    "ban": {
        usage: "<username>",
        process: function(bot, msg, suffix) {
            var usr = userSearch(suffix, msg.channel.server);
            if(!suffix || !usr || [msg.author.id, bot.user.id].indexOf(usr.id)>-1) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Error using ban command");
                bot.sendMessage(msg.channel, "Do you want me to ban you? :open_mouth:");
            } else {
                bot.banMember(usr, msg.channel.server, function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to ban " + usr.username);
                        bot.sendMessage(msg.channel, "I don't have permission to ban on this server :sob:");
                    } else {
                        bot.sendMessage(msg.channel, "kk");
                    }
                });
            }
        }
    },
    // Mutes or unmutes a user
    "mute": {
        usage: "<username>",
        process: function(bot, msg, suffix) {
            var usr = userSearch(suffix, msg.channel.server);
            if(!suffix || !usr || [msg.author.id, bot.user.id].indexOf(usr.id)>-1) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Error using mute command");
                bot.sendMessage(msg.channel, "Do you want me to mute you? :open_mouth:");
            } else {
                muteUser(msg.channel, usr, function(err, state) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to " (state ? "mute " : "unmute ") + usr.username);
                        bot.sendMessage(msg.channel, "I don't have permission to mute on this server :sob:");
                    } else {
                        bot.sendMessage(msg.channel, "Alright, done. **@" + getName(msg.channel.server, usr) + "** has been " + (state ? "muted :mute:" : "unmuted :sound:") + " in this channel.");
                    }
                });
            }
        }
    },
    // Archive n messages in this channel
    "archive": {
        usage: "<no. of messages>",
        process: function(bot, msg, suffix) {
            if(!suffix || isNaN(suffix)) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Number of messages to archive not provided");
                bot.sendMessage(msg.channel, msg.author + " I'll need a number with that, please.");
            } else {
                archiveMessages(msg.channel, suffix, function(err, archive) {
                    if(err) {
                        bot.sendMessage(msg.channel, "Damn, Discord gave me some trouble with that. Ask the mods to give me message history permissions.");
                    } else {
                        var filename = "./" + msg.channel.id + "-" + genToken(8) + ".json";
                        fs.writeFile(filename, JSON.stringify(archive, null, 4), function(err) {
                            if(err) {
                                logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to write temporary archive");
                                bot.sendMessage(msg.channel, "Errors, errors, errors :(");
                            } else {
                                bot.sendFile(msg.channel, filename, msg.channel.server.name + "-" + msg.channel.name + "-" + new Date().getTime() + ".json", function(err) {
                                    if(err) {
                                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to send archive");
                                        bot.sendMessage(msg.channel, "Discord is getting mad at me. Try a smaller number of messages.");
                                    } 
                                    fs.unlink(filename, function(err) {
                                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to delete temporary archive");
                                    });
                                });
                            }
                        });
                    }
                });
            }
        }
    },
    // Admin-only: bulk delete messages
    "nuke": {
        usage: "<no. of messages> [<username>]",
        process: function(bot, msg, suffix) {
            var usr;
            var num = suffix;
            if(suffix.indexOf(" ")>-1) {
                num = suffix.substring(0, suffix.indexOf(" "));
                usr = userSearch(suffix.substring(suffix.indexOf(" ")+1), msg.channel.server);
                if(!usr) {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Invalid user provided to nuke");
                    bot.sendMessage(msg.channel, msg.author + " That user doesn't exist. Use this command without a username to delete messages from everyone.");
                    return;
                }
            }
            if(!num || isNaN(num)) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Invalid number of messages provided to nuke");
                bot.sendMessage(msg.channel, msg.author + " Make sure to use the syntax `nuke <no. of messages> [<username>]`");
                return;
            }
            if(num<=1) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Number of messages to nuke provided is less than 2");
                bot.sendMessage(msg.channel, msg.author + " I must delete at least 2 messages.");
                return;
            }
            cleanMessages(msg.channel, usr, num, function(err) {
                if(err) {
                    bot.sendMessage(msg.channel, "I couldn't nuke this channel. Are ya sure I have powers?");
                } else {
                    bot.sendMessage(msg.channel, ":fire:");
                }
            });
        }
    },
    // Says something
    "say": {
        usage: "<something>",
        process: function(bot, msg, suffix) {
            if(!suffix) {
                bot.sendMessage(msg.channel, "\t\n");
            } else {
                bot.sendMessage(msg.channel, suffix);
            }
        }
    },
    // Searches Google Images with keyword(s)
    "image": {
        usage: "<image tags> [random]",
        process: function(bot, msg, suffix) {
            var num = "";
            if(!suffix) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "User did not provide search term(s)");
                bot.sendMessage(msg.channel, msg.author + " I don't know what image to get...");
                return;
            } else if(suffix.substring(suffix.lastIndexOf(" ")+1).toLowerCase()=="random") {
                if(suffix.substring(0, suffix.lastIndexOf(" "))) {
                    suffix = suffix.substring(0, suffix.lastIndexOf(" "));
                    num = getRandomInt(0, 19);
                }
            }
            giSearch(suffix, num, msg.channel.server.id, msg.channel.id, function(img) {
                if(img==false) {
                    bot.sendMessage(msg.channel, "Looks like we've hit the daily Google Image Search API rate limit, folks! Sorry about that.");
                } else if(img==null) {
                    bot.sendMessage(msg.channel, "Couldn't find anything, sorry");
                } else {
                    bot.sendMessage(msg.channel, img);
                }
            });
        }
    },
    // Get GIF from Giphy
    "gif": {
		usage: "<GIF tags>",
		process: function(bot, msg, suffix) {
            if(!suffix) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "User did not provide GIF search term(s)");
                bot.sendMessage(msg.channel, msg.author + " I don't know of a GIF for nothing.");
                return;
            }
		    var tags = suffix.split(" ");
            var rating = "pg-13";
            if(!configs.servers[msg.channel.server.id].nsfwfilter[0] || configs.servers[msg.channel.server.id].nsfwfilter[1].indexOf(msg.channel.id)>-1 || !configs.servers[msg.channel.server.id].servermod) {
                rating = "r";
            }
		    getGIF(tags, rating, function(id) {
                if(typeof id!=="undefined") {
                    bot.sendMessage(msg.channel, "http://media.giphy.com/media/" + id + "/giphy.gif");
                } else {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "GIF not found for " + suffix);
                    bot.sendMessage(msg.channel, "The Internet has run out of memes :/");
                }
		    });
		}
	},
    // Predicts the answer to a question
    "8ball": {
        usage: "<question>",
        process: function(bot, msg, suffix) {
            if(suffix) {
                unirest.get("https://8ball.delegator.com/magic/JSON/" + encodeURI(suffix.replace(/&/g, '')))
                .header("Accept", "application/json")
                .end(function(result) {
                    if(result.status==200) {
                        bot.sendMessage(msg.channel, "```" + result.body.magic.answer + "```");
                    } else {
                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to fetch 8ball answer");
                        bot.sendMessage(msg.channel, "Broken 8ball :(");
                    }
                });
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "No parameters provided for 8ball command");
                bot.sendMessage(msg.channel, msg.author + " You tell me... :P");
            }
        }
    },
    // Tells your fortune
    "fortune": {
        usage: "[<category>]",
        process: function(bot, msg, suffix) {
            var categories = ["all", "computers", "cookie", "definitions", "miscellaneous", "people", "platitudes", "politics", "science", "wisdom"];
            if(suffix && categories.indexOf(suffix.toLowerCase())==-1) {
                var info = "Select one of the following:";
                for(var i=0; i<categories.length; i++) {
                    info += "\n\t" + i + ") " + categories[i].charAt(0) + categories[i].slice(1);
                }
                bot.sendMessage(msg.channel, info);
                selectMenu(msg.channel, msg.author.id, function(i) {
                    commands.fortune.process(bot, msg, categories[i]);
                }, categories.length-1);
            } else {
                unirest.get("http://yerkee.com/api/fortune/" + (suffix || ""))
                .header("Accept", "application/json")
                .end(function(result) {
                    if(result.status==200) {
                        bot.sendMessage(msg.channel, result.body.fortune);
                    } else {
                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to fetch fortune");
                        bot.sendMessage(msg.channel, "I honestly don't know :neutral_face:");
                    }
                });
            }
        }
    },
    // Random fact about cats
    "catfact": {
        usage: "[<count>]",
        process: function(bot, msg, suffix) {
            var count = suffix;
            if(!count) {
                count = 1;
            }
            if(isNaN(count) || count<1 || count>configs.servers[msg.channel.server.id].maxcount) {
                count = configs.servers[msg.channel.server.id].defaultcount;
            }
            unirest.get("http://catfacts-api.appspot.com/api/facts?number=" + count)
            .header("Accept", "application/json")
            .end(function(result) {
                if(result.status==200) {
                    sendArray(msg.channel, JSON.parse(result.body).facts);
                } else {
                    logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to fetch cat fact");
                    bot.sendMessage(msg.channel, "Cats exist and are cute af.");
                }
            });
        }
    },
    "numfact": {
        usage: "[<no.>]",
        process: function(bot, msg, suffix) {
            var num = suffix || "random";
            if(suffix && isNaN(suffix)) {
                logMsg(new Date().getTime(), "WANR", msg.channel.server.id, msg.channel.id, msg.author.username + " provided an invalid number for numfact command");
                bot.sendMessage(msg.channel, "`" + suffix + "` is not a number!");
                return;
            }
            unirest.get("http://numbersapi.com/" + num)
            .end(function(result) {
                if(result.status==200) {
                    bot.sendMessage(msg.channel, result.body);
                } else {
                    logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to fetch num fact");
                    bot.sendMessage(msg.channel, "Oh no! Something went wrong.");
                }
            });
        }
    },
    // Searches by tag on e621.net
    "e621": {
        usage: "<tags>",
        process: function(bot, msg, suffix) {
            if(suffix) {
                var query = suffix.substring(0, suffix.lastIndexOf(" "));
                var count = parseInt(suffix.substring(suffix.lastIndexOf(" ")+1));

                if(!query) {
                    query = suffix;
                }
                if(!count || isNaN(count) || count<0 || count>configs.servers[msg.channel.server.id].maxcount) {
                    count = configs.servers[msg.channel.server.id].defaultcount;
                }

                unirest.get("https://e621.net/post/index.json?tag=" + encodeURI(query.replace(/&/g, '')) + "&limit=" + count)
                .headers({
                  "Accept": "application/json",
                  "User-Agent": "Unirest Node.js"
                })
                .end(function(result) {
                    if(result.status==200) {
                        var info = [];
                        for(var i=0; i<result.body.length; i++) {
                            info.push((result.body[i].description ? ("```" + result.body[i].description + "```") : "") + "**Author:** " + result.body[i].author + "\n**Rating:** " + result.body[i].rating.toUpperCase() + "\n**Score:** " + result.body[i].score + "\n**Favorites:** " + result.body[i].fav_count + "\n" + result.body[i].file_url);
                        }
                        sendArray(msg.channel, info);
                    } else {
                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to fetch e621 results");
                        bot.sendMessage(msg.channel, "I'm so sorry, e621 has failed me  :'(");
                    }
                });
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "No parameters provided for e621 command");
                bot.sendMessage(msg.channel, msg.author + " I need some tags to search for, yo!");
            }
        }
    },
    // Searches by tag on rule32.xxx
    "rule34": {
        usage: "<tags>",
        process: function(bot, msg, suffix) {
            if(suffix) {
                var query = suffix.substring(0, suffix.lastIndexOf(" "));
                var count = parseInt(suffix.substring(suffix.lastIndexOf(" ")+1));

                if(!query) {
                    query = suffix;
                }
                if(!count || isNaN(count) || count<0 || count>configs.servers[msg.channel.server.id].maxcount) {
                    count = configs.servers[msg.channel.server.id].defaultcount;
                }

                unirest.get("http://rule34.xxx/index.php?page=dapi&s=post&q=index&tags=" + encodeURI(query.replace(/&/g, '')) + "&limit=" + count)
                .end(function(result) {
                    if(result.status==200) {
                        result.body = xmlparser(result.body).root.children;
                        var info = [];
                        for(var i=0; i<result.body.length; i++) {
                            info.push("**Rating:** " + result.body[i].attributes.rating.toUpperCase() + "\n**Score:** " + result.body[i].attributes.score + "\nhttp:" + result.body[i].attributes.file_url);
                        }
                        sendArray(msg.channel, info);
                    } else {
                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to fetch rule34 results");
                        bot.sendMessage(msg.channel, "I'm so sorry, rule34 has failed me  :'(");
                    }
                });
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "No parameters provided for rule34 command");
                bot.sendMessage(msg.channel, msg.author + " I need some tags to search for, yo!");
            }
        }
    },
    // Searches by tag on safebooru.org
    "safebooru": {
        usage: "<tags>",
        process: function(bot, msg, suffix) {
            if(suffix) {
                var query = suffix.substring(0, suffix.lastIndexOf(" "));
                var count = parseInt(suffix.substring(suffix.lastIndexOf(" ")+1));

                if(!query) {
                    query = suffix;
                }
                if(!count || isNaN(count) || count<0 || count>configs.servers[msg.channel.server.id].maxcount) {
                    count = configs.servers[msg.channel.server.id].defaultcount;
                }

                unirest.get("http://safebooru.donmai.us/posts.json?page=0&tags=" + encodeURI(query.replace(/&/g, '')) + "&limit=" + count)
                .headers({
                  "Accept": "application/json",
                  "User-Agent": "Unirest Node.js"
                })
                .end(function(result) {
                    if(result.status==200) {
                        var info = [];
                        for(var i=0; i<result.body.length; i++) {
                            info.push((result.body[i].description ? ("```" + result.body[i].description + "```") : "") + "**Author:** " + result.body[i].uploader_name + "\n**Rating:** " + result.body[i].rating.toUpperCase() + "\n**Score:** " + result.body[i].score + "\n**Favorites:** " + result.body[i].fav_count + "\nhttp://safebooru.donmai.us" + result.body[i].file_url);
                        }
                        sendArray(msg.channel, info);
                    } else {
                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to fetch safebooru results");
                        bot.sendMessage(msg.channel, "I'm so sorry, safebooru has failed me  :'(");
                    }
                });
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "No parameters provided for safebooru command");
                bot.sendMessage(msg.channel, msg.author + " I need some tags to search for, yo!");
            }
        }
    },
    // Create a temporary channel
    "room": {
        usage: "<\"text\" or \"voice\"> <username 1>|<username 2>|...",
        process: function(bot, msg, suffix) {
            if(suffix && ["text", "voice"].indexOf(suffix.split(" ")[0].toLowerCase())>-1) {
                var type = suffix.split(" ")[0].toLowerCase();
                suffix = suffix.substring(suffix.indexOf(" ")+1);
                var users = [bot.user, msg.author];
                if(suffix && suffix.split("|").length>0) {
                    for(var i=0; i<suffix.split("|").length; i++) {
                        var usr = userSearch(suffix.split("|")[i], msg.channel.server);
                        for(var j=0; j<users.length; j++) {
                            if(usr && usr.id==users[j].id) {
                                continue;
                            }
                        }
                        users.push(usr);
                    }
                } else if(rooms[msg.channel.id]) {
                    bot.deleteChannel(msg.channel, function(err) {
                        if(err) {
                            logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, null, "Failed to create delete room " + ch.name);
                            bot.sendMessage(msg.channel, "Dammit, I ran into trouble. Ask the mods to delete this room.");
                        } else {
                            delete rooms[msg.channel.id];
                            logMsg(new Date().getTime(), "INFO", msg.channel.server.id, null, "Deleted room " + ch.name);
                        }
                    });
                }
                bot.createChannel(msg.channel.server, "awesomebot-room-" + genToken(8), type, function(err, ch) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, null, "Failed to create new room");
                        bot.sendMessage(msg.channel, "Dammit, I ran into trouble. Make sure the mods have given me channel and role permissions on this server.");
                    } else {
                        if(type=="text") {
                            var everyonePermissions = {
                                "readMessages": false,
                            };
                            var roomPermissions = {
                                "readMessages": true,
                                "sendMessages": true
                            }
                            rooms[ch.id] = setTimeout(function() {
                                bot.deleteChannel(ch, function(err) {
                                    if(err) {
                                        logMsg(new Date().getTime(), "INFO", msg.channel.server.id, null, "Failed to auto-delete room " + ch.name);
                                    } else {
                                        delete rooms[ch.id];
                                        logMsg(new Date().getTime(), "INFO", msg.channel.server.id, null, "Auto-deleted room " + ch.name);
                                    }
                                });
                            }, 300000);
                        } else {
                            var everyonePermissions = {
                                "voiceConnect": false
                            }
                            var roomPermissions = {
                                "voiceConnect": true,
                                "voiceSpeak": true
                            }
                            rooms[ch.id] = true;
                        }
                        bot.overwritePermissions(ch, msg.channel.server.roles.get("name", "@everyone"), everyonePermissions, function(err) {
                            if(err) {
                                bot.deleteChannel(ch, function(err) {
                                    logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, null, "Failed to create new room");
                                    bot.sendMessage(msg.channel, "Dammit, I ran into trouble. Make sure the mods have given me channel and role permissions on this server.");
                                });
                            } else {
                                var restrictChannel = function(i) {
                                    if(i<users.length) {
                                        bot.overwritePermissions(ch, users[i], roomPermissions, function(err) {
                                            restrictChannel(++i);
                                        });
                                    } else {
                                        logMsg(new Date().getTime(), "INFO", msg.channel.server.id, null, "Created room " + ch.name);
                                        if(type=="text") {
                                            bot.sendMessage(ch, "First! *This room will be deleted after 5 minutes of inactivity.*");
                                        }
                                    }
                                };
                                restrictChannel(0);
                            }
                        });
                    }
                });
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, null, "Invalid parameters provided for room coomand");
                bot.sendMessage(msg.channel, msg.author + " Please at least specify `text` or `voice`");
            }
        }
    },
    // Defines word from Urban Dictionary
    "urban": {
        usage: "<term>",
        process: function(bot, msg, suffix) {
            var def = urban(suffix);
            def.first(function(data) {
                if(data) {
                    bot.sendMessage(msg.channel, "**" + suffix + "**: " + data.definition.replace("\r\n\r\n", "\n") + "\n*" + data.example.replace("\r\n\r\n", "\n") + "*\n`" + data.thumbs_up + " up, " + data.thumbs_down + " down`");
                } else {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Definition not found for " + suffix);
                    bot.sendMessage(msg.channel, "Wtf?! Urban Dictionary doesn't have an entry for " + suffix);
                }
            });
        }
    },
    // Queries Wolfram Alpha
    "wolfram" : {
        usage: "<Wolfram|Alpha query>",
        process(bot, msg, suffix) {
            if(!suffix) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "User did not provide Wolfram|Alpha query");
                bot.sendMessage(msg.channel, msg.author + " I'm confused...");
                return;
            }
            wolfram.ask({query: suffix}, function(err, results) {
                if(err) {
                    logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Unable to connect to Wolfram|Alpha");
                    bot.sendMessage(msg.channel, "Unfortunately, I didn't get anything back from Wolfram|Alpha");
                } else {
                    var info = ""
                    try {
                        for(var i=0; i<results.pod.length; i++) {
                            var tmpinfo = "**" + results.pod[i].$.title + "**\n" + (results.pod[i].subpod[0].plaintext[0] || results.pod[i].subpod[0].img[0].$.src) + "\n";
                            if((tmpinfo.length + info.length)>2000) {
                                break;
                            } else {
                                info += tmpinfo;
                            }
                        }
                        bot.sendMessage(msg.channel, info);
                    } catch(notFound) {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Could not find Wolfram|Alpha data for " + suffix);
                        bot.sendMessage(msg.channel, "Wolfram|Alpha has nothing.");
                    }
                }
            });
        }
    },
    // Gets Wikipedia article with given title
    "wiki": {
        usage: "<search terms>",
        process: function(bot, msg, suffix) {
            if(!suffix) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "User did not provide Wikipedia search term(s)");
                bot.sendMessage(msg.channel, msg.author + " You need to provide a search term.");
                return;
            }
            var wiki = new Wiki.default();
            wiki.search(suffix).then(function(data) {
                if(data.results.length==0) {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Wikipedia article not found for " + suffix);
                    bot.sendMessage(msg.channel, "I don't think Wikipedia has an article on that.");
                    return;
                }
                wiki.page(data.results[0]).then(function(page) {
                    page.summary().then(function(summary) {
                        if(summary.indexOf(" may refer to:") > -1 || summary.indexOf(" may stand for:") > -1) {
                            var options = summary.split("\n").slice(1);
                            var info = "Select one of the following:";
                            for(var i=0; i<options.length; i++) {
                                info += "\n\t" + i + ") " + options[i];
                            }
                            bot.sendMessage(msg.channel, info);
                            selectMenu(msg.channel, msg.author.id, function(i) {
                                commands.wiki.process(bot, msg, options[i].substring(0, options[i].indexOf(",")));
                            }, options.length-1);
                        } else {
                            var sumText = summary.split("\n");
                            var count = 0;
                            var continuation = function() {
                                var paragraph = sumText.shift();
                                if(paragraph && count<3) {
                                    count++;
                                    bot.sendMessage(msg.channel, paragraph, continuation);
                                }
                            };
                            bot.sendMessage(msg.channel, "**From " + page.fullurl + "**", continuation);
                        }
                    });
                });
            }, function(err) {
                logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Unable to connect to Wikipedia");
                bot.sendMessage(msg.channel, "Uhhh...Something went wrong :(");
            });
        }
    },
    // Converts between units
    "convert": {
        usage: "<no.> <unit> to <unit>",
        process: function(bot, msg, suffix) {
            var toi = suffix.toLowerCase().lastIndexOf(" to ");
            if(toi==-1) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "User used incorrect conversion syntax");
                bot.sendMessage(msg.channel, msg.author + " Sorry, I didn't get that. Make sure you're using the right syntax: `" + getPrefix(msg.channel.server) + "<no.> <unit> to <unit>`");
            } else {
                try {
                    var num = suffix.substring(0, suffix.indexOf(" "));
                    var unit = suffix.substring(suffix.indexOf(" ")+1, suffix.toLowerCase().lastIndexOf(" to ")).toLowerCase();
                    var end = suffix.substring(suffix.lastIndexOf(" ")+1).toLowerCase();
                    
                    if(isNaN(num)) {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "User did not provide a numeric conversion quantity");
                        bot.sendMessage(msg.channel, msg.author + " That's not a number...");
                        return;
                    }
                    if(convert().possibilities().indexOf(unit)!=-1) {
                        if(convert().from(unit).possibilities().indexOf(end)!=-1) {
                            bot.sendMessage(msg.channel, (Math.round(convert(num).from(unit).to(end) * 1000) / 1000) + " " + end);
                            return;
                        }
                    }
                    if(unit=="c" && end=="f") {
                        bot.sendMessage(msg.channel, (Math.round((num * 9 / 5 + 32) * 1000) / 1000) + "°" + end.toUpperCase());
                        return;
                    }
                    if(unit=="f" && end=="c") {
                        bot.sendMessage(msg.channel, (Math.round(((num - 32) * 5 / 9) * 1000) / 1000) + "°" + end.toUpperCase());
                        return;
                    }
                    try {
                        bot.sendMessage(msg.channel, (Math.round(fx.convert(num, {from: unit.toUpperCase(), to: end.toUpperCase()}) * 100) / 100) + " " + end.toUpperCase());
                    } catch(error) {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Unsupported conversion unit(s)");
                        bot.sendMessage(msg.channel, msg.author + " I don't support that unit, try something else.");
                    }
                } catch(err) {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "User used incorrect convert syntax");
                    bot.sendMessage(msg.channel, msg.author + " Are you sure you're using the correct syntax?");
                }
            }
        }
    },
    // Fetches stock symbol from Yahoo Finance
    "stock": {
        usage: "<stock symbol>",
        process: function(bot, msg, suffix) {
            if(!suffix) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "User did not provide stock symbol");
                bot.sendMessage(msg.channel, msg.author + " You never gave me a stock symbol! I'm not a magician, you know.");
                return;
            }
            unirest.get("http://finance.yahoo.com/webservice/v1/symbols/" + suffix + "/quote?format=json&view=detail")
            .header("Accept", "application/json")
            .end(function(result) {
                if(result.status==200 && JSON.parse(result.raw_body).list.resources[0]) {
                    var data = JSON.parse(result.raw_body).list.resources[0].resource.fields;
                    var info = data.issuer_name + " (" + data.symbol + ")\n\t$" + (Math.round((data.price)*100)/100) + "\n\t";
                    info += " " + (Math.round((data.change)*100)/100) + " (" + (Math.round((data.chg_percent)*100)/100) + "%)\n\t$" + (Math.round((data.day_low)*100)/100) + "-$" + (Math.round((data.day_high)*100)/100);
                    bot.sendMessage(msg.channel, info);
                } else {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Stock symbol " + suffix + " not found")
                    bot.sendMessage(msg.channel, "Sorry, I can't find that stock symbol.");
                }
            });
        }
    },
    // Displays the weather for an area
    "weather": {
        usage: "<location> [<\"F\" or \"C\">]",
        process: function(bot, msg, suffix) {
            if(profileData[msg.author.id] && !suffix) {
                for(var key in profileData[msg.author.id]) {
                    if(key.toLowerCase()=="location") {
                        suffix = profileData[msg.author.id][key];
                        break;
                    }
                }
            }

            var unit = "F";
            var location = suffix;
            if([" F", " C"].indexOf(suffix.toUpperCase().substring(suffix.length-2))>-1) {
                unit = suffix.charAt(suffix.length-1).toUpperCase().toString();
                location = suffix.substring(0, suffix.length-2);
            }
            
            if(!location) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Weather location not provided");
                bot.sendMessage(msg.channel, msg.author + " I don't have a default location set for you. PM me `profile location|<your city>` to set one.");
                return;
            }
            
            try {
                weather.find({search: location, degreeType: unit}, function(err, data) {
                    if(err) {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Could not find weather for location " + location);
                        bot.sendMessage(msg.channel, msg.author + " I can't find weather info for " + location);
                    } else {
                        data = data[0];
                        bot.sendMessage(msg.channel, "**" + data.location.name + " right now:**\n" + data.current.temperature + "°" + unit + " " + data.current.skytext + ", feels like " + data.current.feelslike + "°, " + data.current.winddisplay + " wind\n**Forecast for tomorrow:**\nHigh: " + data.forecast[1].high + "°, low: " + data.forecast[1].low + "° " + data.forecast[1].skytextday + " with " + data.forecast[1].precip + "% chance precip.");
                    }
                });
            } catch(err) {
                logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Weather.JS threw an error");
                bot.sendMessage(msg.channel, "Idk why this is broken tbh :(");
            }
        }
    },
    // Silences the bot until the start statement is issued
    "quiet": {
        usage: "[<\"all\" or time>]",
        process: function(bot, msg, suffix) {
            var timestr = "";
            if(suffix.toLowerCase()=="all") {
                timestr = " in all channels";
                for(var chid in stats[msg.channel.server.id].botOn) {
                    stats[msg.channel.server.id].botOn[chid] = false;
                }
            } else if(parseTime(suffix)) {
                var time = parseTime(suffix);
                if(time.countdown>3600000) {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Invalid quiet time provided by " + msg.author.username);
                    bot.sendMessage(msg.channel, msg.author + " Too big.");
                    return;
                }
                timestr = " for " + time.num + " " + time.time;
                stats[msg.channel.server.id].botOn[msg.channel.id] = false;
                setTimeout(function() {
                    stats[msg.channel.server.id].botOn[msg.channel.id] = true;
                }, time.countdown);
            } else {
                stats[msg.channel.server.id].botOn[msg.channel.id] = false;
            }
            logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Bot has been quieted by an admin" + timestr);
            bot.sendMessage(msg.channel, "Ok, I'll shut up" + timestr);
        }
    },
    // Creates a command cooldown until the end statement is issued
    "cool": {
        usage: "<cooldown time or \"end\">[|<cooldown duration>]",
        process: function(bot, msg, suffix) {
            var timestr = "";
            if(suffix.toLowerCase()=="end") {
                delete cools[msg.channel.id];
                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Cooldown removed by admin");
                bot.sendMessage(msg.channel, "Vroom vroom :fast_forward:");
                return;
            } else if(parseTime(suffix)) {
                var time = parseTime(suffix);
                if(time.countdown>300000) {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Invalid cooldown time provided by " + msg.author.username);
                    bot.sendMessage(msg.channel, msg.author + " Too big.");
                    return;
                }
                timestr = " of " + time.num + " " +  time.time;
                cools[msg.channel.id] = time.countdown;
            } else if(suffix.split("|").length==2 && parseTime(suffix.split("|")[0]) && parseTime(suffix.split("|")[1])) {
                var time1 = parseTime(suffix.split("|")[0]);
                var time2 = parseTime(suffix.split("|")[1]);
                if(time1[2]>300000 || time2[2]>3600000) {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Invalid cooldown time(s) provided by " + msg.author.username);
                    bot.sendMessage(msg.channel, msg.author + " Too big.");
                    return;
                }
                timestr = " of " + time1.num + " " + time1.time + " for " + time2.num + " " + time2.time;
                cools[msg.channel.id] = time1.countdown;
                setTimeout(function() {
                    delete cools[msg.channel.id];
                }, time2.countdown);
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Invalid cooldown parameters provided by " + msg.author.username);
                bot.sendMessage(msg.channel, msg.author + " You seem confused :thinking:");
                return;
            }
            logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Cooldown" + timestr + " created by admin");
            bot.sendMessage(msg.channel, "Created command cooldown" + timestr);
        }
    },
    // Starts, ends, and answers live trivia game
    "trivia": {
        usage: "<start, end, next, or answer choice> [<question set to use>]",
        process: function(bot, msg, suffix) {
            var triviaOn = trivia[msg.channel.id]!=null;
            
            if(suffix.indexOf("start")==0 && suffix.indexOf(" ")>-1 && suffix.indexOf(" ")<suffix.length-1) {
                var tset = suffix.substring(suffix.indexOf(" ")+1);
                suffix = "start";
            }
            switch(suffix) {
                case "start":
                    if(!triviaOn) {
                        trivia[msg.channel.id] = {
                            answer: "",
                            attempts: 0,
                            score: 0,
                            possible: 0,
                            done: [],
                            responders: {}
                        };
                        if(tset) {
                            if(!configs.servers[msg.channel.server.id].triviasets[tset]) {
                                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Provided trivia set does not exist");
                                bot.sendMessage(msg.channel, msg.author + " The higher-ups haven't added that trivia set to my database. The list of available custom sets is available via my help command.");
                                delete trivia[msg.channel.id];
                                return;
                            }
                            trivia[msg.channel.id].set = tset;
                        }
                        logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Trivia game started");
                        bot.sendMessage(msg.channel, "Welcome to **AwesomeTrivia**! Here's your first question: " + triviaQ(msg.channel, trivia[msg.channel.id].set) + "\nAnswer by tagging me like this: `" + getPrefix(msg.channel.server) + "trivia <answer>` or skip by doing this: `" + getPrefix(msg.channel.server) + "trivia next`\nGood Luck!");
                        trivia[msg.channel.id].possible++;
                        if(!stats[msg.channel.server.id].commands.trivia) {
                            stats[msg.channel.server.id].commands.trivia = 0;
                        }
                        stats[msg.channel.server.id].commands.trivia++;
                    } else {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Ongoing trivia game; new one cannot be started");
                        bot.sendMessage(msg.channel, "There's a trivia game already in progress on this server, in " + msg.channel.name);
                    }
                    break;
                case "end":
                    if(triviaOn) {
                        logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Trivia game ended, score: " + trivia[msg.channel.id].score + " out of " + (trivia[msg.channel.id].possible-1));
                        bot.sendMessage(msg.channel, endTrivia(trivia[msg.channel.id], msg.channel.server, true));
                        delete trivia[msg.channel.id];
                    } else {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "No ongoing trivia game to end");
                        bot.sendMessage(msg.channel, "There isn't a trivia game going on right now. Start one by typing `" + getPrefix(msg.channel.server) + "trivia start [<question set to use>]`");
                    }
                    break;
                case "next":
                    if(triviaOn) {
                        logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Trivia question skipped by " + msg.author.username);
                        var info = "The answer was " + trivia[msg.channel.id].answer;
                        var q = triviaQ(msg.channel, trivia[msg.channel.id].set);
                        if(q) {
                            info += "\n**Next Question:** " + q;
                            trivia[msg.channel.id].possible++;
                        } else {
                            logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Trivia game ended, score: " + trivia[msg.channel.id].score + " out of " + trivia[msg.channel.id].possible);
                            info += "\nNo more questions. " + endTrivia(trivia[msg.channel.id], msg.channel.server);
                            delete trivia[msg.channel.id];
                        }
                        bot.sendMessage(msg.channel, info);
                    } else {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "No ongoing trivia game in which to skip question");
                        bot.sendMessage(msg.channel, "There isn't a trivia game going on right now. Start one by typing `" + getPrefix(msg.channel.server) + "trivia start`");
                    }
                    break;
                default:
                    if(triviaOn) {
                        var compare = function() {
                            if(trivia[msg.channel.id].answer.toLowerCase().trim().length<5 || !isNaN(trivia[msg.channel.id].answer.toLowerCase().trim())) {
                                return suffix.toLowerCase()==trivia[msg.channel.id].answer.toLowerCase().trim();
                            }
                            return levenshtein.get(suffix.toLowerCase(), trivia[msg.channel.id].answer.toLowerCase().trim())<3;
                        }
                        if(compare() && triviaOn) {
                            logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Correct trivia game answer by " + msg.author.username);
                            
                            // Award AwesomePoints to author
                            if(!profileData[msg.author.id]) {
                                profileData[msg.author.id] = {
                                    points: 0
                                };
                            }
                            profileData[msg.author.id].points += 5;
                            saveData("./data/profiles.json", function(err) {
                                if(err) {
                                    logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + msg.author.username);
                                }
                            });
                            
                            // Move on to next question
                            if(trivia[msg.channel.id].attempts<=2) {
                                trivia[msg.channel.id].score++;
                                if(!trivia[msg.channel.id].responders[msg.author.id]) {
                                    trivia[msg.channel.id].responders[msg.author.id] = 0;
                                }
                                trivia[msg.channel.id].responders[msg.author.id]++;
                            }
                            trivia[msg.channel.id].attempts = 0;

                            var info = msg.author + " got it right! The answer is " + trivia[msg.channel.id].answer;
                            
                            var q = triviaQ(msg.channel, trivia[msg.channel.id].set);
                            if(q) {
                                info += "\n**Next Question:** " + q;
                                trivia[msg.channel.id].possible++;
                            } else {
                                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Trivia game ended, score: " + trivia[msg.channel.id].score + " out of " + trivia[msg.channel.id].possible);
                                info += "\nNo more questions. " + endTrivia(trivia[msg.channel.id], msg.channel.server);
                                delete trivia[msg.channel.id];
                            }
                            bot.sendMessage(msg.channel, info);
                        } else if(triviaOn) {
                            bot.sendMessage(msg.channel, msg.author + " Nope :(");
                            trivia[msg.channel.id].attempts++;
                        }
                    } else {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "No ongoing trivia game to answer");
                        bot.sendMessage(msg.channel, "There isn't a trivia game going on right now. Start one by typing `" + getPrefix(msg.channel.server) + "trivia start`");
                    }
            }
        }
    },
    // Sends reminders in given time for given note
    "remindme": {
        usage: "<time from now> <note>",
        process: function(bot, msg, suffix) {
            parseReminder(suffix, msg.author, msg.channel);
        }
    },
    // Gets top (max 5) posts in given subreddit, sorting hot
    "reddit": {
        usage: "<subreddit> [<count>]",
        process: function(bot, msg, suffix) {
            var path = "/.json"
            var count = configs.servers[msg.channel.server.id].defaultcount;
            if(suffix) {
                if(suffix.indexOf(" ")>-1) {
                    var sub = suffix.substring(0, suffix.indexOf(" "));
                    count = suffix.substring(suffix.indexOf(" ")+1);
                    if(count.indexOf(" ")>-1) {
                        count = count.substring(0, count.indexOf(" "));
                    }
                    path = "/r/" + sub + path;
                } else {
                    path = "/r/" + suffix + path;
                }
            } else {
                sub = "all";
                count = configs.servers[msg.channel.server.id].defaultcount;
            }
            if(!sub || !count || isNaN(count)) {
                sub = suffix;
                count = configs.servers[msg.channel.server.id].defaultcount;
            }
            if(count<1 || count>configs.servers[msg.channel.server.id].maxcount) {
                count = configs.servers[msg.channel.server.id].defaultcount;
            }
            unirest.get("https://www.reddit.com" + path)
            .header("Accept", "application/json")
            .end(function(result) {
                if(result.body.data) {
                    var data = result.body.data.children;
                    var info = "";
                    var c = count;
                    for(var i=0; i<c; i++) {
                        if(!data[i] || !data[i].data || !data[i].data.score) {
                            logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Subreddit not found or Reddit unavailable");
                            bot.sendMessage(msg.channel, "Surprisingly, I couldn't find anything in " + sub + " on reddit.");
                            return;
                        } else if(data[i].data.over_18 && configs.servers[msg.channel.server.id].admins.indexOf(msg.author.id)==-1 && configs.servers[msg.channel.server.id].nsfwfilter[0] && configs.servers[msg.channel.server.id].nsfwfilter[1].indexOf(msg.channel.id)==-1 && configs.servers[msg.channel.server.id].servermod) {
                            handleFiltered(msg, "NSFW");
                            return;
                        } else if(!data[i].data.stickied) {
                            info += "`" + data[i].data.score + "` " + data[i].data.title + " **" + data[i].data.author + "** *" + data[i].data.num_comments + " comments*";
                            info += ", https://redd.it/" + data[i].data.id + "\n";
                        } else {
                            c++;
                        }
                    }
                    bot.sendMessage(msg.channel, info);
                } else {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Subreddit not found or Reddit unavailable");
                    bot.sendMessage(msg.channel, "Surprisingly, I couldn't find anything in " + sub + " on reddit.");
                }
            });
        }
    },
    // Gets top (max 5) posts in given RSS feed name 
    "rss": {
        usage: "<site> [<count>]",
        process: function(bot, msg, suffix) {
            if(configs.servers[msg.channel.server.id].rss[0]) {
                var site = suffix.substring(0, suffix.indexOf(" "));
                var count = parseInt(suffix.substring(suffix.indexOf(" ")+1));

                if(site=="" || !site || isNaN(count)) {
                    site = suffix;
                    count = configs.servers[msg.channel.server.id].defaultcount;
                }
                getRSS(msg.channel.server.id, site, (count<1 || count>configs.servers[msg.channel.server.id].maxcount) ? configs.servers[msg.channel.server.id].defaultcount : count, function(err, articles) {
                    if(err) {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Feed " + site + " not found");
                        bot.sendMessage(msg.channel, msg.author + " Feed not found.");
                    } else {
                        var info = "";
                        for(var i=0; i<articles.length; i++) {
                            var tmpinfo = (articles[i].published instanceof Date ? ("`" + prettyDate(articles[i].published) + "`") : "") + " **"  + articles[i].title + "**\n" + articles[i].link + "\n";
                            if((tmpinfo.length + info.length)>2000) {
                                break;
                            } else {
                                info += tmpinfo;
                            }
                        }
                        bot.sendMessage(msg.channel, info);
                    }
                });
            }
        }
    },
    // Generates a random number
    "roll": {
        usage: "[<min inclusive>] [<max inclusive>]",
        process: function(bot, msg, suffix) {
            if(suffix.indexOf(" ")>-1) {
                var min = suffix.substring(0, suffix.indexOf(" "));
                var max = suffix.substring(suffix.indexOf(" ")+1);
            } else if(!suffix) {
                var min = 1;
                var max = 6;
            } else {
                var min = 0;
                var max = suffix;
            }
            var roll = getRandomInt(parseInt(min), parseInt(max));
            if(isNaN(roll)) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " provided nonsensical roll parameter");
                bot.sendMessage(msg.channel, msg.author + " Wut.");
            } else {
                bot.sendMessage(msg.channel, msg.author + " rolled a " + parseInt(roll));
            }
        }
    },
    // Uses goo.gl to shorten a URL
    "shorten": {
        usage: " <URL to shorten or decode>",
        process: function(bot, msg, suffix) {
            if(suffix) {
                if(suffix.toLowerCase().indexOf("http://goo.gl/")==0 || suffix.toLowerCase().indexOf("goo.gl/")==0) {
                    googl.expand(suffix).then(function(url) {
                        bot.sendMessage(msg.channel, url);
                    }).catch(function(err) {
                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to expand goo.gl URL");
                        bot.sendMessage(msg.channel, "An error occurred. *That's all we know.*");
                    });
                } else {
                    googl.shorten(suffix).then(function(url) {
                        bot.sendMessage(msg.channel, url);
                    }).catch(function(err) {
                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to shorten URL");
                        bot.sendMessage(msg.channel, "An error occurred. *That's all we know.*");
                    });
                }
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " did not provide URL for shorten command");
                bot.sendMessage(msg.channel, msg.author + " You humans are confusing. How am I supposed to know the URL?!");
            }
        }
    },
    // Enrolls in a giveaway
    "giveaway": {
        usage: "<name of giveaway>",
        process: function(bot, msg, suffix) {
            var g = getGiveaway(suffix);
            if(g) {
                if(g==msg.author.id) {
                    logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, msg.author.username + " tried to enroll in own giveaway " + giveaways[g].name);
                    bot.sendMessage(msg.channel, "Hey, you're the one who created that giveaway!");
                    return;
                }
                if(giveaways[g].enrolled.indexOf(msg.author.id)>-1) {
                    giveaways[g].enrolled.splice(giveaways[g].enrolled.indexOf(msg.author.id), 1);
                    logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Disenrolled " + msg.author.username + " in giveaway " + giveaways[g].name);
                    bot.sendMessage(msg.channel, msg.author + " I disenrolled you");
                } else {
                    giveaways[g].enrolled.push(msg.author.id);
                    logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Enrolled " + msg.author.username + " in giveaway " + giveaways[g].name);
                    bot.sendMessage(msg.channel, "Ok " + msg.author + " you've been entered to win!");
                }
            } else if(msg.content.indexOf(suffix)>-1) {
                var info = "Select one of the following:";
                var results = [];
                var count = 0;
                for(var usrid in giveaways) {
                    if(giveaways[usrid].channel==msg.channel.id) {
                        info += "\n\t" + count + ") " + giveaways[usrid].name;
                        results.push(giveaways[usrid].name);
                        count++;
                    }
                }
                if(count>0) {
                    bot.sendMessage(msg.channel, info);
                    selectMenu(msg.channel, msg.author.id, function(i) {
                        commands.giveaway.process(bot, msg, results[i]);
                    }, count-1);
                }
            }
        }
    },
    // Votes on an active poll in public
    "vote": {
        usage: " [<no. of choice>]",
        process: function(bot, msg, suffix) {
            var act = activePolls(msg.channel.id);
            if(!polls[act] || !polls[act].open) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Cannot vote when there is no active poll");
                bot.sendMessage(msg.channel, "There isn't an active poll in this channel. PM me `poll " + msg.channel.server.name + " " + msg.channel.name + "` to start one!");
            } else {
                if(!suffix) {
                    var ch = bot.channels.get("id", polls[act].channel);
                    var info = pollResults(act, "Ongoing results", "current leader");
                    info += "\nRemember, vote by typing `" + getPrefix(msg.channel.server) + "vote <no. of choice>`";
                    bot.sendMessage(ch, info);
                } else {
                    var vt = suffix;
                    if(isNaN(vt)) {
                        vt = polls[act].options.join().toLowerCase().split(",").indexOf(vt.toLowerCase());
                    }
                    if(polls[act].responderIDs.indexOf(msg.author.id)==-1 && vt<polls[act].options.length && vt>=0) {
                        polls[act].responses.push(vt);
                        polls[act].responderIDs.push(msg.author.id);
                        logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Vote cast for " + vt + " by " + msg.author.username);
                        bot.sendMessage(msg.channel, "Cast vote for `" + polls[act].options[vt] + "`");
                    } else {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Could not cast " + msg.author.username + "'s vote, duplicate or not an option");
                        bot.sendMessage(msg.channel, msg.author + " I couldn't cast your vote.");
                    }
                }
            }
        }
    },
    // Show list of games being played
    "games": {
        process: function(bot, msg) {
            if(configs.servers[msg.channel.server.id].stats) {
                var rawGames = {};
                for(var i=0; i<msg.channel.server.members.length; i++) {
                    if(msg.channel.server.members[i].id!=bot.user.id && getGame(msg.channel.server.members[i]) && msg.channel.server.members[i].status!="offline") {
                        if(!rawGames[getGame(msg.channel.server.members[i])]) {
                            rawGames[getGame(msg.channel.server.members[i])] = [];
                        }
                        rawGames[getGame(msg.channel.server.members[i])].push(getName(msg.channel.server, msg.channel.server.members[i]));
                    }
                }
                var games = [];
                for(var game in rawGames) {
                    var playingFor;
                    if(stats[msg.channel.server.id].games[game]) {
                        playingFor = secondsToString(stats[msg.channel.server.id].games[game] * 3000) + "this week"; 
                    }
                    games.push([game, rawGames[game], playingFor]);
                }
                games.sort(function(a, b) {
                    return a[1].length - b[1].length;
                });
                var info = "";
                for(var i=games.length-1; i>=0; i--) {
                    var tmpinfo = "**" + games[i][0] + "** (" + games[i][1].length + ")";
                    if(games[i][2]) {
                        tmpinfo+="\n*" + games[i][2] + "*";
                    }
                    for(var j=0; j<games[i][1].length; j++) {
                        tmpinfo += "\n\t@" + games[i][1][j];
                    }
                    tmpinfo += "\n";
                    if((tmpinfo.length + info.length)>2000) {
                        break;
                    } else {
                        info += tmpinfo;
                    }
                }
                bot.sendMessage(msg.channel, info);
            }
        }
    },
    // Get a user's full profile
    "profile": {
        usage: "<username, \"color\", or \"role\"> [<hex code to set or role name>]",
        process: function(bot, msg, suffix) {
            var usr;
            if(!suffix || suffix.toLowerCase()=="me") {
                usr = msg.author;
            } else if(suffix.indexOf("role")==0) {
                if(configs.servers[msg.channel.server.id].customroles[0]) {
                    var rolenm = suffix.substring(4).trim();
                    if(rolenm) { 
                        var roles = msg.channel.server.roles;
                        if(roles.get("name", rolenm)) {
                            if(bot.memberHasRole(msg.author, roles.get("name", rolenm)) && configs.servers[msg.channel.server.id].customroles[1].indexOf(roles.get("name", rolenm).id)>-1) {
                                bot.removeMemberFromRole(msg.author.id, roles.get("name", rolenm), function(err) {
                                    if(err) {
                                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to remove " + msg.author.username + " from role " + roles.get("name", rolenm).name);
                                        bot.sendMessage(msg.channel, msg.author + " I couldn't remove you from that role. Maybe I don't have role management permissions on this server.");
                                    } else {
                                        logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Removed " + msg.author.username + " from role " + roles.get("name", rolenm).name);
                                        bot.sendMessage(msg.channel, msg.author + " Ok, you no longer have the role `" + roles.get("name", rolenm).name + "`");
                                    }
                                });
                            } else if(configs.servers[msg.channel.server.id].customroles[1].indexOf(roles.get("name", rolenm).id)>-1) {
                                bot.addMemberToRole(msg.author, roles.get("name", rolenm).id, function(error) {
                                    if(error) {
                                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to add " + msg.author.username + " to role " + roles.get("name", rolenm).name);
                                        bot.sendMessage(msg.channel, msg.author + " I couldn't add you to that role. Maybe I don't have role management permissions on this server.");
                                    } else {
                                        logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Added " + msg.author.username + " to role " + roles.get("name", rolenm).name);
                                        bot.sendMessage(msg.channel, msg.author + " Ok, you now have the role `" + roles.get("name", rolenm).name + "`");
                                    }
                                });
                            } else {
                                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Cannot add " + msg.author.username + " to existing role " + roles.get("name", rolenm).name);
                                bot.sendMessage(msg.channel, msg.author + " I couldn't add you to that role since it already exists.");
                            }
                        } else if(configs.servers[msg.channel.server.id].customroles[2]) {
                            bot.createRole(msg.channel.server, {name: rolenm, hoist: true}, function(err, role) {
                                if(err) {
                                    logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to create role " + rolenm + " for " + msg.author.username);
                                    bot.sendMessage(msg.channel, msg.author + " I couldn't create that role. Maybe I don't have role management permissions on this server.");
                                } else {
                                    bot.addMemberToRole(msg.author, role, function(error) {
                                        if(error) {
                                            logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to add " + msg.author.username + " to role " + role.name);
                                            bot.sendMessage(msg.channel, msg.author + " I couldn't add you to that role. Maybe I don't have role management permissions on this server.");
                                        } else {
                                            logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Created and added " + msg.author.username + " to role " + role.name);
                                            bot.sendMessage(msg.channel, msg.author + " Ok, you now have the role `" + role.name + "`");
                                        }
                                    });
                                }
                            });
                        } else {
                            bot.sendMessage(msg.channel, "Setting custom roles is disabled in this server, sorry.");
                        }
                    } else {
                        if(configs.servers[msg.channel.server.id].customroles[1].length>0 || configs.servers[msg.channel.server.id].customroles[2]) {
                            info = "Select one of the following:";
                            var availableRoles = [];
                            for(var i=0; i<configs.servers[msg.channel.server.id].customroles[1].length; i++) {
                                var role = msg.channel.server.roles.get("id", configs.servers[msg.channel.server.id].customroles[1][i]);
                                if(role) {
                                    info += "\n\t" + availableRoles.length + ") " + role.name;
                                    availableRoles.push(role.name);
                                }
                            }
                            if(configs.servers[msg.channel.server.id].customroles[2]) {
                                info += "\n\t " + "*Custom roles*";
                            }
                            bot.sendMessage(msg.channel, info);
                            if(availableRoles.length>0) {
                                selectMenu(msg.channel, msg.author.id, function(i) {
                                    commands.profile.process(bot, msg, "role " + availableRoles[i]);
                                }, availableRoles.length-1);
                            }
                        } else {
                            bot.sendMessage(msg.channel, "Setting roles is disabled in this server, sorry.");
                        }
                    }
                } else {
                    bot.sendMessage(msg.channel, "Setting roles is disabled in this server, sorry.");
                }
                return;
            } else if(suffix.indexOf("color")==0 || suffix.indexOf("colour")==0) {
                if(configs.servers[msg.channel.server.id].customcolors || configs.servers[msg.channel.server.id].admins.indexOf(msg.author.id)>-1) {
                    var colornm = suffix.substring(suffix.indexOf("#")+1);
                    var rolenm = "color-" + msg.author.id.toString();
                    var roles = msg.channel.server.roles;
                    if(colornm && colornm.length==6) {
                        if(roles.get("name", rolenm)) {
                            bot.updateRole(roles.get("name", rolenm), {color: parseInt("0x" + colornm, 16)}, function(err, role) {
                                if(!err) {
                                    bot.addMemberToRole(msg.author, role, function(error) {
                                        logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Re-colored " + msg.author.username + " to #" + colornm);
                                        bot.sendMessage(msg.channel, msg.author + " Ok, you now have the color `#" + colornm + "`");
                                    });
                                } else {
                                    logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to re-color " + msg.author.username + " to #" + colornm);
                                    bot.sendMessage(msg.channel, msg.author + " Hmmm, I couldn't change your role color. Perhaps I don't have role management permissions on this server.");
                                }
                            });
                        } else {
                            bot.createRole(msg.channel.server, {color: parseInt("0x" + colornm, 16), hoist: false, name: rolenm}, function(err, role) {
                                if(!err) {
                                    bot.addMemberToRole(msg.author, role, function(error) {
                                        logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Colored " + msg.author.username + " to #" + colornm);
                                        bot.sendMessage(msg.channel, msg.author + " Ok, you now have the color `#" + colornm + "`");
                                    });
                                } else {
                                    logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to color " + msg.author.username + " to #" + colornm);
                                    bot.sendMessage(msg.channel, msg.author + " Hmmm, I couldn't set your role color. Perhaps I don't have role management permissions on this server.");
                                }
                            });
                        }
                    } else if(suffix.substring(suffix.indexOf(" ")+1)==".") {
                        bot.deleteRole(roles.get("name", rolenm), function(err) {
                            if(err) {
                                logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to remove color for " + msg.author.username);
                                bot.sendMessage(msg.channel, msg.author + " I couldn't remove your role color. Perhaps I don't have role management permissions on this server.");
                            } else {
                                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Removed color for " + msg.author.username);
                                bot.sendMessage(msg.channel, msg.author + " You don't have a color anymore! :P");
                            }
                        });
                    } else {
                        logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " did not provide color code for profile command");
                        bot.sendMessage(msg.channel, msg.author + " Please provide a hex code, preceded by a pound sign. Something like `" + getPrefix(msg.channel.server) + "profile color #FFFFFF`");
                    }
                } else {
                    bot.sendMessage(msg.channel, "Setting custom colors is disabled in this server, sorry.");
                }
                return;
            } else if(suffix.split(",").length>=2) {
                var key = suffix.substring(0, suffix.indexOf(",")).toLowerCase().trim();
                var value = suffix.substring(suffix.indexOf(",")+1).trim();
                if(!key || !value) {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " did not specify parameters for profile data");
                    bot.sendMessage(msg.channel, msg.author + " Uh, use the syntax `" + getPrefix(msg.channel.server) + "profile <key>,<value>`");
                } else if(["messages", "active", "seen", "mentions", "strikes"].indexOf(key)>-1) {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " tried to assign default stats profile value");
                    bot.sendMessage(msg.channel, msg.author + " You can't change the value for " + key);
                } else if(stats[msg.channel.server.id].members[msg.author.id] && stats[msg.channel.server.id].members[msg.author.id][key] && value==".") {
                    delete stats[msg.channel.server.id].members[msg.author.id][key];
                    logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Deleted key " + key + " from " + msg.author.username + "'s stats profile");
                    bot.sendMessage(msg.channel, "*Poof, gone.*");
                } else {
                    stats[msg.channel.server.id].members[msg.author.id][key] = value;
                    logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Saved new key " + key + " in " + msg.author.username + "'s stats profile");
                    bot.sendMessage(msg.channel, "K, TIL.");
                }
                return;
            } else {
                usr = userSearch(suffix, msg.channel.server);
            }
            if(usr) {
                var data = getProfile(usr, msg.channel.server);
                var info = "";
                for(var sect in data) {
                    info += "**" + sect + ":**\n";
                    for(var key in data[sect]) {
                        info += "\t" + key + ": " + data[sect][key] + "\n";
                    }
                }
                bot.sendMessage(msg.channel, info);
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Requested member does not exist so profile cannot be shown");
                bot.sendMessage(msg.channel, "That user doesn't exist :/");
            }
        }
    },
    // Quickly get the number of messages a user has
    "messages": {
        usage: "<username>",
        process: function(bot, msg, suffix) {
            if(configs.servers[msg.channel.server.id].stats) {
                var usr;
                if(!suffix) {
                    var memberMessages = [];
                    for(var usrid in stats[msg.channel.server.id].members) {
                        usr = msg.channel.server.members.get("id", usrid);
                        if(usr && stats[msg.channel.server.id].members[usrid].messages>0) { 
                            memberMessages.push([getName(msg.channel.server, usr), stats[msg.channel.server.id].members[usrid].messages]); 
                        }
                    }
                    memberMessages.sort(function(a, b) {
                        return a[1] - b[1];
                    });
                    var info = "";
                    for(var i=memberMessages.length-1; i>=0; i--) {
                        var tmpinfo = "**@" + memberMessages[i][0] + "**: " + memberMessages[i][1] + " message" + (memberMessages[i][1]==1 ? "" : "s") + " this week\n";
                        if((tmpinfo.length + info.length)>2000) {
                            break;
                        } else {
                            info += tmpinfo;
                        }
                    }
                    bot.sendMessage(msg.channel, info);
                    return;
                }
                if(suffix.toLowerCase()=="me") {
                    usr = msg.author;
                } else {
                    usr = userSearch(suffix, msg.channel.server);
                }
                if(usr) {
                    checkStats(usr.id, msg.channel.server.id);
                    bot.sendMessage(msg.channel, "**@" + getName(msg.channel.server, usr) + "** has sent `" + stats[msg.channel.server.id].members[usr.id].messages + "` message" + (stats[msg.channel.server.id].members[usr.id].messages==1 ? "" : "s") + " on this server this week");
                } else {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Requested member does not exist so number of messages cannot be shown");
                    bot.sendMessage(msg.channel, "That user doesn't exist :/");
                }
            }
        }
    },
    // Quickly gets a user's avatar
    "avatar": {
        usage: "<username> [imgur]",
        process: function(bot, msg, suffix) {
            var usr;
            if(!suffix || suffix.toLowerCase()=="me") {
                usr = msg.author;
            } else {
                usr = userSearch(suffix, msg.channel.server);
            }
            if(usr) {
                var useImgur = suffix.length>5 && suffix.substring(suffix.length-5).toLowerCase()=="imgur";
                if(!usr.avatarURL) {
                    bot.sendFile(msg.channel, "http://i.imgur.com/fU70HJK.png");
                } else {
                    if(useImgur) {
                        imgur.upload(usr.avatarURL, function(err, res) {
                            if(err) {
                                bot.sendFile(msg.channel, usr.avatarURL);
                            } else {
                                bot.sendFile(msg.channel, res.data.link);
                            }
                        });
                    } else {
                        bot.sendFile(msg.channel, usr.avatarURL);
                    }
                }
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Requested member does not exist so avatar cannot be shown");
                bot.sendMessage(msg.channel, "I don't know who that is, so you can look at my beautiful face instead:", function() {
                    bot.sendFile(msg.channel, bot.user.avatarURL || "http://i.imgur.com/fU70HJK.png");
                });
            }
        }
    },
    // Google Play Store bot
    "linkme": {
        usage: "<app1>[,<app2>,...]",
        process: function(bot, msg, suffix) {
            var apps = getAppList(suffix);
            if(apps.length>0) {
                for(var i=0; i<apps.length; i++) {
                    var basePath = "https://play.google.com/store/search?&c=apps&q=" + apps[i] + "&hl=en";
                    var data;
                    // Scrapes Play Store search results webpage for information
                    var u;
                    unirest.get(basePath)
                    .end(function(response) {
                        data = scrapeSearch(response.raw_body);
                        var send = "";
                        if(data.items[0]) {
                            send = data.items[0].name + " by " + data.items[0].company + ", ";
                            if(data.items[0].price.indexOf("$")>-1) {
                                send += data.items[0].price.substring(0, data.items[0].price.lastIndexOf("$"));
                            } else {
                                send += "free"
                            }
                            send += " and rated " + data.items[0].rating + " stars: " + data.items[0].url + "\n";
                        } else {
                            logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "App " + apps[i] + " not found to link for " + msg.author.username);
                            send = msg.author + " Sorry, no such app exists.\n";
                        }
                        bot.sendMessage(msg.channel, send);
                    });
                }
            } else {
                bot.sendMessage(msg.channel, "https://play.google.com/store/apps");
            }
        }
    },
    // Apple App Store bot
    "appstore": {
        usage: "<app1>[,<app2>,...]",
        process: function(bot, msg, suffix) {
            var apps = getAppList(suffix);
            if(apps.length>0) {
                for(var i=0; i<apps.length; i++) {
                    itunes({
                        entity: "software",
                        country: "US",
                        term: apps[i],
                        limit: 1
                    }, function (err, data) {
                        var send = "";
                        if(!err) {
                            send = data.results[0].trackCensoredName + " by " + data.results[0].artistName + ", " + data.results[0].formattedPrice + " and rated " + data.results[0].averageUserRating + " stars: " + data.results[0].trackViewUrl + "\n";
                        } else {
                            logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "App " + apps[i] + " not found to link for " + msg.author.username);
                            send = msg.author + " Sorry, no such app exists.\n";
                        }
                        bot.sendMessage(msg.channel, send);
                    });
                }
            } else {
                bot.sendMessage(msg.channel, "http://www.apple.com/itunes/charts/free-apps/");
            }
        }
    },
    // Quickly gets a user's points
    "points": {
        usage: "[<username or \"lottery\">]",
        process: function(bot, msg, suffix) {
            // Show points for user
            var usr;
            if(!suffix) {
                var memberPoints = [];
                for(var usrid in profileData) {
                    usr = msg.channel.server.members.get("id", usrid);
                    if(usr && profileData[usr.id].points>0) { 
                        memberPoints.push([getName(msg.channel.server, usr), profileData[usr.id].points]); 
                    }
                }
                memberPoints.sort(function(a, b) {
                    return a[1] - b[1];
                });
                var info = "";
                for(var i=memberPoints.length-1; i>=0; i--) {
                    var tmpinfo = "**@" + memberPoints[i][0] + "**: " + memberPoints[i][1] + " AwesomePoint" + (memberPoints[i][1]==1 ? "" : "s") + "\n";
                    if((tmpinfo.length + info.length)>2000) {
                        break;
                    } else {
                        info += tmpinfo;
                    }
                }
                bot.sendMessage(msg.channel, info);
                return;
            // PointsBall lottery game!
            } else if(suffix=="lottery" && configs.servers[msg.channel.server.id].lottery) {
                // Start new lottery in server (winner in 60 minutes)
                if(!lottery[msg.channel.server.id]) {
                    lottery[msg.channel.server.id] = {
                        members: [],
                        timestamp: new Date().getTime(),
                        timer: setTimeout(function() {
                            endLottery(msg.channel);
                        }, 3600000)
                    };
                    logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Lottery started, ends in 60 minutes");
                }
                
                // Buy a lottery ticket
                if(!profileData[msg.author.id]) {
                    profileData[msg.author.id] = {
                        points: 0
                    }
                }
                var cost = pointsball<500 ? Math.ceil(pointsball/7) : Math.ceil(pointsball/10)
                if(profileData[msg.author.id].points>=cost) {
                    profileData[msg.author.id].points -= cost;
                    lottery[msg.channel.server.id].members.push(msg.author.id);
                    logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, msg.author.username + " bought a lottery ticket");
                    bot.sendMessage(msg.channel, msg.author + " Thanks for buying a PointsBall ticket. That cost you " + cost + " points. The lottery will end in " + secondsToString((lottery[msg.channel.server.id].timestamp + 3600000 - new Date().getTime())/1000));
                    saveData("./data/profiles.json", function(err) {
                        if(err) {
                            logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + msg.author.username);
                        }
                    });
                } else {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " does not have enough points to buy a lottery ticket");
                    bot.sendMessage(msg.channel, msg.author + " You're not rich enough to participate in the 1%-only lottery :P");
                }
                return;
            } else if(suffix=="lottery end") {
                // End lottery and pick winner
                if(lottery[msg.channel.server.id]) {
                    clearTimeout(lottery[msg.channel.server.id].timer);
                    endLottery(msg.channel);
                } else {
                    logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Cannot end lottery, not started");
                    bot.sendMessage(msg.channel, msg.author + " A lottery hasn't been started yet in this server. Please use `" + getPrefix(msg.channel.server) + "points lottery` to start one.");
                }
                return;
            } else if(suffix.toLowerCase()=="me") {
                usr = msg.author;
            } else {
                usr = userSearch(suffix, msg.channel.server);
            }
            if(usr) {
                if(!profileData[usr.id]) {
                    profileData[usr.id] = {
                        points: 0
                    }
                    saveData("./data/profiles.json", function(err) {
                        if(err) {
                            logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + usr.username);
                        }
                    });
                }
                bot.sendMessage(msg.channel, "**@" + getName(msg.channel.server, usr) + "** has `" + profileData[usr.id].points + "` AwesomePoint" + (profileData[usr.id].points==1 ? "" : "s"));
            } else {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "Requested member does not exist so profile cannot be shown");
                bot.sendMessage(msg.channel, "That user doesn't exist :confused:");
            }
        }
    },
    // List ranks with users
    "ranks": {
        usage: "[<username or rank>]",
        process: function(bot, msg, suffix) {
            var usr;
            if(!suffix) {
                var info = "";
                for(var i=configs.servers[msg.channel.server.id].rankslist.length-1; i>=0; i--) {
                    var membersWithRank = getMembersWithRank(msg.channel.server, configs.servers[msg.channel.server.id].rankslist[i]);
                    if(membersWithRank.length>0) {
                        membersWithRank.sort(function(a, b) {
                            b = a[0].toUpperCase();
                            a = b[0].toUpperCase();
                            return a < b ? -1 : a > b ? 1 : 0;
                        });
                        var tmpinfo = "**" + configs.servers[msg.channel.server.id].rankslist[i].name + "** (" + membersWithRank.length + ")\n" + membersWithRank.join("");
                        if((tmpinfo.length + info.length)>2000) {
                            break;
                        } else {
                            info += tmpinfo;
                        }
                    }
                }
                bot.sendMessage(msg.channel, info);
                return;
            } else if(suffix.toLowerCase()=="me") {
                usr = msg.author;
            } else {
                usr = userSearch(suffix, msg.channel.server);
            }
            if(usr) {
                bot.sendMessage(msg.channel, "**@" + getName(msg.channel.server, usr) + "** has rank `" + stats[msg.channel.server.id].members[msg.author.id].rank + "`");
            } else {
                for(var i=configs.servers[msg.channel.server.id].rankslist.length-1; i>=0; i--) {
                    if(suffix.toLowerCase()==configs.servers[msg.channel.server.id].rankslist[i].name.toLowerCase()) {
                        var membersWithRank = [];
                        for(var usrid in stats[msg.channel.server.id].members) {
                            if(stats[msg.channel.server.id].members[usrid].rank==configs.servers[msg.channel.server.id].rankslist[i].name) {
                                var usr = msg.channel.server.members.get("id", usrid);
                                if(usr) {
                                    membersWithRank.push("\t@" + getName(msg.channel.server, usr) + "\n");
                                }
                            }
                        }
                        if(membersWithRank.length>0) {
                            membersWithRank.sort(function(a, b) {
                                b = a[0].toUpperCase();
                                a = b[0].toUpperCase();
                                return a < b ? -1 : a > b ? 1 : 0;
                            });
                            bot.sendMessage(msg.channel, "**" + configs.servers[msg.channel.server.id].rankslist[i].name + "** (" + membersWithRank.length + ")\n" + membersWithRank.join(""));
                        } else {
                            bot.sendMessage(msg.channel, "No one has the rank `" + configs.servers[msg.channel.server.id].rankslist[i].name + "`.");
                        }
                        return;
                    }
                }

                var rankOptions = [];
                for(var i=0; i<configs.servers[msg.channel.server.id].rankslist.length; i++) {
                    rankOptions.push(i + ") " + configs.servers[msg.channel.server.id].rankslist[i].name);
                }
                bot.sendMessage(msg.channel, "Select one of the following:\n\t" + rankOptions.join("\n\t"));
                selectMenu(msg.channel, msg.author.id, function(i) {
                    commands.ranks.process(bot, msg, rankOptions[i].substring(rankOptions[i].indexOf(")")+2));
                }, rankOptions.length-1);
            }
        }
    },
    // Gets a joke from the Interwebs
    "joke": {
        process: function(bot, msg) {
            jokesearch.getJoke(function(joke) {
                bot.sendMessage(msg.channel, joke);
            });
        }
    },
    "translate": {
        usage: "<text> <source lang> to <target lang>",
        process: function(bot, msg, suffix) {
            var toi = suffix.lastIndexOf(" to ");
            if(toi==-1) {
                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, "User used incorrect translation syntax");
                bot.sendMessage(msg.channel, msg.author + " Sorry, I didn't get that. Make sure you're using the right syntax: `" + getPrefix(msg.channel.server) + "<text> <source lang> to <target lang>`");
            } else {
                var target = suffix.substring(suffix.lastIndexOf(" to ")+4);
                suffix = suffix.substring(0, suffix.lastIndexOf(" to "));
                var source = suffix.substring(suffix.lastIndexOf(" ")+1);
                var text = suffix.substring(0, suffix.lastIndexOf(" "));
                
                bingTranslate.translate(text, source, target, function(err, result) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to translate '" + text + "'");
                        bot.sendMessage(msg.channel, "I got an error when I tried to translate that. I probably don't support that language.");
                    } else {
                        bot.sendMessage(msg.channel, "`" + result.translated_text + "`");
                    }
                });
            }
        }
    },
    // Displays list of options and RSS feeds
    "help": {
        usage: "[<command name>] [\"public\"]",
        process: function(bot, msg, suffix) {
            if(!suffix) {
                sendArray(msg.author, ["Use the syntax `" + getPrefix(msg.channel.server) + "<command> <params>` (without the angle brackets) in the main chat. The following commands are available:"].concat(getHelp(msg.channel.server, msg.author)));
                bot.sendMessage(msg.channel, msg.author + " Check your PMs");
            } else if(suffix.toLowerCase()=="public") {
                sendArray(msg.channel, ["Use the syntax `" + getPrefix(msg.channel.server) + "<command> <params>` (without the angle brackets). The following commands are available:"].concat(getHelp(msg.channel.server, msg.author)));
            } else {
                if(suffix.indexOf(" ")>-1 && suffix.substring(suffix.indexOf(" ")+1).toLowerCase()=="public" && suffix.substring(0, suffix.indexOf(" "))) {
                    bot.sendMessage(msg.channel, getCommandHelp(msg.channel.server, suffix.substring(0, suffix.indexOf(" ")).toLowerCase()));
                } else {
                    bot.sendMessage(msg.author, getCommandHelp(msg.channel.server, suffix.toLowerCase()));
                    bot.sendMessage(msg.channel, msg.author + " Check your PMs");
                }
            }
        }
    }
};

var pmcommands = {
    // Configuration options in wizard or online for maintainer and admins
    "config": {
        usage: "[<server>]",
        process: function(bot, msg, suffix) {
            // Maintainer control panel for overall bot things
            if(msg.author.id==configs.maintainer && !suffix && !maintainerconsole) {
                logMsg(new Date().getTime(), "INFO", "General", null, "Maintainer console opened");
                if(configs.hosting) {
                    if(!onlineconsole[msg.author.id] && !adminconsole[msg.author.id]) {
                        onlineconsole[msg.author.id] = {
                            token: genToken(30),
                            type: "maintainer",
                            timer: setTimeout(function() {
                                logMsg(new Date().getTime(), "INFO", "General", null, "Timeout on online maintainer console");
                                delete onlineconsole[msg.author.id];
                            }, 300000)
                        };
                    } else if(onlineconsole[msg.author.id]) {
                        bot.sendMessage(msg.channel, "You already have an online console session open. Logout of that first or wait 5 minutes...");
                        return;
                    } else if(adminconsole[msg.author.id]) {
                        bot.sendMessage(msg.channel, "One step at a time...Finish configuring this server, then come back later!");
                        return;
                    }
                    
                    var url = (configs.hosting.charAt(configs.hosting.length-1)=='/' ? configs.hosting.substring(0, configs.hosting.length-1) : configs.hosting) + "?auth=" + onlineconsole[msg.author.id].token;
                    bot.sendMessage(msg.channel, url);
                } else {
                    bot.sendMessage(msg.channel, "You have not provided a hosting URL in the bot config, so the maintainer console is not available.");
                }
            }
            
            // Admin control panel, check to make sure the config command was valid
            if(suffix) {
                var svr = serverSearch(suffix, msg.author);
                // Check if specified server exists
                if(!svr) {
                    bot.sendMessage(msg.channel, "Sorry, invalid server. Try again?");
                // Check if sender is an admin of the specified server
                } else if(configs.servers[svr.id].admins.indexOf(msg.author.id)>-1) {
                    // Check to make sure no one is already using the console
                    if(onlineconsole[msg.author.id] || adminconsole[msg.author.id]) {
                        bot.sendMessage(msg.channel, "You already have an online console session open. Logout of that first or wait 5 minutes...");
                        return;
                    }
                    if(!activeAdmins(svr.id)) {
                        // Ok, all conditions met, logged into admin console
                        if(configs.hosting) {
                            logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Admin console launched for " + svr.name);
                            adminconsole[msg.author.id] = svr.id;
                            onlineconsole[msg.author.id] = {
                                token: genToken(30),
                                type: "admin",
                                svrid: svr.id,
                                timer: setTimeout(function() {
                                    logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Timeout on online admin console for " + svr.name);
                                    delete adminconsole[msg.author.id];
                                    delete onlineconsole[msg.author.id];
                                }, 300000)
                            };
                            
                            var url = (configs.hosting.charAt(configs.hosting.length-1)=='/' ? configs.hosting.substring(0, configs.hosting.length-1) : configs.hosting) + "?auth=" + onlineconsole[msg.author.id].token;
                            bot.sendMessage(msg.channel, url);
                        } else {
                            bot.sendMessage(msg.channel, "The bot maintainer has not provided a hosting URL, so the admin console is not available.");
                        }
                    } else {
                        logMsg(new Date().getTime(), "WARN", null, msg.author.id, "Admin console for " + svr.name + " already active");
                        bot.sendMessage(msg.channel, "Another admin is in the console already. Please try again later.");
                    }
                } else {
                    logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User is not a bot admin of " + svr.name);
                    bot.sendMessage(msg.channel, "You are not an admin for that server.");
                }
            }
        }
    },
    // Set a reminder with natural language
    "remindme": {
        usage: commands.remindme.usage,
        process: function(bot, msg, suffix) {
            if(suffix) {
                parseReminder(suffix, msg.author, msg.channel);
            } else {
                logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User did provide remindme parameters");
                bot.sendMessage(msg.channel, "You know - I don't like people like you, expecting me to do things without even giving me any info!");
            }
        }
    },
    // Lists all active reminders
    "reminders": {
        usage: "[<reminder note to cancel>]",
        process: function(bot, msg, suffix) {
            if(!suffix) {
                var info = "";
                for(var i=0; i<reminders.length; i++) {
                    if(reminders[i].user==msg.author.id) {
                        info += "**" + reminders[i].note + "** in " + secondsToString((reminders[i].time - new Date().getTime()) / 1000) + "\n";
                    }
                }
                if(!info) {
                    info = "Hmmm, you haven't set any reminders recently. Reply with `remindme <no.> <h, m, or s> <note>` to set one.";
                }
                bot.sendMessage(msg.author, info);
            } else {
                for(var i=0; i<reminders.length; i++) {
                    if(reminders[i].user==msg.author.id && reminders[i].note.toLowerCase()==suffix.toLowerCase()) {
                        logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Cancelled reminder set at " + prettyDate(new Date(reminders[i].time)));
                        reminders.splice(i, 1);
                        bot.sendMessage(msg.author, "Got it, I won't remind you.");
                        return;
                    }
                }
                logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Could not find matching reminder to cancel");
                bot.sendMessage(msg.author, "Sorry, I couldn't find a reminder like that. Use `remindme <no.> <h, m, or s> " + suffix + "` to set it.");
            }
        }
    },
    // Modify the value for a key in a user's profile
    "profile": {
        usage: "<key>|<value or \".\">",
        process: function(bot, msg, suffix) {
            if(suffix) {
                if(msg.content.indexOf("|")==-1) {
                    logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User did not specify parameters for profile data");
                    bot.sendMessage(msg.channel, "Please include the name of the value as well as the value itself, separated by a comma.");
                    return;
                }
                var key = msg.content.substring(8, msg.content.indexOf("|")).trim();
                var value = msg.content.substring(msg.content.indexOf("|")+1).trim();
                if(["id", "status", "points", "afk", "past names", "svrnicks"].indexOf(key.toLowerCase())>-1) {
                    logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User tried to assign default profile value");
                    bot.sendMessage(msg.channel, "You can't change the value for " + key);
                    return;
                }
                var info = "";
                if(value=="." && profileData[msg.author.id]) {
                    if(!profileData[msg.author.id][key]) {
                        logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User tried to delete a nonexistent profile value");
                        bot.sendMessage(msg.channel, "I didn't have anything for " + key + " in the first place.");
                        return;
                    }
                    info = "Deleted.";
                    delete profileData[msg.author.id][key];
                } else {
                    if(!profileData[msg.author.id]) {
                        profileData[msg.author.id] = {
                            points: 0
                        };
                    }
                    info = "Alright, got it! PM me `profile " + key + "|.` to delete that.";
                    profileData[msg.author.id][key] = value;
                }
                saveData("./data/profiles.json", function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + msg.author.username);
                        bot.sendMessage(msg.channel, "Uh-oh, something went wrong. It wasn't you though.");
                    } else {
                        logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Saved new key " + key + " in profile");
                        bot.sendMessage(msg.channel, info);
                    }
                });
            } else {
                logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User did not provide profile parameters");
                bot.sendMessage(msg.channel, "C'mon, I need something to work with here!");
            }
        }
    },
    // Discreet say command
    "say": {
        usage: "<server> <channel> <something to say>",
        process: function(bot, msg, suffix) {
            if(suffix) {
                var svrnm = msg.content.substring(msg.content.indexOf(" ")+1);
                var svr;
                do {
                    svrnm = svrnm.substring(0, svrnm.lastIndexOf(" "));
                    svr = serverSearch(svrnm, msg.author);
                } while(!svr && svrnm.length>0);
                if(!svr) {
                    bot.sendMessage(msg.channel, "Huh, that's not a server I know of.");
                    return;
                }
                if(configs.servers[svr.id].admins.indexOf(msg.author.id)==-1) {
                    logMsg(new Date().getTime(), "WARN", null, msg.author.id, "Cannot say because user is not a bot admin in " + svr.name);
                    bot.sendMessage(msg.channel, "You're not an admin in that server :P");
                    return;
                }
                var chnm = msg.content.substring(svrnm.length+5);
                chnm = chnm.substring(0, chnm.indexOf(" "));
                var ch = svr.channels.get("name", chnm);
                if(!ch) {
                    logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User provided invalid channel for discreet say");
                    bot.sendMessage(msg.channel, "There's no such channel on " + svr.name);
                    return;
                }
                var suffix = msg.content.substring(svrnm.length+chnm.length+6);
                if(!suffix) {
                    logMsg(new Date().getTime(), "WARN", null, msg.author.id, "No discreet message to say in " + svr.name + ", " + ch.name);
                    bot.sendMessage(msg.channel, "Idk what to say...Please use the syntax `say " + svr.name + " " + ch.name + " <something to say>`");
                    return;
                }
                bot.sendMessage(msg.channel, "Alright, check #" + ch.name)
                bot.sendMessage(ch, suffix);
                logMsg(new Date().getTime(), "INFO", svr.id, ch.id, "Saying '" + suffix + "' at admin's request via PM");
            } else {
                logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User did provide parameters for discreet say command");
                bot.sendMessage(msg.channel, "Whaaaa...Make sure you read the help section for this command. I need a server, channel, and something to say (in that order).");
            }
        }
    },
    // Start a giveaway
    "giveaway": {
        usage: "<server> <channel> <name of giveaway>|<secret>[|<giveaway duration>]",
        process: function(bot, msg, suffix) {
            if(suffix) {
                if(suffix.toLowerCase()=="close") {
                    if(giveaways[msg.author.id]) {
                        endGiveaway(msg.author);
                    } else {
                        logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User tried to close nonexistent giveaway");
                        bot.sendMessage(msg.channel, "You haven't started a giveaway yet. Use `giveaway <server> <channel> <name of giveaway>|<secret>`");
                    }
                    return;
                }
                if(giveaways[msg.author.id]) {
                    logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User already has a giveaway open and cannot start new one");
                    bot.sendMessage(msg.channel, "You already have a giveaway open. Use `giveaway close` to end it.");
                    return;
                }
                var svrnm = msg.content.substring(msg.content.indexOf(" ")+1);
                var svr;
                do {
                    svrnm = svrnm.substring(0, svrnm.lastIndexOf(" "));
                    svr = serverSearch(svrnm, msg.author);
                } while(!svr && svrnm.length>0);
                if(!svr) {
                    bot.sendMessage(msg.channel, "Huh, that's not a server I know of.");
                    return;
                }
                if(configs.servers[svr.id].admincommands.indexOf("giveaway")>-1 && configs.servers[svr.id].admins.indexOf(msg.author.id)==-1) {
                    logMsg(new Date().getTime(), "WARN", null, msg.author.id, "Cannot start giveaway because user is not a bot admin in " + svr.name);
                    bot.sendMessage(msg.channel, "You're not an admin in that server :P");
                    return;
                }
                var chnm = suffix.substring(svrnm.length+1);
                chnm = chnm.substring(0, chnm.indexOf(" "));
                var ch = svr.channels.get("name", chnm);
                if(!ch) {
                    logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User provided invalid channel for giveaway");
                    bot.sendMessage(msg.channel, "There's no such channel on " + svr.name);
                    return;
                }
                if(!configs.servers[svr.id].giveaway || (configs.servers[svr.id].chrestrict[ch.id] && configs.servers[svr.id].chrestrict[ch.id].indexOf("giveaway")>-1)) {
                    bot.sendMessage(msg.channel, "Giveaways aren't allowed on #" + ch.name + " in " + svr.name + ". They encourage hoarding over there, I guess.");
                    return;
                }
                var suffix = suffix.substring(svrnm.length+1);
                suffix = suffix.substring(suffix.indexOf(" "));
                if([2, 3].indexOf(suffix.split("|").length)>-1) {
                    var time = {
                        num: 1,
                        time: "hour",
                        countdown: 3600000
                    };
                    if(suffix.split("|")[2]) {
                        time = parseTime(suffix.split("|")[2]);
                        if(!time) {
                            logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User provided invalid giveaway time");
                            bot.sendMessage(msg.channel, "For the giveaway duration, use the syntax `<no.> <h, m, or s>`");   
                            return;
                        } else if(time.countdown>14400000) {
                            logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User provided excessively large giveaway time");
                            bot.sendMessage(msg.channel, "It's probably not a good idea to make the giveaway last more than 4 hours...");   
                            return;
                        }
                    }

                    if(!suffix.split("|")[0] || !suffix.split("|")[1]) {
                        logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User did not provide giveaway name and/or secret");    
                        bot.sendMessage(msg.channel, "I need a name and secret as well, separated by `|`.");
                        return;
                    }
                    if(getGiveaway(suffix.split("|")[0].trim())) {
                        logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User tried to overwrite existing giveaway");    
                        bot.sendMessage(msg.channel, "A giveaway with that name already exists on the server; pick a different name.");
                        return;
                    }
                    
                    logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Started giveaway " + suffix.split("|")[0].trim() + " for " + time.num + " " + time.time);
                    giveaways[msg.author.id] = {
                        name: suffix.split("|")[0].trim(),
                        secret: suffix.split("|")[1],
                        channel: ch.id,
                        enrolled: []
                    };
                    bot.sendMessage(msg.author, "Gotcha, giveaway started in #" + ch.name + " of " + svr.name);
                    bot.sendMessage(ch, "**" + msg.author + " has started a giveaway: " + suffix.split("|")[0].trim()+ ".** Use `" + getPrefix(svr) + "giveaway " + suffix.split("|")[0].trim() + "` for a chance to win!");

                    setTimeout(function() {
                        endGiveaway(msg.author);
                    }, time.countdown);
                } else {
                    logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User used invalid giveaway syntax");
                    bot.sendMessage(msg.channel, "Please use `giveaway " + svr.name + " " + ch.name + " <name of giveaway>|<secret>[|<giveaway duration>]");   
                }
            } else {
                logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User did not provide parameters for giveaway command");
                bot.sendMessage(msg.channel, "Whaaaa...Make sure you read the help section for this command. I need a server, channel, and giveaway parameters.");
            }
        }
    },
    // Set a shortcut for a server
    "servernick": {
        usage: "<nickname>|<server or \".\">",
        process: function(bot, msg, suffix) {
            if(suffix && suffix.split("|").length==2 && suffix.split("|")[0] && suffix.split("|")[1]) {
                if(profileData[msg.author.id] && profileData[msg.author.id].svrnicks && profileData[msg.author.id].svrnicks[suffix.split("|")[0].toLowerCase()]) {
                    if(suffix.split("|")[1]==".") {
                        delete profileData[msg.author.id].svrnicks[suffix.split("|")[0].toLowerCase()];
                        saveData("./data/profiles.json", function(err) {
                            if(err) {
                                logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + msg.author.username);
                            }
                        });
                        logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Deleted shortcut '" + suffix.split("|")[0] + "'");
                        bot.sendMessage(msg.channel, "Alrighty!");
                    } else {
                        logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User tried to overwrite server nick");
                        bot.sendMessage(msg.channel, "You already have a server set for that shortcut, use `servernick " + suffix.split("|")[0] + "|.` to remove it.");
                    }
                    return;
                }
                var svr = serverSearch(suffix.split("|")[1], msg.author);
                if(svr) {
                    if(!profileData[msg.author.id]) {
                        profileData[msg.author.id] = {
                            points: 0
                        };
                    }
                    if(!profileData[msg.author.id].svrnicks) {
                        profileData[msg.author.id].svrnicks = {};
                    }
                    profileData[msg.author.id].svrnicks[suffix.split("|")[0].toLowerCase()] = svr.id;
                    saveData("./data/profiles.json", function(err) {
                        if(err) {
                            logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + msg.author.username);
                        }
                    });
                    logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Created server nick '" + suffix.split("|")[0] + "' for " + svr.name);
                    bot.sendMessage(msg.channel, "You will now be able to use `" + suffix.split("|")[0] + "` to access " + svr.name);
                } else {
                    bot.sendMessage(msg.channel, "Check ur priv bruh");
                }
            } else {
                logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User provided invalid servernick parameters");
                bot.sendMessage(msg.channel, "I got nothin for ya bro, make sure you're using the right syntax: `servernick <nickname>|<server or \".\">`");
            }
        }
    },
    // Strawpoll-like poll creation
    "poll": {
        usage: "<server> <channel>",
        process: function(bot, msg, suffix) {
            // End poll if it has been initialized previously
            if(polls[msg.author.id] && msg.content.toLowerCase().indexOf("poll close")==0) {
                bot.sendMessage(msg.channel, "Poll ended.");
                var ch = bot.channels.get("id", polls[msg.author.id].channel);
                
                // Displays poll results if voting had occurred
                if(polls[msg.author.id].open) {
                    bot.sendMessage(ch, pollResults(msg.author.id, "The results are in", "and the winner is"));
                }

                // Clear out all the poll stuff
                delete polls[msg.author.id];
                logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Poll ended in " + ch.name + ", " + ch.server.name);
                return;
            }
            // Starts a poll in a given channel via private message
            if(msg.author.id!=bot.user.id && msg.content.toLowerCase().indexOf("poll")==0) {
                var svr = serverSearch(msg.content.substring(msg.content.indexOf(" ")+1, msg.content.lastIndexOf(" ")), msg.author);
                if(!svr || !svr.members.get("id", msg.author.id)) {
                    bot.sendMessage(msg.channel, "That server doesn't exist or I'm not on it.");
                } else if(configs.servers[svr.id].blocked.indexOf(msg.author.id)==-1) {
                    var ch = svr.channels.get("name", msg.content.substring(msg.content.lastIndexOf(" ")+1));
                    if(!ch) {
                        logMsg(new Date().getTime(), "WARN", null, msg.author.id, "Invalid channel provided for new poll");
                        bot.sendMessage(msg.channel, "Invalid channel.");
                    } else if(stats[svr.id].botOn[ch.id]) {
                        if(configs.servers[svr.id].poll && (configs.servers[svr.id].admincommands.indexOf("poll")==-1 || configs.servers[svr.id].admins.indexOf(msg.author.id)>-1) && (!configs.servers[svr.id].chrestrict[ch.id] || configs.servers[svr.id].chrestrict[ch.id].indexOf("poll")==-1)) {
                            if(polls[msg.author.id]) {
                                logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User has already started a poll");
                                bot.sendMessage(msg.channel, "You've already started a poll. Close it before starting a new one.");
                            } else if(!activePolls(ch.id)) {
                                polls[msg.author.id] = {
                                    open: false,
                                    timestamp: new Date().getTime(),
                                    channel: ch.id,
                                    title: "",
                                    options: [],
                                    responderIDs: [],
                                    responses: []
                                };
                                if(!stats[svr.id].commands.poll) {
                                    stats[svr.id].commands.poll = 0;
                                }
                                stats[svr.id].commands.poll++;
                                logMsg(new Date().getTime(), "INFO", ch.server.id, ch.id, "Poll started by " + msg.author.username);
                                bot.sendMessage(msg.channel, "Enter the poll title or question:");
                            } else {
                                logMsg(new Date().getTime(), "WARN", null, msg.author.id, "Poll already active in " + ch.name + ", " + ch.server.name);
                                bot.sendMessage(msg.channel, "There's already a poll going on in that channel. Try again later.");
                            }
                        } else {
                            bot.sendMessage(msg.channel, "Polls aren't allowed over there. To hell with surveys!");
                        }
                    }
                }
            }
        }
    },
    // Discreetly vote on an active poll
    "vote": {
        usage: "<server> <channel> <no. of choice>",
        process: function(bot, msg, suffix) {
            try {
                var vt = suffix.substring(suffix.lastIndexOf(" ")+1);
                suffix = suffix.substring(0, suffix.lastIndexOf(" "));
                var chnm = suffix.substring(suffix.lastIndexOf(" ")+1);
                suffix = suffix.substring(0, suffix.lastIndexOf(" "));
                var svrnm = suffix;
                var svr = serverSearch(svrnm, msg.author);
                if(!svr) {
                    bot.sendMessage(msg.channel, "I'm not on that server or it doesn't exist");
                    return;
                }
                var ch = svr.channels.get("name", chnm);
                if(!ch) {
                    logMsg(new Date().getTime(), "WARN", null, msg.author.id, "Channel does not exist for PM voting");
                    bot.sendMessage(msg.channel, svr.name + " doesn't have that channel. Please try again...");
                    return;
                } else if(stats[svr.id].botOn[ch.id]) {
                    var act = activePolls(ch.id);
                    if(!act) {
                        logMsg(new Date().getTime(), "WARN", null, msg.author.id, "No active poll on provided server/channel for PM voting");
                        bot.sendMessage(msg.channel, "There's no poll going on in that channel. Start one by replying `poll " + svr.name + " " + ch.name + "`");
                        return;
                    }
                    
                    var f = polls[act].responderIDs.indexOf(msg.author.id);
                    if(vt=="." && f>-1) {
                        logMsg(new Date().getTime(), "INFO", svr.id, ch.id, msg.author.username + "'s vote removed");
                        polls[act].responderIDs.splice(f, 1);
                        polls[act].responses.splice(f, 1);
                        bot.sendMessage(msg.channel, "OK, I removed your vote in the poll. You can vote again now.");
                        return;
                    }
                    if(isNaN(vt)) {
                        vt = polls[act].options.join().toLowerCase().split(",").indexOf(vt.toLowerCase());
                    }
                    if(f>-1 || vt>=polls[act].options.length || vt<0) {
                        logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User provided invalid PM vote for poll in " + svr.name + ", " + ch.name);
                        bot.sendMessage(msg.channel, "I couldn't cast your vote");
                        return;
                    }
                    polls[act].responses.push(vt);
                    polls[act].responderIDs.push(msg.author.id);
                    logMsg(new Date().getTime(), "INFO", svr.id, ch.id, "Vote cast for " + vt + " via PM");
                    bot.sendMessage(msg.channel, "Got it! Your vote was cast anonymously ( ͡° ͜ʖ ͡°)");
                }
            } catch(error) {
                logMsg(new Date().getTime(), "WARN", null, msg.author.id, "Invalid PM voting syntax provided");
                bot.sendMessage(msg.channel, "Hmmm, I didn't get that. Make sure to use the syntax `vote <server> <channel> <no. of option>`");
            }
        }
    },
    // Get help with the bot
    "help": {
        process: function(bot, msg) {
            bot.sendMessage(msg.author, "Use `@" + bot.user.username + " help` in the public chat to get help, or head over to the wiki: http://wiki.awesomebot.xyz/");
        }
    },
    // Gets OAuth URL
    "join": {
        process: function(bot, msg) {
            bot.sendMessage(msg.author, "https://discordapp.com/oauth2/authorize?&client_id=" + AuthDetails.client_id + "&scope=bot&permissions=0");
        }
    },
    // View recent mentions/tags in a server
    "mentions": {
        usage: "<server>",
        process: function(bot, msg, suffix) {
            if(suffix) {
                var svr = serverSearch(suffix, msg.author);
                if(!svr) {
                    bot.sendMessage(msg.channel, "I'm not on that server. Use `@AwesomeBot join` in the main chat to add me.");
                    return;
                } else if(!svr.members.get("id", msg.author.id)) {
                    logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User is not on " + svr.name + ", so mentions cannot be retreived");
                    bot.sendMessage(msg.channel, "*You're* not on " + svr.name + ". Obviously no one has mentioned you there!");
                    return;
                }
                
                var info = "";
                if(stats[svr.id].members[msg.author.id].mentions.stream.length>0) {
                    info = "**MENTIONS ON " + svr.name.toUpperCase() + " IN THE LAST WEEK**";
                    for(var i=0; i<stats[svr.id].members[msg.author.id].mentions.stream.length; i++) {
                        var time = prettyDate(new Date(stats[svr.id].members[msg.author.id].mentions.stream[i].timestamp))
                        var tmpinfo = "\n__**@" + stats[svr.id].members[msg.author.id].mentions.stream[i].author + "** at " + time + ":__\n" + stats[svr.id].members[msg.author.id].mentions.stream[i].message + "\n";
                        if((tmpinfo.length + info.length)>1900) {
                            break;
                        } else {
                            info += tmpinfo;
                        }
                    }
                    info += "\n\n";
                    stats[svr.id].members[msg.author.id].mentions.stream = [];
                } else {
                    info = "You haven't been mentioned on " + svr.name + " in the last week. I don't know if that's a good or bad thing...\n";
                }
                logMsg(new Date().getTime(), "INFO", null, msg.author.id, "User checked mentions in " + svr.name);
                info += "*Remember, you can " + (stats[svr.id].members[msg.author.id].mentions.pm ? "disable" : "enable") + " PMs for mentions with `pmmentions " + svr.name + "`*";
                bot.sendMessage(msg.channel, info);
            } else {
                logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User did provide a server for mentions command");
                bot.sendMessage(msg.channel, "Gimme a server pls");
            }
        }
    },
    // Toggles PM mentions in a server
    "pmmentions": {
        usage: "[<server>]",
        process: function(bot, msg, suffix) {
            if(suffix) {
                var svr = serverSearch(suffix, msg.author);
                if(!svr) {
                    bot.sendMessage(msg.channel, "That server isn't available, try a different one.");
                    return;
                }
                
                stats[svr.id].members[msg.author.id].mentions.pm = !stats[svr.id].members[msg.author.id].mentions.pm;
                if(stats[svr.id].members[msg.author.id].mentions.pm) {
                    bot.sendMessage(msg.channel, "You will now receive PM notifications from me when someone mentions you in " + svr.name + ". Turn them off by replying with `pmmentions " + svr.name + "`");
                } else {
                    bot.sendMessage(msg.channel, "Turned off PMs for mentions in " + svr.name + ". Enable them again by replying with `pmmentions " + svr.name + "`");
                }
                logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Turned " + (stats[svr.id].members[msg.author.id].mentions.pm ? "on" : "off") + " mention PMs in " + svr.name);
            } else {
                var info = "Toggled option to receive PMs for mentions in all servers. Here's your current configuration:";
                for(var i=0; i<bot.servers.length; i++) {
                    if(bot.servers[i].members.get("id", msg.author.id)) {
                        checkStats(msg.author.id, bot.servers[i].id);
                        stats[bot.servers[i].id].members[msg.author.id].mentions.pm = !stats[bot.servers[i].id].members[msg.author.id].mentions.pm;
                        info += "\n\t**" + bot.servers[i].name + ":** " + (stats[bot.servers[i].id].members[msg.author.id].mentions.pm ? "on" : "off");
                    }
                }
                info += "\nReply with `pmmentions` to toggle again.";
                bot.sendMessage(msg.author, info);
                logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Toggled mention PMs in all servers");
            }
            saveData("./data/stats.json", function(err) {
                if(err) {
                    logMsg(new Date().getTime(), "ERROR", "General", null, "Could not save updated PM preferences for " + msg.author.username);
                } 
            });
        }
    },
    // Sets an AFK message
    "afk": {
        usage: "<message or \".\">",
        process: function(bot, msg, suffix) {
            if(!suffix) {
                logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User did not provide AFK message");
                bot.sendMessage(msg.author, "What message should I send when you're AFK? Use the syntax `afk <message>`");
            } else if(suffix==".") {
                if(profileData[msg.author.id]) {
                    delete profileData[msg.author.id].AFK;
                    logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Removed AFK message");
                    bot.sendMessage(msg.author, "OK, I won't show that message anymore.");
                } else {
                    logMsg(new Date().getTime(), "WARN", null, msg.author.id, "User tried to delete nonexistent AFK message");
                    bot.sendMessage(msg.author, "I didn't have an AFK message set for you in the first place. Use `afk <message>`");
                }
            } else {
                if(!profileData[msg.author.id]) {
                    profileData[msg.author.id] = {
                        points: 0
                    };
                }
                profileData[msg.author.id].AFK = suffix;
                logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Set AFK message");
                bot.sendMessage(msg.author, "Thanks, I'll show that if/when someone tags you in a server. Reply with `afk .` when you come back :)");
                saveData("./data/profiles.json", function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile AFK message for " + msg.author.username);
                    }
                });
            }
        }
    }
}

// Initializes bot and outputs to console
var bot = new Discord.Client({forceFetchUsers: true});
bot.on("ready", function() {
    // Authorize AwesomeBot
    unirest.post("http://awesome.awesomebot.xyz/botauth?token=" + AuthDetails.awesome_token)
    .end(function(response) {
        if(response.status==200) {
            postData();
        } else {
            logMsg(new Date().getTime(), "ERROR", "General", null, "Unauthorized self-hosted AwesomeBot running, exiting. Please see https://github.com/BitQuote/AwesomeBot/wiki/Setup#getting-started");
            process.exit();
        }
    });

    //checkVersion();
    
    // Set avatar if necessary
    if(AuthDetails.avatar_url) {
        base64.encode(AuthDetails.avatar_url, {filename: "avatar"}, function(error, image) {
            if(!error) {
                bot.setAvatar(image, function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to set bot avatar");
                    }
                });
            } else {
                logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to set bot avatar");
            }
        });
    }
    
    // Set existing reminders
    for(var i=0; i<reminders.length; i++) {
        setReminder(i);
    }
    
    // Configure all servers
    for(var i=0; i<bot.servers.length; i++) {
        readyServer(bot.servers[i]);
    }
    pruneServerData();
    
    // Start message and stat tallies
    if(!stats.timestamp) {
        stats.timestamp = new Date().getTime();
    }
    clearMessageCounter();
    clearLogCounter();
    clearStatCounter();
    
    // Set playing game if applicable
    if(configs.game && configs.game!="") {
        bot.setStatus("online", configs.game);
    }
    defaultGame(0);
    
    // Give 50,000 maintainer points :P
    if(configs.maintainer) {
        if(!profileData[configs.maintainer]) {
            profileData[configs.maintainer] = {
                points: 100000
            };
        }
        if(profileData[configs.maintainer].points<100000) {
            profileData[configs.maintainer].points = 100000;
        }
        saveData("./data/profiles.json", function(err) {
            if(err) {
                logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save updated profile data");
            }
        });
    }

    // Start RSS update timer
    domain.run(rssTimer);
    
    // Start listening for web interface
    try {
        if(disconnects==0 || !openedweb) {
            app.listen(server_port, server_ip_address, function() {
                openedweb = true;
                logMsg(new Date().getTime(), "INFO", "General", null, "Opened web interface on " + server_ip_address + ", server port " + server_port);
            });
        }
    } catch(err) {
        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to open web interface");
    }
    
    // Ready to go!
    logMsg(new Date().getTime(), "INFO", "General", null, "Started " + bot.user.username + " v" + version);
    logMsg(new Date().getTime(), "INFO", "General", null, "This project is in no way affiliated with Alphabet, Inc., who does not own or endorse this product.");
});

bot.on("message", function(msg) {
    var msgDomain = domainRoot.create();
    msgDomain.run(function() {
        // Stop responding if the sender is another bot or botblocked
        if(configs.botblocked.indexOf(msg.author.id)>-1 || msg.author.bot || msg.author.id==bot.user.id || !openedweb) {
            return;
        }
        
        // Stuff that only applies to PMs
        if(msg.channel.isPrivate) {
            // Update command from maintainer
            if(updateconsole && msg.author.id==configs.maintainer && msg.content=="update") {
                updateBot(msg);
            }

            if(msg.author.id!=configs.maintainer && configs.pmforward) {
                bot.sendMessage(bot.users.get("id", configs.maintainer), "**@" + msg.author.username + "** just sent me this PM:```" + msg.cleanContent + "```");
            }
            
            // Gets poll title from user and asks for poll options
            if(polls[msg.author.id] && polls[msg.author.id].title=="") {
                polls[msg.author.id].title = msg.content;
                bot.sendMessage(msg.channel, "Enter poll options, separated by commas, or `.` for yes/no:");
                return;
            // Gets poll options from user and starts voting
            } else if(polls[msg.author.id] && polls[msg.author.id].options.length==0) {
                if(msg.content==".") {
                    polls[msg.author.id].options = ["No", "Yes"];
                } else {
                    var optionsProvided = msg.content.split(",");
                    for(var i=0; i<optionsProvided.length; i++) {
                        if(optionsProvided[i] && optionsProvided.indexOf(optionsProvided[i])==-1) {
                            polls[msg.author.id].options.push(optionsProvided[i]);
                        }
                    }
                    if(polls[msg.author.id].options.length==0) {
                        polls[msg.author.id].options.push(msg.content);
                    }
                }
                bot.sendMessage(msg.channel, "OK, got it. You can end the poll by sending me `poll close`.");
                polls[msg.author.id].open = true;

                var ch = bot.channels.get("id", polls[msg.author.id].channel);
                var info = msg.author + " has started a new poll: **" + polls[msg.author.id].title + "**";
                for(var i=0; i<polls[msg.author.id].options.length; i++) {
                    info += "\n\t" + i + ": " + polls[msg.author.id].options[i];
                }
                info += "\nYou can vote by typing `" + getPrefix(ch.server) + "vote <no. of choice>`. If you don't include a number, I'll just show results";
                bot.sendMessage(ch, info);
                return;
            }
            
            // Check if message is a PM command
            var cmdTxt = msg.content.toLowerCase();
            var suffix;
            if(msg.content.indexOf(" ")>-1) {
                cmdTxt = msg.content.substring(0, msg.content.indexOf(" ")).toLowerCase();
                suffix = msg.content.substring(msg.content.indexOf(" ")+1).trim();
            }
            var cmd = pmcommands[cmdTxt];
            if(cmd) {
                if(cmdTxt!="config" || suffix) {
                    logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Treating '" + msg.cleanContent + "' as a PM command");
                }
                cmd.process(bot, msg, suffix);
                return;
            }
        }

        // Stuff that only applies to public messages
        if(!msg.channel.isPrivate) {
            // Count new message
            messages[msg.channel.server.id]++;
            checkStats(msg.author.id, msg.channel.server.id);
            stats[msg.channel.server.id].members[msg.author.id].messages++;
            checkRank(msg.author, msg.channel.server);
            stats[msg.channel.server.id].members[msg.author.id].active = new Date().getTime();

            // Reset timer for room if applicable
            if(rooms[msg.channel.id]) {
                clearTimeout(rooms[msg.channel.id]);
                rooms[msg.channel.id] = setTimeout(function() {
                    bot.deleteChannel(msg.channel, function(err) {
                        if(!err) {
                            delete rooms[msg.channel.id];
                            logMsg(new Date().getTime(), "INFO", msg.channel.server.id, null, "Auto-deleted room " + msg.channel.name);
                        } else {
                            logMsg(new Date().getTime(), "INFO", msg.channel.server.id, null, "Failed to auto-delete room " + msg.channel.name);
                        }
                    });
                }, 300000);
            }
            
            // Check for message from AFK user
            if(profileData[msg.author.id] && profileData[msg.author.id].AFK) {
                delete profileData[msg.author.id].AFK;
                logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Auto-removed AFK message");
                saveData("./data/profiles.json", function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + msg.author.username);
                    }
                });
            }
            
            // If start statement is issued, say hello and begin listening
            var startcmd = checkCommandTag(msg.content, msg.channel.server.id);
            if(startcmd && startcmd[0].toLowerCase()=="start" && (configs.servers[msg.channel.server.id].admincommands.indexOf("quiet")==-1 || configs.servers[msg.channel.server.id].admins.indexOf(msg.author.id)>-1) && !stats[msg.channel.server.id].botOn[msg.channel.id]) {
                var suffix = startcmd[1];
                var timestr = "";
                if(suffix.toLowerCase()=="all") {
                    timestr = " in all channels";
                    for(var chid in stats[msg.channel.server.id].botOn) {
                        stats[msg.channel.server.id].botOn[chid] = true;
                    }
                } else {
                    stats[msg.channel.server.id].botOn[msg.channel.id] = true;
                }
                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Bot has been started by an admin" + timestr);
                bot.sendMessage(msg.channel, "Hello!\n\n*This project is in no way affiliated with Alphabet, Inc., who does not own or endorse this product.*");
                return;
            }
            
            // Check if the bot is off and stop responding
            if(!stats[msg.channel.server.id].botOn[msg.channel.id]) {
                return;
            }
            
            // Check if using a filtered word
            if(checkFiltered(msg, false, true) && configs.servers[msg.channel.server.id].admins.indexOf(msg.author.id)==-1 && configs.servers[msg.channel.server.id].servermod) {
                handleFiltered(msg, "filtered");
            }
            
            // Check for spam
            if(configs.servers[msg.channel.server.id].admins.indexOf(msg.author.id)==-1 && configs.servers[msg.channel.server.id].servermod && configs.servers[msg.channel.server.id].spamfilter[0] && configs.servers[msg.channel.server.id].spamfilter[1].indexOf(msg.channel.id)==-1) {
                // Tracks spam for a user with each new message, expires after 45 seconds
                if(!spams[msg.channel.server.id][msg.author.id]) {
                    spams[msg.channel.server.id][msg.author.id] = [];
                    spams[msg.channel.server.id][msg.author.id].push(msg.content);
                    setTimeout(function() {
                        try {
                            delete spams[msg.channel.server.id][msg.author.id];
                        } catch(err) {
                            ;
                        }
                    }, 45000);
                // Add a message to the user's spam list if it is similar to the last one
                } else if(levenshtein.get(spams[msg.channel.server.id][msg.author.id][spams[msg.channel.server.id][msg.author.id].length-1], msg.content)<3) {
                    logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Adding message from " + msg.author.username + " to their spam list");
                    spams[msg.channel.server.id][msg.author.id].push(msg.content);
                    
                    // Minus AwesomePoints!
                    if(!profileData[msg.author.id]) {
                        profileData[msg.author.id] = {
                            points: 0
                        }
                    }
                    var negative;
                    
                    // First-time spam warning 
                    if(spams[msg.channel.server.id][msg.author.id].length==configs.servers[msg.channel.server.id].spamfilter[2]) {
                        logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Handling first-time spam from " + msg.author.username);
                        bot.sendMessage(msg.author, "Stop spamming " + msg.channel.server.name + ". The chat mods have been notified about this.");
                        adminMsg(false, msg.channel.server, msg.author, " is spamming #" + msg.channel.name + " in " + msg.channel.server.name);
                        negative = 20;
                    // Second-time spam warning, bans user from using bot
                    } else if(spams[msg.channel.server.id][msg.author.id].length==configs.servers[msg.channel.server.id].spamfilter[2]*2) {
                        logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Kicking/blocking " + msg.author.username + " after second-time spam");
                        handleViolation(msg, "continues to spam", "spamming", configs.servers[msg.channel.server.id].spamfilter[3]);
                        negative = 50;
                    }
                    
                    if(negative!=null) {
                        if(configs.servers[msg.channel.server.id].points) {
                            profileData[msg.author.id].points -= negative;
                            saveData("./data/profiles.json", function(err) {
                                if(err) {
                                    logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + msg.author.username);
                                }
                            });
                        }
                        checkStats(msg.author.id, msg.channel.server.id);
                        stats[msg.channel.server.id].members[msg.author.id].strikes.push(["Automatic", (negative>20 ? "Second" : "First") + "-time spam violation", new Date().getTime()]);
                    }
                }
            }
            
            // Stop responding if the author is a blocked user
            if(configs.servers[msg.channel.server.id].blocked.indexOf(msg.author.id)>-1) {
                return;
            }
            
            // Translate message from certain users
            if(configs.servers[msg.channel.server.id].translated.list.indexOf(msg.author.id)>-1 && configs.servers[msg.channel.server.id].translated.channels[configs.servers[msg.channel.server.id].translated.list.indexOf(msg.author.id)].indexOf(msg.channel.id)>-1) {
                bingTranslate.translate(msg.cleanContent, configs.servers[msg.channel.server.id].translated.langs[configs.servers[msg.channel.server.id].translated.list.indexOf(msg.author.id)], "EN", function(err, result) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to auto-translate '" + msg.cleanContent + "' from " + msg.author.username);
                    } else {
                        bot.sendMessage(msg.channel, "**@" + getName(msg.channel.server, msg.author) + "** said `" + result.translated_text + "`");
                    }
                });
            }
            
            // Check if message includes a tag or attempted tag
            var tagstring = msg.content.slice(0);
            while(tagstring.length>0 && tagstring.indexOf("@")>-1 && tagstring.substring(tagstring.indexOf("@")+1)) {
                var usr;
                tagstring = tagstring.substring(tagstring.indexOf("@")+1);
                if(tagstring.charAt(0)=='!') {
                    tagstring = tagstring.substring(1);
                }
                if(tagstring.indexOf(">")) {
                    var usrid = tagstring.substring(0, tagstring.indexOf(">"));
                    tagstring = tagstring.substring(tagstring.indexOf(">")+1);
                    usr = msg.channel.server.members.get("id", usrid);
                } else {
                    var usrnm = tagstring.slice(0);
                    usr = msg.channel.server.members.get("username", usrnm);
                    while(!usr && usrnm.length>0) {
                        usrnm = usrnm.substring(0, usrnm.lastIndexOf(" "));
                        usr = msg.channel.server.members.get("username", usrnm);
                    }
                    tagstring = tagstring.substring(usrnm.length);
                }
                if(usr && !usr.bot) {
                    var mentions = stats[msg.channel.server.id].members[usr.id].mentions;
                    mentions.stream.push({
                        timestamp: new Date().getTime(),
                        author: removeMd(msg.author.username),
                        message: msg.cleanContent
                    });
                    if(mentions.pm && usr.status!="online") {
                        bot.sendMessage(usr, "__You were mentioned by @" + msg.author.username + " on **" + msg.channel.server.name + "**:__\n" + msg.cleanContent);
                    }
                    if(((profileData[usr.id] && profileData[usr.id].AFK) || stats[msg.channel.server.id].members[usr.id] && stats[msg.channel.server.id].members[usr.id].AFK) && configs.servers[msg.channel.server.id].afk) {
                        bot.sendMessage(msg.channel, "**@" + getName(msg.channel.server, usr) + "** is currently AFK: " + (stats[msg.channel.server.id].members[usr.id].AFK || profileData[usr.id].AFK));
                    }
                    
                    if([msg.author.id, bot.user.id].indexOf(usr.id)==-1 && configs.servers[msg.channel.server.id].points && !novoting[msg.author.id] && msg.channel.server.members.length>2) {
                        var votestrings = [" +!", " +1", " up", " ^"];
                        var voted;
                        for(var i=0; i<votestrings.length; i++) {
                            if(tagstring.indexOf(votestrings[i])==0) {
                                voted = "upvoted";
                                if(!profileData[usr.id]) {
                                    profileData[usr.id] = {
                                        points: 0
                                    };
                                }
                                profileData[usr.id].points++;
                                break;
                            }
                        }
                        if(tagstring.indexOf(" gild")==0) {
                            if(!profileData[msg.author.id]) {
                                profileData[msg.author.id] = {
                                    points: 0
                                }
                            }
                            if(profileData[msg.author.id].points<10) {
                                logMsg(new Date().getTime(), "WARN", msg.channel.server.id, msg.channel.id, msg.author.username + " does not have enough points to gild " + usr.username);
                                bot.sendMessage(msg.channel, msg.author + " You don't have enough AwesomePoints to gild " + usr);
                                return;
                            }
                            voted = "gilded";
                            profileData[msg.author.id].points -= 10;
                            if(!profileData[usr.id]) {
                                profileData[usr.id] = {
                                    points: 0
                                };
                            }
                            profileData[usr.id].points += 10;
                        }
                        
                        if(voted) {
                            logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, usr.username + " " + voted + " by " + msg.author.username);
                            novoting[msg.author.id] = true;
                            setTimeout(function() {
                                delete novoting[msg.author.id];
                            }, 3000);
                            stats[msg.channel.server.id].members[msg.author.id].messages--;
                            saveData("./data/profiles.json", function(err) {
                                if(err) {
                                    logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + usr.username);
                                }
                            });
                            return;
                        }
                    }
                }
            }
            // Upvote previous message, based on context
            if((msg.content.indexOf("+1")==0 || msg.content.indexOf("+!")==0 || msg.content.indexOf("^")==0 || msg.content.indexOf("up")==0) && configs.servers[msg.channel.server.id].points && !novoting[msg.author.id] && msg.channel.server.members.length>2) {
                bot.getChannelLogs(msg.channel, 1, {before: msg}, function(err, messages) {
                    if(!err && messages[0]) {
                        if([msg.author.id, bot.user.id].indexOf(messages[0].author.id)==-1) {
                            if(!profileData[messages[0].author.id]) {
                                profileData[messages[0].author.id] = {
                                    points: 0
                                };
                            }
                            profileData[messages[0].author.id].points++;
                            logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, messages[0].author.username + " upvoted by " + msg.author.username);
                            stats[msg.channel.server.id].members[msg.author.id].messages--;
                            saveData("./data/profiles.json", function(err) {
                                if(err) {
                                    logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + messages[0].author.username);
                                }
                            });
                        }
                    }
                });
            }

            // Stop if cooldown is applied
            if(cooldowns[msg.channel.id]) {
                return;
            }

            // Check for active select menu
            if(selectmenu[msg.channel.id] && msg.author.id==selectmenu[msg.channel.id].usrid) {
                if(msg.content.toLowerCase()=="quit") {
                    delete selectmenu[msg.channel.id];
                } else if(!isNaN(msg.content.trim()) && parseInt(msg.content.trim())>=0 && parseInt(msg.content.trim())<=selectmenu[msg.channel.id].max) {
                    selectmenu[msg.channel.id].process(parseInt(msg.content.trim()));
                    delete selectmenu[msg.channel.id];
                } else {
                    bot.sendMessage(msg.channel, "Invalid selection. Type a number from 0 to " + selectmenu[msg.channel.id].max + " or `quit`.");
                }
                return;
            }
            
            // Apply extensions for this server
            for(var ext in configs.servers[msg.channel.server.id].extensions) {
                var extension = configs.servers[msg.channel.server.id].extensions[ext];
                if((extension.channels && extension.channels.length>0 && extension.channels.indexOf(msg.channel.name)==-1) || extension.type=="timer") {
                    continue;
                }
                
                var keywordcontains = contains(extension.key, msg.content, extension.case);
                if((extension.type.toLowerCase()=="keyword" && keywordcontains>-1) || (extension.type.toLowerCase()=="command" && checkCommandTag(msg.content, msg.channel.server.id) && checkCommandTag(msg.content, msg.channel.server.id)[0].toLowerCase()==extension.key.toLowerCase())) {
                    logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Treating '" + msg.cleanContent + "' from " + msg.author.username + " as an extension " + configs.servers[msg.channel.server.id].extensions[ext].type);
                    if(extension.type=="command") {
                        if(!stats[msg.channel.server.id].commands[extension.key]) {
                            stats[msg.channel.server.id].commands[extension.key] = 0;
                        }
                        stats[msg.channel.server.id].commands[extension.key]++;
                    }
                    
                    var params = getExtensionParams(configs.servers[msg.channel.server.id].extensions[ext], msg.channel.server, msg.channel, msg, extension.type.toLowerCase()=="keyword" ? keywordcontains : null, extension.type.toLowerCase()=="command" ? checkCommandTag(msg.content, msg.channel.server.id)[1] : null);
                    try {
                        var extDomain = domainRoot.create();
                        extDomain.run(function() {
                            var context = new vm.createContext(params);
                            var script = new vm.Script(configs.servers[msg.channel.server.id].extensions[ext].process);
                            script.runInContext(context);
                        });
                        extDomain.on("error", function(runError) {
                            logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to run extension " + configs.servers[msg.channel.server.id].extensions[ext].type + ": " + runError);
                        });
                    } catch(runError) {
                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to run extension " + configs.servers[msg.channel.server.id].extensions[ext].type + ": " + runError);
                    }
                    setCooldown(msg.channel);
                    return;
                }
            }
        }

        // Check if message is a command (bot tagged and matches commands list)
        var cmd;
        if(!msg.channel.isPrivate && checkCommandTag(msg.content, msg.channel.server.id)) {
            var cmdTxt = checkCommandTag(msg.content, msg.channel.server.id)[0].toLowerCase();
            var suffix = checkCommandTag(msg.content, msg.channel.server.id)[1].trim();
            cmd = commands[cmdTxt];
        }
        
        // Process commands
        if(cmd && !msg.channel.isPrivate && stats[msg.channel.server.id].botOn[msg.channel.id]) {
            if(configs.servers[msg.channel.server.id][cmdTxt]!=null) {
                if(configs.servers[msg.channel.server.id][cmdTxt]==false) {
                    return;
                }
            }
            if((configs.servers[msg.channel.server.id].admincommands.indexOf(cmdTxt)>-1 && configs.servers[msg.channel.server.id].admins.indexOf(msg.author.id)==-1) || (configs.servers[msg.channel.server.id].chrestrict[msg.channel.id] && configs.servers[msg.channel.server.id].chrestrict[msg.channel.id].indexOf(cmdTxt)>-1)) {
                return;
            }
            if(checkFiltered(msg, true, false) && configs.servers[msg.channel.server.id].admins.indexOf(msg.author.id)==-1 && configs.servers[msg.channel.server.id].servermod && configs.servers[msg.channel.server.id].nsfwfilter[0] && configs.servers[msg.channel.server.id].nsfwfilter[1].indexOf(msg.channel.id)==-1 && ["image", "youtube", "gif", "search"].indexOf(cmdTxt)>-1) {
                handleFiltered(msg, "NSFW");
            } else if(stats[msg.channel.server.id].botOn[msg.channel.id]) {
                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Treating '" + msg.cleanContent + "' from " + msg.author.username + " as a command");
                if(["quiet", "ping", "help", "stats", "trivia", "vote"].indexOf(cmdTxt)==-1) {
                    if(!stats[msg.channel.server.id].commands[cmdTxt]) {
                        stats[msg.channel.server.id].commands[cmdTxt] = 0;
                    }
                    stats[msg.channel.server.id].commands[cmdTxt]++;
                }
                cmd.process(bot, msg, suffix);
            }
            setCooldown(msg.channel);
        // Check for matching tag commands
        } else if(!msg.channel.isPrivate && !suffix && configs.servers[msg.channel.server.id].tags[cmdTxt] && configs.servers[msg.channel.server.id].tagcommands.indexOf(cmdTxt)>-1) {
            logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Treating '" + msg.cleanContent + "' from " + msg.author.username + " as a tag command");
            bot.sendMessage(msg.channel, configs.servers[msg.channel.server.id].tags[cmdTxt]);
            setCooldown(msg.channel);
        // Process message as chatterbot prompt if not a command
        } else if((msg.content.indexOf(bot.user.mention())==0 || msg.content.indexOf("<@!" + bot.user.id + ">")==0 || msg.channel.isPrivate) && !msg.author.bot) {
            if(!msg.channel.isPrivate) {
                if(!configs.servers[msg.channel.server.id].chatterbot || !stats[msg.channel.server.id].botOn[msg.channel.id]) {
                    return;
                }
                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Treating '" + msg.cleanContent + "' from " + msg.author.username + " as a chatterbot prompt"); 
            } else {
                logMsg(new Date().getTime(), "INFO", null, msg.author.id, "Treating '" + msg.content + "' as chatterbot prompt"); 
            }
            var prompt = "";
            if(!msg.channel.isPrivate) {
                prompt = msg.cleanContent.substring((msg.channel.server.detailsOfUser(bot.user).nick || bot.user.username).length+1);
                prompt = prompt.substring(prompt.indexOf(" ")+1);
                setCooldown(msg.channel);
                if(prompt.toLowerCase().indexOf("help")==0) {
                    bot.sendMessage(msg.channel, "Use `" + getPrefix(msg.channel.server) + "help` for info about how to use me on this server :smiley:");
                    return;
                }
                if(prompt.toLowerCase().indexOf("join")==0) {
                    bot.sendMessage(msg.channel, "https://discordapp.com/oauth2/authorize?&client_id=" + AuthDetails.client_id + "&scope=bot&permissions=0");
                    return;
                }
            } else {
                prompt = msg.cleanContent;
            }
            
            if(!bots[msg.author.id]) {
                bots[msg.author.id] = require("mitsuku-api")();
            }
            var ai = bots[msg.author.id];
            ai.send(prompt).then(function(response) {
                var res = response.replace("Mitsuku", msg.channel.isPrivate ? bot.user.username : (msg.channel.server.detailsOfUser(bot.user).nick || bot.user.username));
                if(!msg.channel.isPrivate) {
                    res = res.replace("Mousebreaker", bot.users.get("id", configs.maintainer) ? bot.users.get("id", configs.maintainer).username : bot.users.get("id", configs.servers[msg.channel.server.id].admins[0]).username);
                }
                res = res.replace("(mitsuku@square-bear.co.uk)", "");
                if(res.indexOf("You have been banned from talking to the chat robot.")>-1) {
                    res = "I'm not talking to you anymore. Goodbye and good riddance!";
                }
                if(msg.channel.isPrivate) {
                    bot.sendMessage(msg.channel, res);
                } else {
                    bot.sendMessage(msg.channel, msg.author + " " + res);
                }
            });
        // Otherwise, check if it's a self-message or just does the tag reaction
        } else {  
            if(msg.author!=bot.user && msg.isMentioned(bot.user) && configs.servers[msg.channel.server.id].tagreaction && (configs.servers[msg.channel.server.id].admincommands.indexOf("tagreaction")==-1 || configs.servers[msg.channel.server.id].admins.indexOf(msg.author.id)>-1) && (!configs.servers[msg.channel.server.id].chrestrict[msg.channel.id] || configs.servers[msg.channel.server.id].chrestrict[msg.channel.id].indexOf("tagreaction")>-1)) {
                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Bot tagged by " + msg.author.username);
                bot.sendMessage(msg.channel,msg.author + ", you called?");
            }
        }
    });
    msgDomain.on("error", function(err) {
        logMsg(new Date().getTime(), "ERROR", "General", null, "Something went wrong handling message: " + err);
    });
});

// Set a cooldown for the next command if necessary
function setCooldown(ch) {
    if(cools[ch.id] || configs.servers[ch.server.id].cooldown>0) {
        cooldowns[ch.id] = true;
        setTimeout(function() {
            delete cooldowns[ch.id];
        }, cools[ch.id] || configs.servers[ch.server.id].cooldown);
    }
}

// Add server if joined outside of bot
bot.on("serverCreated", function(svr) {
    readyServer(svr);
});

function readyServer(svr) {
    // Configure new server
    if(!configs.servers[svr.id]) {
        newServer(svr);
    }
    
    // Make sure config.json is up-to-date
    checkConfig(svr);

    // Populate stats file
    populateStats(svr);
    
    // Set runtime values
    messages[svr.id] = 0;
    spams[svr.id] = {};
    filterviolations[svr.id] = {};

    // Restart countdowns
    for(var event in configs.servers[svr.id].countdowns) {
        setTimeout(function() {
            var ch = svr.channels.get("id", configs.servers[svr.id].countdowns[event].chid);
            if(ch) {
                bot.sendMessage(ch, "3...2...1...**" + configs.servers[svr.id].countdowns[event].name + "**");
                delete configs.servers[svr.id].countdowns[event];
                logMsg(new Date().getTime(), "INFO", svr.id, ch.id, "Countdown " + event + " expired");
                saveData("./data/config.json", function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save updated configs for " + svr.name);
                    }
                });
            }
        }, configs.servers[svr.id].countdowns[event].timestamp - new Date().getTime());
    }
    
    // Run timer extensions
    domain.run(runTimerExtensions);
}

function newServer(svr) {
    defaultConfig(svr);
    adminMsg(false, svr, {username: bot.user.username}, " (me) has been added to " + svr.name + ". You're one of my admins. You can manage me in this server by PMing me `config " + svr.name + "`. Check out http://awesomebot.xyz to learn more.");
    bot.sendMessage(svr.defaultChannel, "Hi, I'm " + (svr.detailsOfUser(bot.user).nick || bot.user.username) + "! Use `" + getPrefix(svr) + "help` to learn more or check out http://awesomebot.xyz");
    postData();
}

function postData() {
    postCarbon();
    unirest.post("http://awesome.awesomebot.xyz/botdata?token=" + AuthDetails.awesome_token + "&svrcount=" + bot.servers.length + "&usrcount=" + bot.users.length)
    .end(function(response) {
        if(response.status==200) {
            logMsg(new Date().getTime(), "INFO", "General", null, "Successfully POSTed to Awesome");
        }
    });
}

function postCarbon() {
    if(AuthDetails.carbon_key) {
        unirest.post("https://www.carbonitex.net/discord/data/botdata.php")
        .headers({
            "Accept": "application/json",
            "Content-Type": "application/json"
        }).send({
            "key": AuthDetails.carbon_key, 
            "servercount": bot.servers.length
        }).end(function(response) {
            if(response.status==200) {
                logMsg(new Date().getTime(), "INFO", "General", null, "Successfully POSTed to Carbonitex");
            }
        });
    }
}

// Turn bot on in a new channel
bot.on("channelCreated", function(ch) {
    if(!ch.isPrivate) {
        stats[ch.server.id].botOn[ch.id] = true;
        logMsg(new Date().getTime(), "INFO", ch.server.id, null, "New channel created: " + ch.name);
        saveData("./data/stats.json", function(err) {
            if(err) {
                logMsg(new Date().getTime(), "ERROR", "General", null, "Could not save updated stats for " + ch.server.name);
            }
        });
    }
});

// Leave server if deleted
bot.on("serverDeleted", function(svr) {
    domain.run(function() {
        deleteServerData(svr.id);
    });
    logMsg(new Date().getTime(), "INFO", "General", null, "Server " + svr.name + " removed, left server");
    postData();
});

// Checks for old servers
function pruneServerData() {
    for(var svrid in configs.servers) {
        if(!bot.servers.get("id", svrid)) {
            deleteServerData(svrid);
        }
    }
    for(var svrid in stats) {
        if(!bot.servers.get("id", svrid) && svrid!="timestamp") {
            deleteServerData(svrid);
        }
    }
}

// Delete everything for a server
function deleteServerData(svrid) {
    delete configs.servers[svrid];
    saveData("./data/config.json", function(err) {
        if(err) {
            logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to delete old configs");
        }
    });
    delete messages[svrid];
    delete spams[svrid];
    delete filterviolations[svrid];
    delete stats[svrid];
}

// New server member handling
bot.on("serverMemberUpdated", function(svr, usr) {
    if(svr.rolesOfUser(usr)) {
        for(var j=0; j<svr.rolesOfUser(usr).length; j++) {
            if(svr.rolesOfUser(usr)[j].hasPermission("banMembers") && configs.servers[svr.id].admins.indexOf(usr.id)==-1 && configs.servers[svr.id].blocked.indexOf(usr.id)==-1 && configs.botblocked.indexOf(usr.id)==-1 && usr.id!=bot.user.id && !usr.bot) {
                configs.servers[svr.id].admins.push(usr.id);
                logMsg(new Date().getTime(), "INFO", svr.id, null, "Auto-added " + usr.username + " to admins list");
                saveData("./data/config.json", function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save updated configs for " + svr.name);
                    }
                });
            } else if(!svr.rolesOfUser(usr)[j].hasPermission("banMembers") && configs.servers[svr.id].admins.indexOf(usr.id)>-1 && usr.id!=bot.user.id && !usr.bot) {
                configs.servers[svr.id].admins.splice(configs.servers[svr.id].admins.indexOf(usr.id), 1);
                logMsg(new Date().getTime(), "INFO", svr.id, null, "Auto-removed " + usr.username + " from admins list");
                saveData("./data/config.json", function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save updated configs for " + svr.name);
                    }
                });
            }
        }
    }
});

bot.on("serverNewMember", function(svr, usr) {
    // Check if this has been enabled in admin console and the bot is listening
    if(configs.servers[svr.id].servermod) {
        if(configs.servers[svr.id].newmembermsg[0]) {
            logMsg(new Date().getTime(), "INFO", svr.id, null, "New member: " + usr.username);
            var ch = svr.channels.get("id", configs.servers[svr.id].newmembermsg[2]);
            if(ch && stats[svr.id].botOn[ch.id]) {
                bot.sendMessage(ch, configs.servers[svr.id].newmembermsg[1][getRandomInt(0, configs.servers[svr.id].newmembermsg[1].length-1)].replaceAll("++", usr));
            }
        }
        if(configs.servers[svr.id].newmemberpm) {
            bot.sendMessage(usr, "Welcome to the " + svr.name + " Discord chat! " + configs.servers[svr.id].newgreeting + " I'm " + (svr.detailsOfUser(bot.user).nick || bot.user.username) + " by the way. Learn more with `" + getPrefix(svr) + "help` in the public chat.");
        }
    }
    if(configs.servers[svr.id].servermod && configs.servers[svr.id].newrole.length>0) {
        for(var i=0; i<configs.servers[svr.id].newrole.length; i++) {
            var role = svr.roles.get("id", configs.servers[svr.id].newrole[i]);
            if(role) {
                bot.addMemberToRole(usr, role, function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", svr.id, null, "Failed to add new member " + usr.username + " to default role " + role.name);
                    }
                });
            }
        }
    }
    
    checkStats(usr.id, svr.id);
    if(usr.id==configs.maintainer && configs.servers[svr.id].admins.indexOf(configs.maintainer)==-1) {
        configs.servers[svr.id].admins.push(configs.maintainer);
        saveData("./data/config.json", function(err) {
            if(err) {
                logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save updated configs for " + svr.name);
            }
        });
    }
});

// Updates voice counter when user joins voice channel
bot.on("voiceJoin", function(ch, usr) {
    if(stats[ch.server.id] && !usr.bot && (!ch.server.afkChannel || (ch.server.afkChannel && ch.id!=ch.server.afkChannel.id)) && !voice[usr.id]) {
        checkStats(usr.id, ch.server.id);
        voice[usr.id] = new Date().getTime();
        stats[ch.server.id].members[usr.id].active = new Date().getTime();
    }
});

// Updates user stats when user deafens
bot.on("voiceStateUpdate", function(ch, usr, oldprops, newprops) {
    if(stats[ch.server.id] && !usr.bot && (!ch.server.afkChannel || (ch.server.afkChannel && ch.id!=ch.server.afkChannel.id))) {
        checkStats(usr.id, ch.server.id);
        if(((oldprops.deaf==false && newprops.deaf==true) || (oldprops.selfDeaf==false && newprops.selfDeaf==true)) && voice[usr.id]) {
            stats[ch.server.id].members[usr.id].voice += (((new Date().getTime() - voice[usr.id])/1000)/60) * 0.02;
            delete voice[usr.id];
            checkRank(usr, ch.server);
        } else if(((oldprops.deaf==true && newprops.deaf==false) || (oldprops.selfDeaf==true && newprops.selfDeaf==false)) && !voice[usr.id]) {
            voice[usr.id] = new Date().getTime();
            stats[ch.server.id].members[usr.id].active = new Date().getTime();
        }
    }
});

// Updates user stats when user leaves voice channel
bot.on("voiceLeave", function(ch, usr) {
    if(stats[ch.server.id] && !usr.bot && (!ch.server.afkChannel || (ch.server.afkChannel && ch.id!=ch.server.afkChannel.id)) && voice[usr.id]) {
        checkStats(usr.id, ch.server.id);
        stats[ch.server.id].members[usr.id].voice += (((new Date().getTime() - voice[usr.id])/1000)/60) * 0.02;
        delete voice[usr.id];
        checkRank(usr, ch.server);
    }
    if(rooms[ch.id] && ch.members.length==0) {
        bot.deleteChannel(ch, function(err) {
            if(!err) {
                delete rooms[ch.id];
                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, null, "Auto-deleted room " + ch.name);
            } else {
                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, null, "Failed to auto-delete room " + ch.name);
            }
        });   
    }
});

// Creates stats for a member on a server if necessary
function checkStats(usrid, svrid) {
    if(!stats[svrid].members[usrid]) {
        stats[svrid].members[usrid] = {
            messages: 0,
            voice: 0,
            rank: configs.servers[svrid].rankslist[0].name,
            rankscore: 0,
            active: new Date().getTime(),
            seen: new Date().getTime(),
            mentions: {
                pm: false,
                stream: []
            },
            strikes: []
        };
    }
}

// Computes current rank and checks for level up
function checkRank(usr, svr) {
    if(usr && !usr.bot && svr) {
        var currentRankscore = stats[svr.id].members[usr.id].rankscore + ((stats[svr.id].members[usr.id].messages + (stats[svr.id].members[usr.id].voice * 10)) / 10);
        for(var i=0; i<configs.servers[svr.id].rankslist.length; i++) {
            if(currentRankscore<=configs.servers[svr.id].rankslist[i].max || i==configs.servers[svr.id].rankslist.length-1) {
                if(stats[svr.id].members[usr.id].rank!=configs.servers[svr.id].rankslist[i].name) {
                    stats[svr.id].members[usr.id].rank = configs.servers[svr.id].rankslist[i].name;
                    if(configs.servers[svr.id].ranks) {
                        logMsg(new Date().getTime(), "INFO", svr.id, null, usr.username + " leveled up to " + stats[svr.id].members[usr.id].rank);
                        if(configs.servers[svr.id].rankmembermsg[0]) {
                            if(!configs.servers[svr.id].rankmembermsg[2] && svr.channels.get("id", configs.servers[svr.id].rankmembermsg[1]) && stats[svr.id].botOn[svr.channels.get("id", configs.servers[svr.id].rankmembermsg[1]).id]) {
                                bot.sendMessage(svr.channels.get("id", configs.servers[svr.id].rankmembermsg[1]), "Congratulations " + usr + ", you've leveled up to **" + stats[svr.id].members[usr.id].rank + "**.");
                            } else if(configs.servers[svr.id].rankmembermsg[2]) {
                                bot.sendMessage(usr, "Congratulations, you've leveled up to **" + stats[svr.id].members[usr.id].rank + "** on " + svr.name + ".");
                            }
                        }
                        if(configs.servers[svr.id].points && svr.members.length>2) {
                            if(!profileData[usr.id]) {
                                profileData[usr.id] = {
                                    points: 0
                                }
                            }
                            profileData[usr.id].points += 100;
                            saveData("./data/profiles.json", function(err) {
                                if(err) {
                                    logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + usr.username);
                                }
                            });
                        }
                        if(configs.servers[svr.id].rankslist[i].role && svr.roles.get("id", configs.servers[svr.id].rankslist[i].role)) {
                            bot.addMemberToRole(usr, svr.roles.get("id", configs.servers[svr.id].rankslist[i].role), function(err) {
                                if(err) {
                                    logMsg(new Date().getTime(), "ERROR", svr.id, null, "Failed to add " + usr.username + " to role " + svr.roles.get("id", configs.servers[svr.id].rankslist[i].role).name + " for level up");
                                } else {
                                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Added " + usr.username + " to role " + svr.roles.get("id", configs.servers[svr.id].rankslist[i].role).name + " for level up");
                                }
                            });
                        }
                    }
                }
                return configs.servers[svr.id].rankslist[i].name;
            }
        }
    }
    return "";
}

// List of members with a rank
function getMembersWithRank(svr, rank) {
    var membersWithRank = [];
    for(var usrid in stats[svr.id].members) {
        if(stats[svr.id].members[usrid].rank==rank.name) {
            var usr = svr.members.get("id", usrid);
            if(usr) {
                membersWithRank.push("\t@" + getName(svr, usr) + "\n");
            }
        }
    }
    return membersWithRank;
}

// Deletes stats when member leaves
bot.on("serverMemberRemoved", function(svr, usr) {
    domain.run(function() {
        serverMemberRemovedHandler(svr, usr);
    });
});
function serverMemberRemovedHandler(svr, usr) {
    delete stats[svr.id].members[usr.id];
    try {
        delete filterviolations[svr.id][usr.id];
        delete spams[svr.id][usr.id];
    } catch(err) {
        ;
    }
    if(configs.servers[svr.id].admins.indexOf(usr.id)>-1) {
        configs.servers[svr.id].admins.splice(configs.servers[svr.id].admins.indexOf(usr.id), 1);
    }
    if(configs.servers[svr.id].blocked.indexOf(usr.id)>-1) {
        configs.servers[svr.id].blocked.splice(configs.servers[svr.id].blocked.indexOf(usr.id), 1);
    }
    if(configs.servers[svr.id].servermod && configs.servers[svr.id].rmmembermsg[0]) {
        logMsg(new Date().getTime(), "INFO", svr.id, null, "Member removed: " + usr.username);
        var ch = svr.channels.get("id", configs.servers[svr.id].rmmembermsg[2]);
        if(ch && stats[svr.id].botOn[ch.id]) {
            bot.sendMessage(ch, configs.servers[svr.id].rmmembermsg[1][getRandomInt(0, configs.servers[svr.id].rmmembermsg[1].length-1)].replaceAll("++", "**@" + getName(svr, usr) + "**"));
        }
    }

    var changed = false;
    if(profileData[usr.id] && profileData[usr.id].svrnicks) {
        for(var nick in profileData[usr.id].svrnicks) {
            if(profileData[usr.id].svrnicks[nick]==svr.id) {
                changed = true;
                delete profileData[usr.id].svrnicks[nick];
            }
        }
    }
    if(changed) {
        saveData("./data/profiles.json", function(err) {
            if(err) {
                logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + usr.username);
            }
        });
    }
};

bot.on("messageUpdated", function(oldmsg, newmsg) {
    if(oldmsg && newmsg && oldmsg.cleanContent && newmsg.cleanContent && oldmsg.cleanContent!=newmsg.cleanContent && !oldmsg.channel.isPrivate && configs.servers[oldmsg.channel.server.id].editmembermsg[0] && configs.servers[oldmsg.channel.server.id].servermod && stats[msg.channel.server.id].botOn[msg.channel.id]) {
        logMsg(new Date().getTime(), "INFO", msg.channel.server.id, null, "Message by " + msg.author.username + " edited");
        bot.sendMessage(oldmsg.channel, "Message by **@" + getName(oldmsg.channel.server, oldmsg.author) + "** edited. Original:\n```" + oldmsg.cleanContent + "```Updated:\n```" + newmsg.cleanContent + "```");
    }
});

// Reduces activity score when message is publicly deleted, removes upvote, and/or shows membermsg
bot.on("messageDeleted", function(msg) {
    if(msg) {
        if(!msg.channel.isPrivate) {
            if(stats[msg.channel.server.id].members[msg.author.id] && stats[msg.channel.server.id].members[msg.author.id].messages>0 && msg.timestamp>stats.timestamp) {
                stats[msg.channel.server.id].members[msg.author.id].messages--;
            }
            if(msg.content.indexOf("+1")==0 || msg.content.indexOf("+!")==0 || msg.content.indexOf("^")==0 || msg.content.indexOf("up")==0) {
                bot.getChannelLogs(msg.channel, 1, {before: msg}, function(err, messages) {
                    if(!err && messages[0]) {
                        if([msg.author.id, bot.user.id].indexOf(messages[0].author.id)==-1) {
                            if(profileData[messages[0].author.id]) {
                                profileData[messages[0].author.id].points--;
                                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, msg.author.username + " deleted upvote for " + messages[0].author.username);
                                saveData("./data/profiles.json", function(err) {
                                    if(err) {
                                        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + messages[0].author.username);
                                    }
                                });
                            }
                        }
                    }
                });
            }
            if(configs.servers[msg.channel.server.id].deletemembermsg[0] && configs.servers[msg.channel.server.id].servermod && msg.author.id!=bot.user.id && stats[msg.channel.server.id].botOn[msg.channel.id]) {
                logMsg(new Date().getTime(), "INFO", msg.channel.server.id, null, "Message by " + msg.author.username + " deleted");
                bot.sendMessage(msg.channel, "Message by **@" + getName(msg.channel.server, msg.author) + "** deleted:\n```" + msg.cleanContent + "```");
            }
        }
    }
});

// Message on user banned
bot.on("userBanned", function(usr, svr) {
    if(configs.servers[svr.id].servermod && configs.servers[svr.id].banmembermsg[0]) {
        logMsg(new Date().getTime(), "INFO", svr.id, null, "User " + usr.username + " has been banned");
        var ch = svr.channels.get("id", configs.servers[svr.id].banmembermsg[2]);
        if(ch && stats[svr.id].botOn[ch.id]) {
            bot.sendMessage(ch, configs.servers[svr.id].banmembermsg[1][getRandomInt(0, configs.servers[svr.id].banmembermsg[1].length-1)].replaceAll("++", "**@" + getName(svr, usr) + "**"));
        }
    }
});

// Message on user unbanned
bot.on("userUnbanned", function(usr, svr) {
    if(configs.servers[svr.id].servermod && configs.servers[svr.id].unbanmembermsg[0]) {
        logMsg(new Date().getTime(), "INFO", svr.id, null, "User " + usr.username + " has been unbanned");
        var ch = svr.channels.get("id", configs.servers[svr.id].unbanmembermsg[2]);
        if(ch && stats[svr.id].botOn[ch.id]) {
            bot.sendMessage(ch, configs.servers[svr.id].unbanmembermsg[1][getRandomInt(0, configs.servers[svr.id].unbanmembermsg[1].length-1)].replaceAll("++", "**@" + getName(svr, usr) + "**"));
        }
    }
});

// Update lastSeen status on presence change and messages
bot.on("presence", function(oldusr, newusr) {
    if(newusr.id!=bot.user.id) {
        for(var i=0; i<bot.servers.length; i++) {
            if(bot.servers[i].members.get("id", newusr.id)) {
                checkStats(oldusr.id, bot.servers[i].id);

                if(newusr.game && newusr.game.type==1 && (!oldusr.game || oldusr.game.type!=1) && configs.servers[bot.servers[i].id].twitchmembermsg[0] && configs.servers[bot.servers[i].id].servermod && bot.servers[i].channels.get("id", configs.servers[bot.servers[i].id].twitchmembermsg[1]) && stats[bot.servers[i].id].botOn(bot.servers[i].channels.get("id", configs.servers[bot.servers[i].id].twitchmembermsg[1]).id)) {
                    logMsg(new Date().getTime(), "INFO", svr.id, null, newusr.username + " started streaming on Twitch");
                    bot.sendMessage(bot.servers[i].channels.get("id", configs.servers[bot.servers[i].id].twitchmembermsg[1]), "**@" + getName(bot.servers[i], newusr) + "** is streaming on Twitch: " + newusr.game.url);
                }
                
                if(oldusr.status=="online" && newusr.status!="online") {
                    stats[bot.servers[i].id].members[oldusr.id].seen = new Date().getTime();
                    
                    if(newusr.status=="offline" && configs.servers[bot.servers[i].id].servermod && configs.servers[bot.servers[i].id].offmembermsg[0] && bot.servers[i].channels.get("id", configs.servers[bot.servers[i].id].offmembermsg[2]) && stats[bot.servers[i].id].botOn[bot.servers[i].channels.get("id", configs.servers[bot.servers[i].id].offmembermsg[2]).id]) { 
                        logMsg(new Date().getTime(), "INFO", svr.id, null, newusr.username + " went offline");
                        bot.sendMessage(bot.servers[i].channels.get("id", configs.servers[bot.servers[i].id].offmembermsg[2]), configs.servers[bot.servers[i].id].offmembermsg[1][getRandomInt(0, configs.servers[bot.servers[i].id].offmembermsg[1].length-1)].replaceAll("++", "**@" + getName(bot.servers[i], newusr) + "**"));
                    }
                } else if(oldusr.status=="offline" && newusr.status=="online" && configs.servers[bot.servers[i].id].servermod && configs.servers[bot.servers[i].id].onmembermsg[0] && bot.servers[i].channels.get("id", configs.servers[bot.servers[i].id].onmembermsg[2]) && stats[bot.servers[i].id].botOn[bot.servers[i].channels.get("id", configs.servers[bot.servers[i].id].onmembermsg[2]).id]) {
                    logMsg(new Date().getTime(), "INFO", svr.id, null, newusr.username + " came online");
                    bot.sendMessage(bot.servers[i].channels.get("id", configs.servers[bot.servers[i].id].onmembermsg[2]), configs.servers[bot.servers[i].id].onmembermsg[1][getRandomInt(0, configs.servers[bot.servers[i].id].onmembermsg[1].length-1)].replaceAll("++", "**@" + getName(bot.servers[i], newusr) + "**"));
                }
                
                if(oldusr.username!=newusr.username && oldusr.username && newusr.username) {
                    if(configs.servers[bot.servers[i].id].servermod && configs.servers[bot.servers[i].id].changemembermsg[0]) {
                        logMsg(new Date().getTime(), "INFO", svr.id, null, oldusr.username + " changed username to " + newusr.username);
                        var ch = bot.servers[i].channels.get("id", configs.servers[bot.servers[i].id].changemembermsg[1]);
                        if(ch && stats[bot.servers[i].id].botOn[ch.id]) {
                            bot.sendMessage(ch, "**@" + oldusr.username + (configs.servers[bot.servers[i].id].usediscriminators ? ("#" + oldusr.discriminator) : "") + "** is now **@" + newusr.username + (configs.servers[bot.servers[i].id].usediscriminators ? ("#" + oldusr.discriminator) : "") + "**");
                        }
                    }
                    
                    if(!profileData[oldusr.id]) {
                        profileData[oldusr.id] = {
                            points: 0
                        }
                    }
                    if(!profileData[oldusr.id]["Past Names"]) {
                        profileData[oldusr.id]["Past Names"] = "";
                    }
                    if(profileData[oldusr.id]["Past Names"].length>3) {
                        profileData[oldusr.id]["Past Names"] = "";
                    }
                    if(profileData[oldusr.id]["Past Names"].indexOf(oldusr.username)==-1) {
                        profileData[oldusr.id]["Past Names"] += (profileData[oldusr.id]["Past Names"].length==0 ? "" : ", ") + oldusr.username;
                    }
                    saveData("./data/profiles.json", function(err) {
                        if(err) {
                            logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + newusr.username);
                        }
                    });
                }
            }
        }
    }
});

// Attempt authentication if disconnected
bot.on("disconnected", function() {
    if(readyToGo) {
        reconnect();
    }
});

// Disconnect handler function
function reconnect() {
    disconnects++;
    logMsg(new Date().getTime(), "ERROR", "General", null, "Disconnected from Discord, will try again in 5s");
    setTimeout(function() {
        try {
            bot.loginWithToken(AuthDetails.token);
        } catch(err) {
            logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to reconnect to Discord");
            reconnect();
        }
    }, 5000);
}

// Fetches posts from RSS feeds
function getRSS(svrid, site, count, callback) {
    try {
        var url = site;
        if(configs.servers[svrid].rss[2].indexOf(site)>-1) {
            url = configs.servers[svrid].rss[1][configs.servers[svrid].rss[2].indexOf(site)];
        }
        feed(url, function(err, articles) {
            try {
                if(!err) {
                    articles = articles.slice(0, count);
                }
                callback(err, articles);
            } catch(error) {
                console.log(error.stack);
                logMsg(new Date().getTime(), "ERROR", svrid, null, "Failed to process RSS feed request");
                return;
            }
        });
    } catch(err) {
        logMsg(new Date().getTime(), "ERROR", svrid, null, "Failed to process RSS feed request");
        return;
    }
}

// Checks if a message is a command tag
function checkCommandTag(msg, svrid) {
    if(configs.servers[svrid].cmdtag=="tag" && msg.indexOf(bot.user.mention())==0) {
        var cmdstr = msg.substring(bot.user.mention().length+1);
    } else if(configs.servers[svrid].cmdtag=="tag" && msg.indexOf("<@!" + bot.user.id + ">")==0) {
        var cmdstr = msg.substring(("<@!" + bot.user.id + ">").length+1);
    } else if(msg.indexOf(configs.servers[svrid].cmdtag)==0) {
        var cmdstr = msg.substring(configs.servers[svrid].cmdtag.length);
    } else {
        return;
    }
    if(cmdstr.indexOf(" ")==-1) {
        return [cmdstr, ""];
    } else {
        return [cmdstr.substring(0, cmdstr.indexOf(" ")), cmdstr.substring(cmdstr.indexOf(" ")+1)];
    }
}

// Returns a new trivia question from external questions/answers list
function triviaQ(ch, tset) {
    var info = "";
    
    if(!tset) {
        var r = 4;
        var n = getRandomInt(0, 1);
        if(n==0) {
            r = getRandomInt(1, 1401);
        } else {
            r = getRandomInt(1, 1640);
        }
        getLine("./trivia/trivia" + n + ".txt", (r * 4)-3, function(err, line) {
            info += line.substring(line.indexOf(":")+2) + "\n";
        });
        getLine("./trivia/trivia" + n + ".txt", (r * 4)-2, function(err, line) {
            var q = line.substring(line.indexOf(":")+2);
            if(trivia[ch.id].done.indexOf(q)==-1) {
                info += q;
                trivia[ch.id].done.push(q);
                logMsg(new Date().getTime(), "INFO", ch.server.id, ch.id, "New trivia question");
            } else if(trivia[ch.id].done.length==3041) {
                return;
            } else {
                return triviaQ(ch, tset);
            }
        });
        getLine("./trivia/trivia" + n + ".txt", (r * 4)-1, function(err, line) {
            trivia[ch.id].answer = line.substring(line.indexOf(":")+2).replace("#", "");
        });
    } else {
        var q = configs.servers[ch.server.id].triviasets[tset][getRandomInt(0, configs.servers[ch.server.id].triviasets[tset].length-1)];
        if(trivia[ch.id].done.indexOf(q.question)==-1) {
            info = q.category + "\n" + q.question;
            trivia[ch.id].done.push(q.question);
            trivia[ch.id].answer = q.answer;
            logMsg(new Date().getTime(), "INFO", ch.server.id, ch.id, "New trivia question");
        } else if(trivia[ch.id].done.length==configs.servers[ch.server.id].triviasets[tset].length) {
            return;
        } else {
            return triviaQ(ch, tset);
        }
    }
    
    return info;
}

// End a trivia game
function endTrivia(game, svr, minusone) {
    var info = "Thanks for playing! Y'all got " + game.score + " out of " + (minusone ? game.possible-1 : game.possible) + ".";
    if(game.score>0) {
        info += " Player stats:";
        var players = [];
        for(var usrid in game.responders) {
            var usr = svr.members.get("id", usrid);
            if(usr) {
                players.push([getName(svr, usr), game.responders[usr.id]]);
            }
        }
        players.sort(function(a, b) {
            return a[1] - b[1];
        });
        for(var i=players.length-1; i>=0; i--) {
            info += "\n\t**@" + players[i][0] + "**: " + players[i][1] + " question" + (players[i][1]==1 ? "" : "s");
        }
    }
    return info;
}

// End a giveaway
function endGiveaway(author) {
    logMsg(new Date().getTime(), "INFO", null, author.id, "Closed giveaway " + giveaways[author.id].name);

    var winIndex = getRandomInt(0, giveaways[author.id].enrolled.length-1);
    var ch = bot.channels.get("id", giveaways[author.id].channel);
    var usr = bot.users.get("id", giveaways[author.id].enrolled[winIndex]);
    if(usr && ch) {
        bot.sendMessage(author, "The winner of your giveaway is **@" + getName(ch.server, usr) + "**. I sent them the secret!");
        bot.sendMessage(ch, "The winner of giveaway `" + giveaways[author.id].name + "` started by **@" + getName(ch.server, author) + "** is... " + usr);
        bot.sendMessage(usr, "Congratulations! You won the giveaway `" + giveaways[author.id].name + "` by **@" + getName(ch.server, author) + "** in " + ch.server.name + ":```" + giveaways[author.id].secret + "```");
    } else {
        bot.sendMessage(author, "A winner couldn't be chosen for your giveaway :sob:");
        if(ch) {
            bot.sendMessage(ch, "The winner of giveaway `" + giveaways[author.id].name + "` started by **@" + getName(ch.server, author) + "** is... NO ONE, rip");
        }
    }

    delete giveaways[author.id];
}

// Populate stats.json for a server
function populateStats(svr) {
    if(!stats[svr.id]) {
        logMsg(new Date().getTime(), "INFO", svr.id, null, "Created stats");
        // Overall server stats
        stats[svr.id] = {
            members: {},
            games: {},
            commands: {},
            botOn: {}
        };
    }
    // Turn on bot
    for(var i=0; i<svr.channels.length; i++) {
        if(!stats[svr.id].botOn[svr.channels[i].id]) {
            stats[svr.id].botOn[svr.channels[i].id] = true;
        }
    }
    // Stats for members
    for(var i=0; i<svr.members.length; i++) {
        if(svr.members[i].id!=bot.user.id) {
            var defaultMemberStats = {
                messages: 0,
                voice: 0,
                rank: configs.servers[svr.id].rankslist[0].name,
                rankscore: 0,
                active: new Date().getTime(),
                seen: new Date().getTime(),
                mentions: {
                    pm: false,
                    stream: []
                },
                strikes: []
            };
            if(!stats[svr.id].members[svr.members[i].id]) {
                stats[svr.id].members[svr.members[i].id] = JSON.parse(JSON.stringify(defaultMemberStats));
            } else {
                for(var key in defaultMemberStats) {
                    if(!stats[svr.id].members[svr.members[i].id][key]) {
                        stats[svr.id].members[svr.members[i].id][key] = JSON.parse(JSON.stringify(defaultMemberStats[key]));
                    }
                }
            }
        }
    }
}

// Get a line in a non-JSON file
function getLine(filename, line_no, callback) {
    var data = fs.readFileSync(filename, "utf8");
    var lines = data.split("\n");

    if(+line_no > lines.length){
        throw new Error("File end reached without finding line");
    }

    callback(null, parseLine(lines[+line_no]));
}

// Remove weird spaces every other character generated by parseLine()
function parseLine(line) {
    var str = "";
    for(var i=1; i<line.length; i+=2) {
        str += line.charAt(i);
    }
    return str;
}

// Get a random integer in specified range, inclusive
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Checks if the values in an array are all the same
Array.prototype.allValuesSame = function() {
    for(var i=1; i<this.length; i++) {
        if(this[i]!==this[0]) {
            return false;
        }
    }
    return true;
}

// Check if the maximum array value is duplicated
function duplicateMax(arr) {
    arr.sort()
    if((arr.length-2)<0) {
        return false;
    }
    return arr[arr.length-1]==arr[arr.length-2];
}

// Count the occurrences of an object in an array
function countOccurrences(arr, ref) {
    var a = [];

    arr.sort();
    for(var i = 0; i<ref.length; i++) {
        a[i] = 0;
    }
    for(var i = 0; i<arr.length; i++) {
        a[arr[i]]++;
    }

    return a;
}

// Determine if string contains substring in an array
function contains(arr, str, sens) {
    for(var i=0; i<arr.length; i++) {
        if((sens && str.indexOf(arr[i])>-1) || (!sens && str.toLowerCase().indexOf(arr[i].toLowerCase())>-1)) {
            return i;
        }
    }
    return -1;
} 

// Find the index of the max value in an array
function maxIndex(arr) {
    var max = arr[0];
    var maxIndex = 0;
    for(var i=1; i<arr.length; i++) {
        if(arr[i]>max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}

// Tally number of messages every 24 hours
function clearMessageCounter() {
    for(var svrid in configs.servers) {
        var svr = bot.servers.get("id", svrid);
        if(svr) {
            messages[svrid] = 0;
        }
    }
    setTimeout(function() {
        clearMessageCounter();
    }, 86400000);
}

// Save logs periodically or clear every two days
function clearLogCounter() {
    if(!logs.timestamp) {
        logs.timestamp = new Date().getTime();
    }
    if(dayDiff(new Date(logs.timestamp), new Date())>=2) {
        logs.stream = [];
        logs.timestamp = new Date().getTime();
        logMsg(new Date().getTime(), "INFO", "General", null, "Cleared logs for this pair of days");
    }
    saveData("./data/logs.json", function(err) {
        if(err) {
            logMsg(new Date().getTime(), "ERROR", "General", null, "Could not save updated logs");
        }
    });
    setTimeout(function() {
        clearLogCounter();
    }, 600000);
}

// Maintain stats file freshness
function clearStatCounter() {
    // Clear member activity and game popularity info if 7 days old
    if(dayDiff(new Date(stats.timestamp), new Date())>=7) {
        stats.timestamp = new Date().getTime();
        for(var svrid in stats) {
            if(svrid=="timestamp") {
                continue;
            }
            var svr = bot.servers.get("id", svrid);
            if(svr) {
                clearServerStats(svrid);
            }
        }
        if(configs.maintainer) {
            if(!profileData[configs.maintainer]) {
                profileData[configs.maintainer] = {
                    points: 100000
                };
            }
            if(profileData[configs.maintainer].points<100000) {
                profileData[configs.maintainer].points = 100000;
            }
        }
        logMsg(new Date().getTime(), "INFO", "General", null, "Cleared stats for this week");
    } else {
        for(var i=0; i<bot.servers.length; i++) {
            if(!stats[bot.servers[i].id]) {
                stats[bot.servers[i].id] = {
                    members: {},
                    games: {},
                    commands: {},
                    botOn: {}
                };
            }
            for(var j=0; j<bot.servers[i].members.length; j++) {
                if(bot.servers[i].members[j].id!=bot.user.id && !bot.servers[i].members[j].bot) {
                    // If member is playing game, add 0.1 (equal to five minutes) to game tally
                    var game = getGame(bot.servers[i].members[j]); 
                    if(game && bot.servers[i].members[j].id && bot.servers[i].members[j].status=="online") {
                        if(!stats[bot.servers[i].id].games[game]) {
                            stats[bot.servers[i].id].games[game] = 0;
                        }
                        stats[bot.servers[i].id].games[game] += 0.1;
                    }
                    // Create member stats if necessary
                    checkStats(bot.servers[i].members[j].id, bot.servers[i].id);
                    // If member's mention data is 7 days old, clear it
                    if(stats[bot.servers[i].id].members[bot.servers[i].members[j].id].mentions.stream.length>0) {
                        if(dayDiff(new Date(stats[bot.servers[i].id].members[bot.servers[i].members[j].id].mentions.stream[0].timestamp), new Date())>=7) {
                            stats[bot.servers[i].id].members[bot.servers[i].members[j].id].mentions.timestamp = 0;
                            stats[bot.servers[i].id].members[bot.servers[i].members[j].id].mentions.stream = [];
                        }
                    }
                    // Kick member if they're inactive and autopruning is on
                    if(configs.servers[bot.servers[i].id].servermod && configs.servers[bot.servers[i].id].autoprune[0] && ((new Date().getTime() - stats[bot.servers[i].id].members[bot.servers[i].members[j].id].active) / 1000)>=configs.servers[bot.servers[i].id].autoprune[1]) {
                        bot.kickMember(bot.servers[i].members[j], bot.servers[i]);
                    }
                }
            }
        }
    }
    saveData("./data/stats.json", function(err) {
        if(err) {
            logMsg(new Date().getTime(), "ERROR", "General", null, "Could not save updated stats");
        }
    });
    setTimeout(function() {
        clearStatCounter();
    }, 300000);
}

// End a lottery and pick a winner
function endLottery(ch) {
    var usrid = lottery[ch.server.id].members[getRandomInt(0, lottery[ch.server.id].members.length-1)];
    var usr = ch.server.members.get("id", usrid);
    if(usr && !lottery[ch.server.id].members.allValuesSame() && configs.servers[ch.server.id].blocked.indexOf(usrid)==-1) {
        if(!profileData[usr.id]) {
            profileData[usr.id] = {
                points: 0
            }
        }
        if(pointsball>1000000) {
            pointsball = 20;
        }
        profileData[usr.id].points += pointsball;
        logMsg(new Date().getTime(), "INFO", ch.server.id, ch.id, usr.username + " won the lottery for " + pointsball);
        saveData("./data/profiles.json", function(err) {
            if(err) {
                logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + usr.username);
            }
        });
        bot.sendMessage(ch, "The PointsBall lottery amount is `" + pointsball + "` points, here's the winner..." + usr);
    } else {
        logMsg(new Date().getTime(), "WARN", ch.server.id, ch.id, "No winner of lottery for " + pointsball);
        bot.sendMessage(ch, "The PointsBall lottery amount is `" + pointsball + "` points, here's the winner... NO ONE, rip");
    }
    delete lottery[ch.server.id];
    pointsball = Math.ceil(pointsball * 1.25);
}

// Clear stats.json for a server
function clearServerStats(svrid) {
    var svr = bot.servers.get("id", svrid);
    if(svr && configs.servers[svrid].points && svr.members.length>2) {
        var topMembers = [];
        for(var usrid in stats[svrid].members) {
            var activityscore = stats[svrid].members[usrid].messages + (stats[svrid].members[usrid].voice*10);
            topMembers.push([usrid, activityscore]);
            stats[svrid].members[usrid].rankscore += activityscore / 10;
            stats[svrid].members[usrid].rank = checkRank(svr.members.get("id", usrid), svr);
            stats[svrid].members[usrid].messages = 0;
            stats[svrid].members[usrid].voice = 0;
        }
        topMembers.sort(function(a, b) {
            return a[1] - b[1];
        });
        for(var i=topMembers.length-1; i>topMembers.length-4; i--) {
            if(i<0) {
                break;
            }
            var usr = bot.users.get("id", topMembers[i][0]);
            if(usr) {
                var amount = Math.ceil(topMembers[i][1] / 10);
                logMsg(new Date().getTime(), "INFO", svr.id, null, usr.username + " won " + amount + " in the weekly activity contest");
                if(!profileData[usr.id]) {
                    profileData[usr.id] = {
                        points: 0
                    }
                }
                profileData[usr.id].points += amount;
            }
        }
        saveData("./data/profiles.json", function(err) {
            if(err) {
                logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save update profile data");
            }
        });
        logMsg(new Date().getTime(), "INFO", "General", null, "Cleared stats for " + svr.name);
    }
    for(var game in stats[svrid].games) {
        delete stats[svrid].games[game];
    }
    for(var cmd in stats[svrid].commands) {
        delete stats[svrid].commands[cmd];
    }
}

// Returns extension sandbox
function getExtensionParams(extension, svr, ch, msg, keywordcontains, suffix) {
    var params = {
        store: extension.store,
        writeStore: function(key, value) {
            extension.store[key] = value;
            configs.servers[svr.id].extensions[extension.name].store = value;
            saveData("./data/config.json", function(err) {
                if(err) {
                    logMsg(new Date().getTime(), "ERROR", svr.id, ch.id, "Could not save updated store for extension " + extension.name);
                }
            });
            return extension.store;
        },
        unirest: unirest,
        imgur: imgur,
        gif: getGIF,
        image: function(query, num, callback) {
            giSearch(query, num, svr.id, ch.id, callback);
        },
        rss: function(site, count, callback) {
            getRSS(svr.id, site, count, callback);
        },
        bot: {
            user: getExtensionUser(bot.user, svr),
            sendMessage: function(message) {
                bot.sendMessage(ch, message);
            },
            sendUser: function(usrid, message) {
                bot.sendMessage(svr.members.get("id", usrid), message);
            }
        },
        svr: {
            name: svr.name,
            id: svr.id,
            icon: svr.iconURL,
            owner: getExtensionUser(svr.owner, svr),
            admins: configs.servers[svr.id].admins,
            members: getExtensionSvrMembers(svr),
            roles: {
                list: getExtensionSvrRoles(svr),
                create: function(options, callback) {
                    bot.createRole(svr, options, callback);
                }
            },
            userSearch: function(str) {
                var r = userSearch(str, svr);
                return r ? getExtensionUser(r, svr) : null;
            }
        },
        ch: {
            name: ch.name,
            id: ch.id,
            overwritePermissions: function(type, id, options, callback) {
                if(type=="user") {
                    bot.overwritePermissions(ch, svr.members.get("id", id), options, callback);
                } else if(type=="role") {
                    bot.overwritePermissions(ch, svr.roles.get("id", id), options, callback);
                }
            },
            muteUser: function(usrid, callback) {
                var usr = svr.members.get("id", usrid);
                if(usr) {
                    muteUser(ch, usr, function(err) {
                        if(!err) {
                            logMsg(new Date().getTime(), "INFO", svr.id, ch.id, "Toggled mute for " + usr.username);
                        }
                        callback(err); 
                    });
                } else {
                    callback(true);
                }
            },
            createSelectMenu: function(callback, usrid, max) {
                return selectMenu(ch, usrid, callback, max);
            }
        },
        parseTime: parseTime,
        prettyDate: prettyDate,
        secondsToString: secondsToString,
        setTimeout: setTimeout,
        JSON: JSON,
        Math: Math,
        isNaN: isNaN,
        Date: Date,
        RegExp: RegExp,
        Array: Array,
        Number: Number,
        encodeURI: encodeURI,
        decodeURI: decodeURI,
        parseInt: parseInt,
        logMsg: function(level, message) {
            if(["INFO", "WARN", "ERROR"].indexOf(level.toUpperCase())>-1) {
                logMsg(new Date().getTime(), level.toUpperCase(), svr.id, ch.id, "Extension log: " + message);
            }
        }
    };
    if(msg && ["keyword", "command"].indexOf(extension.type)>-1) {
        var mentions = msg.mentions;
        if(mentions) {
            for(var i=0; i<mentions.length; i++) {
                if(mentions[i].id==bot.user.id) {
                    mentions.splice(i, 1);
                }
            }
        } else {
            mentions = [];
        }
        params.message = {
            content: msg.content,
            cleancontent: msg.cleanContent,
            mentions: mentions,
            author: getExtensionUser(msg.author, svr),
            delete: function() {
                bot.deleteMessage(msg);
            }
        };
    }
    if(extension.type=="keyword" && keywordcontains) {
        params.selected = keywordcontains;
    }
    if(extension.type=="command") {
        params.message.suffix = suffix.trim();
    }
    return params;
}

// Get data for a server's members to pass to an extension
function getExtensionSvrMembers(svr) {
    var members = {};
    for(var i=0; i<svr.members.length; i++) {
        members[svr.members[i].id] = getExtensionUser(svr.members[i], svr);
    }
    return members;
}

function getExtensionMemberRoles(usr, svr) {
    var rolesOfUser = [];
    for(var i=0; i<svr.rolesOfUser(usr).length; i++) {
        if(svr.rolesOfUser(usr)[i]) {
            rolesOfUser.push(svr.rolesOfUser(usr)[i].id);
        }
    }
    return rolesOfUser;
}

function getExtensionUser(usr, svr) {
    return {
        name: getName(svr, usr),
        username: usr.username,
        nick: svr.detailsOfUser(usr).nick,
        discriminator: usr.discriminator,
        id: usr.id,
        mention: usr.mention(),
        avatar: usr.avatarURL,
        roles: getExtensionMemberRoles(usr, svr),
        profileData: profileData[usr.id] || {},
        statsData: stats[svr.id].members[usr.id] || {},
        setProfileKey: function(key, value) {
            if(profileData[usr.id] && key && (profileData[usr.id][key] || !value)) {
                delete profileData[usr.id][key];
            } else if(key && value) {
                if(!profileData[usr.id]) {
                    profileData[usr.id] = {
                        points: 0
                    };
                }
                profileData[usr.id][key] = value;
            }
        },
        setNickname: function(nick) {
            bot.setNickname(svr, nick, usr);
        },
        addStrike: function(reason) {
            stats[svr.id].members[usr.id].strikes.push(["Automatic", reason, new Date().getTime()]);
        },
        kick: function() {
            bot.kickMember(usr, svr);
        },
        block: function() {
            if(configs.servers[svr.id].blocked.indexOf(usr.id)==-1) {
                configs.servers[svr.id].blocked.push(usr.id);
            }
        }
    };
}

// Get data for a server's roles to pass to an extension
function getExtensionSvrRoles(svr) {
    var roles = {};
    for(var i=0; i<svr.roles.length; i++) {
        if(svr.roles[i].name!="@everyone" && svr.roles[i].name.indexOf("color-")!=0) {
            var membersWithRole = svr.usersWithRole(svr.roles[i]);
            for(var j=0; j<membersWithRole.length; j++) {
                membersWithRole[j] = membersWithRole[j].id;
            }
            roles[svr.roles[i].id] = {
                name: svr.roles[i].name,
                position: svr.roles[i].position,
                color: svr.roles[i].colorAsHex(),
                members: membersWithRole,
                add: function(usrid) {
                    if(!bot.memberHasRole(svr.members.get("id", usrid)), svr.roles[i]) {
                        bot.addMemberToRole(svr.members.get("id", usrid), svr.roles[i]);
                    }
                },
                remove: function(usrid) {
                    if(bot.memberHasRole(svr.members.get("id", usrid)), svr.roles[i]) {
                        bot.removeMemberFromRole(svr.members.get("id", usrid), svr.roles[i]);
                    }
                },
                update: function(options) {
                    bot.updateRole(svr.roles[i], options);
                },
                delete: function() {
                    bot.deleteRole(svr.roles[i]);
                }
            };
        }
    }
    return roles;
}

// Start timer extensions on all servers
function runTimerExtensions() {
    for(var svrid in configs.servers) {
        var svr = bot.servers.get("id", svrid);
        if(svr) {
            for(var extnm in configs.servers[svrid].extensions) {
                if(configs.servers[svrid].extensions[extnm].type=="timer") {
                    runTimerExtension(svrid, extnm);
                }
            }
        }
    }
}

// Run a specific timer extension
function runTimerExtension(svrid, extnm) {
    var extension = configs.servers[svrid].extensions[extnm];
    var svr = bot.servers.get("id", svrid);
    if(extension && svr) {
        for(var i=0; i<extension.channels.length; i++) {
            var ch = svr.channels.get("name", extension.channels[i]);
            if(ch) {
                var params = getExtensionParams(extension, svr, ch);
                try {
                    var extDomain = domainRoot.create();
                    extDomain.run(function() {
                        var context = new vm.createContext(params);
                        var script = new vm.Script(extension.process);
                        script.runInContext(context);
                        logMsg(new Date().getTime(), "INFO", svr.id, ch.id, "Timer extension " + extension.type + " executed successfully");
                    });
                    extDomain.on("error", function(runError) {
                        logMsg(new Date().getTime(), "ERROR", msg.channel.server.id, msg.channel.id, "Failed to run extension " + configs.servers[msg.channel.server.id].extensions[ext].type + ": " + runError);
                    });
                } catch(runError) {
                    logMsg(new Date().getTime(), "ERROR", svr.id, null, "Failed to run timer extension " + extnm + ": " + runError);
                }
            }
        }
        setTimeout(function() {
            runTimerExtension(svrid, extnm);
        }, extension.interval * 1000);
    }
}

// Check for RSS updates and post them
function rssTimer() {
    for(var i=0; i<bot.servers.length; i++) {
        for(var j=0; j<configs.servers[bot.servers[i].id].rss[1].length; j++) {
            if(configs.servers[bot.servers[i].id].rss[3][j][0].length>0) {
                rssUpdates(bot.servers[i], j);
            }
        }
    }

    setTimeout(function() {
        rssTimer();
    }, 900000);
}

// Send RSS updates for a feed
function rssUpdates(svr, i) {
    getRSS(svr.id, configs.servers[svr.id].rss[1][i], 100, function(err, articles) {
        if(!err) {
            var info = [];
            for(var j=articles.length-1; j>=0; j--) {
                var tmpinfo = (articles[j].published instanceof Date ? ("`" + prettyDate(articles[j].published) + "`") : "") + " **"  + articles[j].title + "**\n" + articles[j].link + "\n";
                if((tmpinfo.length + info.join("").length)>2000 || articles[j].link==configs.servers[svr.id].rss[3][i][1]) {
                    break;
                } else {
                    info.push(tmpinfo);
                }
            }
            if(info.length>0) {
                configs.servers[svr.id].rss[3][i][1] = articles[articles.length-1].link;
                saveData("./data/config.json", function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save updated configs for " + bot.servers[i].name);
                    }
                });
                logMsg(new Date().getTime(), "INFO", bot.servers[i].id, null, info.length + " new in feed " + configs.servers[svr.id].rss[2][i]);
                for(var j=0; j<configs.servers[svr.id].rss[3][i][0].length; j++) {
                    var ch = svr.channels.get("id", configs.servers[svr.id].rss[3][i][0][j]);
                    if(ch) {
                        bot.sendMessage(ch, "__" + info.length + " new in feed `" + configs.servers[svr.id].rss[2][i] + "`:__\n\n" + info.join(""));
                    }
                }
            }
        }
    });
}

// Add a select menu to a channel
function selectMenu(ch, usrid, callback, max) {
    if(!selectmenu[ch.id] && !isNaN(usrid) && typeof(callback)=="function" && max!=null && !isNaN(max)) {
        selectmenu[ch.id] = {
            process: callback,
            usrid: usrid,
            max: max
        };
        return true;
    }
    return false;
}

// Converts seconds to a nicely formatted string in years, days, hours, minutes, seconds
function secondsToString(seconds) {
    try {
        var numyears = Math.floor(seconds / 31536000);
        var numdays = Math.floor((seconds % 31536000) / 86400);
        var numhours = Math.floor(((seconds % 31536000) % 86400) / 3600);
        var numminutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
        var numseconds = Math.round((((seconds % 31536000) % 86400) % 3600) % 60);
        
        var str = "";
        if(numyears>0) {
            str += numyears + " year" + (numyears==1 ? "" : "s") + " ";
        }
        if(numdays>0) {
            str += numdays + " day" + (numdays==1 ? "" : "s") + " ";
        }
        if(numhours>0) {
            str += numhours + " hour" + (numhours==1 ? "" : "s") + " ";
        }
        if(numminutes>0) {
            str += numminutes + " minute" + (numminutes==1 ? "" : "s") + " ";
        }
        if(numseconds>0) {
            str += numseconds + " second" + (numseconds==1 ? "" : "s") + " ";
        }
        return str;
    } catch(err) {
        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to process secondsToString request");
        return;
    }
}

// Generate key for online config
function genToken(length) {
    var key = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for(var i=0; i<length; i++) {
        key += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return key;
}

// Get online console session with given authtoken
function getOnlineConsole(token) {
    var session = {};
    for(var s in onlineconsole) {
        if(onlineconsole[s].token==token) {
            session = {
                usrid: s,
                token: onlineconsole[s].token,
                type: onlineconsole[s].type
            };
            if(onlineconsole[s].svrid) {
                session.svrid = onlineconsole[s].svrid;
            }
        }
    }
    return session;
}

// Parse JSON data from POST for maintainer console
function parseMaintainerConfig(delta, consoleid, callback) {
    for(var key in delta) {
        switch(key) {
            case "botblocked":
                var usr = bot.users.get("id", delta[key]);
                if(usr) {
                    if(configs.botblocked.indexOf(usr.id)>-1) {
                        configs.botblocked.splice(configs.botblocked.indexOf(usr.id), 1);
                        logMsg(new Date().getTime(), "INFO", "General", null, "Removed " + usr.username + " from botblocked list");
                    } else {
                        configs.botblocked.push(usr.id);
                        logMsg(new Date().getTime(), "INFO", "General", null, "Added " + usr.username + " from botblocked list");
                    }
                    saveData("./data/config.json", function(err) {
                        if(err) {
                            logMsg(new Date().getTime(), "ERROR", "General", null, "Could not save new config");
                            throw new Error;
                        }
                        callback(err);
                    });
                } else {
                    callback(true);
                }
                break;
            case "username":
                bot.setUsername(delta[key], function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to change username to '" + delta[key] + "'");
                    } else {
                        logMsg(new Date().getTime(), "INFO", "General", null, "Changed bot username to '" + delta[key] + "'");
                    }
                    callback(err);
                });
                break;
            case "avatar":
                base64.encode(delta[key], {filename: "avatar"}, function(error, image) {
                    if(!error) {
                        bot.setAvatar(image, function(err) {
                            if(err) {
                                logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to set bot avatar");
                                callback(err);
                            } else {
                                logMsg(new Date().getTime(), "INFO", "General", null, "Changed bot avatar to '" + delta[key] + "'");
                                AuthDetails.avatar_url = delta[key];
                                saveData("./auth.json", function(serr) {
                                    if(serr) {
                                        logMsg(new Date().getTime(), "ERROR", "General", null, "Could not save new AuthDetails");
                                    }
                                    callback(serr);
                                });
                            }
                        });
                    } else {
                        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to set bot avatar");
                        callback(error);
                    }
                });
                break;
            case "game":
                bot.setStatus("online", delta[key]);
                if(delta[key]==".") {
                    delta[key] = "";
                    bot.setStatus("online", null);
                } else if(delta[key]=="default") {
                    defaultGame(0, true);
                }
                logMsg(new Date().getTime(), "INFO", "General", null, "Set bot game to '" + delta[key] + "'");
                configs.game = delta[key];
                saveData("./data/config.json", function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", "General", null, "Could not save new config");
                    }
                    callback(err);
                });
                break;
            case "msgserver":
                var ch = bot.channels.get("id", delta[key][0]);
                if(!ch || ch.isPrivate) {
                    callback(true);
                    return;
                }
                bot.sendMessage(ch, delta[key][1], function(err) {
                    if(!err) {
                        logMsg(new Date().getTime(), "INFO", "General", null, "Sent message '" + delta[key][1] + "' to " + ch.server.name + " from maintainer");
                    }
                    callback(err);
                });
                break;
            case "rmserver":
                var svr = bot.servers.get("id", delta[key]);
                if(!svr) {
                    callback(true);
                    return;
                }
                bot.leaveServer(svr, function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to leave server " + svr.name);
                    } 
                    callback(err);
                });
                break;
            case "clearstats":
                try {
                    clearServerStats(delta[key]);
                    callback();
                } catch(err) {
                    callback(err);
                }
                break;
            case "resetconfigs":
                try {
                    defaultConfig(bot.servers.get("id", delta[key]), true);
                    callback();
                } catch(err) {
                    callback(err);
                }
                break;
            case "points":
                var usr = bot.users.get("id", delta[key][0]);
                if(usr) {
                    if(!profileData[usr.id]) {
                        profileData[usr.id] = {
                            points: 0
                        }
                    }
                    profileData[usr.id].points = parseInt(delta[key][1]);
                    logMsg(new Date().getTime(), "INFO", "General", null, "Maintainer set " + usr.username + "'s points to " + delta[key][1]);
                    saveData("./data/profiles.json", function(err) {
                        if(err) {
                            logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + usr.username);
                        }
                        callback(err);
                    });
                } else {
                    callback(true);
                }
                break;
            case "pmforward":
                if(typeof(delta[key])!="boolean") {
                    callback(true);
                    return;
                }
                logMsg(new Date().getTime(), "INFO", "General", null, "Turned PM forwarding to maintainer " + (delta[key] ? "on" : "off"));
                configs.pmforward = delta[key];
                saveData("./data/config.json", function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", "General", null, "Could not save new config");
                    }
                    callback(err);
                });
                break;
            case "status":
                bot.setStatus(delta[key], configs.game, function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to change status to " + delta[key]);
                    } else {
                        logMsg(new Date().getTime(), "INFO", "General", null, "Changed bot status to " + delta[key]);
                    }
                    callback(err);
                });
                break;
            case "message":
                for(var i=0; i<bot.servers.length; i++) {
                    bot.sendMessage(bot.servers[i].defaultChannel, delta[key]);
                }
                logMsg(new Date().getTime(), "INFO", "General", null, "Sent message \"" + delta[key] + "\" in every server");
                callback();
                break;
            case "clearlogs":
                logs.stream = [];
                logs.timestamp = new Date().getTime();
                logMsg(new Date().getTime(), "INFO", "General", null, "Cleared logs at maintainer's request");
                callback();
                break;
            case "extend":
                clearTimeout(onlineconsole[consoleid].timer);
                onlineconsole[consoleid].timer = setTimeout(function() {
                    logMsg(new Date().getTime(), "INFO", "General", null, "Timeout on online maintainer console");
                    delete onlineconsole[consoleid];
                }, 300000);
                logMsg(new Date().getTime(), "INFO", "General", null, "Extended maintainer console session");
                callback();
                return;
            case "logout":
                clearTimeout(onlineconsole[delta[key]].timer);
                delete onlineconsole[delta[key]];
                logMsg(new Date().getTime(), "INFO", "General", null, "Logged out of online maintainer console");
                callback();
                break;
        }
    }
}

// Parse JSON data from POST for admin console
function parseAdminConfig(delta, svr, consoleid, callback) {
    var consoleusr = bot.users.get("id", consoleid);
    for(var key in delta) {
        switch(key) {
            case "nickname":
                var nick = delta[key];
                if(delta[key]==".") {
                    nick = bot.user.username;
                }
                bot.setNickname(svr, nick, bot.user, function(err) {
                    if(!err) {
                        logMsg(new Date().getTime(), "INFO", svr.id, null, (nick!=bot.user.username ? ("Changed nickname to '" + nick + "'") : "Removed nickname") + " (@" + consoleusr.username + ")");
                    }
                    callback(err);
                });
                return;
            case "customkeys": 
                if(Array.isArray(delta[key]) && delta[key].length==2 && ["google_api_key", "custom_search_id"].indexOf(delta[key][0])>-1) {
                    if(delta[key][1]=="default") {
                        configs.servers[svr.id].customkeys[delta[key][0]] = "";
                    } else {
                        configs.servers[svr.id].customkeys[delta[key][0]] = delta[key][1];
                    }
                } else {
                    callback(true);
                    return;
                }
            break;
            case "preset":
                delta[key] = delta[key].toLowerCase();
                if(configDefaults[delta[key]] && delta[key]!="default") {
                    for(var config in configDefaults[delta[key]]) {
                        configs.servers[svr.id][config] = JSON.parse(JSON.stringify(configDefaults[delta[key]][config]));
                    }
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Applied config preset " + delta[key] + " for server (@" + consoleusr.username + ")");
                } else if(delta[key]=="default") {
                    defaultConfig(svr, true);
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Reset configs for server (@" + consoleusr.username + ")");
                } else {
                    callback(true);
                    return;
                }
                break;
            case "listing":
                if(typeof(delta[key])=="boolean") {
                    if(!delta[key]) {
                        configs.servers[svr.id].listing.enabled = delta[key];
                        logMsg(new Date().getTime(), "INFO", svr.id, null, "Disabled server listing (@" + consoleusr.username + ")");
                    } else {
                        bot.createInvite(svr.defaultChannel, {
                            maxAge: 0
                        }, function(err, invite) {
                            if(err) {
                                logMsg(new Date().getTime(), "ERROR", svr.id, null, "Failed to create server listing invite (@" + consoleusr.username + ")");
                                callback(true);
                            } else {
                                configs.servers[svr.id].listing.invite = "https://discord.gg/" + invite.code;
                                configs.servers[svr.id].listing.enabled = delta[key];
                                if(!configs.servers[svr.id].listing.description) {
                                    configs.servers[svr.id].listing.description = svr.defaultChannel.topic;
                                }
                                logMsg(new Date().getTime(), "INFO", svr.id, null, "Enabled server listing (@" + consoleusr.username + ")");
                                saveData("./data/config.json", function(err) {
                                    if(err) {
                                        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save updated configs (@" + consoleusr.username + ")");
                                    }
                                    callback(err); 
                                });
                            }
                        });
                        return;
                    }
                } else {
                    if(delta[key].length>1000) {
                        callback(true);
                        return;
                    }
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Set server listing description to '" + delta[key].replace(/<\/?[^>]+(>|$)/g, "") + "' (@" + consoleusr.username + ")");
                    configs.servers[svr.id].listing.description = delta[key].replace(/<\/?[^>]+(>|$)/g, "");
                }
                break;
            case "admins":
            case "blocked":
                if(isNaN(delta[key])) {
                    var role = svr.roles.get("id", delta[key].substring(5));
                    if(role) {
                        var users = svr.usersWithRole(role);
                        for(var i=0; i<users.length; i++) {
                            if(configs.servers[svr.id][key].indexOf(users[i].id)==-1 && configs.servers[svr.id][key=="admins" ? "blocked" : "admins"].indexOf(users[i].id)==-1) {
                                configs.servers[svr.id][key].push(users[i].id);
                            }
                        }
                        logMsg(new Date().getTime(), "INFO", svr.id, null, "Added role " + role.name + " to " + key + " list (@" + consoleusr.username + ")");
                    } else {
                        callback(true);
                        return;
                    }
                } else {
                    var usr = svr.members.get("id", delta[key]);
                    if(usr) {
                        if(configs.servers[svr.id][key].indexOf(usr.id)>-1) {
                            if(key=="admins" && (usr.id==consoleid || usr.id==svr.owner.id || (usr.id==configs.maintainer && consoleid!=configs.maintainer))) {
                                callback(true);
                                return;
                            }
                            logMsg(new Date().getTime(), "INFO", svr.id, null, "Removed " + usr.username + " from " + key + " list (@" + consoleusr.username + ")");
                            configs.servers[svr.id][key].splice(configs.servers[svr.id][key].indexOf(usr.id), 1);
                        } else {
                            if(key=="blocked" && (usr.id==consoleid || usr.id==svr.owner.id || (usr.id==configs.maintainer && consoleid!=configs.maintainer))) {
                                callback(true);
                                return;
                            } else if(key=="admins" && stats[svr.id].members[usr.id]) {
                                stats[svr.id].members[usr.id].strikes = [];
                            }
                            logMsg(new Date().getTime(), "INFO", svr.id, null, "Added " + usr.username + " to " + key + " list (@" + consoleusr.username + ")");
                            configs.servers[svr.id][key].push(usr.id);
                        }
                    } else {
                        callback(true);
                        return;
                    }
                }
                break;
            case "translated":
                if(!Array.isArray(delta[key])) {
                    callback(true);
                    return;
                } else {
                    var usr = svr.members.get("id", delta[key][0]);
                    if(usr) {
                        if(configs.servers[svr.id][key].list.indexOf(usr.id)>-1) {
                            logMsg(new Date().getTime(), "INFO", svr.id, null, "Removed " + usr.username + " from " + key + " list (@" + consoleusr.username + ")");
                            configs.servers[svr.id][key].list.splice(configs.servers[svr.id][key].list.indexOf(usr.id), 1);
                            configs.servers[svr.id][key].langs.splice(configs.servers[svr.id][key].list.indexOf(usr.id), 1);
                            configs.servers[svr.id][key].channels.splice(configs.servers[svr.id][key].list.indexOf(usr.id), 1);
                        } else if(delta[key][1] && delta[key][2] && Array.isArray(delta[key][2])) {
                            logMsg(new Date().getTime(), "INFO", svr.id, null, "Added " + usr.username + " to " + key + " list (@" + consoleusr.username + ")");
                            configs.servers[svr.id][key].list.push(usr.id);
                            configs.servers[svr.id][key].langs.push(delta[key][1]);
                            configs.servers[svr.id][key].channels.push(delta[key][2]);
                        } else {
                            callback(true);
                            return;
                        }
                    } else {
                        callback(true);
                        return;
                    }
                }
                break;
            case "mute":
                if(!Array.isArray(delta[key]) || delta[key].length!=2 || isNaN(delta[key][0]) || (isNaN(delta[key][1]) && delta[key][1]!="all")) {
                    callback(true);
                } else {
                    var usr = svr.members.get("id", delta[key][0]);
                    if(usr) {
                        if(delta[key][1]=="all") {
                            var muteInChannel = function(i) {
                                if(i>=svr.channels.length) {
                                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Toggled mute for " + usr.username + " in all channels (@" + consoleusr.username + ")");
                                    callback();
                                    return;
                                }
                                if(svr.channels[i] instanceof Discord.VoiceChannel) {
                                    muteInChannel(++i);
                                    return;
                                }
                                muteUser(svr.channels[i], usr, function(err) {
                                    if(err) {
                                        callback(err);
                                    } else {
                                        muteInChannel(++i);
                                    }
                                });
                            };
                            muteInChannel(0);
                        } else {
                            var ch = svr.channels.get("id", delta[key][1]);
                            muteUser(ch, usr, function(err) {
                                if(!err) {
                                    logMsg(new Date().getTime(), "INFO", svr.id, ch.id, "Toggled mute for " + usr.username + " (@" + consoleusr.username + ")");
                                }
                                callback(err);
                            });
                        }
                    } else {
                        callback(true);
                    }
                }
                return;
            case "strikes":
                if(Array.isArray(delta[key]) && delta[key].length==2) {
                    var usr = svr.members.get("id", delta[key][0]);
                    if(usr) {
                        if(!isNaN(delta[key][1])) {
                            if(stats[svr.id].members[usr.id]) {
                                if(delta[key][1]<stats[svr.id].members[usr.id].strikes.length && delta[key][1]>=0) {
                                    if(["First-time spam violation", "First-time filter violation"].indexOf(stats[svr.id].members[usr.id].strikes[delta[key][1]][1])>-1 && stats[svr.id].members[usr.id].strikes[delta[key][1]][0]=="Automatic") {
                                        if(configs.servers[svr.id].points && profileData[usr.id].points) {
                                            profileData[usr.id].points += 50;
                                        }
                                    } else if(["Second-time spam violation", "Second-time filter violation"].indexOf(stats[svr.id].members[usr.id].strikes[delta[key][1]][1])>-1 && stats[svr.id].members[usr.id].strikes[delta[key][1]][0]=="Automatic") {
                                        if(configs.servers[svr.id].points && profileData[usr.id].points) {
                                            profileData[usr.id].points += 100;
                                        }
                                        if(configs.servers[svr.id].blocked.indexOf(usr.id)>-1) {
                                            configs.servers[svr.id].blocked.splice(configs.servers[svr.id].blocked.indexOf(usr.id), 1);
                                        }
                                    }
                                    
                                    stats[svr.id].members[usr.id].strikes.splice(delta[key][1], 1);
                                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Removed strike for " + usr.username + " (@" + consoleusr.username + ")");
                                } else if(delta[key][1]==-1) {
                                    stats[svr.id].members[usr.id].strikes = [];
                                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Cleared strikes for " + usr.username + " (@" + consoleusr.username + ")");
                                } else {
                                    callback(true);
                                    return;
                                }
                            } else {
                                callback(true);
                                return;
                            }
                        } else {
                            if(delta[key][1].length>200) {
                                callback(true);
                                return;
                            }
                            checkStats(usr.id, svr.id);
                            stats[svr.id].members[usr.id].strikes.push([consoleid, delta[key][1], new Date().getTime()]);
                            logMsg(new Date().getTime(), "INFO", svr.id, null, "Strike for " + usr.username + " (@" + consoleusr.username + ")");
                        }
                    } else {
                        callback(true);
                        return;
                    }
                } else {
                    callback(true);
                    return;
                }
                break;
            case "customroles":
            case "spamfilter":
            case "nsfwfilter":
                if(typeof(delta[key])=="boolean") {
                    configs.servers[svr.id][key][0] = delta[key];
                    var yn = delta[key] ? "on" : "off";
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Turned " + key + " " + yn + " (@" + consoleusr.username + ")");
                } else if(!isNaN(delta[key]) && key!="customroles") {
                    var ch = svr.channels.get("id", delta[key]);
                    if(!ch) {
                        callback(true);
                        return;
                    }
                    if(configs.servers[svr.id][key][1].indexOf(ch.id)>-1) {
                        configs.servers[svr.id][key][1].splice(configs.servers[svr.id][key][1].indexOf(ch.id), 1);
                        var yn = "on";
                    } else{
                        configs.servers[svr.id][key][1].push(ch.id);
                        var yn = "off";
                    }
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Turned " + key + " " + yn + " in " + ch.name + ", (@" + consoleusr.username + ")");
                } else if(!isNaN(delta[key]) && key=="customroles") {
                    var role = svr.roles.get("id", delta[key]);
                    if(!role) {
                        callback(true);
                        return;
                    }
                    if(configs.servers[svr.id][key][1].indexOf(role.id)>-1) {
                        configs.servers[svr.id][key][1].splice(configs.servers[svr.id][key][1].indexOf(role.id), 1);
                        var yn = ["Removed", "from"];
                        if(configs.servers[svr.id][key][1].length==0) {
                            configs.servers[svr.id][key][0] = false;
                        }
                    } else {
                        configs.servers[svr.id][key][1].push(role.id);
                        var yn = ["Added", "to"];
                    }
                    logMsg(new Date().getTime(), "INFO", svr.id, null, yn[0] + " " + role.name + " " + yn[1] + " " + key + " list (@" + consoleusr.username + ")");
                } else if(delta[key]=="custom" && key=="customroles") {
                    configs.servers[svr.id][key][2] = !configs.servers[svr.id][key][2];
                    var yn = configs.servers[svr.id][key][2] ? "on" : "off";
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Turned custom for " + key + " " + yn + " (@" + consoleusr.username + ")");
                } else if(["spamfilter", "nsfwfilter"].indexOf(key)>-1 && delta[key].toLowerCase().indexOf("action-")==0 && ["action-kick", "action-block", "action-mute"].indexOf(delta[key].toLowerCase())>-1) {
                    if(key=="spamfilter") {
                        configs.servers[svr.id][key][3] = delta[key].toLowerCase().substring(delta[key].indexOf("-")+1);
                    } else if(key=="nsfwfilter") {
                        configs.servers[svr.id][key][2] = delta[key].toLowerCase().substring(delta[key].indexOf("-")+1);
                    }
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Set " + key + " action to " + delta[key].toLowerCase().substring(delta[key].indexOf("-")+1) + " (@" + consoleusr.username + ")");
                } else if(key=="spamfilter") {
                    if(["high", "medium", "low"].indexOf(delta[key].toLowerCase())==-1) {
                        callback(true);
                        return;
                    }
                    switch(delta[key]) {
                        case "high":
                            configs.servers[svr.id][key][2] = 3;
                            break;
                        case "medium":
                            configs.servers[svr.id][key][2] = 5;
                            break;
                        case "low":
                            configs.servers[svr.id][key][2] = 10;
                            break;
                    }
                    logMsg(new Date().getTime(), "INFO", svr.id, null, key + " sensitivity set to " + delta[key] + " (@" + consoleusr.username + ")");
                } else {
                    callback(true);
                    return;
                }
                break;
            case "rss":
                if(typeof(delta[key])=="boolean") {
                    configs.servers[svr.id][key][0] = delta[key];
                    var yn = delta[key] ? "on" : "off";
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Command " + key + " turned " + yn + " (@" + consoleusr.username + ")");
                } else if(typeof(delta[key])=="object" && delta[key].chid && !isNaN(delta[key].chid) && !isNaN(delta[key].i) && delta[key].i>=0 && delta[key].i<configs.servers[svr.id].rss[1].length) {
                    var ch = svr.channels.get("id", delta[key].chid);
                    if(ch) {
                        if(configs.servers[svr.id].rss[3][delta[key].i][0].indexOf(delta[key].chid)==-1) {
                            var yn = "removed from";
                            configs.servers[svr.id].rss[3][delta[key].i][0].push(delta[key].chid);
                        } else {
                            var yn = "added to";
                            configs.servers[svr.id].rss[3][delta[key].i][0].splice(configs.servers[svr.id].rss[3][delta[key].i][0].indexOf(delta[key].chid), 1);
                        }
                        logMsg(new Date().getTime(), "INFO", svr.id, null, ch.name + " " + yn + " rss updates list for " + configs.servers[svr.id].rss[2][delta[key].i] + " (@" + consoleusr.username + ")");
                    } else {
                        callback(true);
                        return;
                    }
                } else if(!Array.isArray(delta[key])) {
                    if(configs.servers[svr.id].rss[2][delta[key]]) {
                        logMsg(new Date().getTime(), "INFO", svr.id, null, "Feed " + configs.servers[svr.id].rss[2][delta[key]] + " removed (@" + consoleusr.username + ")");
                        configs.servers[svr.id].rss[1].splice(delta[key], 1);
                        configs.servers[svr.id].rss[2].splice(delta[key], 1);
                    } else {
                        callback(true);
                        return;
                    }
                } else {
                    if(configs.servers[svr.id].rss[2].indexOf(delta[key][1])==-1 && configs.servers[svr.id].rss[1].indexOf(delta[key][0])==-1 && (/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/).test(delta[key][0])) {
                        configs.servers[svr.id].rss[1].push(delta[key][0]);
                        configs.servers[svr.id].rss[2].push(delta[key][1].toLowerCase());
                        logMsg(new Date().getTime(), "INFO", svr.id, null, "Feed " + delta[key][1] + " added (@" + consoleusr.username + ")");
                    } else {
                        callback(true);
                        return;
                    } 
                }
                break;
            case "cmdtag":
                if(["tag", "+", "&", "!", "-", "--", "/", "$", ">", "`", "~", "*", "=", "\\", "'"].indexOf(delta[key])>-1) {
                    configs.servers[svr.id].cmdtag = delta[key];
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Changed " + key + " to '" + delta[key] + "' (@" + consoleusr.username + ")");
                } else {
                    callback(true);
                    return;
                }
                break;
            case "newgreeting": 
                if(delta[key].length>1500) {
                    callback(true);
                    return;
                }
                logMsg(new Date().getTime(), "INFO", svr.id, null, "Set " + key + " to '" + delta[key] + "' (@" + consoleusr.username + ")");
                configs.servers[svr.id][key] = delta[key];
                break;
            case "rankslist":
                if(!isNaN(delta[key]) && delta[key]>=0 && delta[key]<configs.servers[svr.id].rankslist.length && configs.servers[svr.id].rankslist.length>1) {
                    var removedRank = configs.servers[svr.id].rankslist.splice(delta[key], 1);
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Removed rank " + removedRank.name + " with max " + removedRank.max + " (@" + consoleusr.username + ")");
                } else if(typeof(delta[key])=="object" && Object.keys(delta[key]).length==3 && delta[key].name && delta[key].max && !isNaN(delta[key].max) && delta[key].max>0 && (delta[key].role==null || svr.roles.get("id", delta[key].role))) {
                    for(var i=0; i<configs.servers[svr.id].rankslist.length; i++) {
                        if(delta[key].name==configs.servers[svr.id].rankslist[i].name || delta[key].max==configs.servers[svr.id].rankslist[i].max) {
                            callback(true);
                            return;
                        }
                        if(delta[key].max<=configs.servers[svr.id].rankslist[i].max) {
                            configs.servers[svr.id].rankslist.splice(i, 0, delta[key]);
                            logMsg(new Date().getTime(), "INFO", svr.id, null, "Added rank " + delta[key].name + " with max " + delta[key].max + " (@" + consoleusr.username + ")");
                            break;
                        } else if(i==configs.servers[svr.id].rankslist.length-1) {
                            configs.servers[svr.id].rankslist.splice(i+1, 0, delta[key]);
                            logMsg(new Date().getTime(), "INFO", svr.id, null, "Added rank " + delta[key].name + " with max " + delta[key].max + " (@" + consoleusr.username + ")");
                            break;
                        }
                    }
                }
                break;
            case "cooldown":
            case "defaultcount":
            case "maxcount":
                if(isNaN(delta[key]) || (["defaultcount", "maxcount"].indexOf(key)>-1 && (delta[key]>100 || delta[key]<1)) || (key=="cooldown" && delta[key]>300000)) {
                    callback(true);
                    return;
                }
                configs.servers[svr.id][key] = parseInt(delta[key]);
                logMsg(new Date().getTime(), "INFO", svr.id, null, key + " set to " + delta[key] + " (@" + consoleusr.username + ")");
                break;
            case "newrole":
                var newroles = [];
                if(delta[key]) {
                    for(var i=0; i<delta[key].length; i++) {
                        var role = svr.roles.get("id", delta[key][i]);
                        if(role && newroles.indexOf(role.id)==-1) {
                            newroles.push(role.id);
                        }
                    }
                }
                configs.servers[svr.id][key] = newroles;
                logMsg(new Date().getTime(), "INFO", svr.id, null, "Set " + newroles.length + " " + key + (newroles.length==1 ? "" : "s") + " (@" + consoleusr.username + ")");
                break;
            case "newmembermsg":
            case "onmembermsg":
            case "offmembermsg":
            case "rmmembermsg":
            case "banmembermsg":
            case "unbanmembermsg":
                if(typeof(delta[key])=="boolean") {
                    configs.servers[svr.id][key][0] = delta[key];
                    var yn = delta[key] ? "on" : "off";
                    logMsg(new Date().getTime(), "INFO", svr.id, null, key + " turned " + yn + " (@" + consoleusr.username + ")");
                } else if(!isNaN(delta[key])) {
                    var ch = svr.channels.get("id", delta[key]);
                    if(!ch) {
                        callback(true);
                        return;
                    }
                    configs.servers[svr.id][key][2] = delta[key];
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Set " + key + " channel to " + ch.name + " (@" + consoleusr.username + ")");
                } else if(typeof(delta[key])=="string") {
                    if(delta[key].toLowerCase()=="default") {
                        configs.servers[svr.id][key][1] = JSON.parse(JSON.stringify(configDefaults.default[key][1]));
                        logMsg(new Date().getTime(), "INFO", svr.id, null, "Reset " + key + " to default (@" + consoleusr.username + ")");
                    } else if(configs.servers[svr.id][key][1].indexOf(delta[key])>-1) {
                        configs.servers[svr.id][key][1].splice(configs.servers[svr.id][key][1].indexOf(delta[key]), 1);
                        if(configs.servers[svr.id][key][1].length==0) {
                            configs.servers[svr.id][key][0] = false;
                            configs.servers[svr.id][key][1] = JSON.parse(JSON.stringify(configDefaults.default[key][1]));
                        }
                        logMsg(new Date().getTime(), "INFO", svr.id, null, key + " '" + delta[key] + "' removed (@" + consoleusr.username + ")");
                    } else {
                        configs.servers[svr.id][key][1].push(delta[key]);
                        logMsg(new Date().getTime(), "INFO", svr.id, null, key + " '" + delta[key] + "' added (@" + consoleusr.username + ")");
                    }
                } else {
                    callback(true);
                    return;
                }
                break;
            case "changemembermsg":
            case "rankmembermsg":
            case "twitchmembermsg":
            case "editmembermsg":
            case "deletemembermsg":
                if(typeof(delta[key])=="boolean") {
                    configs.servers[svr.id][key][0] = delta[key];
                    var yn = delta[key] ? "on" : "off";
                    logMsg(new Date().getTime(), "INFO", svr.id, null, key + " turned " + yn + " (@" + consoleusr.username + ")");
                } else if(!isNaN(delta[key])) {
                    var ch = svr.channels.get("id", delta[key]);
                    if(!ch) {
                        callback(true);
                        return;
                    }
                    configs.servers[svr.id][key][1] = delta[key];
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Set " + key + " channel to " + ch.name + " (@" + consoleusr.username + ")");
                } else if(key=="rankmembermsg" && delta[key].toLowerCase()=="pm") {
                    configs.servers[svr.id][key][2] = !configs.servers[svr.id][key][2];
                    var yn = configs.servers[svr.id][key][2] ? "on" : "off";
                    logMsg(new Date().getTime(), "INFO", svr.id, null, key + " PM turned " + yn + " (@" + consoleusr.username + ")");
                } else {
                    callback(true);
                    return;
                }
                break;
            case "filter":
                if(delta[key].toLowerCase().indexOf("action-")==0 && ["action-kick", "action-block", "action-mute"].indexOf(delta[key].toLowerCase())>-1) {
                    configs.servers[svr.id].filter[1] = delta[key].toLowerCase().substring(delta[key].indexOf("-")+1);
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Set " + key + " action to " + delta[key].toLowerCase().substring(delta[key].indexOf("-")+1) + " (@" + consoleusr.username + ")");
                    break;
                }
                if(!Array.isArray(delta[key])) {
                    callback(true);
                    return;
                }
                configs.servers[svr.id][key][0] = delta[key];
                break;
            case "closepoll":
                try {
                    var ch = svr.channels.get("id", polls[delta[key]].channel);
                    bot.sendMessage(ch, "The ongoing poll in this channel has been closed by an admin.");
                    bot.sendMessage(ch, pollResults(delta[key], "The results are in", "and the winner is"));
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Closed active poll in " + ch.name + ", (@" + consoleusr.username + ")");
                    delete polls[delta[key]];
                    callback();
                } catch(err) {
                    callback(err);
                }
                return;
            case "endtrivia":
                try {
                    var ch = svr.channels.get("id", delta[key]);
                    bot.sendMessage(ch, "Sorry to interrupt your game, but an admin has closed this trivia session.", function() {
                        bot.sendMessage(msg.channel, endTrivia(trivia[ch.id], ch.server, true));
                    });
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Closed trivia game in " + ch.name + ", (@" + consoleusr.username + ")");
                    delete trivia[ch.id];
                    callback();
                } catch(err) {
                    callback(err);
                }
                return;
            case "endgiveaway":
                try {
                    var ch = svr.channels.get("id", giveaways[delta[key]].channel);
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Closed giveaway in " + ch.name + ", (@" + consoleusr.username + ")");
                    bot.sendMessage(ch, "The giveaway `" + giveaways[delta[key]].name + "` started by " + svr.members.get("id", delta[key]) + " has been closed by an admin.");
                    delete giveaways[delta[key]];
                    callback();
                } catch(err) {
                    callback(err);
                }
                return;
            case "autoprune":
                if(typeof(delta[key])=="boolean") {
                    configs.servers[svr.id].autoprune[0] = delta[key];
                } else if(!isNaN(delta[key]) && delta[key]>300) {
                    configs.servers[svr.id].autoprune[1] = parseInt(delta[key]);
                } else {
                    callback(true);
                    return;
                }
                break;
            case "clean":
            case "purge":
                var ch = svr.channels.get("id", delta[key][0]);
                if(ch && !isNaN(delta[key][1])) {
                    logMsg(new Date().getTime(), "INFO", svr.id, ch.id, "Request to " + key + " " + delta[key][1] + " messages (@" + consoleusr.username + ")");
                    cleanMessages(ch, key=="purge" ? null : bot.user, delta[key][1], callback);
                } else {
                    callback(true);
                } 
                return;
            case "triviasets":
            case "extensions":
                if(typeof delta[key]=="string") {
                    delta[key] = decodeURI(delta[key]);
                    if(configs.servers[svr.id][key][delta[key]]) {
                        delete configs.servers[svr.id][key][delta[key]];
                        logMsg(new Date().getTime(), "INFO", svr.id, null, "Deleted " + key + " " + delta[key] + " (@" + consoleusr.username + ")");
                        break;
                    } else {
                        callback(true);
                        return;
                    }
                } else {
                    if(key=="triviasets") {
                        addTriviaSet(delta[key], svr, consoleid, callback);
                    } else if(key=="extensions") {
                        addExtension(delta[key], svr, consoleid, callback);
                    }
                    return;
                }
            case "admincommands":
                if(!commands[delta[key]] && delta[key]!="tagreaction") {
                    callback(true);
                    return;
                }
                if(configs.servers[svr.id].admincommands.indexOf(delta[key])==-1) {
                    configs.servers[svr.id].admincommands.push(delta[key]);
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Added " + delta[key] + " to " + key + " list (@" + consoleusr.username + ")");
                } else {
                    configs.servers[svr.id].admincommands.splice(configs.servers[svr.id].admincommands.indexOf(delta[key]), 1);
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Removed " + delta[key] + " from " + key + " list (@" + consoleusr.username + ")");
                }
                break;
            case "chrestrict":
                if(!Array.isArray(delta[key]) || delta[key].length!=2 || typeof(delta[key][0])!="string" || (!commands[delta[key][0]] && delta[key][0]!="tagreaction") || !Array.isArray(delta[key][1])) {
                    callback(true);
                    return;
                }
                for(var i=0; i<svr.channels.length; i++) {
                    if(!(svr.channels[i] instanceof Discord.VoiceChannel)) {
                        if(delta[key][1].indexOf(svr.channels[i].id)==-1) {
                            if(!configs.servers[svr.id][key][svr.channels[i].id]) {
                                configs.servers[svr.id][key][svr.channels[i].id] = [];
                            }
                            if(configs.servers[svr.id][key][svr.channels[i].id].indexOf(delta[key][0])==-1) {
                                configs.servers[svr.id][key][svr.channels[i].id].push(delta[key][0]);
                                logMsg(new Date().getTime(), "INFO", svr.id, null, "Command " + delta[key][0] + " turned off in " + svr.channels[i].name + " (@" + consoleusr.username + ")");
                            }
                        } else {
                            if(configs.servers[svr.id][key][svr.channels[i].id] && configs.servers[svr.id][key][svr.channels[i].id].indexOf(delta[key][0])>-1) {
                                configs.servers[svr.id][key][svr.channels[i].id].splice(configs.servers[svr.id][key][svr.channels[i].id].indexOf(delta[key][0]), 1);
                                logMsg(new Date().getTime(), "INFO", svr.id, null, "Command " + delta[key][0] + " turned on in " + svr.channels[i].name + " (@" + consoleusr.username + ")");
                            }
                        }
                    }
                }
                break;
            case "leave":
                if(bot.servers.length>1) {
                    parseMaintainerConfig({rmserver: svr.id}, callback);
                } else {
                    callback(true);
                }
                return;
            case "extend":
                clearTimeout(onlineconsole[consoleid].timer);
                onlineconsole[consoleid].timer = setTimeout(function() {
                    logMsg(new Date().getTime(), "INFO", svr.id, null, "Timeout on online admin console (@" + consoleusr.username + ")");
                    delete adminconsole[consoleid];
                    delete onlineconsole[consoleid];
                }, 300000);
                logMsg(new Date().getTime(), "INFO", null, consoleid, "Extended admin console session for " + svr.name);
                callback();
                return;
            case "logout":
                clearTimeout(onlineconsole[consoleid].timer);
                delete adminconsole[consoleid];
                delete onlineconsole[consoleid];
                logMsg(new Date().getTime(), "INFO", svr.id, null, "Logged out of online admin console");
                callback();
                return;
            default:
                if(configs.servers[svr.id][key]!=null) {
                    configs.servers[svr.id][key] = delta[key];
                    var yn = delta[key] ? "on" : "off";
                    logMsg(new Date().getTime(), "INFO", svr.id, null, key + " turned " + yn + " (@" + consoleusr.username + ")");
                } else {
                    callback(true);
                    return;
                }
                break;
        }
    }
    saveData("./data/config.json", function(err) {
        if(err) {
            logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save updated configs (@" + consoleusr.username + ")");
        }
        callback(err);
    });
}

// Parses and applies new trivia set from admin console
function addTriviaSet(set, svr, consoleid, callback) {
    var consoleusr = bot.users.get("id", consoleid);
    if(consoleusr) {
        var validity;
        if(!set.name || !set.stream) {
            validity = "missing parameter(s)";
        } else if(!Array.isArray(set.stream)) {
            validity = "question set is not an array";
        } else if(set.stream.length==0) {
            validity = "no questions";
        } else if(configs.servers[svr.id].triviasets[set.name]) {
            validity = "set already exists";
        } else {
            var tset = [];
            for(var i=0; i<set.stream.length; i++) {
                if(!set.stream[i].category || !set.stream[i].question || !set.stream[i].answer) {
                    validity = "error at question  " + i;
                    break;
                } else {
                    tset.push(set.stream[i]);
                }
            }
            
            if(validity) {
                logMsg(new Date().getTime(), "WARN", svr.id, null, "Trivia set uploaded is invalid (@" + consoleusr.username + "): " +  validity);
                callback(validity);
            } else {
                configs.servers[svr.id].triviasets[set.name] = tset;
                logMsg(new Date().getTime(), "INFO", svr.id, null, "Trivia set " + set.name + " added to server (@" + consoleusr.username + ")");
                saveData("./data/config.json", function(err) {
                    if(err) {
                        logMsg(new Date().getTime(), "ERROR", svr.id, null, "Could not save new config for (@" + consoleusr.username + ")");
                        callback(true);
                    } else {
                        callback();
                    }
                });
            }
        }
    } else {
        callback(true);
    }
}

// Checks if a user is muted and in which channels
function checkUserMute(usr, svr) {
    var mutelist = {};
    for(var i=0; i<svr.channels.length; i++) {
        if(!(svr.channels[i] instanceof Discord.VoiceChannel) && configs.servers[svr.id].muted[svr.channels[i].id]) {
            if(configs.servers[svr.id].muted[svr.channels[i].id].indexOf(usr.id)>-1) {
                mutelist[svr.channels[i].id] = true;
                continue;
            }
        }
        mutelist[svr.channels[i].id] = false;
    }
    return mutelist;
}

// Parses and applies new extension from admin console
function addExtension(extension, svr, consoleid, callback) {
    var consoleusr = bot.users.get("id", consoleid);
    if(consoleusr) {
        var validity;
        if(!extension.name || !extension.type || (!extension.key && extension.type!="timer") || !extension.process) {
            validity = "missing parameter(s)";
        } else if(["keyword", "command", "timer"].indexOf(extension.type.toLowerCase())==-1) {
            validity = "invalid type";
        } else if(extension.type=="timer" && !extension.interval) {
            validity = "no interval provided";
        } else if(extension.type=="timer" && (extension.interval<10 || extension.interval>86400)) {
            validity = "interval must be between 10 seconds and 1 day";
        } else if(extension.type=="timer" && !extension.channels) {
            validity = "no channel(s) provided";
        } else if(extension.type=="command" && extension.key.indexOf(" ")>-1) {
            validity = "command has spaces";
        } else if(extension.type=="command" && checkCommandConflicts(extension.key, svr)) {
            validity = "replaces default command";
        } else if(extension.type=="keyword" && !Array.isArray(extension.key)) {
            validity = "keyword must be in an array";
        } else if(extension.type=="command" && Array.isArray(extension.key)) {
            validity = "array as command key";
        } else if(extension.type=="keyword" && extension.case==null) {
            validity = "case sensitivity not specified";
        } else if(configs.servers[svr.id].extensions[extension.name]) {
            validity = "extension already exists";
        }
        
        if(validity) {
            logMsg(new Date().getTime(), "WARN", svr.id, null, "Extension uploaded is invalid (@" + consoleusr.username + "): " +  validity);
            callback(validity);
        } else {
            extension.store = {};
            configs.servers[svr.id].extensions[extension.name] = extension;
            if(extension.type=="timer") {
                runTimerExtension(svr.id, extension.name);
            }
            logMsg(new Date().getTime(), "INFO", svr.id, null, "Extension " + extension.name + " added to server (@" + consoleusr.username + ")");
            delete configs.servers[svr.id].extensions[extension.name].name;
            saveData("./data/config.json", function(err) {
                if(err) {
                    logMsg(new Date().getTime(), "ERROR", svr.id, null, "Could not save new config (@" + consoleusr.username + ")");
                    callback(true);
                } else {
                    callback();
                }
            });
        }
    } else {
        callback(true);
    }
}

// Default game: rotates between stats
function defaultGame(i, force) {
    var games = [bot.servers.length + " server" + (bot.servers.length==1 ? "" : "s") + " connected", "serving " + bot.users.length + " users", "awesomebot.xyz", "v" + version, "by @BitQuote", configs.hosting || "limited mode", "the best Discord bot!"];
    if(configs.game=="default" || force) {
        if(i>=games.length) {
            i = 0;
        }
        bot.setStatus("online", games[i]);
        setTimeout(function() {
            defaultGame(++i);
        }, 15000);
    }
}

// Adds default settings for a server to config.json
function defaultConfig(svr, override) {
    if(!configs.servers[svr.id] || override) {
        var adminList = [svr.owner.id];
        if(svr.members.get("id", configs.maintainer) && adminList.indexOf(configs.maintainer)==-1) {
            adminList.push(configs.maintainer);
        }
        for(var i=0; i<svr.members.length; i++) {
            if(svr.rolesOfUser(svr.members[i])) {
                for(var j=0; j<svr.rolesOfUser(svr.members[i]).length; j++) {
                    if(svr.rolesOfUser(svr.members[i])[j] && svr.rolesOfUser(svr.members[i])[j].hasPermission("banMembers") && adminList.indexOf(svr.members[i].id)==-1 && configs.botblocked.indexOf(svr.members[i].id)==-1 && svr.members[i].id!=bot.user.id && !svr.members[i].bot) {
                        adminList.push(svr.members[i].id);
                    }
                }
            }
        }
        configs.servers[svr.id] = JSON.parse(JSON.stringify(configDefaults.default)); 
        configs.servers[svr.id].admins = adminList;
        for(var key in configDefaults.full) {
            configs.servers[svr.id][key] = JSON.parse(JSON.stringify(configDefaults.full[key]));
        }
        saveData("./data/config.json", function(err) {
            if(err) {
                logMsg(new Date().getTime(), "ERROR", svr.id, null, "Failed to save default configs");
            } else {
                logMsg(new Date().getTime(), "INFO", svr.id, null, "Successfully saved default configs");
            }
        });
    }
}

// Update bot to new version via Git (beta)
function updateBot(msg) {
    logMsg(new Date().getTime(), "INFO", "General", null, "Updating " + bot.user.username + ":");
    bot.sendMessage(msg.channel, "*Updating " + bot.user.username + ". This feature is in beta, and may not work.*");
    var spawn = require("child_process").spawn;
    var log = function(err, stdout, stderr) {
        if(stdout) {
            console.log(stdout);
        }
        if(stderr) {
            console.log(stderr);
        }
    };
    var upstream = spawn("git" ["add", "upstream", require("./package.json").repository.url]);
    upstream.stdout.on("data", function(data) {
        console.log(data.toString());
    });
    upstream.on("close", function(code) {
        var fetch = spawn("git", ["fetch", "upstream"]);
        fetch.stdout.on("data", function(data) {
            console.log(data.toString());
        });
        fetch.on("close", function(code) {
            var add = spawn("git", ["add", "data"]);
            add.stdout.on("data", function(data) {
                console.log(data.toString());
            });
            add.on("close", function(code) {
                var checkout = spawn("git", ["checkout", "."]);
                checkout.stdout.on("data", function(data) {
                    console.log(data.toString());
                });
                checkout.on("close", function(code) {
                    var npm = spawn("npm", ["install"]);
                    npm.stdout.on("data", function(data) {
                        console.log(data.toString());
                    });
                    npm.on("close", function(code) {
                        logMsg(new Date().getTime(), "INFO", "General", null, "Successfully updated");
                        bot.sendMessage(msg.channel, "Done! Shutting down...", function() {
                            bot.logout(function() {
                                process.exit(1);
                            });
                        });
                    });
                });
            });
        });
    });
    logMsg(new Date().getTime(), "ERROR", "General", null, "Could not update " + bot.user.username);
    bot.sendMessage(msg.channel, "Something went wrong, could not update.");
}

// Ensure that config.json is setup properly
function checkConfig(svr) {
    var changed = false;
     
    for(var key in configDefaults.default) {
        if(configs.servers[svr.id][key]==null) {
            changed = true;
            configs.servers[svr.id][key] = JSON.parse(JSON.stringify(configDefaults.default[key]));
        }
    }
    for(var key in configDefaults.full) {
        if(configs.servers[svr.id][key]==null) {
            changed = true;
            configs.servers[svr.id][key] = JSON.parse(JSON.stringify(configDefaults.full[key]));
        }
    }
    
    for(key in configs.servers[svr.id]) {
        if(configDefaults.default[key]==null && configDefaults.full[key]==null) {
            changed = true;
            delete configs.servers[svr.id][key];
        }
    }
    
    // Update data just for this version
    if(typeof(configs.servers[svr.id].newrole)=="string") {
        changed = true;
        configs.servers[svr.id].newrole = [configs.servers[svr.id].newrole];
    }
    for(var extnm in configs.servers[svr.id].extensions) {
        if(!configs.servers[svr.id].extensions[extnm].name) {
            changed = true;
            configs.servers[svr.id].extensions[extnm].name = extnm;
        }
    }
    if(configs.servers[svr.id].spamfilter[3]==null) {
        changed = true;
        configs.servers[svr.id].spamfilter[3] = "mute";
    }
    if(configs.servers[svr.id].nsfwfilter[2]==null) {
        changed = true;
        configs.servers[svr.id].nsfwfilter[2] = "block";
    }
    if(configs.servers[svr.id].filter[0] && !Array.isArray(configs.servers[svr.id].filter[0])) {
        changed = true;
        configs.servers[svr.id].filter = [
            configs.servers[svr.id].filter,
            "mute"
        ];
    }
    if(!configs.servers[svr.id].rss[3]) {
        changed = true;
        configs.servers[svr.id].rss[3] = [];
        for(var i=0; i<configs.servers[svr.id].rss[1].length; i++) {
            configs.servers[svr.id].rss[3].push([
                [],
                ""
            ]);
        }
    }
    if(!configs.servers[svr.id].translated.channels) {
        changed = true;
        configs.servers[svr.id].translated.channels = [];
        var channels = [];
        for(var i=0; i<svr.channels.length; i++) {
            if(!(svr.channels[i] instanceof Discord.VoiceChannel)) {
                channels.push(svr.channels[i].id);
            }
        }   
        for(var i=0; i<configs.servers[svr.id].translated.list.length; i++) {
            configs.servers[svr.id].translated.channels.push(channels);
        }
    }
    
    if(changed) {
        saveData("./data/config.json", function(err) {
            if(err) {
                logMsg(new Date().getTime(), "ERROR", svr.id, null, "Failed to update server configs");
            } else {
                logMsg(new Date().getTime(), "INFO", svr.id, null, "Successfully saved updated server configs");
            }
        });
    }
}

// Write an updated config.json file to disk
function saveData(file, callback) {
    var object;
    switch(file) {
        case "./data/profiles.json": 
            object = profileData;
            break;
        case "./data/stats.json":
            object = stats;
            break;
        case "./data/config.json":
            object = configs;
            break;
        case "./auth.json":
            object = AuthDetails;
            break;
        case "./data/reminders.json":
            object = reminders;
            break;
        case "./data/logs.json":
            object = logs;
            break;
    }
    writeFileAtomic(file, JSON.stringify(object, null, 4), {chown:{uid: 100, gid: 50}}, function(error) {
        if(error) {
            fs.writeFile(file, JSON.stringify(object, null, 4), function(err) {
                callback(err);
            });
        } else {
            callback(error);
        }
    });
}

// Check if other admins of a server are logged into the console, return true if yes
function activeAdmins(svrid) {
    for(var i=0; i<configs.servers[svrid].admins.length; i++) {
        if(adminconsole[configs.servers[svrid].admins[i]]) {
            return true;
        }
    }
    return false;
}

// Finds an active giveaway by name
function getGiveaway(name) {
    for(var usrid in giveaways) {
        if(giveaways[usrid].name.toLowerCase()==name.toLowerCase()) {
            return usrid;
        }
    }
    return;
}

// Check if there are other polls on the same channel
function activePolls(chid) {
    for(var poll in polls) {
        if(polls[poll].channel==chid) {
            return poll;
        }
    }
    return;
}

// Generate results for poll
function pollResults(usrid, intro, outro) {
    var responseCount = countOccurrences(polls[usrid].responses, polls[usrid].options);
    var info = "" + intro + " for the poll: **" + polls[usrid].title + "**";
    for(var i=0; i<polls[usrid].options.length; i++) {
        var c = responseCount[i];
        var d = true;
        if(!c || isNaN(c)) {
            c = 0;
            responseCount[i] = 0;
            d = false;
        }
        info += "\n\t" + i + ") " + polls[usrid].options[i] + ": " + c + " votes";
        if(d) {
            info += ", " + (Math.round((c / polls[usrid].responses.length * 100)*100)/100) + "%";
        }
    }

    var winner = maxIndex(responseCount);
    info += "\n" + polls[usrid].responses.length + " votes, ";
    if((responseCount.allValuesSame() || duplicateMax(responseCount)) && polls[usrid].options.length > 1) {
        info += "tie!";
    } else {
        info += outro + ": " + polls[usrid].options[winner];
    }
    info += "\n*Poll open for " + secondsToString((new Date().getTime() - polls[usrid].timestamp)/1000).slice(0, -1) + "*";
    
    return info;
}

// Mutes or unmutes a user in a channel
function muteUser(ch, usr, callback) {
    if(configs.servers[ch.server.id].muted[ch.id]) {
        if(configs.servers[ch.server.id].muted[ch.id].indexOf(usr.id)>-1) {
            bot.overwritePermissions(ch, usr, {
                "sendMessages": true
            }, function(err) {
                if(err) {
                    callback(err, false);
                } else {
                    configs.servers[ch.server.id].muted[ch.id].splice(configs.servers[ch.server.id].muted[ch.id].indexOf(usr.id), 1);
                    if(configs.servers[ch.server.id].muted[ch.id].length==0) {
                        delete configs.servers[ch.server.id].muted[ch.id];
                    }
                    saveData("./data/config.json", function(err) {
                        callback(err, false);
                    });
                }
            });
            return;
        }
    } else {
        configs.servers[ch.server.id].muted[ch.id] = [];
    }
    bot.overwritePermissions(ch, usr, {
        "sendMessages": false,
        "manageRoles": false,
        "manageChannel": false
    }, function(err) {
        if(err) {
            callback(true, true);
        } else {
            configs.servers[ch.server.id].muted[ch.id].push(usr.id);
            saveData("./data/config.json", function(err) {
                callback(err, true);
            });
        }
    });
}

// Attempt to kick a member
function handleViolation(msg, desc1, desc2, action) {
    switch(action) {
        case "kick":
            bot.kickMember(msg.author, msg.channel.server, function(err) {
                if(err) {
                    blockUser(msg, desc1, desc2);
                } else {
                    adminMsg(err, msg.channel.server, msg.author, " " + desc1 + " #" + msg.channel.name + " in " + msg.channel.server.name + ", so I kicked them from the server.");
                }
            });
            break;
        case "mute":
            muteUser(msg.channel, usr, function(err, state) {
                if(err) {
                    blockUser(msg, desc1, desc2);
                } else {
                    adminMsg(err, msg.channel.server, msg.author, " " + desc1 + " #" + msg.channel.name + " in " + msg.channel.server.name + ", so I muted them in that channel.");
                }
            });
            break;
        case "block":
            blockUser(msg, desc1, desc2);
            break;    
    }
}

// Block user (if kick fails)
function blockUser(msg, desc1, desc2) {
    bot.sendMessage(msg.author, "Stop " + desc2 + ". The chat mods have been notified about this, and you have been blocked from using me.");
    adminMsg(false, msg.channel.server, msg.author, " " + desc1 + " #" + msg.channel.name + " in " + msg.channel.server.name + ", so I blocked them from using me.");
    if(configs.servers[msg.channel.server.id].blocked.indexOf(msg.author.id)==-1) {
        configs.servers[msg.channel.server.id].blocked.push(msg.author.id);
    }
    saveData("./data/config.json", function(error) {
        if(error) {
            logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save updated configs for " + msg.channel.server.name);
        }
    });
}

// Check if a given query is NSFW
function checkFiltered(msg, checknsfw, checkfilter) {
    if(checknsfw) {
        for(var i=0; i<filter.length; i++) {
            if((" " + msg + " ").toLowerCase().indexOf(" " + filter[i] + " ")>-1) {
                return true;
            }
        }
    }
    if(checkfilter) {
        for(var i=0; i<configs.servers[msg.channel.server.id].filter[0].length; i++) {
            if((" " + msg + " ").toLowerCase().indexOf(" " + configs.servers[msg.channel.server.id].filter[0][i] + " ")>-1) {
                return true;
            }
        }
    }
    return false;
}

// Handle an NSFW bot query
function handleFiltered(msg, type) {
    var action = filterviolations[msg.channel.server.id][msg.author.id]!=null;
    logMsg(new Date().getTime(), "INFO", msg.channel.server.id, msg.channel.id, "Handling " + (action ? "second-time" : "") + " filtered message '" + msg.content + "' from " + msg.author.username);
    var description = type=="NSFW" ? "attempting to fetch NSFW content" : "using filtered words";
    if(action) {
        handleViolation(msg, "is still " + description, description, type=="NSFW" ? configs.servers[msg.channel.server.id].nsfwfilter[2] : configs.servers[msg.channel.server.id].filter[1]);
        delete filterviolations[msg.channel.server.id][msg.author.id];
    } else {
        filterviolations[msg.channel.server.id][msg.author.id] = true;
        bot.sendMessage(msg.author, "Stop " + description + " in " + msg.channel.server.name + ". The chat mods have been notified about this.");
        adminMsg(false, msg.channel.server, msg.author, " is " + description + " in #" + msg.channel.name + " in " + msg.channel.server.name);
    }
    if(configs.servers[msg.channel.server.id].points) {
        if(!profileData[msg.author.id]) {
            profileData[msg.author.id] = {
                points: 0
            }
        }
        profileData[msg.author.id].points -= action ? 200 : 100;
        saveData("./data/profiles.json", function(err) {
            if(err) {
                logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + msg.author.username);
            }
        });
    }
    checkStats(msg.author.id, msg.channel.server.id);
    stats[msg.channel.server.id].members[msg.author.id].strikes.push(["Automatic", (action ? "Second" : "First") + "-time filter violation", new Date().getTime()]);
}

// Returns the formatted command prefix for a server
function getPrefix(svr) {
    return (configs.servers[svr.id].cmdtag=="tag" ? ("@" + (svr.detailsOfUser(bot.user).nick || bot.user.username) + " ") : configs.servers[svr.id].cmdtag);
}

// Returns the name of a user on a server according to configs
function getName(svr, usr) {
    return removeMd((configs.servers[svr.id].usenicks ? (svr.detailsOfUser(usr).nick || usr.username) : usr.username) + (configs.servers[svr.id].usediscriminators ? ("#" + usr.discriminator) : "")).replaceAll("_", "");
}

String.prototype.replaceAll = function(target, replacement) {
    return this.split(target).join(replacement);
};

// Searches for a server member based on name, ID, or nick
function userSearch(str, svr) {
    var usr;
    str = str.trim();
    if(str.indexOf("<@!")==0) {
        usr = svr.members.get("id", str.substring(3, str.length-1));
    } else if(str.indexOf("<@")==0) {
        usr = svr.members.get("id", str.substring(2, str.length-1));
    } else if(!isNaN(str)) {
        usr = svr.members.get("id", str);
    } else if(str.lastIndexOf("#")==str.length-5 && !isNaN(str.substring(str.lastIndexOf("#")+1))) {
        usr = svr.members.getAll("username", str.substring(0, str.lastIndexOf("#"))).get("discriminator", str.substring(str.lastIndexOf("#")+1));
    } else {
        usr = svr.members.get("username", str);
    }
    if(!usr) {
        for(var i=0; i<svr.members.length; i++) {
            if(svr.detailsOfUser(svr.members[i]).nick && svr.detailsOfUser(svr.members[i]).nick==str) {
                usr = svr.members[i];
                break;
            }
        }
    }
    return usr;
}

// Searches for a server based on name, ID, or shortcut
function serverSearch(str, usr) {
    var svr = bot.servers.get("name", str);
    if(checkServer(svr, usr)) {
        return svr;
    }

    svr = bot.servers.get("id", str);
    if(checkServer(svr, usr)) {
        return svr;
    }

    for(var i=0; i<bot.servers.length; i++) {
        if(str.toLowerCase()==bot.servers[i].name.toLowerCase() && checkServer(bot.servers[i], usr)) {
            return bot.servers[i];
        }
    }

    if(profileData[usr.id] && profileData[usr.id].svrnicks && profileData[usr.id].svrnicks[str.toLowerCase()]) {
        svr = bot.servers.get("id", profileData[usr.id].svrnicks[str.toLowerCase()]);
        if(checkServer(svr, usr)) {
            return svr;
        }
    }

    logMsg(new Date().getTime(), "WARN", null, usr.id, "User provided invalid server '" + str + "'");
    return;
}

// Checks if a server is fine
function checkServer(svr, usr) {
    return svr && svr.members.get("id", usr.id) && configs.servers[svr.id].blocked.indexOf(usr.id)==-1;
}

// Parses app list for linkme/appstore
function getAppList(suffix) {
    var apps = suffix.split(",");
    for(var i=0; i<apps.length; i++) {
        if(!apps[i] || (apps.indexOf(apps[i])!=i && apps.indexOf(apps[i])>-1)) {
            apps.splice(i, 1);
        }
    }
    return apps;
}

// Searches Google Images for keyword(s)
function giSearch(query, num, svrid, chid, callback) {
    try {
        var url = "https://www.googleapis.com/customsearch/v1?key=" + (configs.servers[svrid].customkeys.google_api_key || AuthDetails.google_api_key) + "&cx=" + (configs.servers[svrid].customkeys.custom_search_id || AuthDetails.custom_search_id) + ((configs.servers[svrid].nsfwfilter[0] && configs.servers[svrid].nsfwfilter[1].indexOf(chid)==-1) ? "&safe=high" : "") + "&q=" + encodeURI(query.replace(/&/g, '')) + "&alt=json&searchType=image" + (num ? ("&start=" + num) : "");
        unirest.get(url)
        .header("Accept", "application/json")
        .end(function(response) {
            try {
                var data = response.body;
                
                if(!data) {
                    logMsg(new Date().getTime(), "ERROR", svrid, chid, "Could not connect to Google Images");
                    callback(null);
                } else if(data.error) {
                    if(data.error.code==403) {
                        logMsg(new Date().getTime(), "WARN", svrid, chid, "Hit daily Google Images API rate limit");
                        callback(false);
                    } else {
                        logMsg(new Date().getTime(), "ERROR", svrid, chid, "Google Images API error");
                        callback(null);
                    }
                } else if(!data.items || data.items.length==0 || query.indexOf("<#")>-1) {
                    logMsg(new Date().getTime(), "WARN", svrid, chid, "No image results for " + query);
                    callback(null);
                } else {
                    callback(data.items[0].link);
                }
            } catch(error) {
                logMsg(new Date().getTime(), "ERROR", svrid, chid, "Failed to process image search request");
                return;
            }
        });	
    } catch(err) {
        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to process image search request");
        return;
    }
}

// Google Play Store search page scraper
function scrapeSearch(data) {
    x = cheerio.load(data);
    var card_list = x(".card-list");
    var items = [];
    card_list.find(".card").each(function() {
        var card = {};
        var card_data = x(this);
        card["cover-image"] = card_data.find("img.cover-image").attr("src");
        card["click-target"] = card_data.find(".card-click-target").attr("src");
        card["name"] = card_data.find(".details .title").attr("title");
        card["url"] = "https://play.google.com" + card_data.find(".details .title").attr("href");
        card["company"] = card_data.find(".details .subtitle").attr("title");
        card["html_description"] = card_data.find(".details .description").text();
        card["rating_description"] = card_data.find(".tiny-star").attr("aria-label");
        var rating_style = card_data.find(".tiny-star .current-rating").attr("style");
        if(rating_style) {
            card["rating"] = parseFloat(rating_style.match(/\d+/g)[0]*5 / 100.0);
        } else {
            card["rating"] = "unknown";
        }
        card["price"] = card_data.find(".price-container .display-price").text();

        items.push(card);
    });

    var result = {
        total: items.length,
        items: items
    };

    return result;
}

// Searches Giphy for matching GIFs
function getGIF(tags, rating, callback) {
    try {
        var params = {
            "api_key": AuthDetails.giphy_api_key,
            "rating": rating,
            "format": "json",
            "limit": 1
        };
        var query = qs.stringify(params);

        if(tags!==null) {
            query += "&tag=" + tags.join("+")
        }
        
        unirest.get("http://api.giphy.com/v1/gifs/random?" + query)
        .header("Accept", "application/json")
        .end(function(response) {
            if(response.status!==200 || !response.body) {
                logMsg(new Date().getTime(), "ERROR", "General", null, "Could not connect to Giphy");
                callback(null);
            } else {
                callback(response.body.data.id);
            }
        }.bind(this));
    } catch(err) {
        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to process GIF search request");
    }
}

// Get YouTube URL given tags as query
function ytSearch(query, svrid, callback) {
    var youtube = new youtube_node();
    youtube.setKey(configs.servers[svrid].customkeys.google_api_key || AuthDetails.google_api_key);
    var q;
	youtube.search(query, 1, function(error, result) {
        if(error) {
            logMsg(new Date().getTime(), "ERROR", "General", null, "Could not connect to YouTube");
            q =  "`¯\\_(ツ)_/¯`";
        } else {
            if (!result || !result.items || result.items.length < 1) {
                logMsg(new Date().getTime(), "WARN", "General", null, "No YouTube results for " + query);
                q = "`¯\\_(ツ)_/¯`";
            } else {
                switch(result.items[0].id.kind) {
                    case "youtube#playlist":
                        q = "http://www.youtube.com/playlist?list=" + result.items[0].id.playlistId;
                        break;
                    case "youtube#video":
                        q = "http://www.youtube.com/watch?v=" + result.items[0].id.videoId;
                        break;
                    case "youtube#channel":
                        q = "http://www.youtube.com/channel/" + result.items[0].id.channelId;
                        break;
                }
            }
        }
        callback(q);
    });
}

// Generate printable stats for a server
function getStats(svr) {
    var sortedMembers = [];
    var sortedRichest = [];
    for(var member in stats[svr.id].members) {
        sortedMembers.push([member, stats[svr.id].members[member].messages]);
        sortedRichest.push([member, profileData[member] ? profileData[member].points : 0]);
    }
    sortedMembers.sort(function(a, b) {
        return a[1] - b[1];
    });
    sortedRichest.sort(function(a, b) {
        return a[1] - b[1];
    });
    var sortedGames = [];
    for(var game in stats[svr.id].games) {
        sortedGames.push([game, stats[svr.id].games[game]]);
    }
    sortedGames.sort(function(a, b) {
        return a[1] - b[1];
    });
    var sortedCommands = [];
    var commandSum = 0;
    for(var cmd in stats[svr.id].commands) {
        commandSum += stats[svr.id].commands[cmd];
        sortedCommands.push([cmd, stats[svr.id].commands[cmd]]);
    }
    sortedCommands.sort(function(a, b) {
        return a[1] - b[1];
    });
    
    var info = {
        "Most active members": [],
        "Richest members": [],
        "Most played games": [],
        "Command usage": [],
        "Data since": prettyDate(new Date(stats.timestamp))
    };
    for(var i=sortedMembers.length-1; i>sortedMembers.length-6; i--) {
        if(i<0) {
            break;
        }
        var usr = svr.members.get("id", sortedMembers[i][0]);
        if(usr && sortedMembers[i][1]>0) {
            info["Most active members"].push(getName(svr, usr) + ": " + sortedMembers[i][1] + " message" + (sortedMembers[i][1]==1 ? "" : "s"));
        }
    }
    if(configs.servers[svr.id].points) {
        for(var i=sortedRichest.length-1; i>sortedRichest.length-6; i--) {
            if(i<0) {
                break;
            }
            var usr = svr.members.get("id", sortedRichest[i][0]);
            if(usr && sortedRichest[i][1]>0) {
                info["Richest members"].push(getName(svr, usr) + ": " + sortedRichest[i][1] + " point" + (sortedRichest[i][1]==1 ? "" : "s"));
            }
        }
    }
    for(var i=sortedGames.length-1; i>sortedGames.length-6; i--) {
        if(i<0) {
            break;
        }
        info["Most played games"].push(sortedGames[i][0] + ": " + secondsToString(sortedGames[i][1] * 3000));
    }
    for(var i=sortedCommands.length-1; i>sortedCommands.length-6; i--) {
        if(i<0) {
            break;
        }
        if(sortedCommands[i][1]>0) {
            var p = Math.floor(100 * sortedCommands[i][1] / commandSum);
            info["Command usage"].push(("  " + p).substring(p.toString().length-1) + "% " + sortedCommands[i][0] + ": " + sortedCommands[i][1] + " use" + (sortedCommands[i][1]==1 ? "" : "s"));
        }
    }
    for(var key in info) {
        if(info[key].length==0) {
            delete info[key];
        }
    }
    return info;
} 

// Get total command usage across all servers
function totalCommandUsage() {
    var usage = {};
    for(var svrid in stats) {
        if(svrid=="timestamp") {
            continue;
        }
        var svr = bot.servers.get("id", svrid);
        if(svr) {
            for(var cmd in stats[svrid].commands) {
                if(commands[cmd]) {
                    if(!usage[cmd]) {
                        usage[cmd] = 0;
                    }
                    usage[cmd] += stats[svrid].commands[cmd];
                }
            }
        }
    }
    
    var cmds = [];
    var sum = 0;
    for(var cmd in usage) {
        sum += usage[cmd]; 
        cmds.push([cmd, usage[cmd]]);
    }
    cmds.sort(function(a, b) {
        return a[1] - b[1];
    });
    for(var i=cmds.length-1; i>=0; i--) {
        var p = Math.floor(100 * cmds[i][1] / sum);
        cmds[i] = ("  " + p).substring(p.toString().length-1) + "% " + cmds[i][0] + ": " + cmds[i][1] + " use" + (cmds[i][1]==1 ? "" : "s");
    }
    return cmds;
}

// Generate printable user profile
function getProfile(usr, svr) {
    var usrinfo = {
        "Username": usr.username,
        "ID": usr.id,
        "Discriminator": usr.discriminator,
        "Status": usr.status
    }
    usrinfo["Avatar"] = "http://i.imgur.com/fU70HJK.png";
    if(usr.avatarURL) {
        usrinfo["Avatar"] = usr.avatarURL;
    }
    if(getGame(usr)) {
        usrinfo["Playing"] = getGame(usr)
    }
    if(!profileData[usr.id]) {
        profileData[usr.id] = {
            points: 0
        };
        saveData("./data/profiles.json", function(err) {
            if(err) {
                logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to save profile data for " + usr.username);
            }
        });
    }
    for(var field in profileData[usr.id]) {
        if((!configs.servers[svr.id].points && field=="points") || ["svrnicks", "afk"].indexOf(field)>-1) {
            continue;
        }
        usrinfo[field.charAt(0).toUpperCase() + field.slice(1)] = profileData[usr.id][field].toString();
    }
    var details = svr.detailsOfUser(usr);
    var svrinfo = {};
    if(details) {
        if(details.roles.length>0) {
            svrinfo["Roles"] = "";
            for(var i=0; i<details.roles.length; i++) {
                if(details.roles[i]) {
                    svrinfo["Roles"] += (svrinfo["Roles"].trim().length==0 ? "" : ", ") + details.roles[i].name;
                }
            }
        }
        svrinfo["Joined"] = prettyDate(new Date(details.joinedAt));
    }
    checkStats(usr.id, svr.id);
    if(configs.servers[svr.id].stats) {
        svrinfo["Messages"] = stats[svr.id].members[usr.id].messages + " this week";
    }
    if(configs.servers[svr.id].ranks) {
        svrinfo["Rank"] = stats[svr.id].members[usr.id].rank;   
    }
    if(usr.status!="online" && configs.servers[svr.id].stats) {
        var seen = prettyDate(new Date(stats[svr.id].members[usr.id].seen));
        svrinfo["Last seen"] = secondsToString((new Date().getTime() - stats[svr.id].members[usr.id].seen)/1000) + "ago";
    }
    svrinfo["Strikes"] = stats[svr.id].members[usr.id].strikes.length + " so far";
    for(var key in stats[svr.id].members[usr.id]) {
        if(["messages", "active", "seen", "mentions", "strikes", "rankscore", "voice"].indexOf(key)==-1) {
            svrinfo[key.charAt(0).toUpperCase() + key.slice(1)] = stats[svr.id].members[usr.id][key];
        }
    }
    var info = {};
    info["User profile: @" + getName(svr, usr)] = usrinfo;
    info["On " + svr.name] = svrinfo;
    return info;
}

// Get the game a user is playing
function getGame(usr) {
    if(usr.game) {
        if(usr.game.name) {
            return usr.game.name;
        } else {
            return usr.game;
        }
    } else {
        return;
    }
}

// Delete messages from a user
function cleanMessages(ch, usr, num, callback) {
    var roles = ch.server.rolesOfUser(bot.user);
    var manage = false;
    for(var i=0; i<roles.length; i++) {
        if(roles[i].hasPermission("manageMessages")) {
            manage = true;
            break;
        }
    }
    if(!manage) {
        callback(true);
        return;
    }

    var doClean = function(option) {
        getMessages(ch, option, function(err, messages) {
            if(err) {
                logMsg(new Date().getTime(), "ERROR", ch.server.id, ch.id, "Failed to fetch old messages for " + (usr ? "cleaning" : "purging"));
                callback(err);
            } else {
                var toDelete = [];
                for(var i=0; i<messages.length; i++) {
                    if(!usr || messages[i].author.id==usr.id) {
                        toDelete.push(messages[i]);
                        num--;
                    }
                    if(num==0) {
                        break;
                    }
                }

                if(toDelete.length>1) {
                    bot.deleteMessages(toDelete, function(err) {
                        if(err) {
                            logMsg(new Date().getTime(), "ERROR", ch.server.id, ch.id, "Failed to " + (usr ? "clean" : "purge") + " messages" + (usr ? (" from " + usr.username) : ""));
                            callback(err);
                        } else if(num==0) {
                            logMsg(new Date().getTime(), "INFO", ch.server.id, ch.id, "Finished " + (usr ? "cleaning" : "purging") + " messages" + (usr ? (" from " + usr.username) : ""));
                            callback();
                        } else {
                            doClean({before: messages[messages.length-1]});   
                        }
                    });
                }
            }
        });
    };
    doClean();
}

// Archives messages in a channel
function archiveMessages(ch, count, callback) {
    bot.getChannelLogs(ch, count, function(error, messages) {
        if(!error) {
            var archive = [];
            for(var i=0; i<messages.length; i++) {
                archive.push({
                    timestamp: messages[i].timestamp,
                    id: messages[i].id,
                    edited: messages[i].editedTimestamp!=null,
                    content: messages[i].content,
                    clean_content: messages[i].cleanContent,
                    attachments: messages[i].attachments,
                    author: {
                        username: messages[i].author.username,
                        discriminator: messages[i].author.username,
                        avatar: messages[i].author.avatar
                    }
                });
            }
            callback(false, archive);
        } else {
            logMsg(new Date().getTime(), "ERROR", ch.server.id, ch.id, "Failed to fetch old messages for archival");
            callback(true);
        }
    });
}

// Set reminder from natural language command
function parseReminder(str, usr, ch) {
    var tag = ch.isPrivate ? "" : (usr + " ");
    var timestr, remind;
    if(str.split("|").length==2) {
        timestr = str.split("|")[0];
        remind = str.split("|")[1];
    } else {
        timestr = str.substring(str.toLowerCase().indexOf(" in ")+4);
        remind = str.indexOf("to ")==0 ? str.substring(3, str.toLowerCase().indexOf(" in ")) : str.substring(0, str.indexOf(" in "));
    }
    var time = parseTime(timestr);
    if(!time) {
        bot.sendMessage(ch, tag + "Sorry, I don't know what that means. Make sure you're using the syntax `remindme <no.> <h, m, or s> <note>`");
        return;
    }
    logMsg(new Date().getTime(), "INFO", null, usr.id, "Reminder set in " + time.num + time.time);
    bot.sendMessage(ch, tag + "OK, I'll send you a PM in " + time.num + " " + time.time);
    saveReminder(usr.id, remind, time.countdown);
}

// Parse a string as a number of seconds, minutes, hours, or days
function parseTime(str) {
    var num, time;
    if(str.indexOf(" ")>-1) {
        num = str.substring(0, str.indexOf(" "));
        time = str.substring(str.indexOf(" ")+1).toLowerCase();
    } else {
        for(var i=0; i<str.length; i++) {
            if(str.substring(0, i) && !isNaN(str.substring(0, i)) && isNaN(str.substring(0, i+1))) {
                num = str.substring(0, i);
                time = str.substring(i);
                break;
            }
        }
    }
    if(!num || isNaN(num) || num<1 || !time || ["d", "day", "days", "h", "hr", "hrs", "hour", "hours", "m", "min", "mins", "minute", "minutes", "s", "sec", "secs", "second", "seconds"].indexOf(time)==-1) {
        return;
    }
    var countdown = 0;
    switch(time) {
        case "d":
        case "day":
        case "days":
            countdown = num * 86400000;
            break;
        case "h":
        case "hr":
        case "hrs":
        case "hour":
        case "hours":
            countdown = num * 3600000;
            break;
        case "m":
        case "min":
        case "mins":
        case "minute":
        case "minutes":
            countdown = num * 60000;
            break;
        case "s":
        case "sec":
        case "secs":
        case "second":
        case "seconds":
            countdown = num * 1000;
            break;
    }
    return {
        num: num,
        time: time,
        countdown: countdown
    };
}

// Save a reminder
function saveReminder(usrid, remind, countdown) {
    reminders.push({
        user: usrid,
        note: remind,
        time: new Date().getTime() + countdown
    });
    setReminder(reminders.length-1);
    saveData("./data/reminders.json", function(err) {
        if(err) {
            logMsg(new Date().getTime(), "ERROR", usrid, null, "Failed to save reminder");
        }
    });
}

// Set and send a reminder
function setReminder(i) {
    var obj = reminders[i];
    var usr = bot.users.get("id", obj.user);
    if(usr && obj) {
        var countdown = obj.time - new Date().getTime();
        setTimeout(function() {
            bot.sendMessage(usr, "**Reminder:** " + obj.note);
            logMsg(new Date().getTime(), "INFO", null, usr.id, "Reminded user for note set at " + prettyDate(new Date(obj.time)));
            reminders.splice(i, 1);
            saveData("./data/reminders.json", function(err) {
                if(err) {
                    logMsg(new Date().getTime(), "ERROR", null, usr.id, "Failed to save reminder");
                }
            });
        }, countdown>0 ? countdown : 0);
    }
}

// Retrieve past messages for clean command
function getMessages(ch, option, callback) {
    if(option) {
        bot.getChannelLogs(ch, option, function(error, messages) {
            callback(error, messages);
        });
    } else {
        bot.getChannelLogs(ch, function(error, messages) {
            callback(error, messages);
        })
    }
}

// Message online bot admins in a server
function adminMsg(error, svr, author, info) {
    if(!error) {
        for(var i=0; i<configs.servers[svr.id].admins.length; i++) {
            var usr = bot.users.get("id", configs.servers[svr.id].admins[i]);
            if(usr && usr.status!="offline") {
                bot.sendMessage(usr, "**@" + author.username + "**" + info);
            }
        }
    } else {
        logMsg(new Date().getTime(), "ERROR", svr.id, null, "Failed to message bot admins");
    }
}

// Ouput a pretty date for logging
function prettyDate(date) {
    try {
        return date.getUTCFullYear() + "-" + ("0" + (date.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + date.getUTCDate()).slice(-2) + " " + ("0" + date.getUTCHours()).slice(-2) + ":" + ("0" + date.getUTCMinutes()).slice(-2) + ":" + ("0" + date.getUTCSeconds()).slice(-2) + " UTC";
    } catch(err) {
        logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to process prettyDate request");
        return;
    }
}

// Number of days between two dates
function dayDiff(first, second) {
    return Math.round((second-first) / (1000*60*60*24));
}

// Send messages in an array
function sendArray(ch, arr, i) {
    if(!i) {
        i = 0;
    } else if(i>=arr.length) {
        return;
    }
    bot.sendMessage(ch, arr[i], function(err, msg) {
        sendArray(ch, arr, ++i);
    });
}

// Return true if a string is an existing commnand, tag, or extension
function checkCommandConflicts(name, svr) {
    name = name.toLowerCase();
    if(commands[name] || configs.servers[svr.id].tagcommands.indexOf(name)>-1) {
        return true;
    }
    for(var extnm in configs.servers[svr.id].extensions) {
        if(configs.servers[svr.id].extensions[extnm].type=="command" && configs.servers[svr.id].extensions[extnm].key==name) {
            return true;
        }
    }
    return false;
}

// Generate help text
function getHelp(svr, usr) {
    var help = [];
    var info = [];
    for(var cmd in commands) {
        if(commands[cmd]) {
            if(configs.servers[svr.id][cmd]==false || cmd=="eval") {
                continue;
            }
            if(cmd=="rss") {
                if(!configs.servers[svr.id][cmd][0]) {
                    continue;
                }
            }
            if(["messages", "games"].indexOf(cmd)>-1 && configs.servers[svr.id].stats==false) {
                continue;
            }
            if(cmd=="ranks" && configs.servers[svr.id].points==false) {
                continue;
            }
            if(configs.servers[svr.id].admincommands.indexOf(cmd)>-1 && configs.servers[svr.id].admins.indexOf(usr.id)==-1) {
                continue;
            }
            var tmpinfo = "\n" + cmd;
            if(commands[cmd].usage) {
                tmpinfo += " " + commands[cmd].usage;
            }
            info.push(tmpinfo);
        }
    }
    info = info.sort().join("");
    if(info) {
        help.push("```" + info + "```");
        info = "";
    }
    for(var ext in configs.servers[svr.id].extensions) {
        if(configs.servers[svr.id].extensions[ext].type.toLowerCase()=="command") {
            info += "\n" + configs.servers[svr.id].extensions[ext].key;
            if(configs.servers[svr.id].extensions[ext].usage) {
                info += " " + configs.servers[svr.id].extensions[ext].usage;
            }
        }
    }
    if(info) {
        help.push("```" + info + "```");
        info = "";
    }
    
    help.push("For the above command list, do not include the angle brackets (`<` and `>`). Also note that the square brackets (`[` and`]`) simply denote that the parameter is optional; don't include them either.");

    if(configs.servers[svr.id].rss[2].length>0) {
        info += "\nThe following RSS feeds are available:";
        for(var i=0; i<configs.servers[svr.id].rss[2].length; i++) {
            info += "\n\t" + configs.servers[svr.id].rss[2][i];
        }
    }
    if(info) {
        help.push(info);
        info = "";
    }
    
    if(Object.keys(configs.servers[svr.id].triviasets).length>0) {
        info += "The follow custom trivia sets are available:";
        for(var tset in configs.servers[svr.id].triviasets) {
            info += "\n\t" + tset;
        }
    }
    if(info) {
        help.push(info);
        info = "";
    }
    
    info = "";
    for(var cmd in pmcommands) {
        info += "\n" + cmd;
        if(pmcommands[cmd].usage) {
            info += " " + pmcommands[cmd].usage.replace("<server>", svr.name);
        }
    }
    if(info) {
        help.push("The following commands are also available via PM:```" + info + "```");
        info = "";
    }
    
    if(configs.servers[svr.id].points) {
        help.push("\nFinally: *AwesomePoints*, a karma system for Discord. You can upvote someone with `@user <\"^\", \"+1\", or \"up\">`, and give 10 of your own points with `@user gild`. You'll lose points for doing bad things, and get a reward for being the most active user at the end of the week.");
    }
    
    help.push("\nOn top of all this, you can talk to me about anything privately or in the main chat (by tagging me). Learn more on my wiki: http://wiki.awesomebot.xyz/ \n\nVersion " + version + " by **@BitQuote**, http://awesomebot.xyz. *This project is in no way affiliated with Alphabet, Inc., who does not own or endorse this product.*");
    return help;
}

// Get info on a specific command
function getCommandHelp(svr, cmd) {
    var pubdisabled = false;
    if(configs.servers[svr.id][cmd]) {
        if(!configs.servers[svr.id][cmd]) {
            pubdisabled = true;
            if(!pmcommands[cmd]) {
                return "`" + cmd + "` is disabled on this server.";
            }
        }
    }
    var info = "";
    var filled = false;
    if(commands[cmd] && !pubdisabled) {
        filled = true;
        info += "**Help for public command `" + cmd + "`:**\nhttps://github.com/BitQuote/AwesomeBot/wiki/Commands#" + cmd;
    }
    if(pmcommands[cmd] && cmd!="remindme") {
        info += (filled ? "\n\n" : "") + "**Help for private command `" + cmd + "`:**\nhttps://github.com/BitQuote/AwesomeBot/wiki/Commands#" + cmd + "-pm";
        filled = true;
    }
    for(var ext in configs.servers[svr.id].extensions) {
        if(configs.servers[svr.id].extensions[ext].type.toLowerCase()=="command" && configs.servers[svr.id].extensions[ext].extended && configs.servers[svr.id].extensions[ext].key==cmd) {
            info += (filled ? "\n\n" : "") + "**Help for public extension command `" + configs.servers[svr.id].extensions[ext].key + "`:**\n" + configs.servers[svr.id].extensions[ext].extended;
            filled = true; 
        }
    }
    if(!info) {
        info = "Extended help for `" + cmd + "` not available.";
    }
    return info;
}

// Log to database and console
function logMsg(timestamp, level, id, ch, msg) {
    logs.stream.push({
        timestamp: timestamp,
        level: level,
        id: id,
        ch: ch,
        msg: msg
    });
    console.log(printLog(logs.stream[logs.stream.length-1]));
}

// Get printable log message
function printLog(log) {
    var info = "";
    try {
        info = "[" + prettyDate(new Date(log.timestamp)) + "] [" + log.level + "] [";
        if(!log.id && !isNaN(log.ch)) {
            var usr = bot.users.get("id", log.ch);
            info += "@" + (usr ? usr.username : "invalid-user");
        } else if(log.id=="General") {
            info += "General";
        } else if(!isNaN(log.id) && !log.ch) {
            var svr = bot.servers.get("id", log.id);
            info += svr ? svr.name : "invalid-server";
        } else if(!isNaN(log.id) && !isNaN(log.ch)) {
            var svr = bot.servers.get("id", log.id);
            var ch = bot.channels.get("id", log.ch);
            info += (svr ? svr.name : "invalid-server") + ", " + (ch ? ch.name : "invalid-channel");
        }
        info += "] " + log.msg;
        return info;
    } catch (err) {
        return "";
    }
}

// Filter and print logs by parameter
function getLog(idFilter, levelFilter) {
    if(idFilter) {
        var type = idFilter.substring(0, idFilter.indexOf("-"));
        idFilter = idFilter.substring(idFilter.indexOf("-")+1);
    }
    var results = logs.stream.filter(function(obj) {
        if(idFilter && levelFilter) {
            return (type=="server" ? (obj.id==idFilter && checkLogID(obj.id)) : obj.ch==idFilter) && obj.level==levelFilter;
        } else if(idFilter && !levelFilter) {
            return (type=="server" ? (obj.id==idFilter && checkLogID(obj.id)) : obj.ch==idFilter);
        } else if(!idFilter && levelFilter) {
            return obj.level==levelFilter;
        } else {
            if(!isNaN(obj.id)) {
                return checkLogID(obj.id);
            }
            return true;
        }
    });
    var printables = [];
    for(var i=0; i<results.length; i++) {
        printables.push(printLog(results[i]));
    }
    return printables;
}

// Count number of log IDs
function getLogIDs() {
    var allids = [];
    var addedids = [];
    for(var i=0; i<logs.stream.length; i++) {
        try {
            if(!logs.stream[i].id && logs.stream[i].ch && !isNaN(logs.stream[i].ch) && addedids.indexOf("author-" + logs.stream[i].ch)==-1) {
                allids.push([null, [logs.stream[i].ch, bot.users.get("id", logs.stream[i].ch).username]]);
                addedids.push("author-" + logs.stream[i].ch);
            } else if(logs.stream[i].id=="General" && addedids.indexOf("General")==-1) {
                allids.push([["General", "General"], null]);
                addedids.push("General");
            } else if(logs.stream[i].id && !isNaN(logs.stream[i].id) && checkLogID(logs.stream[i].id) && !logs.stream[i].ch && addedids.indexOf("server-" + logs.stream[i].id)==-1) {
                allids.push([[logs.stream[i].id, bot.servers.get("id", logs.stream[i].id).name], null]);
                addedids.push("server-" + logs.stream[i].id);
            } else if(logs.stream[i].id && !isNaN(logs.stream[i].id) && checkLogID(logs.stream[i].id) && logs.stream[i].ch && !isNaN(logs.stream[i].ch) && addedids.indexOf("server-" + logs.stream[i].id)==-1 ) {
                allids.push([[logs.stream[i].id, bot.servers.get("id", logs.stream[i].id).name], [logs.stream[i].ch, bot.channels.get("id", logs.stream[i].ch).name]]);
                addedids.push("server-" + logs.stream[i].id);
            }
        } catch(err) {
            ;
        }
    }
    return allids;
}

// Ensure that a given log ID is safe to display
function checkLogID(id) {
    var svr = bot.servers.get("id", id);
    if(svr) {
        return configs.servers[svr.id].showsvr && configs.servers[svr.id].showpub;
    }
    return true;
}

// Check for updates
function checkVersion() {
    unirest.get("http://awesome.awesomebot.xyz/updates")
    .header("Accept", "application/json")
    .end(function(response) {
        try {
            if(!response.body || !response.body[0]) {
                logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to check for updates");
                return;
            }
            
            var info;
            var change = "";
            var v = "";
            if(version.indexOf("-M")==version.length-2) {
                v = version.substring(0, version.length-2)
            } else {
                v = version.slice(0);
            }
            if(response.body[0][0]!=v && response.body.indexOf(version)!=outOfDate) {
                if(version.indexOf("-M")==version.length-2 && response.body[0][0].indexOf("-M")!=response.body[0][0].length-2) {
                    return;
                }
                outOfDate = -1;
                for(var i=0; i<response.body.length; i++) {
                    if(response.body[i][0]==v) {
                        outOfDate = i;
                    }
                }
                if(outOfDate==-1) {
                    info = "many, many";
                } else {
                    if(response.body[outOfDate][1]) {
                        change = response.body[outOfDate][1];
                    }
                    info = outOfDate;
                }
                logMsg(new Date().getTime(), "INFO", "General", null, "Found " + info + " new bot updates");
                var send = "There are " + info + " new update" + (info==1 ? "" : "s") + " available for " + bot.user.username;
                for(var i=0; i<outOfDate; i++) {
                    send += "\n\t" + (response.body[i][0] + "             ").slice(0,15);
                    if(response.body[i][1]) {
                        send += response.body[i][1];
                    }
                }
                send += "\nLearn more at http://awesomebot.xyz";
                
                if(configs.maintainer && configs.maintainer!="") {
                    var usr = bot.users.get("id", configs.maintainer);
                    if(usr) {
                        bot.sendMessage(usr, send + "\nReply with `update` in the next 30 minutes to apply changes and shut down");
                        updateconsole = true;
                        setTimeout(function() {
                            updateconsole = false;
                        }, 1800000);
                        return;
                    }
                }
                logMsg(new Date().getTime(), "WARN", "General", null, "Could not message bot maintainer about new updates");
            }
        } catch(error) {
            logMsg(new Date().getTime(), "ERROR", "General", null, "Failed to check for updates");
        }
    });
    
    setTimeout(checkVersion, 10800000);
}

// Array comparison
Array.prototype.equals = function(array) {
    if(!array) {
        return false;
    }
    if(this.length!=array.length) {
        return false;
    }

    for(var i=0; i<this.length; i++) {
        if(this[i] instanceof Array && array[i] instanceof Array) {
            if(!this[i].equals(array[i])) {
                return false;
            }
        }  else if(this[i]!=array[i]) {
            return false;   
        }           
    }       
    return true;
}

// Command-line setup for empty fields
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
function setup(i) {
    if(i<Object.keys(AuthDetails).length) {
        var key = Object.keys(AuthDetails)[i];
        if(!AuthDetails[key]) {
            rl.question("Enter " + key + ": ", function(input) {
                AuthDetails[key] = input;
                saveData("./auth.json", function(err) {
                    if(err) {
                        console.log("Error saving authentication details");
                        process.exit(1);
                    }
                    setup(++i);
                });
            });
        } else {
            setup(++i);
        }
    } else {
        switch(i) {
            case Object.keys(AuthDetails).length:
                if(!configs.maintainer && !configs.setup) {
                    rl.question("Enter your personal Discord ID or \".\" to skip: ", function(input) {
                        if(input==".") {
                            setup(++i);
                        } else {
                            configs.maintainer = input;
                            saveData("./data/config.json", function(err) {
                                if(err) {
                                    console.log("Error saving configuration");
                                    process.exit(1);
                                }
                                readyToGo = true;
                                setup(i+3);
                            });
                        }
                    });
                } else {
                    setup(i+3);
                }
                break;
            case Object.keys(AuthDetails).length+1:
                if(!configs.hosting && !configs.setup) {
                    rl.question("Enter the web interface URL or \".\" to skip: ", function(input) {
                        if(input==".") {
                            setup(++i);
                        } else {
                            configs.hosting = input;
                            saveData("./data/config.json", function(err) {
                                if(err) {
                                    console.log("Error saving configuration");
                                    process.exit(1);
                                }
                                setup(++i);
                            });
                        }
                    });
                } else {
                    setup(i+2);
                }
                break;
            case Object.keys(AuthDetails).length+2:
                if(!configs.game && !configs.setup) {
                    rl.question("Enter bot game or \".\" to skip: ", function(input) {
                        if(input==".") {
                            setup(++i);
                        } else {
                            configs.maintainer = input;
                            saveData("./data/config.json", function(err) {
                                if(err) {
                                    console.log("Error saving configuration");
                                    process.exit(1);
                                }
                                setup(++i);
                            });
                        }
                    });
                } else {
                    setup(++i);
                }
                break;
            default:
                rl.close();
                // Login to the bot's Discord account
                bot.loginWithToken(AuthDetails.token, function(loginError) {
                    if(loginError) {
                        console.log("Could not connect to Discord");
                        process.exit(1);
                    }
                    readyToGo = true;
                    configs.setup = true;
                    saveData("./data/config.json", function(err) {
                        if(err) {
                            console.log("Error saving configuration");
                            process.exit(1);
                        }
                    });
                });
                // Authenticate other modules
                imgur.setClientID(AuthDetails.imgur_client_id);
                wolfram = require("wolfram-node").init(AuthDetails.wolfram_app_id);
                googl.setKey(AuthDetails.google_api_key);
                unirest.get("https://openexchangerates.org/api/latest.json?app_id=" + AuthDetails.openexchangerates_app_id)
                .header("Accept", "application/json")
                .end(function(result) {
                    if(result.status==200) {
                        fx.rates = result.body.base;
                        fx.rates = result.body.rates;
                    }
                });
                break;
        }
    }
}
setup(0);

domain.on("error", function(err) {
    logMsg(new Date().getTime(), "ERROR", "General", null, "Something went seriously wrong: " + err);
});
