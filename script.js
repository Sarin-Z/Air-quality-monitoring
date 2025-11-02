// ============ ตั้งค่า MQTT ============
const MQTT_BROKER = 'ws://broker.hivemq.com:8000/mqtt';
const MQTT_TOPIC_PM = 'test/pm';
const MQTT_TOPIC_TEMP = 'test/temp';

let client = null;
let isConnected = false;

const connectBtn = document.getElementById('connectBtn');
const statusDiv = document.getElementById('status');
const pm1Div = document.getElementById('pm1');
const pm25Div = document.getElementById('pm25');
const pm10Div = document.getElementById('pm10');
const tempDiv = document.getElementById('temp');
const humidDiv = document.getElementById('humid');

// Elements สำหรับ air status
const airStatusText = document.getElementById('airStatusText');
const airMemeImg = document.getElementById('airMemeImg');
const airStatusLabel = document.getElementById('airStatusLabel');
const airStatusTextMobile = document.getElementById('airStatusTextMobile');
const airStatusLabelMobile = document.getElementById('airStatusLabelMobile');

// ฟังก์ชันประเมินคุณภาพอากาศ
function getAirQualityStatus(pm25Value) {
    const memeImages = {
        good: 'img/air-good.png',
        moderate: 'img/air-moderate.png',
        unhealthySensitive: 'img/air-bad.png',
        unhealthy: 'img/air-unheathy.png',
        veryUnhealthy: 'img/air-veryunhealthy.png',
        hazardous: 'img/air-dead.png'
    };

    if (pm25Value <= 25) {
        return {
            text: 'current PM 2.5 is...',
            label: 'good',
            className: 'level-good',
            meme: memeImages.good
        };
    } else if (pm25Value <= 37) {
        return {
            text: 'current PM 2.5 is...',
            label: 'moderate',
            className: 'level-moderate',
            meme: memeImages.moderate
        };
    } else if (pm25Value <= 50) {
        return {
            text: 'current PM 2.5 is...',
            label: 'pretty bad',
            className: 'level-unhealthy-sensitive',
            meme: memeImages.unhealthySensitive
        };
    } else if (pm25Value <= 90) {
        return {
            text: 'current PM 2.5 is...',
            label: 'unhealthy',
            className: 'level-unhealthy',
            meme: memeImages.unhealthy
        };
    } else if (pm25Value <= 120) {
        return {
            text: 'current PM 2.5 is...',
            label: 'very unhealthy',
            className: 'level-very-unhealthy',
            meme: memeImages.veryUnhealthy
        };
    } else {
        return {
            text: 'current PM 2.5 is...',
            label: 'DEAD',
            className: 'level-hazardous',
            meme: memeImages.hazardous
        };
    }
}

// ฟังก์ชันอัพเดท air status
function updateAirStatus(pm25Value) {
    const status = getAirQualityStatus(pm25Value);

    // อัพเดท Desktop version
    airStatusText.textContent = status.text;
    airStatusLabel.textContent = status.label;
    airStatusLabel.className = 'status-label ' + status.className;

    airMemeImg.src = status.meme;
    airMemeImg.style.display = 'block';

    // อัพเดท Mobile version (ไม่มีรูป)
    airStatusTextMobile.textContent = status.text;
    airStatusLabelMobile.textContent = status.label;
    airStatusLabelMobile.className = 'status-label ' + status.className;

    // เพิ่ม class has-data เพื่อแสดงส่วนนี้
    document.querySelector('.air-status-mobile').classList.add('has-data');
}

// ฟังก์ชันเชื่อมต่อ MQTT
function connectMQTT() {
    statusDiv.className = 'status connecting';
    statusDiv.innerHTML = '<i class="bi bi-arrow-repeat"></i> Connecting...';
    connectBtn.disabled = true;

    client = mqtt.connect(MQTT_BROKER, {
        clean: true,
        connectTimeout: 4000,
        clientId: 'dust_meter_' + Math.random().toString(16).substr(2, 8)
    });

    client.on('connect', function () {
        console.log('Connected to MQTT broker');
        isConnected = true;

        statusDiv.className = 'status connected';
        statusDiv.innerHTML = '<i class="bi bi-check-circle"></i> Connected';
        connectBtn.textContent = 'Disconnect';
        connectBtn.disabled = false;

        client.subscribe(MQTT_TOPIC_PM, function (err) {
            if (!err) console.log('Subscribed to: ' + MQTT_TOPIC_PM);
        });

        client.subscribe(MQTT_TOPIC_TEMP, function (err) {
            if (!err) console.log('Subscribed to: ' + MQTT_TOPIC_TEMP);
        });
    });

    client.on('message', function (topic, message) {
        console.log('Received from ' + topic + ':', message.toString());

        try {
            const data = JSON.parse(message.toString());

            if (topic === MQTT_TOPIC_PM) {
                pm1Div.textContent = data.pm1_0 || '--';
                pm25Div.textContent = data.pm2_5 || '--';
                pm10Div.textContent = data.pm10 || '--';

                // อัพเดท air status ตามค่า PM2.5
                if (data.pm2_5) {
                    updateAirStatus(parseFloat(data.pm2_5));
                }
            }

            if (topic === MQTT_TOPIC_TEMP) {
                tempDiv.textContent = data.temperature || '--';
                humidDiv.textContent = data.humidity || '--';
            }

        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    });

    client.on('error', function (err) {
        console.error('MQTT Error:', err);
        statusDiv.className = 'status disconnected';
        statusDiv.innerHTML = '<i class="bi bi-exclamation-circle"></i> Connection Error';
        connectBtn.disabled = false;
    });

    client.on('close', function () {
        console.log('Disconnected from MQTT broker');
        isConnected = false;

        statusDiv.className = 'status disconnected';
        statusDiv.innerHTML = '<i class="bi bi-x-circle"></i> Disconnected';
        connectBtn.textContent = 'Connect to MQTT';
        connectBtn.disabled = false;

        pm1Div.textContent = '--';
        pm25Div.textContent = '--';
        pm10Div.textContent = '--';
        tempDiv.textContent = '--';
        humidDiv.textContent = '--';

        airStatusText.textContent = '--';
        airStatusLabel.textContent = '--';
        airStatusLabel.className = 'status-label';
        airMemeImg.style.display = 'none';

        // ซ่อน mobile air status
        airStatusTextMobile.textContent = '--';
        airStatusLabelMobile.textContent = '--';
        airStatusLabelMobile.className = 'status-label';
        document.querySelector('.air-status-mobile').classList.remove('has-data');
    });
}

function disconnectMQTT() {
    if (client) {
        client.end();
    }
}

connectBtn.addEventListener('click', function () {
    if (isConnected) {
        disconnectMQTT();
    } else {
        connectMQTT();
    }
});