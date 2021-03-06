var clientID = "9981d3ee482146e8a48360958403ddfd";
var domain = "https://ethanf108.github.io/spotiview";

var tracks = {};
var albums = {};
var playlists = [];
var artists = {};

var username = "";

var userToken = null;
var callback;

var libraryDone = false;
var playlistsDone = false;
var localIdCount = -1;

function spotifyRedirect() {
    var sLink = "https://accounts.spotify.com/authorize?";
    sLink += "client_id=" + clientID + "&";
    sLink += "redirect_uri=" + encodeURIComponent(domain) + "&"; //production
    //sLink += "redirect_uri=" + encodeURIComponent("http://localhost:8383/spotiview" + "/index.html") + "&"; //testing
    sLink += "response_type=token&";
    sLink += "scope=" + encodeURIComponent("playlist-read-private user-library-read user-read-private playlist-read-collaborative") + " & ";
    sLink += "state=spotiviewstate";
    console.log("redirecting to: " + sLink);
    window.location = sLink;
}

function loadTracks(cb = null, fromPL = false, URL = "https://api.spotify.com/v1/me/tracks?offset=" + 0 + "&limit=" + 50) {
    var request = new XMLHttpRequest();
    var responseObject;
    request.open("GET", URL, true);
    request.setRequestHeader("Authorization", "Bearer " + userToken);
    request.send();
    request.onload = e => {
        if (request.status === 429) {
            console.log("429: " + URL);
            return;
        } else if (request.status === 401) {
            var expire = new Date();
            expire.setDate(expire.getDate() - 7);
            document.cookie = "spotifyAPIKey=; expires=" + expire.toUTCString();
            window.location = "/spotiview/index.html";
        }
        responseObject = JSON.parse(request.responseText);
        responseObject.items.forEach(item => {
            if (!item.track) {
                return;
            }
            const album_release = item.track.album.release_date;
            var trackObject = {
                fromPL: fromPL,
                id: item.track.id,
                name: item.track.name,
                local: item.is_local,
                album: item.track.album,
                popularity: item.popularity,
                length: item.duration_ms,
                track_number: item.track_number,
                explicit: item.explicit,
                artists: item.track.album.artists
            };
            if (trackObject.local) {
                trackObject.id = localIdCount--;
            }
            trackObject.notAddedByOwner = (item.added_by && item.added_by.id !== username && item.added_by.id !== "");
            if (album_release) {
                trackObject.year = parseInt(album_release.substr(0, 4));
                if (album_release.length > 4) {
                    trackObject.month = parseInt(album_release.substr(5, 7));
                    trackObject.day = parseInt(album_release.substr(8, 10));
                }
            }
            if (tracks[trackObject.id]) {
                tracks[trackObject.id].fromPL &= fromPL;
                tracks[trackObject.id].notAddedByOwner &= trackObject.notAddedByOwner;
            } else {
                tracks[trackObject.id] = trackObject;
            }
            for (var artist of trackObject.artists) {
                if (/^Various Artists$/ig.test(artist.name)) {
                    continue;
                }
                if (!artists[artist.id]) {
                    artists[artist.id] = artist;
                    artists[artist.id].numTracks = 0;
                    artists[artist.id].numPLTracks = 0;
                }
                artists[artist.id].numPLTracks++;
                if (!tracks[trackObject.id].fromPL) {
                    artists[artist.id].numTracks++;
                }
            }
        });
        if (responseObject.next !== null) {
            setTimeout(loadTracks, 0, cb, fromPL, responseObject.next);
        } else {
            if (cb) {
                setTimeout(cb, 0);
            }
        }
    };
}

function loadSongsFromPlaylists(i) {
    if (i >= playlists.length) {
        playlistsDone = true;
        setTimeout(loadTracks, 0, doneLibrary);
        return;
    }
    loadTracks(() => loadSongsFromPlaylists(i + 1), true, "https://api.spotify.com/v1/playlists/" + playlists[i].id + "/tracks?offset=" + 0 + "&limit=" + 50);
}

function loadPlaylists(URL = "https://api.spotify.com/v1/me/playlists?offset=" + 0 + "&limit=" + 50) {
    var request = new XMLHttpRequest();
    var responseObject;
    request.open("GET", URL, true);
    request.setRequestHeader("Authorization", "Bearer " + userToken);
    request.send();
    request.onload = e => {
        responseObject = JSON.parse(request.responseText);
        responseObject.items.forEach(item => {
            const playlistObject = {
                id: item.id,
                collaborative: item.collaborative,
                name: item.name,
                ownedBySelf: item.owner.id === username,
                public: item.pubic,
                img: item.images
            };
            playlists.push(playlistObject);
        }
        );
        if (responseObject.next !== null) {
            setTimeout(loadPlaylists, 0, responseObject.next);
        } else {
            setTimeout(loadSongsFromPlaylists, 0, 0);
        }
    };
}

function doneLibrary() {
    libraryDone = true;
}

function getUsername() {
    var request = new XMLHttpRequest();
    var responseObject;
    request.open("GET", "https://api.spotify.com/v1/me", true);
    request.setRequestHeader("Authorization", "Bearer " + userToken);
    request.send();
    request.onload = e => {
        if (request.status === 401) {
            var expire = new Date();
            expire.setDate(expire.getDate() - 7);
            document.cookie = "spotifyAPIKey=; expires=" + expire.toUTCString();
            window.location = "/spotiview/index.html";
        }
        responseObject = JSON.parse(request.responseText);
        username = responseObject.id;
        setTimeout(loadPlaylists, 0);
    };

}

function setUserToken(token) {
    userToken = token;
}

function analyzeAlbum() {
    for (var track of Object.values(tracks)) {
        if (track.album) {
            if (!albums[track.album.id]) {
                albums[track.album.id] = {
                    id: track.album.id,
                    name: track.album.name,
                    year: track.year,
                    month: track.month,
                    day: track.day,
                    fromPL: track.fromPL,
                    notAddedByOwner: track.notAddedByOwner
                };
            }
            if (track.album.images && track.album.images[0]) {
                albums[track.album.id].img = track.album.images[1].url;
            }
            albums[track.album.id].fromPL &= track.fromPL;
            albums[track.album.id].notAddedByOwner &= track.notAddedByOwner;
        }
    }
    setTimeout(callback, 0);
}

function untilDone() {
    if (playlistsDone && libraryDone) {
        setTimeout(analyzeAlbum, 0);
    } else {
        setTimeout(untilDone, 500);
    }
}

function gatherData(c) {
    callback = c;
    username = getUsername();
    setTimeout(untilDone, 0);
}