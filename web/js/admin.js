function doAdminSetup() {
    document.title = botData.svrnm + " Admin Console";
    document.getElementById("servername").innerHTML = botData.svrnm;
    document.getElementById("profilepic").src = botData.svricon;
    document.getElementById("botname").innerHTML = botData.botnm;
    document.getElementById("botsince").innerHTML = " added " + botData.joined + " ago";
    document.getElementById("rssrow").style.display = botData.configs.rss[0] ? "" : "none";
    
    switchAdmins();
    $("#admins-body").collapse("show");
    switchBlocked();
    $("#blocked-body").collapse("show");
    switchMuted();
    $("#muted-body").collapse("show");
    switchStrikes();
    $("#strikes-body").collapse("show");
    switchRss();
    $("#rss-body").collapse("show");
    switchTags();
    $("#tags-body").collapse("show");
    switchTranslated();
    $("#translated-body").collapse("show");
    switchStatspoints();
    $("#statspoints-body").collapse("show");
    switchCommands();
    $("#commands-body").collapse("show");
    switchPublic();
    $("#public-body").collapse("show");
    switchManage();
    $("#manage-body").collapse("show");
    switchTriviaSets();
    $("#triviasets-body").collapse("show");
    switchExtensions();
    $("#extensions-body").collapse("show");
    
    NProgress.done();
}

function configNickname() {
    if(!document.getElementById("botnameinput")) {
        document.getElementById("botname").innerHTML = "<div class=\"col-xs-4 input-group\"><span class=\"input-group-addon btn btn-danger\" onclick=\"config('nickname', '.', configNickname);\" data-toggle=\"tooltip\" data-placement=\"bottom\" title=\"Clear nickname and use username\"><span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span> Remove</span><input id=\"botnameinput\" class=\"form-control\" onkeydown=\"if(event.keyCode==13){config('nickname', this.value, configNickname)}else if(event.keyCode==27){configNickname()}\" value=\"" + botData.botnm + "\"></input></div>";
        document.getElementById("botname").onclick = "";
        document.getElementById("botnameinput").focus();
    } else {
        document.getElementById("botname").innerHTML = botData.botnm;
        document.getElementById("botname").onclick = configNickname;
    }
}

function switchAdmins() {
    document.getElementById("adminstable").style.display = "";
    
    var blacklist = [];
    var adminstablebody = "";
    for(var i=0; i<botData.configs.admins.length; i++) {
        blacklist.push(botData.configs.admins[i][2]);
        adminstablebody += "<tr id=\"adminsentry-" + botData.configs.admins[i][2] + "\"><td><img class=\"profilepic\" width=25 src=\"" + botData.configs.admins[i][0] + "\" /></td><td>" + botData.configs.admins[i][1] + "</td><td>" + botData.configs.admins[i][2] + "</td><td><button type=\"button\" class=\"btn btn-danger btn-xs\" onclick=\"javascript:config('admins', this.parentNode.parentNode.id.substring(12), function() {switchAdmins();switchBlocked();switchStrikes();});\"><span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span> Remove</button></td></tr>";
    }
    document.getElementById("adminstablebody").innerHTML = adminstablebody;
    if(botData.configs.admins.length==0) {
        document.getElementById("adminstable").style.display = "none";
    }
    
    for(var i=0; i<botData.configs.blocked.length; i++) {
        blacklist.push(botData.configs.blocked[i][2]);
    }
    filterMembers(blacklist, function(possibleAdmins) {
        var adminsselector = "";
        for(var i=0; i<possibleAdmins.data.length; i++) {
            adminsselector += "<option value=\"" + possibleAdmins.data[i][1] + "\"" + (possibleAdmins.data[i][2] ? (" data-tokens=\"" + possibleAdmins.data[i][2] + "\"") : "" ) + ">" + possibleAdmins.data[i][0] + "</option>";
        }
        document.getElementById("adminsselector").innerHTML = adminsselector;
        $("#adminsselector").selectpicker("refresh");
    });

    var adminsselector_role = "";
    for(var i=botData.roles.length-1; i>=0; i--) {
        adminsselector_role += "<option id=\"newroleentry-" + botData.roles[i][1] + "\" value=\"role-" + botData.roles[i][1] + "\" style=\"color: " + botData.roles[i][3] + ";\">" + botData.roles[i][0] + "</option>";
    }
    document.getElementById("adminsselector-role").innerHTML = adminsselector_role;
    $("#adminsselector-role").selectpicker("refresh");
}

function switchBlocked() {
    document.getElementById("blockedtable").style.display = "";
    
    var blacklist = [];
    var blockedtablebody = "";
    for(var i=0; i<botData.configs.blocked.length; i++) {
        blacklist.push(botData.configs.blocked[i][2]);
        blockedtablebody += "<tr id=\"blockedentry-" + botData.configs.blocked[i][2] + "\"><td><img class=\"profilepic\" width=25 src=\"" + botData.configs.blocked[i][0] + "\" /></td><td>" + botData.configs.blocked[i][1] + "</td><td>" + botData.configs.blocked[i][2] + "</td><td>" + (botData.configs.blocked[i][3] ? "" : "<button type=\"button\" class=\"btn btn-danger btn-xs\" onclick=\"javascript:config('blocked', this.parentNode.parentNode.id.substring(13), function() {switchAdmins();switchBlocked();switchStrikes();});\"><span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span> Unblock</button>") + "</td></tr>";
    }
    document.getElementById("blockedtablebody").innerHTML = blockedtablebody;
    if(botData.configs.blocked.length==0) {
        document.getElementById("blockedtable").style.display = "none";
    }
    
    for(var i=0; i<botData.configs.admins.length; i++) {
        blacklist.push(botData.configs.admins[i][2]);
    }
    filterMembers(blacklist, function(possibleBlocked) {
        var blockedselector = "";
        for(var i=0; i<possibleBlocked.data.length; i++) {
            blockedselector += "<option value=\"" + possibleBlocked.data[i][1] + "\"" + (possibleBlocked.data[i][2] ? (" data-tokens=\"" + possibleBlocked.data[i][2] + "\"") : "" ) + ">" + possibleBlocked.data[i][0] + "</option>";
        }
        document.getElementById("blockedselector").innerHTML = blockedselector;
        $("#blockedselector").selectpicker("refresh");
    });

    var blockedselector_role = "";
    for(var i=botData.roles.length-1; i>=0; i--) {
        blockedselector_role += "<option id=\"newroleentry-" + botData.roles[i][1] + "\" value=\"role-" + botData.roles[i][1] + "\" style=\"color: " + botData.roles[i][3] + ";\">" + botData.roles[i][0] + "</option>";
    }
    document.getElementById("blockedselector-role").innerHTML = blockedselector_role;
    $("#blockedselector-role").selectpicker("refresh");
}

function switchMuted() {
    document.getElementById("mutedtable").style.display = "";
    
    var blacklist = [];
    var mutedtablebody = "";
    for(var i=0; i<botData.configs.muted.length; i++) {
        blacklist.push(botData.configs.muted[i][2]);
        mutedtablebody += "<tr id=\"mutedentry-" + botData.configs.muted[i][2] + "\"><td><img class=\"profilepic\" width=25 src=\"" + botData.configs.muted[i][0] + "\" /></td><td>" + botData.configs.muted[i][1] + "</td><td>" + botData.configs.muted[i][2] + "</td><td><button type=\"button\" class=\"btn btn-primary btn-xs mutedmute\" id=\"mutedentry-"+ i + "-mute\"><span class=\"glyphicon glyphicon-volume-off\" aria-hidden=\"true\"></span> Channels</button></td></tr>";
    }
    document.getElementById("mutedtablebody").innerHTML = mutedtablebody;
    if(botData.configs.muted.length==0) {
        document.getElementById("mutedtable").style.display = "none";
    }
    
    $("#mutedtable").popover({
        html: true,
        title: function() {
            i = parseInt(this.id.substring(this.id.indexOf("-")+1, this.id.lastIndexOf("-")));
            return "<button type=\"button\" class=\"close\" id=\"mutedentry-" + botData.configs.muted[i][2] + "-popoverclose\" onclick=\"$('#" + this.id + "').popover('hide');\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button><h4 class=\"modal-title\">Mute @" + botData.configs.muted[i][1] + "</h4>";
        },
        content: function() {
            i = parseInt(this.id.substring(this.id.indexOf("-")+1, this.id.lastIndexOf("-")));
            var popovercontent = "Block sending messages in:";
            for(var j=0; j<botData.channels.length; j++) {
                popovercontent += "<div class=\"checkbox\"><input type=\"checkbox\" id=\"mutedentry-mute-" + j + "\" onclick=\"javascript:newMute(['" + botData.configs.muted[i][2] + "', '" + botData.channels[j][1] + "'], " + i + ");\"" + (botData.configs.muted[i][3][botData.channels[j][1]] ? " checked" : "") + "><label for=\"mutedentry-mute-" + j + "\">#" + botData.channels[j][0] + "</label></div>";
            }
            popovercontent += "<button type=\"button\" class=\"btn btn-default\" onclick=\"javascript:newMute(['" + botData.configs.muted[i][2] + "', 'all'], " + i + ");\">Toggle All</button>";
            return popovercontent;
        },
        selector: ".mutedmute",
        placement: "bottom",
        container: "body",
        trigger: "click"
    });
    
    for(var i=0; i<botData.configs.admins.length; i++) {
        blacklist.push(botData.configs.admins[i][2]);
    }
    filterMembers(blacklist, function(possiblemuted) {
        var mutedselector = "";
        for(var i=0; i<possiblemuted.data.length; i++) {
            mutedselector += "<option value=\"" + possiblemuted.data[i][1] + "\"" + (possiblemuted.data[i][2] ? (" data-tokens=\"" + possiblemuted.data[i][2] + "\"") : "" ) + ">" + possiblemuted.data[i][0] + "</option>";
        }
        document.getElementById("mutedselector").innerHTML = mutedselector;
        $("#mutedselector").selectpicker("refresh");
    });
}

