var io = require('socket.io')
var socket = io.connect('http://localhost:9988');
socket.on('connect', function(){
    socket.emit('hello', 'Hello guest');
});
socket.on('news_by_server', function(data){
    alert(data);
});

socket.emit('news', 'I want news :D ');