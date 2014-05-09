/**
 * Created by chenpeng on 14-3-25.
 */

var log = require('pomelo-logger').getLogger('web-log', __filename, process.pid);
process.env.LOGGER_LINE = true;

//var iconv = require('./lib/iconv.js');
var qrcode = require('./lib/qrcode');
var consts = require('./lib/consts/consts');
var token = require('./lib/token');
var socket = require('./lib/util/socket')

var routes = module.exports = function (app) {
    this.app = app;
    app.get('/', routes.index )
    app.post('/authDoor', routes.authDoor)
    app.post('/image', routes.image);

    app.get('/Open:code',routes.open);  //验证界面
    app.post('/Open', routes.doOpen);  //扫码开门
    app.post('/isUsed',routes.isUsed);
    app.post('/qrcallback', routes.qrcallback);
    //test
    app.get('/view',routes.view);
    app.get('/test', routes.test);
    return app.router;
}

routes.qrcallback = function ( req, res)
{
    //扫码回调
    log.info(JSON.stringify( req.body));

    var user_id = req.body.user_id;
    var code = req.body.qr_key;
    var is_subscribe = req.body.is_subscribe;

    token.check( code, function ( err, data)
    {
        log.info(JSON.stringify(data));
        if( data && data.token == code)
        {
            var door_id = data.door;
            this.app.set(data.door, "1");
            log.info("ok ! to check user","door", data.door);

            //OPEN
            token.addOpenLog( user_id, door_id);
            token.getDoorUUIDByDoorId(door_id, function(err, door)
            {
                if( err)
                {
                    log.error(err.stack);
                    res.render("error",{
                        header:"访问错误！",
                        info:"请重新扫码开门！"
                    });
                }
                else
                {
                    if( door && door.door_uuid)
                    {
                        var uuid = door.door_uuid.replace(new RegExp(',','g'),''); //清除','
                        this.app.set(uuid, "1");
                        socket.send(uuid,'k',function(error)
                        {
                            if(error)
                            {
                                log.error(error.message);
                                res.render("error",{
                                    header:"失败",
                                    info:error.message
                                });
                            }
                            else
                            {
                                log.info( "door", door_id, door.door_name, " open !");
                                res.render("error",{
                                    header:"成功",
                                    info:"门已经打开，请进！"
                                });
                            }

                        }); //开门

                    }
                    else
                    {
                        console.log("door", door);
                        res.render("error",{
                            header:"无法连接到门",
                            info:"请重新扫码开门！"
                        });
                    }
                }
            });




            req.session.door = {door_id:data.door};
            res.render("error",{
                header:"开门成功"
            });
        }
        else
        {
            console.log("error",err,data);
            //TODO error page
            res.render("error",{
                header:"访问链接失效",
                info:"请重新扫码开门！"
            });
        }
    });
}
routes.set = function ( req, res)
{
    console.log(req.query);
    if(req.query.door_id)
    {
        req.session.door = {door_id:req.query.door_id};
    }
    res.render("jump",{url:"http://" + this.app.get('host_') +":"+ this.app.get('port')});
}
routes.view = function (req, res)
{
    log.info(req.path);
    res.render('view',{list:socket.getClientList()});
}

routes.test = function (req, res)
{
    socket.sendAll("k");
    res.send(200);
    return;
    log.info('just test', req.path,req.params['id']);
    if(req.params['id'])
    {
        socket.send(req.params['id'],'k',function(error)
        {
            if(error)
            {
                res.send(JSON.stringify(error));
            }
            else
            {
                res.send(200);
            }

        });
    }else
    {
        res.send("没有发现ID");
    }
}

routes.index = function(req, res){


    //TODO 倒计时刷新代码
    console.log("index",req.sessionID);
    if(req.query.door_id)
    {
        req.session.door = {door_id:req.query.door_id};
    }

    if(req.session.door && req.session.door.door_id)
    {

        token.getToken(req.session.door.door_id, function (token)
        {
            var exp_time = token.exp_time - Math.ceil(new Date().getTime()/1000);

            log.info("token",token.token,"exp_time",exp_time);

            res.render("index",{
                    url:token.qr_url,//"/image.jpg",//"http://" + this.app.get('host_') +":"+ this.app.get('port') +"/image",
                    time:exp_time,
                    title:"门禁",
                    door_id:req.session.door.door_id
                }
            );
        });

    }
    else
    {
        res.render('doorAuth');
    }
};