function newMute(data, i) {
    $("#mutedentry-" + i + "-mute").popover("hide");
    config("mute", data, switchMuted);
}

function switchStrikes() {
    document.getElementById("strikestable").style.display = "";
    
    var blacklist = [];
    var strikestablebody = "";
    for(var i=botData.strikes.length-1; i>=0; i--) {
        strikestablebody += "<tr id=\"strikesentry-" + botData.strikes[i][0] + "\"><td><img class=\"profilepic\" width=25 src=\"" + botData.strikes[i][1] + "\" /></td><td>" + botData.strikes[i][2] + "</td><td>" + botData.strikes[i][3].length + "</td><td><button type=\"button\" id=\"strikesentry-" + i + "-view\" class=\"btn btn-default btn-xs strikesview\"><span class=\"glyphicon glyphicon-eye-open\" aria-hidden=\"true\"></span> View</button>&nbsp;<button type=\"button\" id=\"strikesentry-" + i + "-add\" class=\"btn btn-primary btn-xs strikesadd\"><span class=\"glyphicon glyphicon-plus\" aria-hidden=\"true\"></span> Add</button>&nbsp;<button type=\"button\" class=\"btn btn-danger btn-xs\" onclick=\"javascript:removeStrike(this.parentNode.parentNode.id.substring(13), " + i + ");\"><span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span> Remove All</button></td></tr>";
    }
    document.getElementById("strikestablebody").innerHTML = strikestablebody;
    if(botData.strikes.length==0) {
        document.getElementById("strikestable").style.display = "none";
    }
    
    $("#strikestable").popover({ 
        html: true,
        title: function() {
            i = parseInt(this.id.substring(this.id.indexOf("-")+1, this.id.lastIndexOf("-")));
            return "<button type=\"button\" class=\"close\" id=\"strikesentry-" + botData.strikes[i][0] + "-popoverclose\" onclick=\"$('#" + this.id + "').popover('hide');\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button><h4 class=\"modal-title\">Strikes for " + botData.strikes[i][2] + "</h4>";
        },
        content: function() {
            i = parseInt(this.id.substring(this.id.indexOf("-")+1, this.id.lastIndexOf("-")));
            var popovercontent = "<div class=\"table-responsive\"><table class=\"table table-striped\"><thead><tr><th>#</th><th>Reason</th><th>From</th><th>Date</th><th>Action</th></tr></thead><tbody>";
            for(var j=0; j<botData.strikes[i][3].length; j++) {
                popovercontent += "<tr id=\"" + j + "-" + botData.strikes[i][0] + "-strikesentry\"><td>" + (j+1) + "</td><td>" + botData.strikes[i][3][j][1] + "</td><td>@" + botData.strikes[i][3][j][0] + "</td><td>" + botData.strikes[i][3][j][2] + "</td><td><button type=\"button\" class=\"btn btn-danger btn-xs\" onclick=\"javascript:removeStrike('" + botData.strikes[i][0] + "', " + i + ", this.parentNode.parentNode.id.substring(0, this.parentNode.parentNode.id.indexOf('-')));\"><span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span> Remove</button></td></tr>";
            }
            popovercontent += "</tbody></table></div>";
            return popovercontent;
        },
        selector: ".strikesview",
        placement: "bottom",
        container: "body",
        trigger: "click"
    });
    $("#strikestablebody").popover({
        html: true,
        title: function() {
            i = parseInt(this.id.substring(this.id.indexOf("-")+1, this.id.lastIndexOf("-")));
            return "<button type=\"button\" class=\"close\" id=\"strikesentry-" + botData.strikes[i][0] + "-popoverclose\" onclick=\"$('#" + this.id + "').popover('hide');\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button><h4 class=\"modal-title\">Add Strike</h4>";
        },
        content: function() {
            i = parseInt(this.id.substring(this.id.indexOf("-")+1, this.id.lastIndexOf("-")));
            return "<div class=\"input-group\"><input type=\"text\" id=\"" + botData.strikes[i][0] + "-strikesadd\" class=\"form-control\" placeholder=\"Reason for strike\" onkeydown=\"if(event.keyCode==13){addStrike('" + botData.strikes[i][0] + "', this.value, " + i + ");}\"><span class=\"input-group-addon btn btn-primary\" onclick=\"javascript:addStrike('" + botData.strikes[i][0] + "', document.getElementById('" + botData.strikes[i][0] + "-strikesadd').value, " + i + ");\"><span class=\"glyphicon glyphicon-plus\" aria-hidden=\"true\"></span> Add</span></div><script>document.getElementById(\"" + botData.strikes[i][0] + "-strikesadd\").parentNode.parentNode.parentNode.style.maxWidth = \"350px\";</script>";
        },
        selector: ".strikesadd",
        placement: "bottom",
        container: "body",
        trigger: "click"
    });
    
    for(var i=0; i<botData.configs.admins.length; i++) {
        blacklist.push(botData.configs.admins[i][2]);
    }
    filterMembers(blacklist, function(possibleStrikes) {
        var strikesselector = "";
        for(var i=0; i<possibleStrikes.data.length; i++) {
            strikesselector += "<option value=\"" + possibleStrikes.data[i][1] + "\"" + (possibleStrikes.data[i][2] ? (" data-tokens=\"" + possibleStrikes.data[i][2] + "\"") : "" ) + ">" + possibleStrikes.data[i][0] + "</option>";
        }
        document.getElementById("strikesselector").innerHTML = strikesselector;
        $("#strikesselector").selectpicker("refresh");
    });
    document.getElementById("strikesinput").value = "";
}

function newStrike() {
    if(!document.getElementById("strikesselector").value || !document.getElementById("strikesinput").value) {
        if(!document.getElementById("strikesselector").value) {
            richModal("Select a member");
        }
        if(!document.getElementById("strikesinput").value) {
            $("#strikesinput-block").addClass("has-error");
        }
    } else {
        $("#strikesinput-block").removeClass("has-error");
        config("strikes", [document.getElementById("strikesselector").value, document.getElementById("strikesinput").value], function() {
            switchAdmins();
            switchBlocked();
            switchStrikes();
        });
    }
}

function addStrike(usrid, reason, i) {
    if(reason) {
        $("#strikesentry-" + i + "-view").popover("hide");
        $("#strikesentry-" + i + "-add").popover("hide");
        config("strikes", [usrid, reason], function() {
            switchAdmins();
            switchBlocked();
            switchStrikes();
        });
    }
}

function removeStrike(usrid, i, u) {
    $("#strikesentry-" + i + "-view").popover("hide");
    $("#strikesentry-" + i + "-add").popover("hide");
    config("strikes", [usrid, u || -1], function() {
        switchAdmins();
        switchBlocked();
        switchStrikes();
    });
}

function switchRss() {
    document.getElementById("rsstable").style.display = "";
    
    var rsstablebody = "";
    for(var i=0; i<botData.configs.rss[1].length; i++) {
        rsstablebody += "<tr id=\"rssentry-" + i + "\"><td>" + botData.configs.rss[2][i] + "</td><td><a href=\"" + botData.configs.rss[1][i] + "\">" + botData.configs.rss[1][i] + "</a></td><td><button type=\"button\" id=\"rssentry-" + i + "-updates\" class=\"btn btn-primary btn-xs rssupdates\"><span class=\"glyphicon glyphicon-refresh\" aria-hidden=\"true\"></span> Updates</button>&nbsp;<button type=\"button\" class=\"btn btn-danger btn-xs\" onclick=\"javascript:config('rss', this.parentNode.parentNode.id.substring(9), switchRss);\"><span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span> Remove</button></td></tr>";
    }
    document.getElementById("rsstablebody").innerHTML = rsstablebody;
    if(botData.configs.rss[1].length==0) {
        document.getElementById("rsstable").style.display = "none";
    }

    $("#rsstable").popover({ 
        html: true,
        title: function() {
            i = parseInt(this.id.substring(this.id.indexOf("-")+1, this.id.lastIndexOf("-")));
            return "<button type=\"button\" class=\"close\" id=\"rssentry-" + i + "-updates\" onclick=\"$('#" + this.id + "').popover('hide');\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button><h4 class=\"modal-title\">RSS Updates</h4>";
        },
        content: function() {
            i = parseInt(this.id.substring(this.id.indexOf("-")+1, this.id.lastIndexOf("-")));
            var popovercontent = "Post new articles in:";
            for(var j=0; j<botData.channels.length; j++) {
                popovercontent += "<div class=\"checkbox\"><input type=\"checkbox\" id=\"rssupdates-channel-" + botData.channels[j][1] + "\" onclick=\"javascript:config('rss', {chid: '" + botData.channels[j][1] + "', i: " + i + "}, function() {});\"" + (botData.configs.rss[3][i][0].indexOf(botData.channels[j][1])>-1 ? " checked" : "") + "><label for=\"rssupdates-channel-" + botData.channels[j][1] + "\">#" + botData.channels[j][0] + "</label></div>";
            }
            return popovercontent;
        },
        selector: ".rssupdates",
        placement: "bottom",
        container: "body",
        trigger: "click"
    });
}

