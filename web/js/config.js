var authtoken;
var authtype;
var botData;
var consoletimer;
var extendedSession = false;

window.onscroll = function(e) {
    document.getElementById("menu-toggle").style.boxShadow = window.scrollY!=0 ? "0 6px 12px rgba(0,0,0,.175)" : "";
};

function goToSection(section) {
    if(section) {
        document.getElementById("back-button").style.display = "";
    } else {
        document.getElementById("back-button").style.display = "none";
    }
    var sections = document.getElementsByClassName("section-head");
    for(var i=0; i<sections.length; i++) {
        sections[i].parentNode.parentNode.style.display = (!section || sections[i].id==section) ? "" : "none";
        if(sections[i].id==section) {
            $("#" + sections[i].id + "-entry").addClass("entry-highlighted");
        } else {
            $("#" + sections[i].id + "-entry").removeClass("entry-highlighted");
        }
    }
    $("html, body").animate({ scrollTop: 0 }, "fast");
}

function getHelp() {
    var u = window.open("https://github.com/BitQuote/AwesomeBot/wiki/Configuration#" + authtype + "-console");
    if(u) {
        u.focus();
    } else {
        window.location.href = "https://github.com/BitQuote/AwesomeBot/wiki/Configuration#" + authtype + "-console";
    }
}

function doAuth() {
    NProgress.start();
    
    if(localStorage.getItem("auth")) {
        var auth = JSON.parse(localStorage.getItem("auth"));
        authtoken = auth.token;
        authtype = auth.type;
        getJSON("data/?auth=" + authtoken + "&type=" + auth.type, function(data) {
            if(Object.keys(data).length>0 && (location.pathname+location.search).substr(1)==authtype) {
                checkAuth();
                botData = data;
                if(authtype=="maintainer") {
                    doMaintainerSetup();
                } else if(authtype=="admin") {
                    doAdminSetup();
                }
            } else {
                leaveConsole("Authentication failed");
            }
        });
    } else {
        leaveConsole("Authentication failed");
    }
}

function checkAuth(extend) {
    if(extend) {
        postJSON({extend: true}, function(response) {
            $("#extender-modal").modal("hide");
            if(response!=200) {
                leaveConsole("Session timeout");
            } else {
                extendedSession = true;
            }
        });
    } else {
        setAuthTimer();
    }
}

function setAuthTimer() {
    consoletimer = setTimeout(function() {
        extendedSession = false;
        if(authtype=="admin" && ($("#extensionbuilder").data("bs.modal") || {}).isShown) {
            checkAuth(true);
        } else {
            $("#extender-modal").modal("show");
            setTimeout(function() {
                if(!extendedSession) {
                    $("#extender-modal").modal("hide");
                    leaveConsole("Session timeout");
                }
            }, 30000);
        }
    }, 270000);
}

function leaveConsole(msg, header) {
    richModal(msg, header);
    $("#error-modal").on("hidden.bs.modal", function(e) {
        localStorage.removeItem("auth");
        document.location.replace("index.html");
    });
}

function filterMembers(toRemove, callback) {
    var filtered = botData.members.filter(function(obj) {
        return toRemove.indexOf(obj[1])==-1;
    });
    callback({data: filtered});
}

function postJSON(data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("post", "config?auth=" + authtoken + "&type=" + authtype + (authtype=="admin" ? ("&svrid=" + JSON.parse(localStorage.getItem("auth")).svrid + "&usrid=" + JSON.parse(localStorage.getItem("auth")).usrid) : ""), true);
    xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    xhr.send(JSON.stringify(data));
    xhr.onloadend = function() {
        callback(xhr.status);
    };
}

function config(key, value, callback) {
    if((typeof value=="string" && value=="" && key!="newgreeting") || (key=="chrestrict" && value[1].length==0) || (key=="statsexclude" && value.length==0)) {
        return;
    }
    
    NProgress.start();
    if(key=="leave" && authtype=="admin") {
        leaveConsole("Bot has left this server", "Goodbye");
        NProgress.done();
    }
    var data = {};
    data[key] = value;
    postJSON(data, function(response) {
        if(response==200) {
            getJSON("data/?auth=" + authtoken + "&type=" + authtype, function(mData) {
                if(Object.keys(mData).length>0) {
                    clearTimeout(consoletimer);
                    setAuthTimer();
                    botData = mData;
                    if(authtype=="admin") {
                        switchManage();
                    }
                    callback(false);
                    NProgress.done();
                } else {
                    leaveConsole("Session timeout");
                }
            });
        } else if(response==401) {
            leaveConsole("Session timeout");
        } else {
            richModal("Error saving changes");
            if(authtype=="admin") {
                switchManage();
            }
            callback(true);
            NProgress.done();
        }
    });
}

function doLogout() {
    postJSON({logout: JSON.parse(localStorage.getItem("auth")).usrid}, function(response) {
        if(response==200) {
            localStorage.removeItem("auth");
            window.close();
            richModal("You may now close this page", "Info");
        } else {
            richModal("Error logging out, wait 3 minutes to timeout");
        }
    });
}