(function(exports) {
  'use strict';

  var _counter = 0;
  var _countdownElements;
  var _counterTimer = null;
  var _counterStart = 0;
  var _counterGap = 0;

  var debug = Config.debug;

  function _beautify(value) {
    if (value < 10) {
      return '0' + value;
    } else {
      return value;
    }
  }

  function _reset() {
    _counterStart = performance.now();
    _counterGap = 0;
  }

  function _paint(minutes, seconds) {
    var len = _countdownElements.length;
    minutes = _beautify(minutes);
    seconds = _beautify(seconds);
    for (var i = 0; i < len; i++) {
      _countdownElements[i].textContent = minutes + ':' + seconds;
    }
  }

  var Countdown = {
    init: function () {
      _countdownElements = document.querySelectorAll('.counter');
      _reset();
      return this;
    },
    start: function(element) {
      if (_counterTimer !== null) {
        debug && console.log('Warning, a countdown timer is running!');
        return;
      }
      _counterStart = performance.now();
      _counterTimer = setInterval(function() {
        _counter = (_counterGap + (performance.now() - _counterStart)) / 1000;
        var minutes = Math.floor(_counter/60);
        var seconds = Math.floor(_counter%60);
        _paint(minutes, seconds);
      }, 1000);
    },
    stop: function() {
      clearInterval(_counterTimer);
      _counterTimer = null;
      _counterGap = _counter;
      return _counter;
    },
    reset: function() {
      _reset();
      _paint(0, 0);
    }
  };

  exports.Countdown = Countdown;

}(this));
