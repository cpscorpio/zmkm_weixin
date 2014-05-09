var logger = require('pomelo-logger').getLogger('log', __filename, process.pid);

process.env.LOGGER_LINE = true;
logger.info('test1');
logger.warn('test2');
logger.error('test3');

var utils = require('../lib/util/utils');

utils.post("http://124.127.89.52:4000/qrcallback", null, function (da)
{
    console.log("data", da);
});
//utils.get("http://v.ubox.cn/wx_open/interface_load_wx_qr?app_name=gift&qr_key=123&ex_time=300",function ( data)
//{
//    if ( typeof data == "string")
//    {
//        console.log(data);
//        data = eval( "(" + data + ")");
//
//    }
//
//    console.log( data.code, data.data.qr_url);
//
//
//});