function newRss() {
    if(!document.getElementById("rssnewname").value || !document.getElementById("rssnewurl").value) {
        if(!document.getElementById("rssnewname").value) {
            $("#rssnewname-block").addClass("has-error");
        }
        if(!document.getElementById("rssnewurl").value) {
            $("#rssnewurl-block").addClass("has-error");
        }
    } else if(document.getElementById("rssnewname").value.indexOf(" ")>-1 || document.getElementById("rssnewurl").value.indexOf(" ")>-1) {
        richModal("Name and URL cannot contain spaces");
    } else {
        $("#rssnewname-block").removeClass("has-error");
        $("#rssnewurl-block").removeClass("has-error");
        config("rss", [document.getElementById("rssnewurl").value, document.getElementById("rssnewname").value], function() {
            document.getElementById("rssnewname").value = "";
            document.getElementById("rssnewurl").value = "";
            switchRss();
        });
    }
}

function newRssUrl(site) {
    var url = "";
    switch(site) {
        case "github":
            url = "https://github.com/USERNAME/REPO/commits/master.atom";
            break;
        case "reddit":
            url = "https://www.reddit.com/r/SUBREDDIT/.rss";
            break;
        case "twitter":
            url = "http://twitrss.me/twitter_user_to_rss/?user=USERNAME";
            break;
    }
    document.getElementById("rssnewurl").value = url;
}

function switchTags() {
    document.getElementById("tags-tag").checked = botData.configs.tag;
    document.getElementById("tags-select-tag").value = botData.configs.admincommands.indexOf("tag")>-1 ? "admins" : "everyone";
    if(botData.configs.tag) {
        document.getElementById("tags-select-tag").removeAttribute("disabled");
    } else {
        document.getElementById("tags-select-tag").setAttribute("disabled", "disable");
    }
    $("#tags-select-tag").selectpicker("refresh");

    var tagsections = ["add", "remove"];
    for(var i=0; i<tagsections.length; i++) {
        document.getElementById("tags-select-" + tagsections[i] + "tag").value = botData.configs[tagsections[i] + "tagadmin"] ? "admins" : "everyone";
        if(botData.configs.tag && document.getElementById("tags-select-tag").value=="everyone") {
            document.getElementById("tags-select-" + tagsections[i] + "tag").removeAttribute("disabled");
        } else {
            document.getElementById("tags-select-" + tagsections[i] + "tag").setAttribute("disabled", "disable");
        }
        $("#tags-select-" + tagsections[i] + "tag").selectpicker("refresh");

        document.getElementById("tags-select-" + tagsections[i] + "tagcommand").value = botData.configs[tagsections[i] + "tagcommandadmin"] ? "admins" : "everyone";
        if(!botData.configs[tagsections[i] + "tagadmin"] && botData.configs.tag && document.getElementById("tags-select-tag").value=="everyone") {
            document.getElementById("tags-select-" + tagsections[i] + "tagcommand").removeAttribute("disabled");
        } else {
            document.getElementById("tags-select-" + tagsections[i] + "tagcommand").setAttribute("disabled", "disable");
        }
        $("#tags-select-" + tagsections[i] + "tagcommand").selectpicker("refresh");
    }

    document.getElementById("tagstable-block").style.display = "";
    document.getElementById("tagstable").style.display = "";

    var tagstablebody = "";
    for(var i=0; i<botData.configs.tags.length; i++) {
        tagstablebody += "<tr id=\"tagsentry-" + botData.configs.tags[i][0] + "\"><td>" + botData.configs.tags[i][0] + "</td><td>" + micromarkdown.parse(botData.configs.tags[i][1]) + "</td><td>" + (botData.configs.tags[i][2] ? "Command" : "Text") + "</td><td><button type=\"button\" class=\"btn btn-primary btn-xs\" onclick=\"javascript:config('tags', ['lock', '" + botData.configs.tags[i][0] + "'], switchTags);\"><span class=\"glyphicon glyphicon-lock\" aria-hidden=\"true\"></span> " + (botData.configs.tags[i][3] ? "Unlock" : "Lock") + "</button>&nbsp;&nbsp;<button type=\"button\" class=\"btn btn-danger btn-xs\" onclick=\"javascript:config('tags', ['" + botData.configs.tags[i][0] + "'], switchTags);\"><span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span> Remove</button></td></tr>"
    }
    document.getElementById("tagstablebody").innerHTML = tagstablebody;
    if(botData.configs.tags.length==0) {
        document.getElementById("tagstable").style.display = "none";
    }
    if(!botData.configs.tag) {
        document.getElementById("tagstable-block").style.display = "none";
    }
}

function newTag() {
    if(!document.getElementById("tagsinput").value || !document.getElementById("tagsvalue").value) {
        if(!document.getElementById("tagsinput").value) {
            $("#tagsinput-block").addClass("has-error");
        }
        if(!document.getElementById("tagsvalue").value) {
            $("#tagsvalue-block").addClass("has-error");
        }
    } else {
        $("#tagsinput-block").removeClass("has-error");
        $("#tagsvalue-block").removeClass("has-error");
        config("tags", [document.getElementById("tagsinput").value, document.getElementById("tagsvalue").value, document.getElementById("tagsselect").value], function() {
            document.getElementById("tagsinput").value = "";
            document.getElementById("tagsvalue").value = "";
            document.getElementById("tagsselect").value = "text";
            switchTags();
        });
    }
}

function switchTranslated() {
    document.getElementById("translatedtable").style.display = "";
    
    var blacklist = [];
    var translatedtablebody = "";
    for(var i=0; i<botData.configs.translated.length; i++) {
        blacklist.push(botData.configs.translated[i][2]);
        translatedtablebody += "<tr id=\"translatedentry-" + botData.configs.translated[i][2] + "\"><td><img class=\"profilepic\" width=25 src=\"" + botData.configs.translated[i][0] + "\" /></td><td>" + botData.configs.translated[i][1] + "</td><td>" + botData.configs.translated[i][3] + "</td><td>" + botData.configs.translated[i][4] + "</td><td><button type=\"button\" class=\"btn btn-danger btn-xs\" onclick=\"javascript:config('translated', [this.parentNode.parentNode.id.substring(16)], switchTranslated);\"><span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span> Remove</button></td></tr>";
    }
    document.getElementById("translatedtablebody").innerHTML = translatedtablebody;
    if(botData.configs.translated.length==0) {
        document.getElementById("translatedtable").style.display = "none";
    }
    
    for(var i=0; i<botData.configs.blocked.length; i++) {
        blacklist.push(botData.configs.blocked[i][2]);
    }
    filterMembers(blacklist, function(possibleTranslated) {
        var translatedselector = "";
        for(var i=0; i<possibleTranslated.data.length; i++) {
            translatedselector += "<option value=\"" + possibleTranslated.data[i][1] + "\"" + (possibleTranslated.data[i][2] ? (" data-tokens=\"" + possibleTranslated.data[i][2] + "\"") : "" ) + ">" + possibleTranslated.data[i][0] + "</option>";
        }
        document.getElementById("translatedselector").innerHTML = translatedselector;
        $("#translatedselector").selectpicker("refresh");
    });
    document.getElementById("translatedinput").value = "";

    var translatedchannels = "";
    for(var i=0; i<botData.channels.length; i++) {
        translatedchannels += "<option id=\"translatedch-" + botData.channels[i][1] + "\" value=\"" + botData.channels[i][1] + "\">#" + botData.channels[i][0] + "</option>";
    }
    document.getElementById("translatedchannels").innerHTML = translatedchannels;
    $("#translatedchannels").selectpicker("refresh");
}

function newTranslate() {
    if(!document.getElementById("translatedselector").value || !document.getElementById("translatedinput").value || !$("#translatedchannels").val()) {
        if(!document.getElementById("translatedselector").value) {
            richModal("Select a member");
            return;
        }
        if(!document.getElementById("translatedinput").value) {
            $("#translatedinput-block").addClass("has-error");
            return;
        }
        if(!$("#translatedchannels").val()) {
            richModal("Select at least one channel");
            return;
        }
    } else {
        $("#translatedinput-block").removeClass("has-error");
        config("translated", [document.getElementById("translatedselector").value, document.getElementById("translatedinput").value, $("#translatedchannels").val()], switchTranslated);
    }
}

function switchStatspoints() {
    var statspoints = ["stats", "games", "messages", "ranks", "points", "lottery"];
    for(var i=0; i<statspoints.length; i++) {
        document.getElementById("statspoints-" + statspoints[i]).checked = botData.configs[statspoints[i]];
    }
    var statspoints_statsexclude = "";
    var statschannels = [];
    for(var i=0; i<botData.channels.length; i++) {
        if(botData.configs.statsexclude.indexOf(botData.channels[i][1])==-1) {
            statschannels.push(botData.channels[i][1]);
        }
        statspoints_statsexclude += "<option value=\"" + botData.channels[i][1] + "\">#" + botData.channels[i][0] + "</option>";
    }
    document.getElementById("statspoints-statsexclude").innerHTML = statspoints_statsexclude;
    $("#statspoints-statsexclude").val(statschannels);
    if(botData.configs.stats && botData.configs.messages) {
        document.getElementById("statspoints-statsexclude").removeAttribute("disabled");
    } else {
        document.getElementById("statspoints-statsexclude").setAttribute("disabled", "disable");
    }
    $("#statspoints-statsexclude").selectpicker("refresh");
    disableBlock("statspoints-stats-block", !botData.configs.stats);
    disableBlock("statspoints-points-block", !botData.configs.points);

    document.getElementById("rankstable-block").style.display = botData.configs.ranks ? "" : "none";
    var rankstablebody = "";
    for(var i=botData.configs.rankslist.length-1; i>=0; i--) {
        rankstablebody += "<tr id=\"ranksentry-" + i + "\"><td>" + botData.configs.rankslist[i][0] + "</td><td>" + (i==botData.configs.rankslist.length-1 ? "&infin;" : botData.configs.rankslist[i][1]) + "</td><td>" + (botData.configs.rankslist[i][2] ? ("<span style=\"color:" +  botData.configs.rankslist[i][2][1] + "\">" + botData.configs.rankslist[i][2][0] + "</span>") : "None") + "</td><td>" + botData.configs.rankslist[i][3] + "</td><td><button type=\"button\" class=\"btn btn-danger btn-xs\" onclick=\"javascript:config('rankslist', " + i + ", switchStatspoints);\"><span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span> Remove</button></td></tr>";
    }
    document.getElementById("rankstablebody").innerHTML = rankstablebody;
    var ranksselect = "";
    for(var i=botData.roles.length-1; i>=0; i--) {
        ranksselect += "<option id=\"ranksselect-" + botData.roles[i][1] + "\" value=\"" + botData.roles[i][1] + "\" style=\"color: " + botData.roles[i][3] + ";\">" + botData.roles[i][0] + "</option>";
    }
    document.getElementById("ranksselect").innerHTML = ranksselect;
    $("#ranksselect").selectpicker("refresh");
}

