const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());

/**
 * Função utilitária para aguardar X milissegundos
 */
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Envia uma solicitação de amizade de um perfil para um alvo
 */
async function enviarSolicitacao(emissor, alvoUID) {
  const {
    uid,
    cookie,
    fb_dtsg,
    lsd,
    jazoest
  } = emissor;

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0',
    'Accept': '*/*',
    'Origin': 'https://www.facebook.com',
    'Referer': 'https://www.facebook.com/',
    'X-FB-Friendly-Name': 'FriendingCometFriendRequestSendMutation',
    'X-FB-LSD': lsd,
    'Cookie': cookie
  };

  const payload = new URLSearchParams({
    fb_dtsg,
    jazoest,
    doc_id: '24682827627988124',
    variables: JSON.stringify({
      input: {
        click_correlation_id: Date.now().toString(),
        click_proof_validation_result: '{"validated":true}',
        friend_requestee_ids: [alvoUID],
        friending_channel: 'PROFILE_BUTTON',
        warn_ack_for_ids: [],
        actor_id: uid,
        client_mutation_id: '1'
      },
      scale: 1
    }),
    server_timestamps: true
  });

  try {
    const response = await axios.post(
      'https://www.facebook.com/api/graphql/',
      payload.toString(),
      { headers }
    );

    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message
    };
  }
}

/**
 * Rota principal para envio de solicitações
 */
app.post('/api/send-requests', async (req, res) => {
  const { emissores, alvos } = req.body;

  if (!emissores || !alvos || !Array.isArray(emissores) || !Array.isArray(alvos)) {
    return res.status(400).json({ error: 'Dados inválidos. Envie "emissores" e "alvos" como arrays.' });
  }

  const logs = [];

  for (let alvo of alvos) {
    for (let emissor of emissores) {
      const logPrefix = `[${new Date().toISOString()}] Emissor: ${emissor.uid} → Alvo: ${alvo}`;

      const resultado = await enviarSolicitacao(emissor, alvo);

      if (resultado.success) {
        logs.push(`${logPrefix} ✅ SUCESSO`);
        console.log(`${logPrefix} ✅ SUCESSO`);
      } else {
        logs.push(`${logPrefix} ❌ ERRO: ${JSON.stringify(resultado.error).slice(0, 300)}`);
        console.error(`${logPrefix} ❌ ERRO:`, resultado.error);
      }

      // Espera aleatória entre 2s e 4s
      const espera = Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000;
      await delay(espera);
    }
  }

  return res.json({ status: 'finalizado', total: logs.length, logs });
});

module.exports = app;
