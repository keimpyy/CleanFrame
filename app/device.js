/* Public Tizen application APIs. No Mac server, network address or credentials. */
(function () {
  'use strict';
  var IDS = {
    netflix: 'org.tizen.netflix-app', primevideo: 'evKhCgZelL.AmazonIgnitionLauncher2',
    hbomax: 'fjpfQryJuR.HBOMaxCTV', videoland: 'WyN2wsAQHK.VideolandV2', youtube: '9Ur5IzDKqV.TizenYouTube',
    disneyplus: 'MCmYXNxgcu.DisneyPlus', appletv: 'com.samsung.tv.aria-video',
    applemusic: 'org.tizen.apple.apple-music', stremio: 'IkWsFHtOY9.Stremio'
  };
  // Installed IDs differ between TV generations and regions, so primary apps also match by name.
  var NAMES = {
    netflix: /^netflix$/i, primevideo: /^(amazon )?prime video$/i, hbomax: /^(hbo ?max|max)$/i,
    videoland: /^videoland$/i, youtube: /^youtube$/i, disneyplus: /^disney ?\+$/i,
    appletv: /^apple tv$/i, applemusic: /^apple music$/i, stremio: /^stremio$/i
  };
  var STREAMING = ['3KA0pm7a7V.TubiTV', 'rJeHak5zRg.Spotify'];
  var CONSUMER_SYSTEM = ['org.tizen.browser', 'com.microsoft.copilot'];
  var EXTRA_BRANDS = {'rJeHak5zRg.Spotify': 'spotify', '3KA0pm7a7V.TubiTV': 'tubi'};
  var INTERNAL = ['adplatform.ADPlayer', 'WykOS4t4F0.cmsWebApp', '25emanual3.emanual',
    'ZODRT12q2l.WebAccountExtension', 'ByJlgt0XeD.CastSettingsApp', 'tv6pbVMQFF.PrivacyChoices'];
  var SELF = 'w5NDRdHNPF.CleanFrame';
  function api() { return window.tizen && window.tizen.application; }
  function unavailable(done) {
    done({ message: 'Open CleanFrame on the TV to use this control.', detail: 'The web preview cannot control the TV.' });
  }
  function failure(err) {
    return { message: 'The TV could not open this screen.', detail: err && (err.message || err.name) || 'Try again, or press the remote’s Home button to return to CleanFrame.' };
  }
  function bounded(done) {
    var finished = false, timer = setTimeout(function () { finish({ message: 'The TV did not respond. Please try again.' }); }, 8000);
    function finish(err, value) { if (finished) return; finished = true; clearTimeout(timer); done(err, value); }
    return finish;
  }
  function launchApp(id, done) {
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done);
    try { api().launch(id, function () { finish(null); }, function (err) { finish(failure(err)); }); }
    catch (err) { finish(failure(err)); }
  }
  function launch(brand, done) {
    if (!IDS[brand]) { done({message: 'This app has no launch target.'}); return; }
    launchApp(IDS[brand], done);
  }
  function home(done) { launchApp('com.samsung.tv.csfs', done); }
  function settings(done) { launchApp('org.tizen.menu', done); }
  function apps(done) {
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done);
    try {
      api().getAppsInfo(function (list) {
        var known = {}, seen = {}, result = [], brands = Object.keys(NAMES);
        Object.keys(IDS).forEach(function (brand) { known[IDS[brand]] = brand; });
        list.forEach(function (a) {
          if (!known[a.id] && a.show && a.name && a.id !== 'com.samsung.tv.cobalt-yt') {
            brands.some(function (brand) { if (NAMES[brand].test(String(a.name).trim())) { known[a.id] = brand; return true; } return false; });
          }
        });
        list.forEach(function (a) {
          var primary = !!known[a.id], stream = STREAMING.indexOf(a.id) >= 0;
          var consumer = /^[A-Za-z0-9]{10}\.[A-Za-z0-9_-]+$/.test(a.id) || CONSUMER_SYSTEM.indexOf(a.id) >= 0;
          if (a.id === SELF || INTERNAL.indexOf(a.id) >= 0 || seen[a.id] || !a.name || (!primary && !stream && (!a.show || !consumer))) return;
          if (!primary && /(?:service|worker|preview|promotion|plugin|launcher|test|sdk|^ep[ -]|factory|daemon)/i.test(a.name + ' ' + a.id)) return;
          if (/-dummy$/.test(a.id) || a.id === 'com.samsung.tv.cobalt-yt') return;
          seen[a.id] = true;
          result.push({ appId: a.id, name: a.name, brand: known[a.id] || EXTRA_BRANDS[a.id] || '', icon: a.iconPath || '', rank: primary ? brands.indexOf(known[a.id]) + (IDS[known[a.id]] === a.id ? 0 : 0.5) : (stream ? 20 : 30) });
        });
        result.sort(function (a, b) { return a.rank - b.rank || a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
        finish(null, result);
      }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }
  window.FrameDevice = { launch: launch, launchApp: launchApp, home: home, settings: settings, apps: apps };
}());