function newRank() {
    if(!document.getElementById("ranksinput").value || !document.getElementById("ranksmax").value) {
        if(!document.getElementById("ranksinput").value) {
            $("#ranksinput-block").addClass("has-error");
        }
        if(!document.getElementById("ranksmax").value) {
            $("#ranksmax-block").addClass("has-error");
        }
    } else {
        $("#ranksinput-block").removeClass("has-error");
        $("#ranksmax-block").removeClass("has-error");
        config("rankslist", {
            name: document.getElementById("ranksinput").value,
            max: parseInt(document.getElementById("ranksmax").value),
            role: document.getElementById("ranksselect").value ? document.getElementById("ranksselect").value : null
        }, function() {
            document.getElementById("ranksinput").value = "";
            document.getElementById("ranksmax").value = "";
            document.getElementById("ranksselect").value = "";
            switchStatspoints();
        });
    }
}

function switchCommands() {
    var descs = {
        "rss": "Fetches entries from an <a href='#rss'>RSS feed</a>",
        "stats": "Shows the most active members, richest users, most played games, and most used commands on the server for this week",
        "lottery": "Hourly point giveaways in the <code>points</code> command", 
        "linkme": "Searches the Google Play Store for one or more apps", 
        "appstore": "Searches the Apple App Store for one or more apps", 
        "say": "Says something in the chat", 
        "convert": "Converts between units of measurement and currencies", 
        "twitter": "Fetches the Twitter timeline for a given user", 
        "youtube": "Gets a YouTube link with the given query, including channels, videos, and playlists", 
        "image": "Searches Google Images with the given query and returns the first or a random result", 
        "gif": "Gets a GIF from Giphy with the given tags", 
        "wolfram": "Displays an entire Wolfram|Alpha knowledge page about a given topic or person", 
        "wiki": "Shows the first three paragraphs of the Wikipedia article matching the given search query", 
        "weather": "Gets the current weather and forecast for the given location from MSN Weather", 
        "stock": "Fetches basic information about a stock symbol from Yahoo! Finance", 
        "reddit": "Gets the top HOT posts from a given sub on Reddit", 
        "roll": "Generates a random number or rolls a die", 
        "profile": "An all-in-one command to view information about users", 
        "tagreaction": "Responds when tagged without a command", 
        "poll": "Allows users to create live, in-chat polls", 
        "trivia": "<a href='#triviasets'>AwesomeTrivia</a>, a fun question-and-answer group quiz game", 
        "meme": "Generates a dank new meme", 
        "urban": "Defines the given word from Urban Dictionary", 
        "choose": "Randomly chooses from a set of options", 
        "afk": "Display AFK message for users when tagged", 
        "shorten": "Uses goo.gl to shorten or decode a URL", 
        "joke": "Tells a random joke!", 
        "translate": "Uses Microsoft Translate to translate a word/phrase into another language", 
        "emoji": "Fetches the large version of an emoji", 
        "time": "Gets the time in a city or country",
        "avatar": "Posts a user's profile picture",
        "list": "In-chat to-do list",
        "kick": "Removes a member from the server",
        "ban": "Removes a member from the server and prevents them from coming back",
        "nuke": "Deletes messages in a channel, all or from a user",
        "archive": "Provides a JSON file with the last <i>n</i> messages in chat",
        "room": "Allows anyone to create a temporary channel with a few other members",
        "anime": "Searches anime shows using Hummingbird",
        "quiet": "Turns off the bot in one or all channels",
        "join": "Provdes the OAuth link to add the bot to another server",
        "giveaway": "Easy way to randomly give away a secret of some sort",
        "chatterbot": "The Mitsuku chatbot, very fun and friendly",
        "info": "Lists basic stats about this server",
        "calc": "Quickly evaluate a mathematical expression",
        "manga": "Searches manga data",
        "imdb": "Provides movie and TV show data",
        "search": "Displays Google search and Knowledge Graph results",
        "ddg": "DuckDuckGo Instant Answers",
        "countdown": "Set a timer for an event",
        "8ball": "Predicts the answer to a question",
        "fortune": "Tells your fortune (not really)",
        "catfact": "Random fact about cats",
        "numfact": "Random fact about a number",
        "e621": "Searches by tag on e621.net",
        "rule34": "Searches by tag on rule34.xxx",
        "safebooru": "Searches by tag on safebooru.org",
        "xkcd": "Fetches today's XKCD comic or by ID",
        "imgur": "Uploads an image to Imgur",
        "cat": "Random picture of a cat!"
    }
    var newcmds = ["kick", "ban", "nuke", "list", "avatar", "archive", "mute", "anime", "manga", "room", "giveaway", "calc", "countdown", "ddg", "imdb", "8ball", "fortune", "catfact", "numfact", "e621", "rule34", "safebooru", "cat", "info", "imgur", "xkcd"];
    var nsfwcmds = ["e621", "rule34", "safebooru"];
    var blacklist = ["admins", "blocked", "extensions", "newgreeting", "nsfwfilter", "servermod", "spamfilter", "customroles", "customcolors", "customkeys", "cmdtag", "newmembermsg", "onmembermsg", "offmembermsg", "changemembermsg", "rankmembermsg", "twitchmembermsg", "editmembermsg", "deletemembermsg", "rmmembermsg", "banmembermsg", "unbanmembermsg", "triviasets", "newrole", "showpub", "defaultcount", "maxcount", "autoprune", "translated", "filter", "usenicks", "usediscriminators", "listsrc", "listing", "tagcommands", "cooldown", "stats", "points", "ranks", "rankslist", "messages", "games", "lottery", "admincommands", "showsvr", "chrestrict", "newmemberpm", "role", "addtagadmin", "addtagcommandadmin", "muted", "removetagadmin", "removetagcommandadmin", "tag", "tags", "deletecommands"];

    var cmdchannelselect = "";
    for(var i=0; i<botData.channels.length; i++) {
        cmdchannelselect += "<option value=\"" + botData.channels[i][1] + "\">#" + botData.channels[i][0] + "</option>";
    }

    var commands = [];
    for(var cmd in botData.configs) {
        if(blacklist.indexOf(cmd)==-1) {
            commands.push("<div class=\"checkbox\"><input style=\"height: auto;\" id=\"commandsentry-" + cmd + "\" type=\"checkbox\" onclick=\"javascript:config(this.id.substring(14), this.checked, switchCommands);\" " + ((cmd=="rss" ? botData.configs[cmd][0] : botData.configs[cmd]) ? "checked " : "") + "/><label for=\"commandsentry-" + cmd + "\">" + cmd + "&nbsp;" + (nsfwcmds.indexOf(cmd)>-1 ? "<span class=\"label label-danger newlabel\">NSFW</span>&nbsp;" : "") + (newcmds.indexOf(cmd)>-1 ? "<span class=\"label label-info newlabel\">New</span>&nbsp;" : "") + "&nbsp;<p class=\"help-block\" style=\"display:inline\">" + descs[cmd] + "</p></label>&nbsp;&nbsp;<select id=\"" + cmd + "-admincommands-select\" onChange=\"javascript:config('admincommands', '" + cmd + "', switchCommands);\" class=\"selectpicker show-tick\" data-width=\"fit\"><option" + (botData.configs.admincommands.indexOf(cmd)==-1 ? " selected" : "") + ">Everyone</option><option" + (botData.configs.admincommands.indexOf(cmd)>-1 ? " selected" : "") + ">Admins only</option></select>&nbsp;<select id=\"" + cmd + "-chrestrict-select\" onChange=\"javascript:config('chrestrict', ['" + cmd + "', $('#' + this.id).val()], switchCommands);\" title=\"Select Channels\" class=\"selectpicker show-tick\" data-width=\"auto\" data-selected-text-format=\"count\" multiple  data-actions-box=\"true\">" + cmdchannelselect + "</select></div>");
        }
    }
    commands.sort();
    $("#commands-container").html(commands.join(''));

    for(var cmd in botData.configs) {
        if(blacklist.indexOf(cmd)==-1) {
            if((cmd=="rss" && botData.configs[cmd][0]) || botData.configs[cmd]) {
                document.getElementById(cmd + "-admincommands-select").removeAttribute("disabled");
                document.getElementById(cmd + "-chrestrict-select").removeAttribute("disabled");
            } else {
                document.getElementById(cmd + "-admincommands-select").setAttribute("disabled", "disable");
                document.getElementById(cmd + "-chrestrict-select").setAttribute("disabled", "disable");
            }
            $("#" + cmd + "-admincommands-select").selectpicker("refresh");

            var enabledChannels = [];
            for(var i=0; i<botData.channels.length; i++) {
                if(botData.configs.chrestrict[botData.channels[i][1]] && botData.configs.chrestrict[botData.channels[i][1]].indexOf(cmd)>-1) {
                    continue;
                }
                enabledChannels.push(botData.channels[i][1]);
            }
            $("#" + cmd + "-chrestrict-select").val(enabledChannels);
            $("#" + cmd + "-chrestrict-select").selectpicker("refresh");
        }
    }


    document.getElementById("commandtag-tag").innerHTML = "@" + botData.botnm;
    document.getElementById("commandtag-selector").value = botData.configs.cmdtag;
    $("#commandtag-selector").selectpicker("refresh");

    $('a[href^="#"]').click(function(e) {
        e.preventDefault();
        if(this.hash!="#menu-toggle") {
            var target = this.hash, $target = $(target);
            $('html, body').stop().animate({
                'scrollTop': $target.offset().top
            }, 900, 'swing', function() {
                window.location.hash = target;
            });
        }
    });

    document.getElementById("commands-defaultcount").value = botData.configs.defaultcount;
    document.getElementById("commands-maxcount").value = botData.configs.maxcount;

    document.getElementById("commands-cooldown").checked = botData.configs.cooldown!=0;
    document.getElementById("commands-cooldown-select").value = botData.configs.cooldown;
    if(botData.configs.cooldown==0) {
        document.getElementById("commands-cooldown-select").setAttribute("disabled", "disable");
        $("#commands-cooldown-select").selectpicker("refresh");
    } else {
        document.getElementById("commands-cooldown-select").removeAttribute("disabled");
        $("#commands-cooldown-select").selectpicker("refresh");
    }
    
    document.getElementById("api-google-input").value = botData.configs.customkeys.google_api_key;
    if(!botData.configs.customkeys.google_api_key) {
        document.getElementById("api-google-default").style.display = "none";
    } else {
        document.getElementById("api-google-default").style.display = "";
    }
    document.getElementById("api-custom-input").value = botData.configs.customkeys.custom_search_id;
    if(!botData.configs.customkeys.custom_search_id) {
        document.getElementById("api-custom-default").style.display = "none";
    } else {
        document.getElementById("api-custom-default").style.display = "";
    }
}

