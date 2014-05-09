/**
 * Created by chenpeng on 14-3-25.
 */
window.onload= function()
{
    setInterval("test()",1000);
}

function print()
{
    $.get('/statusACBD1234567EFFFE86',function (data)
    {
        console.log(data);
        if(data == '1')
        {
            var oTest = document.getElementById("info");
            var newNode = document.createElement("p");
            var now = new Date();
            newNode.innerHTML = "door open at " + now.getFullYear() + '-' + now.getMonth() + '-' + now.getDate()
                + " " + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();
            oTest.appendChild(newNode);
        }
    });
}

function test()
{
    $.post('/test123',{username:'123456'},function ()
    {

    });
}