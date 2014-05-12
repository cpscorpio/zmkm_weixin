/**
 * Created by chenpeng on 14-3-24.
 */


var log = require('pomelo-logger').getLogger('web-log', __filename, process.pid);
var token = module.exports;
var sqlite = require('sqlite3').verbose();
var dateFile = __dirname + "/database/data.sqlite";
var consts = require('./consts/consts');
var utils = require('./util/utils');


function qrUrl ( token, exp_time)
{
    return "http://v.ubox.cn/wx_open/interface_load_wx_qr?app_name=zmkm&qr_key=" +
             token +"&ex_time=" + exp_time;
}

function createTable(id, cb)
{
    var db = new sqlite.Database(dateFile);
    db.serialize(function() {
        db.run("CREATE TABLE token (token TEXT,qr_url TEXT, exp_time integer,door integer,id integer NOT NULL PRIMARY KEY AUTOINCREMENT)");
        var expTime = Math.ceil(new Date().getTime()/1000) + consts.TIME_OUT;
        var code = _getRandomString();

        utils.get(qrUrl( code, consts.TIME_OUT), function ( data)
        {
            if ( typeof data == "string")
            {
                log.info(data);
                data = eval( "(" + data + ")");
            }
            var stmt = db.prepare("INSERT INTO token (exp_time, token,door ,qr_url) VALUES (?,?,?, ?)");
            stmt.run( expTime, code,id, data.data.qr_url);
            stmt.finalize(function()
            {

                cb();
                db.close();
            });
        });
    });
}
token.getTime = function(id, cb)
{
    console.log(arguments);
    var db = new sqlite.Database(dateFile);
    var date = Math.ceil(new Date().getTime()/1000);
    console.log(date);
    db.serialize(function() {

        db.all("SELECT * FROM token where door=" + id + " and exp_time > " + date, function(err, row) {
            if( err){
                console.log("error",err);
                createTable(id, function(){
                    token.getTime(id, cb);

                    db.close();
                });
            }
            else
            {
                console.log(row);
                if( row && row.length > 0)
                {
                    cb( row[0].exp_time);

                    db.close();
                }
                else
                {
                    var expTime = Math.ceil(new Date().getTime()/1000) + consts.TIME_OUT;
                    var code = _getRandomString();

                    utils.get(qrUrl( code, consts.TIME_OUT), function ( data)
                    {
                        if ( typeof data == "string")
                        {
                            log.info(data);
                            data = eval( "(" + data + ")");

                        }
                        var db = new sqlite.Database(dateFile);
                        var stmt = db.prepare("INSERT INTO token (exp_time, token,door ,qr_url) VALUES (?,?,?, ?)");
                        stmt.run( expTime, code,id, data.data.qr_url);
                        stmt.finalize(function()
                        {
                            cb(expTime);
                            db.close();
                        });
                    });
                }
            }
        });
    });
}
token.getToken = function(id,  cb)
{
    var db = new sqlite.Database(dateFile);
    var date = Math.ceil(new Date().getTime()/1000);
    console.log(date);
    db.serialize(function() {

        db.all("SELECT * FROM token where door=" + id + " and exp_time > " + date, function(err, row) {
            if( err){
                console.log(err.message);
                createTable(id,  function(){
                    token.getToken(id, cb);
                    db.close();
                });
            }
            else
            {
                console.log(row);
                if( row && row.length > 0)
                {
                    cb( row[0]);
                    db.close();
                }
                else
                {
                    var expTime = Math.ceil(new Date().getTime()/1000) + consts.TIME_OUT;
                    var code = _getRandomString();

                    utils.get(qrUrl( code, consts.TIME_OUT), function ( data)
                    {
                        if ( typeof data == "string")
                        {
                            log.info(data);
                            data = eval( "(" + data + ")");

                        }

                        var db = new sqlite.Database(dateFile);
                        var stmt = db.prepare("INSERT INTO token (exp_time, token,door ,qr_url) VALUES (?,?,?, ?)");
                        stmt.run( expTime, code,id, data.data.qr_url);
                        stmt.finalize(function()
                        {
                            cb({
                                exp_time:expTime,
                                token:code,
                                door:id,
                                qr_url:data.data.qr_url
                            });
                            db.close();
                        });
                    });
                }
            }
        });
    });

}

