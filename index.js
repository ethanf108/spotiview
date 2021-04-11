/* global clientID, domain, playlists, tracks, albums, artists */

var libOnly;
var allPLs;

var includePLs = false;

function getKeyFromCookie() {
    for (var cookie of document.cookie.split(";")) {
        if (cookie.split("=")[0] === "spotifyAPIKey") {
            return cookie.split("=")[1];
        }
    }
    return null;
}

function getKeyFromURL() {
    for (var frag of window.location.hash.split(/[#?&]/)) {
        if (frag.startsWith("access_token")) {
            return frag.substring(frag.indexOf("access_token") + 13, frag.length);
        }
    }
    return null;
}

function determine() {
    var key = getKeyFromCookie();
    if (key !== null) {
        setUserToken(key);
        return true;
    }
    key = getKeyFromURL();
    if (key !== null) {
        var expire = new Date();
        expire.setDate(expire.getDate() + 7);
        document.cookie = "spotifyAPIKey=" + key + "; expires=" + expire.toUTCString();
        window.location = "/spotiview/index.html";
        return false;
    }
    return false;
}

function loadAlbumsByYearHelper(valChecker) {
    var ret = {
        albs: [],
        lowestYear: -1,
        highestYear: -1,
        longestAlbArr: -1
    };
    for (var alb of Object.values(albums)) {
        if (!valChecker(alb)) {
            continue;
        }
        if (!ret.albs[alb.year]) {
            ret.albs[alb.year] = [];
        }
        ret.albs[alb.year].push(alb);
        if (alb.year !== undefined && alb.year > ret.highestYear || ret.highestYear === -1) {
            ret.highestYear = alb.year;
        }
        if (alb.year !== undefined && alb.year < ret.lowestYear || ret.lowestYear === -1) {
            ret.lowestYear = alb.year;
        }
        if (ret.albs[alb.year].length > ret.longestAlbArr || ret.longestAlbArr === -1) {
            ret.longestAlbArr = ret.albs[alb.year].length;
        }
    }
    return ret;
}

function loadAlbumsByYear() {
    libOnly = loadAlbumsByYearHelper(a => !a.fromPL);
    allPLs = loadAlbumsByYearHelper(a => !a.notAddedByOwner);
}

function displayAll() {

    for (var tableCount = 1; tableCount <= 2; tableCount++) {
        var thead = document.getElementById("aHead" + tableCount);
        var tabl = document.getElementById("aTable" + tableCount);
        var nameLater = [allPLs, libOnly][tableCount - 1];
        var ttd = "";
        for (var i = nameLater.lowestYear; i <= nameLater.highestYear; i++) {
            ttd += "<th class='rowe'><p>" + "</p></th>";
        }
        thead.innerHTML = "<tr>" + ttd + "</tr>";
        for (var i = nameLater.longestAlbArr; i >= 0; i -= 1) {
            ttd = "";
            for (var year = nameLater.lowestYear; year <= nameLater.highestYear; year++) {
                if (nameLater.albs[year] === undefined) {
                    ttd += "<td><p></p></td>";
                } else if (nameLater.albs[year].length > i) {
                    ttd +=
                            "<td><img src='" +
                            nameLater.albs[year][i].img +
                            "' height='32' width='32' title=\"" + nameLater.albs[year][i].name.replaceAll(/"/g, '\\\"') + " (" + nameLater.albs[year][i].year + ")\" class='imag'></img></td>";
                } else {
                    ttd += "<td><p></p></td>";
                }
            }
            tabl.innerHTML += "<tr class='tabl'>" + ttd + "</tr>";
        }
        ttd = "";
        for (var i = nameLater.lowestYear; i <= nameLater.highestYear; i++) {
            var text = "";
            if (("" + i).endsWith("0") || i === nameLater.lowestYear || i === nameLater.highestYear) {
                text = i;
            }
            ttd += "<td><p class='lbl' style='text-align:center'>" + text + "</p></td>";
        }
        tabl.innerHTML += "<tr>" + ttd + "</tr>";
    }
}

function scopeSelect() {
    includePLs = document.getElementById("scope-select").value === "allPLs";
    document.getElementById("aTable1").hidden = !includePLs;
    document.getElementById("aTable2").hidden = includePLs;
    document.getElementById("top5artists").hidden = includePLs;
    document.getElementById("top5artistsPL").hidden = !includePLs;
}

function artists() {
    var ap = document.getElementById("top5artists");
    var apPL = document.getElementById("top5artistsPL");
    var top5 = Object.keys(artists).sort(function (a, b) {
        return artists[b].numTracks - artists[a].numTracks;
    });
    var top5PL = Object.keys(artists).sort(function (a, b) {
        return artists[b].numPLTracks - artists[a].numPLTracks;
    });
    var count = 0;
    for (var artist of top5) {
        count++;
        ap.innerHTML += "<p>" + artists[artist].name + ": " + artists[artist].numTracks + "</p><br />";
        if (count === 5)
            break;
    }
    count = 0;
    for (var artist of top5PL) {
        count++;
        apPL.innerHTML += "<p>" + artists[artist].name + ": " + artists[artist].numPLTracks + "</p><br />";
        if (count === 5)
            break;
    }
}

function afterLoad() {
    document.getElementById("loading").hidden = true;
    loadAlbumsByYear();
    displayAll();
    scopeSelect();
    artists();
    document.getElementById("analysis").hidden = false;
}

function onLoad() {
    if (determine()) {
        document.getElementById("loading").hidden = false;
        gatherData(afterLoad);
    } else {
        document.getElementById("landing").hidden = false;
    }
}

onLoad();
