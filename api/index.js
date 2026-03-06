const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const userLimits = {};
const MAX_LIMIT = 4;

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
        
        // Kirim parameter yang paling umum diminta API
        const payloadParams = { query: query, q: query };
        const axiosConfig = {
            headers: { 'User-Agent': 'Mozilla/5.0 SANN404/Intel' },
            params: targetConfig.method === 'GET' ? payloadParams : {}
        };

        let response;
        if (targetConfig.method === 'POST') {
            response = await axios.post(targetUrl, payloadParams, axiosConfig);
        } else {
            response = await axios.get(targetUrl, axiosConfig);
        }

        let responseData = response.data;
        let isDataFound = true;

        // LOGIKA PENGECEKAN DATA KOSONG
        if (typeof responseData === 'string') {
            // Bersihkan spasi dan HTML untuk mengecek isi aslinya
            let cleanText = responseData.replace(/<[^>]*>?/gm, '').trim();
            // Jika isinya terlalu pendek atau hanya template "Code: ID:"
            if (cleanText.length < 20 || cleanText.includes('Code:') && !cleanText.match(/[a-zA-Z0-9]{5,}/)) {
                isDataFound = false;
            }
        } else if (typeof responseData === 'object') {
            if (Object.keys(responseData).length === 0 || responseData.error) {
                isDataFound = false;
            }
        } else if (!responseData) {
            isDataFound = false;
        }

        if (isDataFound) {
            userLimits[userIp].count += 1; // POTONG LIMIT
            return res.json({
                status: 'success',
                data: responseData,
                limit_remaining: MAX_LIMIT - userLimits[userIp].count
            });
        } else {
            return res.json({
                status: 'not_found',
                message: 'Data tidak ditemukan di database target.',
                data: responseData, // Tetap kirimkan datanya untuk ditampilkan
                limit_remaining: MAX_LIMIT - userLimits[userIp].count // LIMIT TIDAK DIPOTONG
            });
        }

    } catch (error) {
        return res.json({
            status: 'error',
            message: 'Koneksi ke server target gagal (Timeout/Offline).',
            limit_remaining: MAX_LIMIT - userLimits[userIp].count
        });
    }
});

module.exports = app;
