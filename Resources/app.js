Titanium.UI.setBackgroundColor('#FFF');

var win_ti = Titanium.UI.createWindow({
  barColor: '#369',
  title: 'ti',
  url: 'win_ti.js'
});
var win_web = Titanium.UI.createWindow({
  barColor: '#963',
  title: 'webview',
  url: 'win_webview.js'
});

var tabGroup = Titanium.UI.createTabGroup();
tabGroup.addTab(Titanium.UI.createTab({
  window: win_ti,
  title: win_ti.title
}));
tabGroup.addTab(Titanium.UI.createTab({
  window: win_web,
  title: win_web.title
}));
tabGroup.open();
