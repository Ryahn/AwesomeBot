var statsSelect = "null";
var logID = "null";
var logLevel = "null";
var svrSearch;
var svrData;

function doSetup() {
    var param = Object.keys(getQueryParams(document.URL))[0];
    if(param) {
        if(param.indexOf("?auth")==param.length-5) {
            var token = getQueryParams(document.URL)[param];
            if(token) {
                checkAuth(token, true);
            } else {
                richModal("Authentication failed");
                writeInterface();
            }
        } else {
            writeInterface();
        }
    } else {
        writeInterface();
    }
}

function getQueryParams(qs) {
    qs = qs.split("+").join(" ");

    var params = {};
    var tokens;
    var re = /[?&]?([^=]+)=([^&]*)/g;

    while(tokens = re.exec(qs)) {
        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }

    return params;
}
    
function writeInterface() {
    NProgress.start();

    getJSON("data?section=list&type=bot", function(data) {
        document.title = data.username + " Info";
        document.getElementById("botname").innerHTML = data.username;
        document.getElementById("profilepic").src = data.avatar;
        setFavicon(data.avatar);
        document.getElementById("servers-badge").innerHTML = data.servers;
        document.getElementById("addserverlink").href = data.oauthurl;
        
        getJSON("data?section=list&type=servers", function(data) {
            var statsselect = "";
            for(var i=0; i<data.stream.length; i++) {
                statsselect += "<option value=\"" + data.stream[i][1] + "\">" + data.stream[i][0] + "</option>";
            }
            document.getElementById("statsselect").innerHTML += statsselect;
            $("#statsselect").selectpicker("refresh");
            
            switchStats("null", true);
                
            getJSON("data?section=list&type=logids", function(data) {
                var idselector = "";
                for(var i=0; i<data.stream.length; i++) {
                    idselector += "<option id=\"id-" + (data.stream[i][0] ? ("server-" + data.stream[i][0][0]) : ("author-"+ data.stream[i][1][0])) + "\" value=\"" + (data.stream[i][0] ? ("server-" + data.stream[i][0][0]) : ("author-"+ data.stream[i][1][0])) + "\">";
                    if(!data.stream[i][0] && data.stream[i][1]) {
                        idselector += "@" + data.stream[i][1][1];
                    } else {
                        idselector += data.stream[i][0][1];
                    }
                    idselector += "</option>";
                }
                document.getElementById("idselector").innerHTML += idselector;
                $("#idselector").selectpicker("refresh");
                
                switchLog(true);
                
                switchServers("messages", null, function() {
                    NProgress.done();
                });
            });
        });
    });
}

function switchServers(sort, search, callback) {
    NProgress.start();
    $(document).on('focus', ':not(.popover)', function(){
        $('.popover').popover('hide');
    });
    if(search!=null) {
        svrSearch = search.toLowerCase();
    }
    getJSON("data?section=servers&sort=" + sort, function(data) {
        svrData = data.stream;

        var servertablebody = "";
        for(var i=0; i<svrData.length; i++) {
            if(!svrSearch || (svrData[i][1].toLowerCase().indexOf(svrSearch)>-1 || svrData[i][2].toLowerCase().indexOf(svrSearch)>-1 || (svrData[i][5].description && svrData[i][5].description.toLowerCase().indexOf(svrSearch)>-1))) {
                servertablebody += "<tr><td id=\"serverentry-" + i + "\" class=\"serverentry\">" + svrData[i][1] + "</td><td>" + svrData[i][3] + "</td><td>" + svrData[i][4] + "</td></tr>";
                $("#serverentry-" + i).popover("disable");
            }
        }
        document.getElementById("servertablebody").innerHTML = servertablebody;

        $("#servertable").popover({ 
            html: true,
            title: function() {
                i = parseInt(this.id.substring(this.id.indexOf("-")+1));
                return "<button type=\"button\" class=\"close\" id=\"serverentry-" + i + "-popoverclose\" onclick=\"$('#" + this.id + "').popover('hide');\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button><h4 class=\"modal-title\">" + svrData[i][1] + "</h4>";
            },
            content: function() {
                i = parseInt(this.id.substring(this.id.indexOf("-")+1));
                setTimeout(function() {
                    document.getElementById("serverimg-" + i).src = svrData[i][0];
                }, 10);
                return "<img id=\"serverimg-" + i + "\" style=\"width:100%;\" src=\"data:image/gif;base64,R0lGODlhAQABAIAAAHd3dwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==\" /><br><br>Owned by <b>@" + svrData[i][2] + "</b><br>Total: <b>" + svrData[i][4].substring(0, svrData[i][4].indexOf(" ")) + "</b> members<br><b>" + svrData[i][3] + "</b> message" + (svrData[i][3]==1 ? "" : "s") + " today" + (svrData[i][5].enabled ? ("<hr>" + micromarkdown.parse(svrData[i][5].description) + "<br><br><a href=\"" + svrData[i][5].invite + "\" role=\"button\" class=\"btn btn-primary\">Join " + svrData[i][1] + "</a>") : "") + "<script>document.getElementById(\"" + this.id + "\").parentNode.parentNode.style.maxWidth = \"400px\";</script>";
            },
            selector: ".serverentry",
            placement: "right",
            container: "body",
            trigger: "click"
        });
        
        NProgress.done();
        if(callback) {
            callback();
        }
    });
}