function resetConfigs() {
    config("preset", "default", function(err) {
        if(!err) {
            location.reload();
        }
    });
}

function switchManage() {
    document.getElementById("manageentry-servermod").checked = botData.configs.servermod;
    
    document.getElementById("manageentry-autoprune").checked = botData.configs.autoprune[0];
    document.getElementById("manageentry-select-autoprune").value = botData.configs.autoprune[1];
    if(!botData.configs.autoprune[0] || !botData.configs.servermod) {
        document.getElementById("manageentry-select-autoprune").setAttribute("disabled", "disable");
        $("#manageentry-select-autoprune").selectpicker("refresh");
    } else {
        document.getElementById("manageentry-select-autoprune").removeAttribute("disabled");
        $("#manageentry-select-autoprune").selectpicker("refresh");
    }

    if(!botData.configs.ranks) {
        document.getElementById("rankmembermsg").style.display = "none";
    } else {
        document.getElementById("rankmembermsg").style.display = "";
    }
    
    var membermsg = ["newmembermsg", "onmembermsg", "offmembermsg", "changemembermsg", "twitchmembermsg", "rankmembermsg", "editmembermsg", "deletemembermsg", "rmmembermsg", "banmembermsg", "unbanmembermsg"];
    for(var i=0; i<membermsg.length; i++) {
        document.getElementById("manageentry-" + membermsg[i]).checked = botData.configs[membermsg[i]][0];
        if(botData.configs[membermsg[i]][0]) {
            var manageentry_select = ""; 
            for(var j=0; j<botData.channels.length; j++) {
                manageentry_select += "<option value=\"" + botData.channels[j][1] + "\">#" + botData.channels[j][0] + "</option>";
            }
            document.getElementById("manageentry-select-" + membermsg[i]).innerHTML = manageentry_select;
            if(["editmembermsg", "deletemembermsg"].indexOf(membermsg[i])>-1) {
                $("#manageentry-select-" + membermsg[i]).val(botData.configs[membermsg[i]][1]);
            } else {
                document.getElementById("manageentry-select-" + membermsg[i]).value = (["changemembermsg", "twitchmembermsg", "rankmembermsg"].indexOf(membermsg[i])>-1 ? botData.configs[membermsg[i]][1] : botData.configs[membermsg[i]][2]);
            }
            document.getElementById("manageentry-select-" + membermsg[i]).removeAttribute("disabled");
            $("#manageentry-select-" + membermsg[i]).selectpicker("refresh");

            if(membermsg[i]=="rankmembermsg") {
                document.getElementById("manageentry-select-pm-" + membermsg[i]).value = botData.configs.rankmembermsg[2] ? "pms" : "messages";
                document.getElementById("manageentry-select-pm-" + membermsg[i]).removeAttribute("disabled");
                $("#manageentry-select-pm-" + membermsg[i]).selectpicker("refresh");
            }
            
            if(["changemembermsg", "rankmembermsg", "twitchmembermsg", "editmembermsg", "deletemembermsg"].indexOf(membermsg[i])==-1) {
                var current_block = "";
                for(var j=0; j<botData.configs[membermsg[i]][1].length; j++) {
                    current_block += "<div class=\"checkbox\">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<input type=\"checkbox\" onclick=\"javascript:config('" + membermsg[i] + "', this.value, function() {});\" id=\"manageentry-" + membermsg[i] + "-" + j + "\" value=\"" + botData.configs[membermsg[i]][1][j] + "\" checked><label for=\"manageentry-" + membermsg[i] + "-" + j + "\">" + botData.configs[membermsg[i]][1][j].replace("++", "<b>@user</b>") + "</label></div>";
                }
                document.getElementById("manageentry-" + membermsg[i] + "-block").innerHTML = current_block;
                document.getElementById(membermsg[i] + "-input").value = "";
                $("#manageentry-" + membermsg[i] + "-body").collapse("show");
            }
        } else {
            document.getElementById("manageentry-select-" + membermsg[i]).setAttribute("disabled", "disable");
            $("#manageentry-select-" + membermsg[i]).selectpicker("refresh");
            if(membermsg[i]=="rankmembermsg") {
                document.getElementById("manageentry-select-pm-" + membermsg[i]).setAttribute("disabled", "disable");
                $("#manageentry-select-pm-" + membermsg[i]).selectpicker("refresh");
            }
            if(membermsg[i]!="changemembermsg") {
                $("#manageentry-" + membermsg[i] + "-body").collapse("hide");
            }
        }
    }
    
    if(!document.getElementById("manageentry-select-newrole").innerHTML) {
        var newrole = "";
        for(var i=botData.roles.length-1; i>=0; i--) {
            newrole += "<option id=\"newroleentry-" + botData.roles[i][1] + "\" value=\"" + botData.roles[i][1] + "\" style=\"color: " + botData.roles[i][3] + ";\">" + botData.roles[i][0] + "</option>";
        }
        document.getElementById("manageentry-select-newrole").innerHTML = newrole;
    }
    $("#manageentry-select-newrole").val(botData.configs.newrole);
    $("#manageentry-select-newrole").selectpicker("refresh");
    
    document.getElementById("manageentry-spamfilter").checked = botData.configs.spamfilter[0];
    if(botData.configs.spamfilter[0]) {
        if(!document.getElementById("manageentry-spamfilter-block").innerHTML) {
            var spamfilter_block = "";
            for(var i=0; i<botData.channels.length; i++) {
                spamfilter_block += "<div class=\"checkbox\">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<input type=\"checkbox\" id=\"manageentry-spamfilter-" + botData.channels[i][1] + "\" onclick=\"javascript:config('spamfilter', this.id.substring(23), function() {});\"" + (botData.configs.spamfilter[1].indexOf(botData.channels[i][1])==-1 ? " checked" : "") + "><label for=\"manageentry-spamfilter-" + botData.channels[i][1] + "\">#" + botData.channels[i][0] + "</label></div>";
            }
            document.getElementById("manageentry-spamfilter-block").innerHTML = spamfilter_block;
        }
        $("#manageentry-spamfilter-body").collapse("show");
    } else {
        $("#manageentry-spamfilter-body").collapse("hide");
    }
    switch(botData.configs.spamfilter[2]) {
        case 10:
            document.getElementById("manageentry-spamfilter-selector").value = "low";
            break;
        case 5:
            document.getElementById("manageentry-spamfilter-selector").value = "medium";
            break;
        case 3:
            document.getElementById("manageentry-spamfilter-selector").value = "high";
            break;
    }
    document.getElementById("manageentry-spamfilter-action").value = botData.configs.spamfilter[3];
    var spamfilter_role = "<option value=\"role-\">Role for violators</option>";
    for(var i=botData.roles.length-1; i>=0; i--) {
        spamfilter_role += "<option value=\"role-" + botData.roles[i][1] + "\" style=\"color: " + botData.roles[i][3] + ";\">" + botData.roles[i][0] + "</option>";
    }
    document.getElementById("manageentry-spamfilter-role").innerHTML = spamfilter_role;
    document.getElementById("manageentry-spamfilter-role").value = "role-" + botData.configs.spamfilter[4];
    document.getElementById("manageentry-spamfilter-delete").checked = botData.configs.spamfilter[5];
    
    document.getElementById("manageentry-nsfwfilter").checked = botData.configs.nsfwfilter[0];
    if(botData.configs.nsfwfilter[0]) {
        if(!document.getElementById("manageentry-nsfwfilter-block").innerHTML) {
            var nsfwfilter_block = "";
            for(var i=0; i<botData.channels.length; i++) {
                nsfwfilter_block += "<div class=\"checkbox\">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<input type=\"checkbox\" id=\"manageentry-nsfwfilter-" + botData.channels[i][1] + "\" onclick=\"javascript:config('nsfwfilter', this.id.substring(23), function() {});\"" + (botData.configs.nsfwfilter[1].indexOf(botData.channels[i][1])==-1 ? " checked" : "") + "><label for=\"manageentry-nsfwfilter-" + botData.channels[i][1] + "\">#" + botData.channels[i][0] + "</label></div>";
            }
            document.getElementById("manageentry-nsfwfilter-block").innerHTML = nsfwfilter_block;
        }
        $("#manageentry-nsfwfilter-body").collapse("show");
    } else {
        $("#manageentry-nsfwfilter-body").collapse("hide");
    }
    document.getElementById("manageentry-nsfwfilter-action").value = botData.configs.nsfwfilter[2];
    var nsfwfilter_role = "<option value=\"role-\">Role for violators</option>";
    for(var i=botData.roles.length-1; i>=0; i--) {
        nsfwfilter_role += "<option value=\"role-" + botData.roles[i][1] + "\" style=\"color: " + botData.roles[i][3] + ";\">" + botData.roles[i][0] + "</option>";
    }
    document.getElementById("manageentry-nsfwfilter-role").innerHTML = nsfwfilter_role;
    document.getElementById("manageentry-nsfwfilter-role").value = "role-" + botData.configs.nsfwfilter[3];
    document.getElementById("manageentry-nsfwfilter-delete").checked = botData.configs.nsfwfilter[4];
    
    disableBlock("manageentry-servermod-block", !botData.configs.servermod);
    if(!botData.configs.servermod) {
        document.getElementById("manageentry-spamfilter-selector").setAttribute("disabled", "disable");
        document.getElementById("manageentry-spamfilter-action").setAttribute("disabled", "disable");
        document.getElementById("manageentry-spamfilter-role").setAttribute("disabled", "disable");
        document.getElementById("manageentry-nsfwfilter-action").setAttribute("disabled", "disable");
        document.getElementById("manageentry-nsfwfilter-role").setAttribute("disabled", "disable");
    } else {
        document.getElementById("manageentry-spamfilter-selector").removeAttribute("disabled");
        document.getElementById("manageentry-spamfilter-action").removeAttribute("disabled");
        document.getElementById("manageentry-spamfilter-role").removeAttribute("disabled");
        document.getElementById("manageentry-nsfwfilter-action").removeAttribute("disabled");
        document.getElementById("manageentry-nsfwfilter-role").removeAttribute("disabled");
    }
    if(!botData.configs.spamfilter[0]) {
        document.getElementById("manageentry-spamfilter-action").setAttribute("disabled", "disable");
    }
    if(!botData.configs.nsfwfilter[0]) {
        document.getElementById("manageentry-nsfwfilter-action").setAttribute("disabled", "disable");
    }
    $("#manageentry-spamfilter-selector").selectpicker("refresh");
    $("#manageentry-spamfilter-action").selectpicker("refresh");
    $("#manageentry-spamfilter-role").selectpicker("refresh");
    $("#manageentry-nsfwfilter-action").selectpicker("refresh");
    $("#manageentry-nsfwfilter-role").selectpicker("refresh");
    
    document.getElementById("manageentry-newgreeting").style.display = "";
    if(botData.configs.newgreeting && botData.configs.newmemberpm && botData.configs.servermod) {
        document.getElementById("newgreetingremove").style.display = "";
        document.getElementById("newgreetinginput").value = botData.configs.newgreeting;
    } else if(!botData.configs.servermod || !botData.configs.newmemberpm) {
        document.getElementById("manageentry-newgreeting").style.display = "none";
    } else {
        document.getElementById("newgreetingremove").style.display = "none";
        document.getElementById("newgreetinginput").value = "";
    }
    
    var filterstr = botData.configs.filter[0].join();
    document.getElementById("manageentry-filter").style.display = "";
    document.getElementById("manageentry-filter-action").value = botData.configs.filter[1];
    $("#manageentry-filter-action").selectpicker("refresh");
    var filter_role = "<option value=\"role-\">Role for violators</option>";
    for(var i=botData.roles.length-1; i>=0; i--) {
        filter_role += "<option value=\"role-" + botData.roles[i][1] + "\" style=\"color: " + botData.roles[i][3] + ";\">" + botData.roles[i][0] + "</option>";
    }
    document.getElementById("manageentry-filter-role").innerHTML = filter_role;
    document.getElementById("manageentry-filter-role").value = "role-" + botData.configs.filter[2];
    $("#manageentry-filter-role").selectpicker("refresh");
    document.getElementById("manageentry-filter-delete").checked = botData.configs.filter[3];
    if(filterstr && botData.configs.servermod) {
        document.getElementById("filterremove").style.display = "";
        document.getElementById("filterinput").value = filterstr;
    } else if(!botData.configs.servermod) {
        document.getElementById("manageentry-filter").style.display = "none";
    } else {
        document.getElementById("filterremove").style.display = "none";
        document.getElementById("filterinput").value = "";
    }
    
    document.getElementById("manageentry-usenicks").checked = botData.configs.usenicks;
    document.getElementById("manageentry-usediscriminators").checked = botData.configs.usediscriminators;

    document.getElementById("manageentry-role").checked = botData.configs.role;
    document.getElementById("manageentry-customcolors").checked = botData.configs.customcolors;
    document.getElementById("manageentry-customroles").checked = botData.configs.customroles[0];
    if(botData.configs.customroles[0]) {
        if(!document.getElementById("manageentry-customroles-block").innerHTML) {
            var customroles_block = "";
            for(var i=botData.roles.length-1; i>=0; i--) {
                customroles_block += "<div class=\"checkbox\">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<input type=\"checkbox\" id=\"manageentry-customroles-" + botData.roles[i][1] + "\" onclick=\"javascript:config('customroles', this.id.substring(24), function() {});\"" + (botData.configs.customroles[1].indexOf(botData.roles[i][1])>-1 ? " checked" : "") + "><label style=\"color: " + botData.roles[i][3] + ";\" for=\"manageentry-customroles-" + botData.roles[i][1] + "\">" + botData.roles[i][0] + "</label></div>";
            }
            customroles_block += "<div class=\"checkbox\">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<input id=\"manageentry-customroles-custom\" type=\"checkbox\" onclick=\"javascript:config('customroles', 'custom', function() {});\"" + (botData.configs.customroles[2] ? " checked" : "") + "><label for=\"manageentry-customrkoles-custom\">Custom roles</label></div>"
            document.getElementById("manageentry-customroles-block").innerHTML = customroles_block;
        }
        $("#manageentry-customroles-body").collapse("show");
    } else {
        $("#manageentry-customroles-body").collapse("hide");
    }
    disableBlock("manageentry-role-block", !botData.configs.role)
    
    if(botData.polls.length>0) {
        document.getElementById("manageentry-polls").style.display = "";
        var manageentry_polls_block = "";
        for(var i=0; i<botData.polls.length; i++) {
            manageentry_polls_block += "<li>" + botData.polls[i][1] + "&nbsp;<button type=\"button\" class=\"btn btn-danger btn-xs\" id=\"manageentry-polls-" + botData.polls[i][0] + "\" onclick=\"javascript:config('closepoll', this.id.substring(18), function() {});\">Close</button></li>";
        }
        document.getElementById("manageentry-polls-block").innerHTML = manageentry_polls_block;
    } else {
        document.getElementById("manageentry-polls").style.display = "none";
    }
    
    if(botData.trivia.length>0) {
        document.getElementById("manageentry-trivia").style.display = "";
        var manageentry_trivia_block = "";
        for(var i=0; i<botData.trivia.length; i++) {
            manageentry_trivia_block += "<li>" + botData.trivia[i][1] + "&nbsp;<button type=\"button\" class=\"btn btn-danger btn-xs\" id=\"manageentry-trivia-" + botData.trivia[i][0] + "\" onclick=\"javascript:config('endtrivia', this.id.substring(19), function() {});\">End</button></li>";
        }
        document.getElementById("manageentry-trivia-block").innerHTML = manageentry_trivia_block;
    } else {
        document.getElementById("manageentry-trivia").style.display = "none";
    }

    if(botData.giveaways.length>0) {
        document.getElementById("manageentry-giveaways").style.display = "";
        var manageentry_giveaways_block = "";
        for(var i=0; i<botData.trivia.length; i++) {
            manageentry_giveaways_block += "<li>" + botData.giveaways[i][1] + "&nbsp;<button type=\"button\" class=\"btn btn-danger btn-xs\" id=\"manageentry-giveaways-" + botData.giveaways[i][0] + "\" onclick=\"javascript:config('endgiveaway', this.id.substring(22), function() {});\">End</button></li>";
        }
        document.getElementById("manageentry-giveaways-block").innerHTML = manageentry_giveaways_block;
    } else {
        document.getElementById("manageentry-giveaways").style.display = "none";
    }
    
    if(!document.getElementById("caselector").innerHTML) {
        var caselector = ""; 
        for(var i=0; i<botData.channels.length; i++) {
            caselector += "<option id=\"caentry-" + botData.channels[i][1] + "\" value=\"" + botData.channels[i][1] + "\">#" + botData.channels[i][0] + "</option>";
        }
        document.getElementById("caselector").innerHTML = caselector;
        $("#caselector").selectpicker("refresh");
    }
}

