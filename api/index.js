const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const userLimits = {};
const MAX_LIMIT = 4;

// 17 ENDPOINT LENGKAP - TIDAK ADA YANG DIKURANGI
const endpointMap = {
    'NODE_01': { path: 'getcontact', method: 'GET' },
    'NODE_02': { path: 'truecaller', method: 'GET' },
    'NODE_03': { path: 'leakosint', method: 'GET' },
    'NODE_04': { path: 'whatsappleak', method: 'GET' },
    'NODE_05': { path: 'ewallet', method: 'GET' },
    'NODE_06': { path: 'dataguru', method: 'GET' },
    'NODE_07': { path: 'emailleak', method: 'GET' },
    'NODE_08': { path: 'nameleak', method: 'GET' },
    'NODE_09': { path: 'datasiswa', method: 'GET' },
    'NODE_10': { path: 'ceknik', method: 'GET' },
    'NODE_11': { path: 'dbdcphone', method: 'GET' },
    'NODE_12': { path: 'bpjspasien', method: 'GET' },
    'NODE_13': { path: 'bpjspersonil', method: 'GET' },
    'NODE_14': { path: 'namadukcapil', method: 'GET' },
    'NODE_15': { path: 'nikdukcapil', method: 'GET' },
    'NODE_16': { path: 'kkdukcapil', method: 'GET' },
    'NODE_17': { path: 'datasekolah', method: 'POST' }
};

app.post('/api/search', async (req, res) => {
    const { nodeId, query } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const today = new Date().toDateString();

    if (!endpointMap[nodeId]) {
        return res.status(400).json({ status: 'error', message: 'Target Node tidak valid.' });
    }

    if (!userLimits[userIp] || userLimits[userIp].date !== today) {
        userLimits[userIp] = { count: 0, date: today };
    }

    if (userLimits[userIp].count >= MAX_LIMIT) {
        return res.json({ status: 'limit_reached', message: 'Akses ditolak: Limit harian (4x) habis.' });
    }

    try {
        const targetConfig = endpointMap[nodeId];
        const targetUrl = `http://api.adx7.com/${targetConfig.path}`;
        
        // Mengirim banyak variasi parameter agar salah satunya pasti "nyangkut" di API target
        const payloadParams = { query: query, q: query, search: query, id: query, nik: query, phone: query };
        
        // Menambahkan User-Agent agar tidak dicurigai sebagai bot spam
        const axiosConfig = {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 SANN404/Intel' },
            params: targetConfig.method === 'GET' ? payloadParams : {}
        };

        let response;
        if (targetConfig.method === 'POST') {
            response = await axios.post(targetUrl, payloadParams, axiosConfig);
        } else {
            response = await axios.get(targetUrl, axiosConfig);
        }

        // APA PUN HASILNYA, SELAMA API MERESPONS 200 OK, KITA TAMPILKAN DATANYA
        if (response.status === 200) {
            userLimits[userIp].count += 1;
            return res.json({
                status: 'success',
                data: response.data,
                limit_remaining: MAX_LIMIT - userLimits[userIp].count
            });
        }

    } catch (error) {
        // TANGKAP ERROR ASLI DARI API AGAR BISA DIDEBUG
        let errorMsg = 'Koneksi ke server target gagal total / Timeout.';
        let errorData = null;

        if (error.response) {
            // Server target menolak (misal error 404, 500, dll)
            errorMsg = `API Target Menolak Request (Kode: ${error.response.status})`;
            errorData = error.response.data;
        } else if (error.request) {
            // API target mati atau tidak merespons sama sekali
            errorMsg = 'API Target Offline atau tidak merespons request Vercel.';
        }

        return res.json({
            status: 'error',
            message: errorMsg,
            data: errorData,
            limit_remaining: MAX_LIMIT - userLimits[userIp].count
        });
    }
});

module.exports = app;
