/**
 * Created by chenpeng on 14-3-28.
 */

var net = require('net');
var timeout = 600000;//超时
var listenPort = 4001;//监听端口
var server = null;
var schedule = require('pomelo-schedule');
var utils = require('./utils');
var consts = require('../consts/consts');
var socketId = 0;
var log = require('pomelo-logger').getLogger('socket-log', __filename, process.pid);
process.env.LOGGER_LINE = true;
var heartBeatJob = null;
var socketServer = module.exports = function (app)
{
    this.app = app;
    server = net.createServer(function(socket){
        // 我们获得一个连接 - 该连接自动关联一个socket对象
        console.log('connect: ' +
            socket.remoteAddress + ':' + socket.remotePort);
        socketId++;
        socket.setNoDelay(true); //write立即发出
        socketList.push(
            {
                id:socketId,
                socket:socket,
                begin:Math.ceil(new Date().getTime()/1000),
                name:"",
                endTime:0,
                error:[],
                jobId:0,
                callback:null
            }
        );
        socket.setEncoding('binary');
        //接收到数据
        socket.on('data',function(data){
            log.debug('recv data(', data.length ,') from',socket._peername.address+':'+ socket._peername.port,':',data);
            data = data.replace(new RegExp('\r','g'),''); //清除换行
            data = data.replace(new RegExp('\n','g'),''); //清除换行
            if( data.length == 24 && data.match(/^[0-9a-fA-F]*$/))
            {
                log.debug("Heartbeat... send 0");
                socketList.getSocketBySocket(socket).name = data;
                socket.write("0\r\n");
            }
            else if(data == "ok")
            {
                log.info("open door ok!");
                var socket_ = socketList.getSocketBySocket(socket);
                if(socket_.jobId > 0)
                {
                    schedule.cancelJob(socket_.jobId);
                    socket_.jobId = 0;
                }

                if(socket_.callback)
                {
                    socket_.callback(null);
                    socket_.callback = null;
                }
            }
//            else
//            {
//                log.debug('recv data(' + data.length + '): ',data);
//            }
        });

        //数据错误事件
        socket.on('error',function(exception){
            log.error('socket error:' + exception);
            socketList.getSocketBySocket(socket).error.push(exception);
            socket.end();
        });
        //客户端关闭事件
        socket.on('close',function(data){
            log.error('close: ',socket._peername.address,socket._peername.port);
            var s = socketList.getSocketByIpAndPort(socket._peername.address,socket._peername.port);
            s.endTime = Math.ceil(new Date().getTime()/1000);
            closeSocketList.push(s);
            socketList.deleteSocketById(s.id);
        });
    }).listen(listenPort);

    //服务器监听事件
    server.on('listening',function(){
        log.info("server listening:" + server.address().port);
    });

    //服务器错误事件
    server.on("error",function(exception){
        log.error("server error:" + exception);
    });

    schedule.scheduleJob({
        start:Date.now(),
        period:consts.PING_PONG
    },socketServer.sendAll, "0");
}

var socketList = [];
var closeSocketList = [];
socketList.getSocketByIp = function(ip)
{
    for (var i = 0; i < this.length; i++) {
        if (this[i].socket.remoteAddress == ip || socket._peername.address == ip) {
            return this[i];
        };
    };
}
socketList.getSocketByIpAndPort = function(ip,port)
{
    for (var i = 0; i < this.length; i++) {
        if ( ( this[i].socket.remoteAddress == ip || this[i].socket._peername.address == ip)&&
            ( this[i].socket.remotePort == port || this[i].socket._peername.port == port)) {
            return this[i];
        };
    };
}

socketList.getSocketByName = function( name)
{
    for (var i = 0; i < this.length; i++) {
        if (this[i].name == name) {
            return this[i];
        };
    };
}

socketList.getSocketById = function( id)
{
    for (var i = 0; i < this.length; i++) {
        if (this[i].id == id) {
            return this[i];
        };
    };
}

socketList.getSocketBySocket = function( socket)
{
    for (var i = 0; i < this.length; i++) {
        if (this[i].socket == socket) {
            return this[i];
        };
    };
}

socketList.deleteSocketById = function( id)
{
    for (var i = 0; i < this.length; i++) {
        if (this[i].id == id) {
            //元素前移
            if(this[i].callback)
            {
                this[i].callback({error:2,message:"无法连接到门，请稍后重新扫码开门!"});
                if(this[i].jobId > 0)
                {
                    schedule.cancelJob(this[i].jobId);
                }
            }
            for (var j = i; j < this.length - 1; j++) {
                this[j] = this[j + 1];
            }
            //数组长度--
            this.length--;
            break;
        }
    }
}

function toSend()
{
    log.debug("send",this.data.msg, "to", this.data.name, "runTime",this.runTime);
    var s = socketList.getSocketByName(this.data.name);
    if(s)
    {
        if(this.runTime > consts.SEND_LIMIT_COUNT)
        {
            log.debug("send",this.data.msg, "to", this.data.name,"TIME OUT!");
            schedule.cancelJob(this.id);
            s.jobId = 0;
            if(s.callback)
            {
                s.callback( {
                    code:1,
                    message:"开门超时，请重新扫码开门"
                });
            }
            s.callback = null;
        }
        else
        {
            s.socket.write(this.data.msg + "\r\n");
        }
    }
    else
    {
        schedule.cancelJob(this.id);
    }
}


socketServer.send = function(name, msg ,cb)
{

    log.info(name,msg);
    var s = socketList.getSocketByName(name);
    if(s)
    {
        s.jobId = schedule.scheduleJob({
            start:Date.now(),
            period:consts.SEND_TIME    //1.5s
        },toSend, {name:name,msg:msg})
        s.callback = cb;
    }
    else
    {
        cb({error:2,message:"无法连接到门，请稍后重新扫码开门!"});
    }
}

socketServer.sendAll = function(msg)
{
    for( var i = 0; i < socketList.length; i++)
    {
        if(socketList[i] && socketList[i].socket && socketList[i].socket.writable)
        {
            socketList[i].socket.write(msg + "\r\n");
        }
    }
}

socketServer.getClientList = function ()
{
    var list = [];
    for ( var i = 0; i < socketList.length; i++)
    {
        list.push({
            id:socketList[i].id,
            name:socketList[i].name,
            ip:socketList[i].socket._peername.address,
            port:socketList[i].socket._peername.port,
            begin:utils.DateMSFormat(socketList[i].begin),
            endTime:utils.DateMSFormat(socketList[i].endTime),
            upTime:socketList[i].endTime > 0? ((socketList[i].endTime - socketList[i].begin)/60).toFixed(2) : ((Math.ceil(new Date().getTime()/1000) - socketList[i].begin)/60).toFixed(2),
            error:socketList[i].error,
            flag:socketList[i].socket.writable
        })
    }
    return list;
}
process.on('uncaughtException', function (err) {
    log.error('[uncaughtException] Caught exception: ' + err.stack);
    console.log(err);
//    utils.sendMail(err.message, err.stack);
});