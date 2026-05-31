// src/helius.ts
var BASE_URL = "https://api.helius.xyz/v0";
function getApiKey() {
  return process.env.HELIUS_API_KEY;
}
function getWebhookId() {
  return process.env.HELIUS_WEBHOOK_ID;
}
async function addWalletToWebhook(address) {
  const apiKey = getApiKey();
  const webhookId = getWebhookId();
  if (!apiKey || !webhookId) {
    console.warn("Helius webhook not configured: missing HELIUS_API_KEY or HELIUS_WEBHOOK_ID");
    return;
  }
  try {
    const getRes = await fetch(`${BASE_URL}/webhooks/${webhookId}?api-key=${apiKey}`);
    if (!getRes.ok) {
      console.error("Failed to fetch Helius webhook:", await getRes.text());
      return;
    }
    const webhook = await getRes.json();
    const currentAddresses = webhook.accountAddresses || [];
    if (currentAddresses.includes(address)) {
      return;
    }
    const updatedAddresses = [...currentAddresses, address];
    const patchRes = await fetch(
      `${BASE_URL}/webhooks/${webhookId}?api-key=${apiKey}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountAddresses: updatedAddresses,
          webhookURL: webhook.webhookURL,
          webhookType: webhook.webhookType,
          transactionTypes: webhook.transactionTypes,
          authHeader: webhook.authHeader,
          txnStatus: webhook.txnStatus
        })
      }
    );
    if (!patchRes.ok) {
      console.error("Failed to update Helius webhook:", await patchRes.text());
      return;
    }
    console.log(`Added wallet ${address} to Helius webhook`);
  } catch (error) {
    console.error("Helius webhook update error:", error);
  }
}
async function removeWalletFromWebhook(address) {
  const apiKey = getApiKey();
  const webhookId = getWebhookId();
  if (!apiKey || !webhookId) {
    console.warn("Helius webhook not configured");
    return;
  }
  try {
    const getRes = await fetch(`${BASE_URL}/webhooks/${webhookId}?api-key=${apiKey}`);
    if (!getRes.ok) {
      console.error("Failed to fetch Helius webhook:", await getRes.text());
      return;
    }
    const webhook = await getRes.json();
    const currentAddresses = webhook.accountAddresses || [];
    const updatedAddresses = currentAddresses.filter((a) => a !== address);
    if (updatedAddresses.length === currentAddresses.length) {
      return;
    }
    await fetch(
      `${BASE_URL}/webhooks/${webhookId}?api-key=${apiKey}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountAddresses: updatedAddresses,
          webhookURL: webhook.webhookURL,
          webhookType: webhook.webhookType,
          transactionTypes: webhook.transactionTypes,
          authHeader: webhook.authHeader,
          txnStatus: webhook.txnStatus
        })
      }
    );
    console.log(`Removed wallet ${address} from Helius webhook`);
  } catch (error) {
    console.error("Helius webhook update error:", error);
  }
}

export { addWalletToWebhook, removeWalletFromWebhook };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map