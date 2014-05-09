/**
 * Created by chenpeng on 14-3-24.
 */

var door_id = "";
var lostCout = 0;
function print()
{
//    console.log(lostCout,counts);
    lostCout ++;
    $.post('/isUsed',{door_id:door_id}, function (data)
    {
        lostCout = 0;
        if(data == '1')
        {
            $("#timeout").text('');
            $("#info").text('正在刷新...');
            reloadImage();
        }
    });

    if(lostCout > 5)
    {
        reloadUrl();
        return;
    }
    if( counts >= 0)
    {
        if(-- counts < 0)
        {
            clearInterval(time);
            $("#timeout").text('');
            $("#info").text('正在刷新...');
            reloadImage();
        }
        else
        {
            $("#timeout").text(counts);
        }

    }
    if(counts == 30)
    {
        document.getElementById('timeout').removeAttribute('style');
        document.getElementById('info').removeAttribute('style');
    }

}
var time;
var counts = 0;
window.onload= function()
{
    console.log("init");
    if(document.getElementById("timeout"))
    {
        door_id = $('#door_id').text();
        console.log(door_id);
        console.log($("#timeout").text());
        counts = parseInt($("#timeout").text());
        if(counts > 30)
        {
            document.getElementById('timeout').setAttribute('style','display:none;');
            document.getElementById('info').setAttribute('style','display:none;');
        }
        time = setInterval("print()",1000);
    }


    if(document.getElementById('pw'))
    {
        document.getElementById('pw').focus();
        GetCookie();
    }
};

function onEnter()
{
    door_id = $("#door_id").val();
    console.log(door_id);
    $.post("/authDoor",{door_id:door_id},function(data)
    {
        console.log(data)
        window.location.reload();
    });
}

function reloadUrl(url)
{
    if(url)
    {
        window.location.href = url;
    }
    else
    {
        parent.location.reload()
    }
}
function reloadImage()
{

    clearInterval(time);
    $.post('/image',function(date)
    {
        console.log(date);
        var t = date.exp_time;
        counts = t;
        if(counts > 30)
        {
            document.getElementById('timeout').setAttribute('style','display:none;');
            document.getElementById('info').setAttribute('style','display:none;');
        }
        $("#timeout").text(t);
        $("#info").text('秒后刷新');
        time = setInterval("print()",1000);

        document.getElementById("image").src = date.src;
    });

}
function checkform()
{
    if( $("#pw").val() == "")
    {
        document.getElementById('pw').focus();
        return false;
    }
    else
    {
        saveInfo();
        return true;
    }
}

saveInfo = function(){
    try{

        var userpsw = document.getElementById('pw').value;
        if(userpsw!="" ){
            SetCookie(userpsw);
        }
    }catch(e){

    }
}

function SetCookie(psw){
    var Then = new Date()
    Then.setTime(Then.getTime() + 1866240000000)
    document.cookie = "keyWord=" + psw+";expires="+ Then.toGMTString();
}


function GetCookie(){
    var psd;
    var cookieString = new String(document.cookie)
    var cookieHeader = "keyWord="
    var beginPosition = cookieString.indexOf(cookieHeader)
    cookieString = cookieString.substring(beginPosition);
    var ends=cookieString.indexOf(";");
    if (ends!=-1){
        cookieString = cookieString.substring(0,ends);
    }
    if (beginPosition>-1){
        psd = cookieString.substring(cookieHeader.length);
        if (psd!=""){
            document.getElementById('pw').value=psd;
        }
    }
}