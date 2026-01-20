import notificationQueue, { NotificationJobData } from './notification.queue';
import { getDeviceTokensForUsers, getOneSignalConfig, getFcmConfig } from './notification.service';
import OneSignal from 'onesignal-node';

async function sendViaOneSignal(data: NotificationJobData, tokens: string[]) {
  const cfg = getOneSignalConfig();
  if (!cfg.appId || !cfg.restApiKey) {
    console.warn('OneSignal not configured; skipping send');
    return { provider: 'onesignal', success: false, reason: 'Not configured' };
  }

  const client = new OneSignal.Client(cfg.appId, cfg.restApiKey);

  await client.createNotification({
    contents: { en: data.message },
    headings: { en: data.title },
    include_player_ids: tokens,
    data: data.data,
  });

  return { provider: 'onesignal', success: true };
}

async function sendViaFcm(data: NotificationJobData, tokens: string[]) {
  const cfg = getFcmConfig();
  if (!cfg.serverKey) {
    console.warn('FCM not configured; skipping send');
    return { provider: 'fcm', success: false, reason: 'Not configured' };
  }

  const url = 'https://fcm.googleapis.com/fcm/send';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${cfg.serverKey}`,
    },
    body: JSON.stringify({
      registration_ids: tokens,
      notification: {
        title: data.title,
        body: data.message,
      },
      data: data.data,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM send failed: ${res.status} ${text}`);
  }

  return { provider: 'fcm', success: true };
}

notificationQueue.process(5, async (job) => {
  const data = job.data as NotificationJobData;

  const tokens = await getDeviceTokensForUsers(data.recipientUserIds);
  const activeTokens = tokens.map((t) => t.token);

  if (activeTokens.length === 0) {
    console.warn('No device tokens found for recipients');
    return { status: 'no-tokens' };
  }

  const results: Array<{ provider: string; success: boolean; reason?: string }> = [];

  try {
    const osResult = await sendViaOneSignal(data, activeTokens);
    results.push(osResult);
  } catch (err) {
    console.error('OneSignal send failed:', err);
    results.push({ provider: 'onesignal', success: false, reason: (err as Error).message });
  }

  try {
    const fcmResult = await sendViaFcm(data, activeTokens);
    results.push(fcmResult);
  } catch (err) {
    console.error('FCM send failed:', err);
    results.push({ provider: 'fcm', success: false, reason: (err as Error).message });
    throw err; // Let Bull retry
  }

  return { status: 'sent', results };
});

process.on('SIGTERM', async () => {
  await notificationQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await notificationQueue.close();
  process.exit(0);
});

