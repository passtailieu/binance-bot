const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const Binance = require('binance-api-node').default;

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

let client;
let positions = [];

app.post('/start-bot', async (req, res) => {
  const {
    apiKey, apiSecret, symbol, quantity,
    slPoints, tpPoints, trailingStart, trailingStep
  } = req.body;

  client = Binance({ apiKey, apiSecret });
  positions = [];

  for (let i = 0; i < 3; i++) {
    const market = await client.futuresMarketBuy(symbol, quantity);
    const entry = parseFloat(market.avgFillPrice || market.fills[0].price);
    const sl = entry - slPoints;
    const tp = entry + tpPoints;
    positions.push({ entry, sl, tp, qty: quantity, active: true });
  }

  res.json({ message: 'Bot started', positions });

  setInterval(async () => {
    const ticker = await client.futuresMarkPrice({ symbol });
    const price = parseFloat(ticker.markPrice);
    positions.forEach(pos => {
      if (!pos.active) return;
      if (price - pos.entry >= trailingStart) {
        const newSL = price - trailingStep;
        if (newSL > pos.sl) {
          console.log(`📈 Dời SL từ ${pos.sl} lên ${newSL}`);
          pos.sl = newSL;
        }
      }
    });
  }, 5000);
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Server is running');
});
