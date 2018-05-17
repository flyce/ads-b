const hexToBinary = require('./fun/hex2binary');
const lineReader = require('line-reader');
// let RawMessage = "8D40621D58C382D690C8AC2863A7";
// let RawMessageTwo = "8D40621D58C386435CC412692AD6";

const NZ = 15;
// 参考经纬度，请根据实际情况修订
const LATref = 52.258;
const LONGref = 3.918;

async function readFile() {
    const buffer = await readFilePromise('./DF17.TXT');
    let data = buffer.toString(); //=> '... file contents ...'
    console.log(buffer);
}

let lastOne = '';
let lineCount = 0;
lineReader.eachLine('./DF17.TXT', function(line, last) {
    lineCount++;
    console.log();
    console.log("第", lineCount, "行数据");
    if (lastOne !== '') {
        let messageOne = dataProcessor(lastOne), messageTwo = dataProcessor(line);
        let location = calcLocationWithTwoMessage(messageOne, messageTwo);
        if (location.error == null) {
            console.log("数据1: %s, 数据2: %s", lastOne, line);
            console.log("数据1高度: %s, 数据2高度: %s", messageOne.Altitude, messageTwo.Altitude);
            console.log("经度: %s, 纬度: %s", location.Latitude, location.Longitude);
        } else {
            location = calcLocationWithOneMessage(messageTwo);
            console.log("数据: %s", line);
            console.log("高度: %s", messageTwo.Altitude);
            console.log("经度: %s, 纬度: %s", location.Latitude, location.Longitude);
        }
    } else {
        lastOne = line;
        let message = dataProcessor(line);
        location = calcLocationWithOneMessage(message);
        console.log("数据: %s", line);
        console.log("高度: %s", message.Altitude);
        console.log("经度: %s, 纬度: %s", location.Latitude, location.Longitude);
    }
});

// 数据处理 十六进制 转 二进制
function dataProcessor(rawInformation) {
    let BinaryMessage = hexToBinary(rawInformation);
    return {
        "EvenOrOddFlag": BinaryMessage[53],
        "ICAO24": getICAO24Address(BinaryMessage),
        "Latitude": parseInt(getLatitudeInCPRFormat(BinaryMessage), 2) / 131072,
        "Longitude": parseInt(getLongitudeInCPRFormat(BinaryMessage), 2) / 131072,
        "Altitude": calcAltitude(BinaryMessage),
        "Time": BinaryMessage[52]
    }
}
// 获取高度数据
function getAltitude(message) {
    let data = '';
    for(let i = 40; i <= 51; ++i) {
        data = data + message[i];
    }
    return data;
}

// 计算高度
function calcAltitude(message) {
    let data = getAltitude(message);
    let N = data[7] == 0 ?  100 : 25; //根据第8位 Q bit， 确定基数是100ft 还是25ft 0: 100ft 1:25ft
    let newData = ''; //获取除了第8位之外的11位数
    for(let i=0; i < 7; ++i) {
        newData = newData + data[i];
    }
    for(let i=8; i <= 11; ++i) {
        newData = newData + data[i];
    }
    return parseInt(newData, 2) * N - 1000;
}

// 计算 ICAO 地址
function getICAO24Address(message) {
    let data = '';
    for(let i = 8; i <= 31; ++i) {
        data = data + message[i];
    }
    return data;
}

// 获取 CPR 格式下的 经度
function getLatitudeInCPRFormat(message) {
    let data = '';
    for(let i = 54; i <= 70; ++i) {
        data = data + message[i];
    }
    return data;
}

// 获取 CPR 格式下的 纬度
function getLongitudeInCPRFormat(message) {
    let data = '';
    for(let i = 71; i <= 87; ++i) {
        data = data + message[i];
    }
    return data;
}

// 计算经纬度 两条数据
function calcLocationWithTwoMessage(messageOne, messageTwo) {
    // 计算两个过数据的ICAO是否一致， 不一致则不进行计算
    if (messageOne.ICAO24 != messageTwo.ICAO24) {
        return {
            "error": "Not the same plane, wrong input！"
        }
    }

    let messageEven, messageOdd;
    let dLatEven = 360 / 60;
    let dLatOdd = 360 / 59;

    // 确定输入的两个数据的奇偶性
    if (messageOne.EvenOrOddFlag == 0) {
        messageEven = messageOne;
        messageOdd = messageTwo;
    } else {
        messageEven = messageTwo;
        messageOdd = messageOne;
    }
    let j = floor(59 * messageEven.Latitude - 60 * messageOdd.Latitude + (1 / 2));
    let LatEven = dLatEven * (mod(j, 60) + messageEven.Latitude);
    LatEven = LatEven >= 270 ? LatEven - 360 : LatEven;
    let LatOdd = dLatOdd * (mod(j, 59) + messageOdd.Latitude);
    LatOdd = LatOdd >= 270 ? LatOdd -360 : LatOdd;
    let location =  {
        "LatEven": LatEven,
        "LatOdd": LatOdd,
        "Latitude": messageEven.Time >= messageOdd.Time ? LatEven : LatOdd,
        "IndexJ": j
    };

    if (messageEven.Time >= messageOdd.Time) {
        let ni = NL(location.LatEven);
        ni = ni >= 1 ? ni : 1;
        let dLon = 360 / ni;
        let m = floor(messageEven.Longitude * (NL(location.LatEven) - 1) - messageOdd.Longitude * NL(location.LatEven) + 1 / 2);
        let longitude = dLon * (mod(m, ni) + messageEven.Longitude);
        location.Longitude = longitude;
        location.IndexM = m;
        location.EvenOrOddFlag = "even >= odd";
        return location;
    } else {
        let ni = NL(location.LatOdd);
        ni = ni - 1 >= 1 ? ni - 1 : 1;
        let dLon = 360 / ni;
        dLon = dLon >= 180 ? dLon - 360 : dLon;
        let m =floor(messageEven.longitude * (NL(location.LatOdd) - 1) - messageOdd.longitude * NL(location.LatOdd) + 1 /2);
        let longitude = dLon * (mod(m, ni) + messageOdd.Longitude);
        location.Longitude = longitude;
        location.IndexM = m;
        location.EvenOrOddFlag = "odd > even";
        return location;
    }
}

// 计算经纬度 一条数据
function calcLocationWithOneMessage(message) {
    let dLat = message.EvenOrOddFlag === 0 ? 360 / 60 : 360 / 59;
    let j = floor(LATref / dLat) + floor(mod(LATref, dLat) / dLat - message.Latitude + 1 / 2);
    let Latitude = dLat * (j + message.Latitude);
    let nl = NL(Latitude);
    let dLon = nl > 0 ? 360 / nl : nl;
    let m = floor(LONGref/dLon) + floor(mod(LONGref, dLon) / dLon - message.Longitude + 1 / 2);
    let Longitude = dLon * (m + message.Longitude);
    let location = {
        dLat, j, Latitude, m, Longitude
    };
    return location;
}

// NL 计算公式，由于js限制，只能分开计算，否则返回Nan
function NL(lat) {
    let data1 = (2 * Math.PI), data2 = (1-Math.cos(Math.PI/(2*NZ))), data3 = Math.cos(Math.PI/180*(lat));
    let data = floor(data1 / (Math.acos(1 - (data2/ (data3 * data3)))));
    return data;
}

// floor函数
function floor(number) {
    return Math.floor(number);
}

// mod函数
function mod(x, y) {
    return x - y * floor(x/y);
}

