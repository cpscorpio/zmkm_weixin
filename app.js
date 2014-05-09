
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var Logger = require('pomelo-logger');
var utils = require('./lib/util/utils');
var consts = require('./lib/consts/consts');

var app = module.exports =  express();

Logger.configure({
    appenders: [
        {
            type: 'console'
        } //控制台输出
        ,
        {
            "type": "file",
            "filename": __dirname + "/logs/log.log",
            "pattern": "_yyyy-MM-dd",
            "maxLogSize": 1048576,
            "layout": {
                "type": "basic"
            }
            ,"backups": 5,
            "category": "web-log"
        }
        ,
        {
            "type": "file",
            "filename": __dirname + "/logs/static-log.log",
            "pattern": "_yyyy-MM-dd",
            "maxLogSize": 1048576,
            "layout": {
                "type": "basic"
            }
            ,"backups": 5,
            "category": "static-log"
        }
        ,
        {
            "type": "file",
            "filename": __dirname + "/logs/socket-log.log",
            "pattern": "_yyyy-MM-dd",
            "maxLogSize": 1048576,
            "layout": {
                "type": "basic"
            }
            ,"backups": 5,
            "category": "socket-log"
        }
    ],
    replaceConsole: true
});
var log = require('pomelo-logger').getLogger('web-log', __filename, process.pid);

var logger = require('pomelo-logger').getLogger('static-log', __filename, process.pid);
process.env.LOGGER_LINE = true;

app.set('host_','124.127.89.52');
//app.set('host_',"192.168.16.174");
app.set(consts.DOOR_STATUS,"0");
// all environments
app.set('port', process.env.PORT || 4000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('door_control ses'));
app.use(express.session());

app.use(express.static(path.join(__dirname, 'public')));

app.use(Logger.connectLogger(logger, {level: 'auto', format:':method :url'})); //静态文件不打印

app.use(app.router);
app.use(routes(app));

//处理未找到请求
app.use(function(req, res, next){
    log.error('no %s method on %s . return 404', req.method, req.url);
    res.render("error",{
        header:"404",
        info:"Can't " + req.method + " " + req.url
    });
});


//error handler
app.use( function ( err, req, res, next)
{
    log.error(err.stack);
    utils.sendMail(err.message, err.stack);
    res.render("error",{
        header:"500",
        info:err.message
    });
});

var socket = require('./lib/util/socket');
socket(app);
app.set('_socketServer',socket);

if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

http.createServer(app).listen(app.get('port'), function(){
    log.log('Express server listening on port ' + app.get('port'));
});

process.on('uncaughtException', function (err) {
    log.error('[uncaughtException] Caught exception: ' + err.stack);
    utils.sendMail(err.message, err.stack);
});