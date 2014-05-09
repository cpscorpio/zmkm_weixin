#! /bin/sh
start(){
 now=`date "+%Y-%m-%d-%H:%M:%S"`
 exec forever start -l logs/"$now"_forever.log -o logs/"$now"_out.log -e logs/"$now"_err.log app.js
}
#停止方法
stop(){
 exec forever stop app.js
}

case "$1" in
start)
start
;;
stop)
stop
;;
*)
printf 'Usage: %s {start|stop}\n' "$prog"
exit 1
;;
esac
