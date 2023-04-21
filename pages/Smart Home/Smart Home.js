// pages/Smart Home/Smart Home.js

const mqtt = require("../../utils/mqtt.min");

var client = null;  // mqtt客户端
let isMqttConnected = false;    // mqtt客户端是否已连接
var LEDcommand = "openLED"; // 开关灯指令
var ledStatus = 1;  // LED灯的状态-0:开启,1:关闭
var weatherInfo = {
    "local": ["广东", "番禺"],
    "weather": "晴",
    "tmpWeather": "06",
    "humWeather": "13",
    "windDirect": "北",
    "windPower": "4",
    "reportTime": "2023-04-10 23:52:20"
};

var ledCommand = {
    "command": "control",
    "LED": "on"
};

Page({
    data: {
        "tmpText": "06",
        "humText": "13",
        "weatherColorText": "#2486b9",
        "LEDcolorText": "#47484c",
        "humColorText": "#1661ab",
        "tmpColorText": "#c3d7df",
        "rfidColorText": "#20a162",
        "LEDswitchText": false,
        "localText": weatherInfo.local,
        "weatherText": weatherInfo.weather,
        "tmpWeatherText": weatherInfo.tmpWeather,
        "humWeatherText": weatherInfo.humWeather,
        "windDirectText": weatherInfo.windDirect,
        "windPowerText": weatherInfo.windPower,
        "reportTimeText": weatherInfo.reportTime,
        "weatherIconText": "晴",
        "ledStatusIconText": "灭",
        "rfidArray": [],
        "isRfidNULL": true
    },
    onLoad(options) {
        this.connectMqtt();
        //获取chart-container的宽度和高度
        this.timer = setInterval(this.refreshPage, 3000);
    },

    LEDswitch: function () {
        if (isMqttConnected) {
            client.publish("GX/miniProgram", JSON.stringify(ledCommand));
            if (ledStatus === 1) {
                this.setData({
                    // "switchLED": '关灯',
                    "LEDcolorText": "#d8e3e7",
                    "ledStatusIconText": "亮"
                });
                ledStatus = 0;
                ledCommand.LED = "off";
            } else {
                this.setData({
                    // "switchLED": '开灯',
                    "LEDcolorText": "#47484c",
                    "ledStatusIconText": "灭"
                });
                ledStatus = 1;
                ledCommand.LED = "on";
            }
        }
        else {
            // console.log("MQTT服务器未连接...");
        }
    },

    connectMqtt: function () {
        var that = this;
        const options = {
            connectTimeout: 4000,
            clientId: 'miniProgram_' + Math.random().toString(16).substr(2, 8),
            port: 8084,
            username: "gwf"
        };
        console.log("clientId:" + options.clientId);
        client = mqtt.connect("wxs://mqtt.gwf.icu/mqtt", options);
        client.on("connect", (e) => {
            // console.log("服务器连接成功");
            isMqttConnected = true;
            client.subscribe("GX/rpi", { qos: 0 }, function (err) {
                if (!err) {
                    // console.log("订阅成功");
                }
            });
            this.getRpiInfo();
            wx.hideLoading();
            wx.stopPullDownRefresh();
        });
        // 信息监听事件
        client.on("message", function (topic, message) {
            // console.log("收到:" + message);
            var jsonMessage = JSON.parse(message);
            if (("command" in jsonMessage) && "report" === jsonMessage.command) {
                if (jsonMessage.status != undefined) {
                    if ("LED" in jsonMessage.status) {
                        if (jsonMessage.status.LED === "on") {
                            ledStatus = 0; ledCommand.LED = "off"; that.setData({
                                "LEDcolorText": "#d8e3e7",
                                "ledStatusIconText": "亮"
                            });
                        }
                        else if (jsonMessage.status.LED === "off") {
                            ledStatus = 1; ledCommand.LED = "on"; that.setData({
                                "LEDcolorText": "#47484c",
                                "ledStatusIconText": "灭"
                            });
                        }
                    }
                    if ("tmp" in jsonMessage.status) {
                        that.setData({
                            tmpText: jsonMessage.status.tmp
                        });
                    }
                    if ("hum" in jsonMessage.status) {
                        that.setData({
                            humText: jsonMessage.status.hum
                        });
                    }
                    if ("rfid" in jsonMessage.status) {
                        if (Object.keys(jsonMessage.status.rfid).length > 0) {
                            that.setData({
                                "rfidArray": jsonMessage.status.rfid,
                                "isRfidNULL": false
                            });
                        }

                    }
                }
                if (jsonMessage.weatherInfo != undefined) {
                    that.setData({
                        localText: jsonMessage.weatherInfo.local,
                        weatherText: jsonMessage.weatherInfo.weather,
                        tmpWeatherText: jsonMessage.weatherInfo.tmpWeather,
                        humWeatherText: jsonMessage.weatherInfo.humWeather,
                        windDirectText: jsonMessage.weatherInfo.windDirect,
                        windPowerText: jsonMessage.weatherInfo.windPower,
                        reportTimeText: jsonMessage.weatherInfo.reportTime,
                    });
                    if (that.data.weatherText.includes("晴")) { that.setData({ weatherIconText: "晴" }); }
                    if (that.data.weatherText.includes("阴")) { that.setData({ weatherIconText: "阴天" }); }
                    if (that.data.weatherText.includes("雨")) { that.setData({ weatherIconText: "雨" }); }
                }
            }
            that.sendAck();
            that.refreshPage();
            wx.hideLoading();
        });
        client.on("reconnect", (error) => {
            // console.log("正在重连...", error);
        });
        client.on("error", (error) => {
            // console.log("连接失败...", error);
        });
    },

    getRpiInfo: function () {
        const send_message = {
            "command": "get"
        }
        client.publish("GX/miniProgram", JSON.stringify(send_message));
    },

    refreshPage: function () {
        if (ledStatus == 1) {
            this.setData({
                LEDswitchText: false
            })
        } else {
            this.setData({
                LEDswitchText: true
            })
        }
    },

    sendAck: function () {
        const send_message = {
            "command": "ack"
        };
        client.publish("GX/miniProgram", JSON.stringify(send_message));
    },

    onSyncRefresh: function () {
        var that = this;
        // 开始刷新
        wx.showLoading({
            title: '同步中',
        });
        if (client.connected) {
            // console.log("已连接，获取数据");
            this.getRpiInfo();
        }
        else {
            this.connectMqtt();
        }
    },



    onReady() {

    },


    onShow() {
        wx.showLoading({
            title: '同步中',
        });
        isMqttConnected = false;
        if (client.connected) {
            client.reconnect();
        }
        this.getRpiInfo();
    },


    onHide() {

    },


    onUnload() {

    },

    // 下拉刷新
    onPullDownRefresh() {
        // loading提示框
        wx.showLoading({
            title: '同步中',
        });
        if (isMqttConnected) {
            // console.log("正在断开连接");
            // console.log("正在重连");
            isMqttConnected = false;
            client.reconnect();
        }
        this.getRpiInfo();
    },

    onReachBottom() {

    },


    onShareAppMessage() {

    }
})