function switchPublic() {
    document.getElementById("publicentry-showsvr").checked = botData.configs.showsvr;
    document.getElementById("publicentry-showpub").checked = botData.configs.showpub;

    document.getElementById("publicentry-enable-listing").checked = botData.configs.listing.enabled;
    document.getElementById("publicentry-description-listing").value = botData.configs.listing.description;
    document.getElementById("publicentry-description").style.display = "";
    if(!botData.configs.listing.enabled || !botData.configs.showsvr) {
        document.getElementById("publicentry-description").style.display = "none";
    }

    disableBlock("public-showsvr-block", !botData.configs.showsvr);
}

function disableBlock(blockname, disable) {
    var inputs = document.getElementById(blockname).getElementsByTagName("input");
    for(var i=0; i<inputs.length; i++) {
        if(disable) {
            inputs[i].setAttribute("disabled", "disable");
        } else {
            inputs[i].removeAttribute("disabled");
        }
    }
    var buttons = document.getElementById(blockname).getElementsByClassName("btn");
    for(var i=0; i<buttons.length; i++) {
        if(disable) {
            buttons[i].setAttribute("disabled", "disable");
        } else {
            buttons[i].removeAttribute("disabled");
        }
    }
}

function configNewgreeting(content) {
    if(!content && !botData.configs.newgreeting) {
        richModal("New member greeting cannot be blank");
    } else {
        config("newgreeting", content, function() {});
    }
}

