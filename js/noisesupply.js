// Load everything...
Zepto(function($){

// Mobile check
var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Create instance with token
var player = new SoundCloudAudio('b386da1a67a067584cac1747c49ef3d7');

// Button icon changing
player.on('waiting', function(audio) {
    $('.player').removeClass('fa-pause fa-play');
    $('.player').addClass('fa-circle-o-notch fa-spin');
});

player.on('pause', function(audio) {
    $('.player').removeClass('fa-pause fa-circle-o-notch fa-spin');
    $('.player').addClass('fa-play');
});

player.on('playing', function(audio) {
    $('.player').removeClass('fa-play fa-circle-o-notch fa-spin');
    $('.player').addClass('fa-pause');
});

// Grab next song and start playing on song end
player.on('ended', function(audio) {
    playNext();
});

// Play / pause button click handling
$('.player').on('click', function(e) {

    // Player looks paused, go to play
    if (!player.playing) {
        player.play();
      }

    // iOS touch interaction workaround  
    else if (isMobile && !window.touchInitiated) {
      player.play();
      window.touchInitiated = 'true';
      } 

    // Player is playing, go to pause
    else {
        player.pause();
    }
});

// Favorite current track click
$('.favorite').on('click', function(e) {
  favoriteCurrent();
});

// Submit button click handling
$('#track-input').on('submit', function(e) {
    e.preventDefault();
    url = $('#track-url').val();

    // It's just a permalink
    if (/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/i.test(url)) {
    trackPlay(url);
    }

    // Play user favorite
    else {

      $.getJSON('https://api.soundcloud.com/users/' + url + '/favorites?client_id=b386da1a67a067584cac1747c49ef3d7',
          function(data) { 
            shuffleArray(data);
            trackPlay(data[0].permalink_url);      
      });
    }

    // Player user upload
    /*
    else if (url.indexOf('t ') == 0){

      $.getJSON('https://api.soundcloud.com/users/' + url.slice(2) + '/tracks?client_id=b386da1a67a067584cac1747c49ef3d7',
          function(data) { 
            shuffleArray(data);
            trackPlay(data[0].permalink_url);      
      });
    }
    */

});

// Genre clicking
$('.genres > span').on('click', function(e) {
    $('.selected-genre').text($(this).text());
    $('.genres').hide();
    $('.genre-loading').show();
    var genre = escape($(this).text().replace(/ /g, '+'));
    loadGenre(genre);
});

// Go to play screen
function trackPlay(url) {
    player.resolve(url, function(track) {
    if (track.stream_url) {
      $('#track-url').val('');
      $('.pick-area').hide();
      $('.play-area').show();
      document.title = 'NOISESUPPLY - "' + track.title + '" by ' + track.user.username;
      sessionStorage.clear();
      window.location.hash = '#' + track.permalink_url;
      updateSocial(window.location.origin + '/#' + track.permalink_url);
      playTrack(track.permalink_url);

        if (!localStorage.tips) {
          $('.tips').show().addClass('animated fadeIn');
        }

      $('.history').show().addClass('animated fadeIn');
    }
  });
}

// Back to select track
function trackSelect() {
  player.pause();
  $('.pick-area').show();
  $('.play-area').hide();
}

// Keyboard handling handling
$(window).keydown(function(e) {
    // Spacebar
    if (e.which === 32) {
        if (!player.playing) {
            player.play();
        } else {
            player.pause();
        }
    }
    else if (e.which === 39) {
      playNext();
    }
    else if (e.which === 38) {
      volumeUp();
    }
    else if (e.which === 40) {
      volumeDown();
    }
    else if (e.which === 70) {
      favoriteCurrent();
    }
});

function loadSuggestions(id) {

  // Grab suggestions
  $.getJSON('https://api.soundcloud.com/tracks/' + id + '/related?limit=25', function(data){

    // Get playlist
    if (sessionStorage.playlist) {
    playlist = JSON.parse(sessionStorage.playlist);
    }

    else {
      playlist = [];
    }

    // Get play history
    playhistory = JSON.parse(sessionStorage.history);

    // Empty tracks array
    tracks = [];

    // Loop through and add to array
    data.forEach(function(track) {

      // Make sure we're using HTTPS for everything
      track.permalink_url = track.permalink_url.replace(/^http:\/\//i, 'https://');

      // Make sure track is streamable, not already in playlist or history
      if (track.stream_url && playlist.indexOf(track.permalink_url) < 0 && playhistory.indexOf(track.permalink_url) < 0) {
        tracks.push(track.permalink_url);
      }

    });

    // Concat new tracks and resubmit to sessionStorage
    sessionStorage.playlist = JSON.stringify(playlist.concat(tracks));

});

}

function playTrack(url) {
    // Resolve track metadata
    player.resolve(url, function(track) {

        // Make sure we're using HTTPS for everything
        track.permalink_url = track.permalink_url.replace(/^http:\/\//i, 'https://');

        // Add to player history storage
        if (sessionStorage.history) {
          playhistory = JSON.parse(sessionStorage.history);
          playhistory.push(track.permalink_url);
          sessionStorage.history = JSON.stringify(playhistory);
        }

        else {
          playhistory = [];
          playhistory.push(track.permalink_url);
          sessionStorage.history = JSON.stringify(playhistory);
        }

        // Load suggestions into playlist (even if the track doesn't stream, because there could still be recommendations)
        loadSuggestions(track.id);

        // Get around SounCloud saying stuff is streamable when it's not by using an undocumented API endpoint...
        $.getJSON('https://api.soundcloud.com/tracks/' + track.id + '/streams?client_id=b386da1a67a067584cac1747c49ef3d7',
          function(data) {

            // HTTP accessible stream exists
            if (data.http_mp3_128_url) {

              // Update UI
              $('.title').attr('href', track.permalink_url).text(track.title);
              $('.user').attr('href', track.user.permalink_url).text(track.user.username);

              if (localStorage.oauth) {
              $('.favorite').removeClass('favorited tada').show();
              }

              else { $('.favorite').hide(); }

              // Play the track
              player.play();

              // Add to player history DOM
              $('<li class="animated"><span class="timestamp">' + moment().format('h:mmA') + '</span> <a href="' + track.permalink_url + '">' + track.title + '</a> <em>by</em> <a href="' + track.user.permalink_url + '">' + track.user.username + '</a></li>').prependTo('.history ul').addClass('fadeInLeft');
              $()
            }

            // SoundCloud lied, it's not streamable, play the next song
            else {
              playNext();
            }

          });

    });

}

function playNext() {

  if (sessionStorage.playlist) {

  // Load the playlist from sessionStorage
  playlist = JSON.parse(sessionStorage.playlist);

  // Grab the track to play
  url = playlist[0];

  // Remove the first track and save back to sessionStorage
  playlist.shift();
  sessionStorage.playlist = JSON.stringify(playlist);

  // Play the track
  playTrack(url);
  }

  else {
    setTimeout(function() {
            playNext();
        }, 1000);
  }

}

// Error handling
player.on('error', function(audio) {
  if (!player.playing) {
        playNext();
  }
  else {
    player.play();
  }
});

function updateSocial(url) {

  $('.twitter').attr('href', 'https://twitter.com/intent/tweet?text=Currently listening on @noisedotsuppply :: ' + encodeURIComponent(url));
  $('.facebook').attr('href', 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url));
  $('.tumblr').attr('href','http://www.tumblr.com/share/link?url=' + encodeURIComponent(url) + '&description=Currently listening on noise.supply');

}

// Helper function: Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

// Load genre
function loadGenre(genre) {

  // Get the top tracks for the genre
  $.getJSON('https://api.soundcloud.com/tracks?tags=' + genre + '&limit=100&client_id=b386da1a67a067584cac1747c49ef3d7', function(data){

    // Sort by favorites
    data.sort(function(a, b) {
      return b.playback_count - a.playback_count;
    });

    // Get first 10 items
    data.splice(10, data.length - 10);
    shuffleArray(data);

    // Play the first suggestion
    trackPlay(data[0].permalink_url);
  });

}

// Volume goes up
function volumeUp() {
if (player.audio.volume < 1) {
  newVolume = player.audio.volume + 0.05;
  player.audio.volume = parseFloat(newVolume.toFixed(2));
  
  $('.volume').text(Math.round(player.audio.volume * 100)).removeClass('fadeOutDown fadeOutUp').show().addClass('fadeOutUp');
 }
}

// Volume goes down
function volumeDown() {
if (player.audio.volume > 0) { 
  newVolume = player.audio.volume - 0.05;
  player.audio.volume = parseFloat(newVolume.toFixed(2));

  $('.volume').text(Math.round(player.audio.volume * 100)).removeClass('fadeOutDown fadeOutUp').show().addClass('fadeOutDown');
 }
}

function favoriteCurrent() {
// If current track isn't favorited already, do the AJAX call
if (!$('.favorite').hasClass('favorited') && localStorage.oauth) {

$('.favorite').addClass('favorited tada');

  $.ajax({
  url: 'https://api.soundcloud.com/users/' + localStorage.userid + '/favorites/' + player._track.id + '?oauth_token='+localStorage.oauth,
  type: 'PUT',
  success: function(data) {
    
  },
  error: function(data) {
    $('.favorite').removeClass('favorited tada');
  }
  });
}
}

  // IE origin workaround
  if (!window.location.origin) {
    window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
  }

  // Hash handling
  if(window.location.hash) {

    // oAuth token return
    if (window.location.hash.split('#')[1].indexOf('access') >= 0) {
      
    token = window.location.hash.split('#')[1].split('&')[0].split('=')[1];

    $.getJSON('https://api.soundcloud.com/me.json?oauth_token=' + token , function(data){
      localStorage.oauth = token;
      localStorage.username = data.username;
      localStorage.userid = data.id;
      localStorage.avatar = data.avatar_url;
      window.location = window.location.origin;
    });

    }

    // Hashed song playing
    else if (window.location.hash.split('#')[1].indexOf('http') >= 0) {
    url = window.location.hash.split('#')[1];
    trackPlay(url);
    }

  } 

  else {
    trackSelect();
  }

  if (isMobile) {
    $('.credits').hide();
    $('.player').removeClass('fa-pause fa-circle-o-notch fa-spin');
    $('.player').addClass('fa-play');
  }

});