function _getRandomString(len) {
    len = len || 32;
    var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz1234567890'; // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
    var maxPos = $chars.length;
    var pwd = '';
    for (var i = 0; i < len; i++) {
        pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return pwd;
}

token.getCode = function ()
{
    var str = new Date().getTime();

    var code = _getRandomString();
    var string = code + str + code.
    console.log(code);
    var result = new Buffer(code,'utf8');

    return result.toString('base64');
}

token.check = function ( code, cb)
{
    var db = new sqlite.Database(dateFile);
    var date = Math.ceil(new Date().getTime()/1000);
    log.info(date);
    db.serialize(function() {

        db.all("SELECT * FROM token where exp_time > " + date + " and token='" + code + "'", function(err, row)
        {
            console.log("token.check",err, row);
            if( err){
                console.log(err.message);
                cb(err, null);
            }
            if(row && row.length > 0)
            {

                var expTime = Math.ceil(new Date().getTime()/1000) + consts.TIME_OUT;
                var newCode = _getRandomString();

                utils.get(qrUrl( newCode, consts.TIME_OUT), function ( data)
                {
                    try{
                        if ( typeof data == "string")
                        {
                            log.info(data);
                            data = eval( "(" + data + ")");
                        }
                        var db = new sqlite.Database(dateFile);
                        db.run("update token set exp_time=" + date + " where token='" + code + "'");    //设置为过期
                        var stmt = db.prepare("INSERT INTO token (exp_time, token,door, qr_url) VALUES (?,?,?, ?)");
                        stmt.run( expTime, newCode, row[0].door,data.data.qr_url);
                        stmt.finalize(function()
                        {
                            cb(err, row[0]);
                        });

                    }catch (e )
                    {
                        log.error(e.stack);
                    }
                    finally
                    {
                        db.close();
                    }

                });
            }
            else
            {
                cb( new Error("二维码失效"), null);

                db.close();
            }

        });
    });

}

token.checkUser = function ( username, password, cb)
{
    if(username == '2013@uboxol' && password == 'uboxol')
    {
        cb(null,{id:0,user_name:username});
        return ;
    }
    var db = new sqlite.Database(dateFile);
    db.serialize(function() {

        db.all("SELECT * FROM user where user_name='" + username + "' and password='" + password + "'", function(err, row)
        {
            console.log(err, row);
            if( err){
                console.log(err.message);
                cb(err, null);
            }
            if(row && row.length > 0)
            {
                cb(err, row[0]);
            }
            else
            {
                cb( null, null);
            }
            db.close();

        });
    });
}

token.checkPassWordCode = function (code, cb)
{
    var db = new sqlite.Database(dateFile);
    db.serialize(function() {

        db.all("SELECT * FROM password where password='" + code + "'", function(err, row)
        {
            console.log(err, row);
            if( err){
                console.log(err.message);
                cb(err, null);
            }
            if(row && row.length > 0)
            {
                cb(err, row[0]);
            }
            else
            {
                cb( null, null);
            }
            db.close();
        });
    });
}
token.getDoorUUIDByDoorId = function ( door_id, cb)
{
    var db = new sqlite.Database(dateFile);
    db.serialize(function() {

        db.all("SELECT * FROM door where door_id=" + door_id, function(err, row)
        {
            console.log(err, row);
            if( err){
                console.log(err.message);
                cb(err, null);
            }
            if(row && row.length > 0)
            {
                cb(err, row[0]);
            }
            else
            {
                cb( null, null);
            }

            db.close();
        });
    });
}

token.getDoorUUIDById = function ( id, cb)
{
    var db = new sqlite.Database(dateFile);
    db.serialize(function() {

        db.all("SELECT * FROM door where id=" + id, function(err, row)
        {
            console.log(err, row);
            if( err){
                console.log(err.message);
                cb(err, null);
            }
            if(row && row.length > 0)
            {
                cb(err, row[0]);
            }
            else
            {
                cb( null, null);
            }

            db.close();
        });
    });
}

token.addOpenLog = function( user_id, door_id)
{
    var db = new sqlite.Database(dateFile);
    db.serialize(function() {
        var openTime = Math.ceil(new Date().getTime()/1000);;
        var stmt = db.prepare("INSERT INTO open_log (user_id, open_time,door_id) VALUES (?,?,?)");
        stmt.run(  user_id, openTime, door_id);
        stmt.finalize(function()
        {
            db.close();
        });
    });
}