routes.image = function( req, res)
{
    var now = Math.ceil(new Date().getTime()/1000);
    if(req.session.door && req.session.door.door_id)
    {
        token.getToken(req.session.door.door_id,function ( token)
        {
            var time = token.exp_time - now;
            console.log('exp_time : ' ,time,"token",token.token);

            res.send({
                exp_time:time,
                src:token.qr_url
            });
        });
    }
    else
    {
        res.render('doorAuth');
    }
};

routes.isUsed = function( req, res)
{
    log.debug("check token...(",req.session.door ? req.session.door.door_id:0,")");
    if(req.body && req.body.door_id)
    {
        var id = req.body.door_id;
        var status = this.app.get(id);
        if( status)
        {
            if(status == "1")
            {
                log.info(" change image .........", req.body.door_id);
                this.app.set(id,"0");
            }
        }
        else
        {
            status = "0";
            this.app.set(id,"0");
        }
        res.send(status);
    }
    else
    {
        res.send("0");
    }

}

routes.doOpen = function( req, res)
{
    if(req.session.door && req.body)
    {
        var password = req.body.password;
        var door_id = req.session.door.door_id;
        log.info(password,door_id);
        token.checkPassWordCode(password, function (err, pwd)
        {
            if( err)
            {
                log.error(err.stack);
                res.render("error",{
                    header:"访问异常",
                    info:"请重新扫码开门！"
                });
            }
            else
            {
                if( pwd && pwd.password == password)
                {
                    //OPEN
                    token.addOpenLog(pwd.id, door_id);
                    token.getDoorUUIDByDoorId(door_id, function(err, door)
                    {
                        if( err)
                        {
                            log.error(err.stack);
                            res.render("error",{
                                header:"访问错误！",
                                info:"请重新扫码开门！"
                            });
                        }
                        else
                        {
                            if( door && door.door_uuid)
                            {
                                var uuid = door.door_uuid.replace(new RegExp(',','g'),''); //清除','
                                this.app.set(uuid, "1");
                                socket.send(uuid,'k',function(error)
                                {
                                    if(error)
                                    {
                                        log.error(error.message);
                                        res.render("error",{
                                            header:"失败",
                                            info:error.message
                                        });
                                    }
                                    else
                                    {
                                        log.info( "door", door_id, door.door_name, " open !");
                                        res.render("error",{
                                            header:"成功",
                                            info:"门已经打开，请进！"
                                        });
                                    }

                                }); //开门

                            }
                            else
                            {
                                console.log("door", door);
                                res.render("error",{
                                    header:"无法连接到门",
                                    info:"请重新扫码开门！"
                                });
                            }
                        }
                    });
                }
                else
                {
                    console.log("pwd",pwd);
                    res.render("error",{
                        header:"密码错误",
                        info:"请重新扫码开门！"
                    });
                }
            }
        });
    }
    else
    {
        console.log('session', req.session,"body",req.body);
        res.render("error",{
            header:"访问链接失效",
            info:"请重新扫码开门！"
        });
    }
    delete req.session.door;
}


routes.open = function( req, res)
{
    log.info(req.path,req.params['code']);
    var code = req.params['code'];
    token.check( code, function ( err, data)
    {
        log.info(data);
        if( data && data.token == code)
        {

            this.app.set(data.door, "1");
            log.info("ok ! to check user","door", data.door);
            req.session.door = {door_id:data.door};
            res.render("doOpen");
        }
        else
        {
            console.log("error",err,data);
            //TODO error page
            res.render("error",{
                header:"访问链接失效",
                info:"请重新扫码开门！"
            });
        }
    });
}
routes.authDoor = function ( req, res)
{
    log.info(req.body);
    if( req.body.door_id)
    {
        req.session.door = {door_id:req.body.door_id};
        console.log("authDoor",req.session);
        res.send("0");
    }
    else
    {
        res.send("1");
    }
}