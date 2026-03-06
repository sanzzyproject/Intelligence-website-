const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Memori penyimpan limit (ter-reset jika server Vercel idle/restart)
const userLimits = {};
const MAX_LIMIT = 4;

// KAMUS RAHASIA: Mapping kode dari frontend ke endpoint asli
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
    'NODE_17': { path: 'datasekolah', method: 'POST' } // Menggunakan POST sesuai instruksi
};

app.post('/api/search', async (req, res) => {
    const { nodeId, query } = req.body;
    
    // Deteksi IP
    const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const today = new Date().toDateString();

    // Validasi apakah nodeId ada di kamus rahasia
    if (!endpointMap[nodeId]) {
        return res.status(400).json({ status: 'error', message: 'Target Node tidak valid.' });
    }

    if (!userLimits[userIp] || userLimits[userIp].date !== today) {
        userLimits[userIp] = { count: 0, date: today };
    }

    if (userLimits[userIp].count >= MAX_LIMIT) {
        return res.json({ 
            status: 'limit_reached', 
            message: 'Akses ditolak: Limit harian (4x) telah habis.' 
        });
    }

    try {
        const targetConfig = endpointMap[nodeId];
        const targetUrl = `http://api.adx7.com/${targetConfig.path}`;
        let response;

        // Eksekusi request dari Backend ke Target secara tersembunyi
        if (targetConfig.method === 'POST') {
            response = await axios.post(targetUrl, { query: query });
        } else {
            response = await axios.get(targetUrl, { params: { query: query } });
        }

        const responseData = response.data;

        // Cek jika data ada (bukan null, bukan array kosong, bukan object kosong)
        const isDataFound = responseData && (
            (Array.isArray(responseData) && responseData.length > 0) || 
            (typeof responseData === 'object' && Object.keys(responseData).length > 0 && !responseData.error)
        );

        if (isDataFound) {
            userLimits[userIp].count += 1; // Potong limit
            return res.json({
                status: 'success',
                data: responseData,
                limit_remaining: MAX_LIMIT - userLimits[userIp].count
            });
        } else {
            return res.json({
                status: 'not_found',
                message: 'Data tidak ditemukan. Limit Anda aman.',
                limit_remaining: MAX_LIMIT - userLimits[userIp].count
            });
        }

    } catch (error) {
        return res.json({
            status: 'error',
            message: `Koneksi ke database gagal atau target timeout. Limit Anda aman.`,
            limit_remaining: MAX_LIMIT - userLimits[userIp].count
        });
    }
});

module.exports = app;