function configFilter(content) {
    var words;
    if(content) {
        words = content.split(",");
        if(words) {
            for(var i=0; i<words.length; i++) {
                words[i] = words[i].trim();
            }
        } else {
            words = [content];
        }
    } else {
        words = [];
    }
    config("filter", words, function() {});
}

function configCA(type) {
    if(!document.getElementById("cainput").value) {
        $("#cainput-block").addClass("has-error");
        return;
    }
    
    $("#cainput-block").addClass("remove-error");
    if(["clean", "purge"].indexOf(type)>-1) {
        config(type, [document.getElementById("caselector").value, parseInt(document.getElementById("cainput").value)], function(err) {
            if(err) {
                richModal("Error trying to " + type + " messages");
            } else {
                richModal((type=="clean" ? "Cleaned" : "Purged") + " " + parseInt(document.getElementById("cainput").value) + " messages in " + document.getElementById("caentry-" + document.getElementById("caselector").value).innerHTML, "Info");
            }
        });
    } else if(type=="archive") {
        NProgress.start();
        getJSON("archive?auth=" + authtoken + "&type=" + authtype + "&svrid=" + JSON.parse(localStorage.getItem("auth")).svrid + "&chid=" + document.getElementById("caselector").value + "&num=" + parseInt(document.getElementById("cainput").value), function(archive) {
            window.open("data:text/json;charset=utf-8," + escape(JSON.stringify(archive, null, 2)));
            NProgress.done();
        });
    }
}

function switchTriviaSets() {
    document.getElementById("triviasetstable").style.display = "";
    
    var triviasetstablebody = "";
    for(var i=0; i<botData.configs.triviasets.length; i++) {
        triviasetstablebody += "<tr id=\"triviasetsentry-" + encodeURI(botData.configs.triviasets[i][0]) + "\"><td>" + botData.configs.triviasets[i][0] + "</td><td>" + botData.configs.triviasets[i][1] + "</td><td><button type=\"button\" class=\"btn btn-default btn-xs\" onclick=\"javascript:showTriviaSet(" + i + ");\"><span class=\"glyphicon glyphicon-eye-open\" aria-hidden=\"true\"></span> View</button>&nbsp;<button type=\"button\" class=\"btn btn-danger btn-xs\" onclick=\"javascript:config('triviasets', this.parentNode.parentNode.id.substring(16), switchTriviaSets);\"><span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span> Remove</button></td></tr>";
    }
    document.getElementById("triviasetstablebody").innerHTML = triviasetstablebody;
    if(botData.configs.triviasets.length==0) {
        document.getElementById("triviasetstable").style.display = "none";
    }
}

function showTriviaSet(i) {
    window.open("data:text/json;charset=utf-8," + escape(JSON.stringify(botData.configs.triviasets[i][2], null, 2)));
}

function newTriviaSet(uploads) {
    if(!uploads) {
        richModal("Upload a file and enter a name");
        return;
    }
    
    var reader = new FileReader();
    reader.onload = function(event) {
        try {
            var tset = JSON.parse(event.target.result);
            config("triviasets", tset, function(err) {
                if(err) {
                    richModal("Error adding trivia set, see logs for details");
                } else {
                    switchTriviaSets();
                }
            });
        } catch(err) {
            richModal("File must be JSON format");
        }
    };
    reader.readAsText(uploads[0]);
    
    document.getElementById("triviasetsupload").value = null;
}

function leaveServer() {
    config("leave", true, function(err) {
        localStorage.removeItem("auth");
        document.location.replace("");
    });
}

function switchExtensions() {
    document.getElementById("extensionstable").style.display = "";
    
    var extensionstablebody = "";
    for(var ext in botData.configs.extensions) {
        extensionstablebody += "<tr id=\"extensionsentry-" + encodeURI(botData.configs.extensions[ext].name) + "\"><td>" + botData.configs.extensions[ext].name + "</td><td>" + botData.configs.extensions[ext].type.charAt(0).toUpperCase() + botData.configs.extensions[ext].type.slice(1) + "</td><td>" + botData.configs.extensions[ext].channels.length + "</td><td><button type=\"button\" class=\"btn btn-default btn-xs\" onclick=\"javascript:launchBuilder('" + ext + "');\"><span class=\"glyphicon glyphicon-pencil\" aria-hidden=\"true\"></span> Edit</button>&nbsp;<button type=\"button\" class=\"btn btn-danger btn-xs\" onclick=\"javascript:config('extensions', this.parentNode.parentNode.id.substring(16), switchExtensions);\"><span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span> Remove</button></td></tr>";
    }
    document.getElementById("extensionstablebody").innerHTML = extensionstablebody;
    if(Object.keys(botData.configs.extensions).length==0) {
        document.getElementById("extensionstable").style.display = "none";
    }
}

function launchBuilder(ext) {
    $("#extensionbuilder").modal("show");

    var extensionbuilder_select_channels = "";
    for(var i=0; i<botData.channels.length; i++) {
        extensionbuilder_select_channels += "<option id=\"extensionbuilder-channel-" + botData.channels[i][1] + "\" value=\"" + botData.channels[i][1] + "\">#" + botData.channels[i][0] + "</option>";
    }
    document.getElementById("extensionbuilder-select-channels").innerHTML = extensionbuilder_select_channels;
    $("#extensionbuilder-select-channels").selectpicker("refresh");

    if(ext) {
        ext = botData.configs.extensions[ext];
        document.getElementById("extensionbuilder-input-name").value = ext.name;
        document.getElementById("extensionbuilder-input-name").setAttribute("disabled", "disable");
        $("#extensionbuilder-select-channels").val(ext.channels);
        $("#extensionbuilder-select-channels").selectpicker("refresh");
        document.getElementById("extensionbuilder-select-type").value = ext.type;
        $("#extensionbuilder-select-type").selectpicker("refresh");
        switchBuilderType(ext.type);
        switch(ext.type) {
            case "command":
                document.getElementById("extensionbuilder-input-commandkey").value = ext.key;
                document.getElementById("extensionbuilder-input-usage").value = ext.usage || "";
                document.getElementById("extensionbuilder-input-extended").value = ext.usage || "";
                break;
            case "keyword":
                document.getElementById("extensionbuilder-input-keywordkey").value = ext.key.join();
                document.getElementById("extensionbuilder-select-case").checked = ext.case;
                break;
            case "timer":
                document.getElementById("extensionbuilder-input-interval").value = ext.interval;
                break;
        }
        cm.getDoc().setValue(ext.process.replaceAll("<!--AWESOME_EXTENSION_NEWLINE-->", "\n"));
        setTimeout(function() {
            cm.refresh();
        }, 1000);
    } else {
        document.getElementById("extensionbuilder-input-name").removeAttribute("disabled");
    }
}

String.prototype.replaceAll = function(target, replacement) {
    return this.split(target).join(replacement);
};

function switchBuilderType(type) {
    document.getElementById("extensionbuilder-type-block").innerHTML = document.getElementById("extensionbuilder-type-" + type).innerHTML;
}

function uploadToBuilder(uploads) {
    if(uploads) {
        var reader = new FileReader();
        reader.onload = function(event) {
            cm.getDoc().setValue(event.target.result);
        };
        reader.readAsText(uploads[0]);
        document.getElementById("extensionbuilder-file").value = null;
    }
}

function downloadFromBuilder() {
    window.open("data:application/javascript;charset=utf-8," + escape(cm.getValue()));
}

function insertBuilderShortcut(type) {
    var codeToInsert = "";
    switch(type) {
        case "writeStore":
            codeToInsert += "store = writeStore(\"/*key*/\", /*value*/);";
            break;
        case "sendMessage":
            codeToInsert += "ch.sendMessage(\"/*message*/\");";
            break;
        case "sendUser":
            codeToInsert += "bot.sendUser(\"/*user id*/\", \"/*message*/\");";
            break;
        case "image":
            codeToInsert += "image(\"/*query*/\", /*num*/, function(image) {\n    //code\n});";
            break;
        case "gif":
            codeToInsert += "gif(\"/*query*/\", null, function(imageid) {\n    //code\n});";
            break;
        case "rss":
            codeToInsert += "rss(\"/*url*/\", /*count*/, function(error, articles) {\n    //code\n});";
            break;
        case "unirest":
            codeToInsert += "unirest.get(\"/*url*/\").header(\"Accept\", \"application/json\").end(function(response) {\n    //code\n});";
            break;
        case "userSearch":
            codeToInsert += "svr.userSearch(\"/*string*/\");";
            break;
        case "svr.members":
            codeToInsert += "svr.members[\"/*user id*/\"]";
            break;
        case "svr.createChannel":
            codeToInsert += "svr.createChannel(\"/*name*/\");";
            break;
        case "svr.roles.create":
            codeToInsert += "svr.roles.create({\n    //options\n});";
            break;
    }
    cm.replaceSelection(codeToInsert);
    cm.focus();
}