function switchColors(theme) {
    if(theme) {
        document.getElementById("theme").href = "./css/bootstrap-" + theme + ".min.css";
        localStorage.setItem("bootstrap-theme", theme);
    } else {
        if(!localStorage.getItem("bootstrap-theme")) {
            localStorage.setItem("bootstrap-theme", "default");
        }
        document.getElementById("theme").href = "./css/bootstrap-" + localStorage.getItem("bootstrap-theme") + ".min.css";
        if(document.getElementById("themeswitcher")) {
            document.getElementById("themeswitcher").value = localStorage.getItem("bootstrap-theme");
            $("#themeswitcher").selectpicker("refresh");
        }
    }
    loadBackground();
}

function loadBackground() {
    document.getElementById("header").style.backgroundImage = "url('https://github.com/BitQuote/AwesomeBot/blob/gh-pages/img/header-bg-" + (Math.floor(Math.random() * (53)) + 1) + ".jpg?raw=true')";
}

function switchStats(n, nodestroy) {
    NProgress.start();
    
    statsSelect = n;
    document.getElementById("statsselect").value = n;
    setTimeout(function() {
        var html = "";
        if(n=="null") {
            document.getElementById("profileselect").setAttribute("disabled", "disable");
            $("#profileselect").selectpicker("refresh");
            getJSON("data?section=list&type=bot", function(data) {
                html = "<b>Status:</b> Online<br><b>Bot ID:</b> " + data.id + "<br><b>Version:</b> v" + data.version + "<br><b>Uptime:</b> " + (data.uptime || "<i>None, how are you viewing this?</i>") + "<br><b>Disconnections:</b> " + data.disconnects + " so far";
                
                document.getElementById("stats-body").innerHTML = html || "<i>Nothing here</i>";
                if(!nodestroy) {
                    NProgress.done();
                }
            });
        } else {
            document.getElementById("profileselect").removeAttribute("disabled");
            $("#profileselect").selectpicker("refresh");
            
            getJSON("data?section=stats&type=server&svrid=" + n, function(data) {
                html = "<div class=\"col-xs-9\"><h4 style=\"margin-top:0px;margin-bottom:0px;\">" + data.name + " (this week)</h4>" + (Object.keys(data).length>1 ? "" : "<br><i>Nothing here</i>");
                if(Object.keys(data).length>1) {
                    var icon = ""
                    for(var cat in data) {
                        if(cat=="icon") {
                            icon = data.icon;
                        } else if(cat!="name") {
                            html += "<br><b>" + cat + ":</b>" + (cat=="Data since" ? (" " + data[cat]) : "");;
                            if(cat!="Data since") {
                                for(var i=0; i<data[cat].length; i++) {
                                    html += "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + data[cat][i];
                                }
                            }
                        }
                    }
                }
                html += "</div><div class=\"col-xs-3\"><img style=\"float:right;\" src=\"" + icon + "\" width=\"100\" height=\"100\" class=\"img-responsive\" alt=\"Server Icon\"></div>";
                
                getJSON("data?section=list&type=members&svrid=" + n, function(data) {
                    var profileselect = "<option value=\"null-" + n + "\" selected>View Profile</option>";
                    for(var i=0; i<data.stream.length; i++) {
                        profileselect += "<option value=\"" + data.stream[i][1] + "-" + n + "\"" + (data.stream[i][2] ? (" data-tokens=\"" + data.stream[i][2] + "\"") : "") + ">" + data.stream[i][0] + "</option>";
                    }
                    document.getElementById("profileselect").innerHTML = profileselect;
                    $("#profileselect").selectpicker("refresh");
                    
                    document.getElementById("stats-body").innerHTML = html || "<i>Nothing here</i>";
                    if(!nodestroy) {
                        NProgress.done();
                    }
                });
            });
        }
    }, 125);
}

