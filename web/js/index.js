var statsSelect = "null";
var logID = "null";
var logLevel = "null";
var svrSearch;

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
    $("#loading-modal").modal("show");

    getJSON("http://awesome-botmakersinc.rhcloud.com/botdata", function(data) {
        document.getElementById("servers-badge").innerHTML = data.svrcount;
    
        getJSON("data?section=list&type=bot", function(data) {
            document.title = data.username + " Status";
            document.getElementById("botname").innerHTML = data.username;
            document.getElementById("profilepic").src = data.avatar;
            setFavicon(data.avatar);
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
                        $("#loading-modal").modal("hide");
                    });
                });
            });
        });
    });
}

if(document.getElementById("wait")) {
    var dots = window.setInterval( function() {
    var wait = document.getElementById("wait");
    if(wait.innerHTML.length > 3) 
        wait.innerHTML = "";
    else 
        wait.innerHTML += ".";
    }, 100);
}

function switchServers(sort, search, callback) {
    document.getElementById("loading").style.display = "";
    $(document).on('focus', ':not(.popover)', function(){
        $('.popover').popover('hide');
    });
    if(search!=null) {
        svrSearch = search.toLowerCase();
    }
    getJSON("data?section=servers&sort=" + sort, function(data) {
        var servertablebody = "";
        for(var i=0; i<data.stream.length; i++) {
            if(svrSearch && data.stream[i][1].toLowerCase().indexOf(svrSearch)==-1 && data.stream[i][2].toLowerCase().indexOf(svrSearch)==-1 && data.stream[i][5].description.toLowerCase().indexOf(svrSearch)==-1) {
                continue;
            }
            servertablebody += "<tr><td id=\"serverentry-" + i + "\" class=\"serverentry\">" + data.stream[i][1] + "</td><td>" + data.stream[i][3] + "</td><td>" + data.stream[i][4] + "</td></tr>";
        }
        document.getElementById("servertablebody").innerHTML = servertablebody;

        $("#servertable").popover({ 
            html: true,
            title: function() {
                i = parseInt(this.id.substring(this.id.indexOf("-")+1));
                return "<button type=\"button\" class=\"close\" id=\"serverentry-" + i + "-popoverclose\" onclick=\"$('#" + this.id + "').popover('hide');\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button><h4 class=\"modal-title\">Server Info</h4>";
            },
            content: function() {
                i = parseInt(this.id.substring(this.id.indexOf("-")+1));
                setTimeout(function() {
                    document.getElementById("serverimg-" + i).src = data.stream[i][0];
                }, 10);
                return "<img id=\"serverimg-" + i + "\" style=\"width:100%;\" src=\"data:image/gif;base64,R0lGODlhAQABAIAAAHd3dwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==\" /><br><br>Owned by <b>@" + data.stream[i][2] + "</b><br>Total: <b>" + data.stream[i][4].substring(0, data.stream[i][4].indexOf(" ")) + "</b> members<br><b>" + data.stream[i][3] + "</b> message" + (data.stream[i][3]==1 ? "" : "s") + " today" + (data.stream[i][5].enabled ? ("<hr>" + micromarkdown.parse(data.stream[i][5].description) + "<br><br><a href=\"" + data.stream[i][5].invite + "\" role=\"button\" class=\"btn btn-primary\">Join " + data.stream[i][1] + "</a>") : "") + "<script>document.getElementById(\"" + this.id + "\").parentNode.parentNode.style.maxWidth = \"350px\";</script>";
            },
            selector: ".serverentry",
            placement: "top",
            container: "body",
            trigger: "click"
        });
        
        document.getElementById("loading").style.display = "none";
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
            if(checkMobile()) {
                localStorage.setItem("bootstrap-theme", "slate");
            } else {
                localStorage.setItem("bootstrap-theme", "default");
            }
        }
        document.getElementById("theme").href = "./css/bootstrap-" + localStorage.getItem("bootstrap-theme") + ".min.css";
        if(document.getElementById("themeswitcher")) {
            document.getElementById("themeswitcher").value = localStorage.getItem("bootstrap-theme");
            $("#themeswitcher").selectpicker("refresh");
        }
    }
    if(["admin", "maintainer"].indexOf(window.location.pathname.substring(window.location.pathname.indexOf("/")+1).toLowerCase())>-1) {
        var headerColor = "#90CAF9";
        switch(localStorage.getItem("bootstrap-theme")) {
            case "cyborg":
                headerColor = "#01579B";
                break;
            case "paper":
                headerColor = "#42A5F5";
                break;
            case "slate":
                headerColor = "#212121";
                break;
            case "superhero":
                headerColor = "#263238";
        }
        document.getElementsByClassName("header")[0].style.backgroundColor = headerColor;
    }
}

function checkMobile() {
    var check = false;
    (function(a){
        if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true
    })(navigator.userAgent||navigator.vendor||window.opera);
    return check;
}

function switchStats(n, nodestroy) {
    $("#loading-modal").modal("show");
    
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
                    $("#loading-modal").modal("hide");
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
                        $("#loading-modal").modal("hide");
                    }
                });
            });
        }
    }, 125);
}

function switchProfile(n) {
    $("#loading-modal").modal("show");
    
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
                $("#loading-modal").modal("hide");
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
    $("#loading-modal").modal("show");
    
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
                for(var i=data.stream.length-1; i>=(data.stream.length>150 ? data.stream.length-150 : 0); i--) {
                    html = data.stream[i] + "<br>" + html;
                }
            }
            
            document.getElementById("console").innerHTML = html || "<i>Nothing here</i>";
            document.getElementById("console").scrollTop = document.getElementById("console").scrollHeight;
            if(!nodestroy) {
                $("#loading-modal").modal("hide");
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
            $("#loading-modal").modal("hide");
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