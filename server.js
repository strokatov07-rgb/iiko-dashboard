const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('public'));

// Хранилище данных в памяти
let data = {
  orgs: {
    "Панфилова": { revenue: 0, orders: 0 },
    "Орбита":    { revenue: 0, orders: 0 },
    "Форум":     { revenue: 0, orders: 0 },
    "Атакент":   { revenue: 0, orders: 0 },
  },
  lastUpdate: null
};

// ID организаций → имена
const ORG_NAMES = {
  "6b87416f-50c1-4858-ac46-3ed4c011e914": "Панфилова",
  "f783221c-2437-4aff-ac42-c703520e52fc": "Орбита",
  "cb114b57-abd6-4a06-99b1-710072a552cc": "Форум",
  "5ba3aecc-6e9c-4460-b0bd-96b0f5a480c9": "Атакент",
};

// Webhook от iiko
app.post('/webhook', (req, res) => {
  try {
    const events = req.body;
    console.log('📨 Webhook получен:', JSON.stringify(events).slice(0, 200));

    const eventList = Array.isArray(events) ? events : [events];

    for (const event of eventList) {
      const orgId = event.organizationId;
      const orgName = ORG_NAMES[orgId];
      if (!orgName) continue;

      // Закрытый заказ / оплата
      if (event.eventType === 'DeliveryOrderStatusChanged' ||
          event.eventType === 'OrderClosed' ||
          event.eventType === 'TableOrderPaymentSaved') {

        const amount = event.order?.sum || event.sum || 0;
        if (amount > 0) {
          data.orgs[orgName].revenue += amount;
          data.orgs[orgName].orders += 1;
          data.lastUpdate = new Date().toISOString();
          console.log(`✅ ${orgName}: +${amount} ₸`);
        }
      }
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('Ошибка webhook:', e);
    res.status(500).json({ error: e.message });
  }
});

// API для дашборда
app.get('/api/stats', (req, res) => {
  res.json(data);
});

// Сброс данных в полночь
function resetDaily() {
  const now = new Date();
  const night = new Date();
  night.setHours(24, 0, 0, 0);
  const msUntilMidnight = night - now;

  setTimeout(() => {
    console.log('🔄 Сброс дневной статистики');
    for (const org of Object.keys(data.orgs)) {
      data.orgs[org] = { revenue: 0, orders: 0 };
    }
    data.lastUpdate = null;
    resetDaily(); // запланировать следующий сброс
  }, msUntilMidnight);
}

resetDaily();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
