/**
 * Created by chenpeng on 14-3-25.
 */

var utils = module.exports;

utils.sendMail = function (message, error)
{
//    var mail = require('nodemailer');
//    var email = "844653009@qq.com";
//    var content = message + " <br /><br />" + utils.DateFormat(new Date()) + " <br /><br />" +  error.replace(new RegExp('\n','g'),'<br/>\n');
//
//    var smtpTransport = mail.createTransport("SMTP",{
//        host: "smtp.exmail.qq.com",
//        secureConnection: true, // 使用 SSL
//        port: 465, // SMTP 端口
//        auth: {
//            user: "service@xnal.cn",
//            pass: "jnh123"
//        }
//    });
//    var mailOptions = {
//        from: "service@xnal.cn", // sender address
//        to: email, // list of receivers
//        subject: "ParentsHeart gameServer Error" + message, // Subject line
//        text: content, // plaintext body
//        html: content // html body
//    }
//    smtpTransport.sendMail(mailOptions,function(error, response){
//        console.log(error, response);
//    });
}

utils.DateMSFormat = function (ms,format)
{
    if( ms > 0)
    {
        var date = new Date();
        date.setTime(ms * 1000);
        return utils.DateFormat(date,format);
    }
    else
    {
        return "0";
    }

}
utils.DateFormat = function ( date, format)
{
    if( !format )
    {
        format = "yyyy-MM-dd hh:mm:ss";
    }

    if(date == undefined) return "0000-00-00 00:00:00";
    if( typeof  date == "string") return date;

    var o = {
        "M+" : date.getMonth()+1, //month
        "d+" : date.getDate(), //day
        "h+" : date.getHours(), //hour
        "m+" : date.getMinutes(), //minute
        "s+" : date.getSeconds(), //second
        "q+" : Math.floor((date.getMonth()+3)/3), //quarter
        "S" : date.getMilliseconds() //millisecond
    }

    if(/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (date.getFullYear()+"").substr(4 - RegExp.$1.length));
    }

    for(var k in o) {
        if(new RegExp("("+ k +")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length==1 ? o[k] : ("00"+ o[k]).substr((""+ o[k]).length));
        }
    }
    return format;
}


function request(url,data,method,fn)
{
    data = data || {};

    var content=require('querystring').stringify(data);
    var parse_u=require('url').parse(url,true);
    var isHttp=parse_u.protocol=='http:';
    var options = {
        host:parse_u.hostname,
        port:parse_u.port||(isHttp?80:443),
        path:parse_u.path,
        method:method,
        headers:{
            'Content-Type':'application/x-www-form-urlencoded',
            'Content-Length':content.length
        }
    };
    var req = require(isHttp?'http':'https').request(options,function(res){
        var _data='';
        res.on('data', function(chunk){
            _data += chunk;
        });
        res.on('end', function(){
            fn!=undefined && fn(_data);
        });
    });
    req.write(content);
    req.end();
}

utils.post = function(url, data, cb)
{
    request(url,data,"POST",cb);
}

utils.get = function(url, cb)
{
    console.log("get " + url);
    request(url,null,"GET",cb);
}