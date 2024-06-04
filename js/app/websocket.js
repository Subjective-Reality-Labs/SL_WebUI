// var wsCon = new WebSocket('ws://' + location.hostname + ':81/', ['arduino']);
var wsCon = new WebSocket('ws://192.168.2.194/ws', ['arduino']);
// Events
wsCon.addEventListener('open', function (e) {
    wsCon.send('Connect ' + new Date());
    console.log(wsCon);
});
wsCon.addEventListener('error', function (error) {
    console.log('WebSocket Error ', error);
});
wsCon.addEventListener('message', function (e) {
    console.log('Server: ', e.data);
});
wsCon.addEventListener('close', function (e) {
    console.log('WebSocket connection closed');
});