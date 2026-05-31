const BASE_URL = 'https://api.helius.xyz/v0';

function getApiKey(): string | undefined {
  return process.env.HELIUS_API_KEY;
}

function getWebhookId(): string | undefined {
  return process.env.HELIUS_WEBHOOK_ID;
}

/**
 * Add a wallet address to the Helius webhook's monitored addresses.
 */
export async function addWalletToWebhook(address: string): Promise<void> {
  const apiKey = getApiKey();
  const webhookId = getWebhookId();

  if (!apiKey || !webhookId) {
    console.warn('Helius webhook not configured: missing HELIUS_API_KEY or HELIUS_WEBHOOK_ID');
    return;
  }

  try {
    // 1. Get current webhook config
    const getRes = await fetch(`${BASE_URL}/webhooks/${webhookId}?api-key=${apiKey}`);

    if (!getRes.ok) {
      console.error('Failed to fetch Helius webhook:', await getRes.text());
      return;
    }

    const webhook: any = await getRes.json();
    const currentAddresses: string[] = webhook.accountAddresses || [];

    // Skip if already monitored
    if (currentAddresses.includes(address)) {
      return;
    }

    // 2. Append new address
    const updatedAddresses = [...currentAddresses, address];

    const patchRes = await fetch(
      `${BASE_URL}/webhooks/${webhookId}?api-key=${apiKey}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountAddresses: updatedAddresses,
          webhookURL: webhook.webhookURL,
          webhookType: webhook.webhookType,
          transactionTypes: webhook.transactionTypes,
          authHeader: webhook.authHeader,
          txnStatus: webhook.txnStatus,
        }),
      },
    );

    if (!patchRes.ok) {
      console.error('Failed to update Helius webhook:', await patchRes.text());
      return;
    }

    console.log(`Added wallet ${address} to Helius webhook`);
  } catch (error) {
    console.error('Helius webhook update error:', error);
  }
}

/**
 * Remove a wallet address from the Helius webhook's monitored addresses.
 */
export async function removeWalletFromWebhook(address: string): Promise<void> {
  const apiKey = getApiKey();
  const webhookId = getWebhookId();

  if (!apiKey || !webhookId) {
    console.warn('Helius webhook not configured');
    return;
  }

  try {
    const getRes = await fetch(`${BASE_URL}/webhooks/${webhookId}?api-key=${apiKey}`);

    if (!getRes.ok) {
      console.error('Failed to fetch Helius webhook:', await getRes.text());
      return;
    }

    const webhook: any = await getRes.json();
    const currentAddresses: string[] = webhook.accountAddresses || [];

    const updatedAddresses = currentAddresses.filter((a) => a !== address);

    if (updatedAddresses.length === currentAddresses.length) {
      return; // address not found
    }

    await fetch(
      `${BASE_URL}/webhooks/${webhookId}?api-key=${apiKey}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountAddresses: updatedAddresses,
          webhookURL: webhook.webhookURL,
          webhookType: webhook.webhookType,
          transactionTypes: webhook.transactionTypes,
          authHeader: webhook.authHeader,
          txnStatus: webhook.txnStatus,
        }),
      },
    );

    console.log(`Removed wallet ${address} from Helius webhook`);
  } catch (error) {
    console.error('Helius webhook update error:', error);
  }
}
