var redis = require('redis');
var client = redis.createClient({
  port      : '6379',
  host      : '127.0.0.1',
  // password  : 'redispassword',
});

client.on('connect', function() {
    console.log('Redis Database connected'+'\n');
});

client.on('reconnecting', function() {
    console.log('Redis client reconnecting');
});

client.on('ready', function() {
    console.log('Redis client is ready');
});

client.on('error', function (err) {
    console.log('Something went wrong ' + err);
});

client.on('end', function() {
    console.log('\nRedis client disconnected');
    console.log('Server is going down now...');
    process.exit();
});

let set = (key, value) => {
  client.set(key, value, redis.print);
  return 'done';
}

let get = (key) => {
  return new Promise((resolve, reject) => {
    client.get(key, function (error, result) {
        if (error) {
          console.log(error);
          reject(error);
        }
        resolve(result);
    });
  });
}

let close = () => {
  client.quit();
}

module.exports = {
   client: client,
   set: set,
   get: get,
   close: close
};