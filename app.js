const hexToBinary = require('./fun/hex2binary');
let RawMessage = "8D40621D58C382D690C8AC2863A7";
let BinaryMessage = hexToBinary(RawMessage);

const NZ = 15;
const LATref = 52.258;
const LONGref = 3.918;
const PI = 360 / Math.PI;

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

function getAltitude() {
    let data = '';
    for(let i = 40; i <= 51; ++i) {
        data = data + BinaryMessage[i];
    }
    return data;
}

function getTime() {
    return BinaryMessage[52];
}

function getCPROddOrEvenFrameFlag() {
    return BinaryMessage[53];
}

function getLatitudeInCPRFormat() {
    let data = '';
    for(let i = 54; i <= 70; ++i) {
        data = data + BinaryMessage[i];
    }
    return data;
}

function getLongtitudeInCPRFormat() {
    let data = '';
    for(let i = 71; i <= 87; ++i) {
        data = data + BinaryMessage[i];
    }
    return data;
}

function floor(number) {
    return Math.floor(number);
}

function mod(x, y) {
    return x - y * floor(x/y);
}


function calcAltitude() {
    let data = getAltitude();
    let N = data[7] == 0 ?  100 : 25; //根据第8位 Q bit， 确定基数是100ft 还是25ft 0: 100ft 1:25ft
    let newData = ''; //获取除了第8位之外的11位数
    for(let i=0; i < 7; ++ i) {
        newData = newData + data[i];
    }
    for(let i=8; i <= 11; ++ i) {
        newData = newData + data[i];
    }
    return parseInt(newData, 2) * N - 1000;
}

// 似乎没啥用的一个函数 和下一个函数一致，用下一个函数即可 
function calcNL_lat() {
    return floor(
        (2*Math.PI)/
        (Math.acos(
            1 - 
            (
                (1-Math.cos(Math.PI/(2*NZ))/
                (Math.cos(Math.PI/180*calcRawLatitude()) * Math.cos(Math.PI/180*calcRawLatitude))
            )
        )
    )));
}

function calcNL() {
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
    console.log("RawLatitude = ", RawLatitude);
    return RawLatitude;
}

function calcRawLongtitude() {
    return parseInt(getLongtitudeInCPRFormat(), 2);
}

function calcDLat() {
    const DLat = getCPROddOrEvenFrameFlag() == 0 ? 360 / (4 * NZ) : 360.0 / (4 * NZ - 1);
    console.log("DLat = ", DLat);
    return DLat;
}

function clacLatitudeIndexJ() {
    const dLat = calcDLat();
    console.log(mod(LATref, dLat));
    const LatitudeIndexJ =  floor(LATref/dLat) + floor((mod(LATref, dLat)/dLat) - calcRawLatitude() + 1/2);
    console.log("LatitudeIndexJ = ", LatitudeIndexJ);
    return LatitudeIndexJ;
}


console.log(clacLatitudeIndexJ())
function calcLatitude() {
    return dLat*(clacLatitudeIndexJ() + calcRawLatitude());
}


console.log(calcAltitude())
// const Decoder = require('mode-s-decoder')
// const decoder = new Decoder()
// const data = new Uint8Array([0x8f, 0x46, 0x1f, 0x36, 0x60, 0x4d, 0x74, 0x82, 0xe4, 0x4d, 0x97, 0xbc, 0xd6, 0x4e])
// const newdata = new Uint8Array([0x8d, 0x40, 0x62, 0x1d, 0x58, 0xc3, 0x82, 0xd6, 0x90, 0xc8, 0xac, 0x28, 0x63, 0xa7]);
// console.log(newdata.toString(2))
// const message = decoder.parse(newdatah)
// console.log(message)