function packageBuilderContent() {
    var isComplete = true;
    if(!document.getElementById("extensionbuilder-input-name").value) {
        isComplete = false;
        $("#extensionbuilder-input-name-block").addClass("has-error");
    } else {
        $("#extensionbuilder-input-name-block").removeClass("has-error");
    }
    if(!$("#extensionbuilder-select-channels").val() || $("#extensionbuilder-select-channels").val().length==0) {
        isComplete = false;
        richModal("Select at least one channel");
    }
    switch(document.getElementById("extensionbuilder-select-type").value) {
        case "command":
            if(!document.getElementById("extensionbuilder-input-commandkey").value || document.getElementById("extensionbuilder-input-commandkey").value.indexOf(" ")>-1 || !(new RegExp("^[a-zA-Z0-9.]*$").test(document.getElementById("extensionbuilder-input-commandkey").key))) {
                isComplete = false;
                $("#extensionbuilder-input-commandkey-block").addClass("has-error");
            } else {
                $("#extensionbuilder-input-commandkey-block").removeClass("has-error");
            }
            break;
        case "keyword":
            var keywordkeyIsComplete = true;
            for(var i=0; i<document.getElementById("extensionbuilder-input-keywordkey").value.split(",").length; i++) {
                if(!document.getElementById("extensionbuilder-input-keywordkey").value.split(",")[i] || document.getElementById("extensionbuilder-input-keywordkey").value.split(",").lastIndexOf(document.getElementById("extensionbuilder-input-keywordkey").value.split(",")[i])!=i) {
                    keywordkeyIsComplete = false;
                }
            }
            if(!document.getElementById("extensionbuilder-input-keywordkey").value || !keywordkeyIsComplete) {
                isComplete = false;
                $("#extensionbuilder-input-keywordkey-block").addClass("has-error");
            } else {
                $("#extensionbuilder-input-keywordkey-block").removeClass("has-error");
            }
            break;
        case "timer":
            if(!document.getElementById("extensionbuilder-input-interval").value) {
                isComplete = false;
                $("#extensionbuilder-input-interval-block").addClass("has-error");
            } else {
                $("#extensionbuilder-input-interval-block").removeClass("has-error");
            }
            break;
        default:
            isComplete = false;
            richModal("Select a type");
            break;
    }
    if(!cm.getValue()) {
        isComplete = false;
        richModal("Type some code or upload a JS file");
    }
    if(isComplete) {
        var packagedExtension = {
            name: document.getElementById("extensionbuilder-input-name").value,
            type: document.getElementById("extensionbuilder-select-type").value,
            channels: $("#extensionbuilder-select-channels").val(),
            process: cm.getValue().replaceAll(";\n", ";<!--AWESOME_EXTENSION_NEWLINE-->")
        }
        switch(document.getElementById("extensionbuilder-select-type").value) {
            case "command":
                packagedExtension.key = document.getElementById("extensionbuilder-input-commandkey").value;
                packagedExtension.usage = document.getElementById("extensionbuilder-input-usage").value;
                packagedExtension.extended = document.getElementById("extensionbuilder-input-extended").value;
                break;
            case "keyword":
                packagedExtension.key = document.getElementById("extensionbuilder-input-keywordkey").value.split(",");
                packagedExtension.case = document.getElementById("extensionbuilder-select-case").checked;
                break;
            case "timer":
                packagedExtension.interval = parseInt(document.getElementById("extensionbuilder-input-interval").value);
                break;
        }
        return packagedExtension;
    }
    return;
}

function runBuilderContent() {
    var packagedExtension = packageBuilderContent();
    if(packagedExtension) {
        var extensionbuilder_run_channel = "";
        for(var i=0; i<packagedExtension.channels.length; i++) {
            for(var j=0; j<botData.channels.length; j++) {
                if(botData.channels[j][1]==packagedExtension.channels[i]) {
                    extensionbuilder_run_channel += "<option value=\"" + botData.channels[j][1] + "\">#" + botData.channels[j][0] + "</option>";
                }
            }
        }
        document.getElementById("extensionbuilder-run-channel").innerHTML = extensionbuilder_run_channel;
        document.getElementById("extensionbuilder-run-channel").value = packagedExtension.channels[0];
        $("#extensionbuilder-run-channel").selectpicker("refresh");
        if(packagedExtension.type=="timer") {
            document.getElementById("extensionbuilder-run-input").style.display = "none";
        } else {
            document.getElementById("extensionbuilder-run-input").style.display = "";
            document.getElementById("extensionbuilder-run-prefix").innerHTML = botData.configs.cmdtag=="tag" ? ("@" + botData.botnm) : botData.configs.cmdtag;
            document.getElementById("extensionbuilder-run-message").value = "";
        }
        document.getElementById("extensionbuilder-run-content").style.display = "inline";
        document.getElementById("extensionbuilder-button-run").onclick = function() {
            runExtension(document.getElementById("extensionbuilder-run-message").value)
        };
    }
}

function runExtension(message) {
    var packagedExtension = packageBuilderContent();
    if(packagedExtension) {
        if(!message && packagedExtension.type!="timer") {
            $("#extensionbuilder-run-message-block").addClass("has-error");
        } else {
            document.getElementById("extensionbuilder-run-content").style.display = "none";
            NProgress.start();
            $("#extensionbuilder-run-message-block").removeClass("has-error");
            document.getElementById("extensionbuilder-button-run").setAttribute("disabled", "disable");

            postExtension({
                extension: packagedExtension,
                message: packagedExtension.type!="timer" ? {
                    content: (botData.configs.cmdtag=="tag" ? ("<@" + botData.usrid + "> ") : botData.configs.cmdtag) + document.getElementById("extensionbuilder-run-message").value,
                    cleanContent: (botData.configs.cmdtag=="tag" ? ("@" + botData.botnm + " ") : botData.configs.cmdtag) + document.getElementById("extensionbuilder-run-message").value
                } : null
            }, "test", document.getElementById("extensionbuilder-run-channel").value, function(response) {
                if(!response) {
                    response = {
                        isValid: false,
                        extensionLog: ["FATAL: Something went wrong"]
                    }
                }

                document.getElementById("extensionbuilder-button-run").removeAttribute("disabled");
                document.getElementById("extensionbuilder-button-run").onclick = runBuilderContent;
                document.getElementById("extensionbuilder-output-body").innerHTML = response.extensionLog.join("<br>");
                $("#extensionbuilder-button-output").removeClass("btn-default");
                $("#extensionbuilder-button-output").addClass(response.isValid ? "btn-success" : "btn-danger");
                $("#extensionbuilder-button-output").tooltip("show");
                if(response.isValid) {
                    document.getElementById("extensionbuilder-button-save").style.display = "";
                } else {
                    document.getElementById("extensionbuilder-button-save").style.display = "none";
                }
                NProgress.done();
            });
        }
    }
}

function addExtension() {
    var packagedExtension = packageBuilderContent();
    if(packagedExtension) {
        NProgress.start();
        document.getElementById("extensionbuilder-button-save").setAttribute("disabled", "disable");

        postExtension({
            extension: packagedExtension
        }, "final", null, function(response) {
            if(!response) {
                response = {
                    isValid: false,
                    extensionLog: ["FATAL: Something went wrong"]
                }
            }

            document.getElementById("extensionbuilder-button-save").removeAttribute("disabled");
            document.getElementById("extensionbuilder-output-body").innerHTML = response.extensionLog.join("<br>");
            $("#extensionbuilder-button-output").removeClass("btn-default");
            $("#extensionbuilder-button-output").addClass(response.isValid ? "btn-success" : "btn-danger");
            $("#extensionbuilder-button-output").tooltip("show");
            if(response.isValid) {
                document.getElementById("extensionbuilder-button-save").style.display = "none";
                getJSON("data/?auth=" + authtoken + "&type=" + authtype, function(mData) {
                    if(Object.keys(mData).length>0) {
                        clearTimeout(consoletimer);
                        setAuthTimer();
                        botData = mData;
                        switchExtensions();
                    } else {
                        leaveConsole("Session timeout");
                    }
                    NProgress.done();
                });
            } else {
                NProgress.done();
            }
        });
    }
}

function postExtension(data, type, chid, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("post", "extension?auth=" + authtoken + "&svrid=" + JSON.parse(localStorage.getItem("auth")).svrid + "&type=" + type + (type=="test" ? ("&chid=" + chid) : ""), true);
    xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    xhr.send(JSON.stringify(data));
    xhr.onloadend = function() {
        if(xhr.status==200) {
            callback(JSON.parse(xhr.response));
        } else {
            callback(null);
        }
    };
}

function closeBuilder() {
    $("#extensionbuilder-button-output").popover("hide");
    $("#extensionbuilder").modal("hide");
    document.getElementById("extensionbuilder-input-name").value = "";
    $("#extensionbuilder-select-channels").val([]);
    document.getElementById("extensionbuilder-select-type").value = "";
    document.getElementById("extensionbuilder-type-block").innerHTML = "<p class=\"help-block\">Upload a JS file or select a type to get started</p>";
    cm.getDoc().setValue("");
    setTimeout(function() {
        cm.refresh();
    }, 1000);
}