function switchProfile(n) {
    NProgress.start();
    
    document.getElementById("profileselect").value = n;
    if(statsSelect) {
        document.getElementById("statsselect").value = statsSelect;
    }
    setTimeout(function() {
        var usrid = n.substring(0, n.indexOf("-"));
        var svrid = n.substring(n.indexOf("-")+1);
        
        if(usrid=="null") {
            switchStats(svrid);
        } else {
            getJSON("data?section=stats&type=profile&usrid=" + usrid + "&svrid=" + svrid, function(data) {
                var html = "<div class=\"col-xs-9\">";
                var avatar = "";
                for(var sect in data) {
                    html += "<h4 style=\"margin-bottom:0px;\">" + sect + ":</h4><br>";
                    for(var key in data[sect]) {
                        if(key=="Avatar") {
                            avatar = data[sect][key];
                        } else {
                            html += "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>" + key + ":</b> " + data[sect][key] + "<br>";
                        }
                    }
                }
                html += "</div><div class=\"col-xs-3\"><img style=\"float:right;\" src=\"" + avatar + "\" width=\"100\" height=\"100\" class=\"img-responsive\" alt=\"User Avatar\"></div>";
                
                document.getElementById("stats-body").innerHTML = html || "<i>Nothing here</i>";
                NProgress.done();
            });
        }
    }, 125);
}

function switchLogID(n) {
    setTimeout(function() {
        document.getElementById("id-" + n).selected = true;
    }, 1);
    logID = n=="null" ? null : n;
    switchLog();
}

function switchLogLevel(n) {
    setTimeout(function() {
        document.getElementById("level-" + n).selected = true;
    }, 1);
    logLevel = n=="null" ? null : n;
    switchLog();
}

function switchLog(nodestroy) {
    NProgress.start();
    
    if(logID) {
        document.getElementById("id-" + logID).selected = true;
        $("#idselector").selectpicker("refresh");
    }
    if(logLevel) {
        document.getElementById("level-" + logLevel).selected = true;
        $("#levelselector").selectpicker("refresh");
    }
    setTimeout(function() {
        var html = "";
        
        getJSON("data?section=log" + (logID ? "&id=" + encodeURI(logID) : "") + (logLevel ? "&level=" + encodeURI(logLevel) : ""), function(data) {
            if(data.stream.length>0) {
                for(var i=data.stream.length-1; i>=(data.stream.length>200 ? data.stream.length-200 : 0); i--) {
                    html = data.stream[i].replace(/<\/?[^>]+(>|$)/g, "") + "<br>" + html;
                }
            }
            
            document.getElementById("console").innerHTML = html || "<i>Nothing here</i>";
            document.getElementById("console").scrollTop = document.getElementById("console").scrollHeight;
            if(!nodestroy) {
                NProgress.done();
            }
        });    
    }, 125);
}

function checkAuth(token, write) {
    if(token) {
        $("#nav-auth").popover("hide");
        getJSON("data?auth=" + token, function(data) {
            if(Object.keys(data).length>0) {
                localStorage.setItem("auth", JSON.stringify(data));
                setTimeout(function() {
                    if(data.type=="maintainer") {
                        window.location.replace("maintainer");
                    } else if(data.type=="admin") {
                        window.location.replace("admin");
                    }
                }, 250);
            } else {
                richModal("Authentication failed");
                if(write) {
                    writeInterface();
                } else {
                    document.getElementById("nav-authinput").value = "";
                }
            }
        });
    }
}

function getJSON(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("get", url, true);
    xhr.responseType = "json";
    xhr.onload = function() {
    var status = xhr.status;
        if(status==200) {
            callback(xhr.response);
        } else {
            NProgress.done();
            richModal("Something went wrong");
        }
    };
    try {
        xhr.send();
    } catch(err) {
        setTimeout(function() {
            getJSON(url, callback);
        }, 500);
    }
};

function richModal(body, header) {
    if(header) {
        $("#error-modal-header").html(header);
    }
    $("#error-modal-body").html(body);
    $("#error-modal").modal("show");
    $("#error-modal").on("hidden.bs.modal", function(e) {
        $("#error-modal-header").html("Error");
    });
}

function setFavicon(url) {
    var link = document.createElement("link");
    link.type = "image/x-icon";
    link.rel = "shortcut icon";
    link.href = url;
    document.getElementsByTagName("head")[0].appendChild(link);
}