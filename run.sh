#! /bin/sh
start(){
 now=`date "+%Y-%m-%d-%H:%M:%S"`
 exec forever start -l logs/"$now"_forever.log -o logs/"$now"_out.log -e logs/"$now"_err.log app.js
 #nohup node app.js 5 > logs/"$now"_RunTime.log &
}
#停止方法
stop(){
 exec forever stop app.js
# ps -ef|grep 'node app.js' |awk '{print $2}' |while read pid
#
# do
#    kill -9 $pid
# done
}

case "$1" in
start)
start
;;
stop)
stop
;;  
restart)
stop
start
;;
*)
printf 'Usage: %s {start|stop|restart}\n' "$prog"
exit 1
;;
esac
