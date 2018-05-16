const hexToBinary = require('./fun/hex2binary');
let RawMessage = "8D40621D58C382D690C8AC2863A7";
let RawMessageTwo = "8D40621D58C386435CC412692AD6";

const NZ = 15;
const LATref = 52.258;
const LONGref = 3.918;


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

// 计算经度
function calcLatitude(messageOne, messageTwo) {

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
    console.log(messageEven);
    console.log(messageOdd);
    let j = floor(59 * messageEven.Latitude - 60 * messageOdd.Latitude + (1 / 2));
    let LatEven = dLatEven * (mod(j, 60) + messageEven.Latitude);
    LatEven = LatEven >= 270 ? LatEven - 360 : LatEven;
    let LatOdd = dLatOdd * (mod(j, 59) + messageOdd.Latitude);
    LatOdd = LatOdd >= 270 ? LatOdd -360 : LatOdd;
    let location =  {
        "LatEven": LatEven,
        "LatOdd": LatOdd,
        "Latitude": messageEven.Time >= messageOdd.Time ? LatEven : LatOdd
    };

    console.log(location);

    if (messageEven.Time >= messageOdd.Time) {
        console.log("even > odd");
        let ni = NL(location.LatEven);
        ni = ni >= 1 ? ni : 1;
        let dLon = 360 / ni;
        let m = floor(messageEven.Longitude * (NL(location.LatEven) - 1) - messageOdd.Longitude * NL(location.LatEven) + 1 / 2);
        let longitude = dLon * (mod(m, ni) + messageEven.Longitude);
        console.log(longitude);
    } else {
        console.log("odd > even");
        let ni = NL(location.LatOdd);
        ni = ni - 1 >= 1 ? ni - 1 : 1;
        let dLon = 360 / ni;
        let m =floor(messageEven.longitude * 131072 * (NL(location.LatOdd) - 1) - messageOdd.longitude * 131072 * NL(location.LatOdd) + 1 /2);
        let longitude = dLon * (mod(m, ni) + messageOdd.Longitude * 131072);
        console.log(longitude);
    }
}


// 此函数有问题，无法得到预期的结果
async function NL(lat) {
    let data =floor(
        (2 * Math.PI) /
        (Math.acos(
            1 -
            (
                (1-Math.cos(Math.PI/(2*NZ))/
                    (Math.cos(Math.PI/180*(lat)) * Math.cos(Math.PI/180*(lat)))
                )
            )
        )));
    return data;
}


console.log(calcLatitude(dataProcessor(RawMessage), dataProcessor(RawMessageTwo)));

























function getDownlinkFormat() {
    let data = '';
    for(let i = 0; i <= 4; ++i) {
        data = data + BinaryMessage[i];
    }
    return data;
}

function getTypeCode() {
    let data = '';
    for(let i = 32; i <= 36; ++i) {
        data = data + BinaryMessage[i];
    }
    return data;
}

function getSurveillanceStatus() {
    let data = '';
    for(let i = 37; i <= 38; ++i) {
        data = data + BinaryMessage[i];
    }
    return data;
}

function getNICSUpplement_B() {
    return BinaryMessage[39];
}



function getTime() {
    return BinaryMessage[52];
}

function getCPROddOrEvenFrameFlag() {
    return BinaryMessage[53];
}



function floor(number) {
    return Math.floor(number);
}

function mod(x, y) {
    return x - y * floor(x/y);
}




// 似乎没啥用的一个函数 和下一个函数一致，用下一个函数即可
function calcNL_lat() {
    return floor(
        (2*Math.PI)/
        (Math.acos(
            1 -
            (
                (1-Math.cos(Math.PI/(2*NZ))/
                (Math.cos(Math.PI/180*(calcRawLatitude()/131072)) * Math.cos(Math.PI/180*(calcRawLatitude()/131072)))
            )
        )
    )));
}

function calcNL1() {
    let NL =  0;
    const rawLatitude = calcRawLatitude();
    if ( rawLatitude == 0 ){
        NL = 59;
    }

    if ( rawLatitude == 87 ){
        NL = 2;
    }

    if ( rawLatitude == -87 ){
        NL = 2;
    }

    if ( rawLatitude > 87 ){
        NL = 1;
    }

    if ( rawLatitude < -87 ){
        NL = 1;
    }

    return NL;
}


function calcRawLatitude() {
    const RawLatitude = parseInt(getLatitudeInCPRFormat(), 2);
    return RawLatitude;
}

function calcRawLongtitude() {
    return parseInt(getLongtitudeInCPRFormat(), 2);
}

function calcDLat() {
    const DLat = getCPROddOrEvenFrameFlag() == 0 ? 360 / (4 * NZ) : 360.0 / (4 * NZ - 1);
    return DLat;
}

function clacLatitudeIndexJ() {
    const dLat = calcDLat();
    const LatitudeIndexJ =  floor(LATref/dLat) + floor((mod(LATref, dLat)/dLat) - calcRawLatitude()/131072.0 + 1/2);
    return LatitudeIndexJ;
}

function calcLatitudeOOOOO() {
    return calcDLat() * (clacLatitudeIndexJ() + calcRawLatitude()/131072);
}
// console.log(calcLatitude());

function calcDLon() {
    const NL_lat = calcNL_lat();
    console.log("NL_lat: ", NL_lat);
    if ( NL_lat > 0) {
        return 360/(NL_lat*0.6);
    }

    if(NL_lat == 0) {
        return 360;
    }
}

function calcLongtitudeIndexM() {
    const dLon = calcDLon();
    console.log("dLon: ", dLon);
    const LongtitudeIndexM = floor(LONGref/dLon) + floor(mod(LONGref, dLon)/dLon - calcRawLongtitude()/131072 + 1/2);
    console.log(LongtitudeIndexM)
    return LongtitudeIndexM;
}

function calcLongtitude() {
    return calcDLon() * (calcLongtitudeIndexM() + calcRawLongtitude()/131072);
}

// console.log(calcLongtitude());
// const Decoder = require('mode-s-decoder')
// const decoder = new Decoder()
// const data = new Uint8Array([0x8f, 0x46, 0x1f, 0x36, 0x60, 0x4d, 0x74, 0x82, 0xe4, 0x4d, 0x97, 0xbc, 0xd6, 0x4e])
// const newdata = new Uint8Array([0x8d, 0x40, 0x62, 0x1d, 0x58, 0xc3, 0x82, 0xd6, 0x90, 0xc8, 0xac, 0x28, 0x63, 0xa7]);
// console.log(newdata.toString(2))
// const message = decoder.parse(newdatah)
// console.log(message)