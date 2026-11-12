import 'server-only';

/**
 * Integrações externas.
 *
 * A estrutura está pronta, mas nada é enviado enquanto as credenciais não
 * forem configuradas. Nesse estado as notificações ficam registradas com
 * entrega `skipped` — a plataforma nunca registra como enviada uma mensagem
 * que não saiu de fato.
 *
 * Variáveis necessárias (ver .env.example e README):
 *   WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN  → WhatsApp Cloud API
 *   RESEND_API_KEY, RESEND_FROM_EMAIL                → envio de e-mail
 */

export function integrationsStatus() {
  return {
    whatsapp: Boolean(
      process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN,
    ),
    email: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
  };
}

export type DeliveryOutcome =
  | { status: 'sent' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string };

/** Envia uma mensagem de texto pelo WhatsApp Cloud API. */
export async function sendWhatsApp(
  to: string,
  message: string,
): Promise<DeliveryOutcome> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !token) {
    return {
      status: 'skipped',
      reason:
        'WhatsApp não configurado (WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN).',
    };
  }

  const digits = to.replace(/\D/g, '');
  const international = digits.startsWith('55') ? digits : `55${digits}`;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: international,
          type: 'text',
          text: { body: message },
        }),
      },
    );

    if (!response.ok) {
      return { status: 'failed', reason: `WhatsApp respondeu ${response.status}.` };
    }
    return { status: 'sent' };
  } catch (err) {
    return {
      status: 'failed',
      reason: err instanceof Error ? err.message : 'Falha de rede.',
    };
  }
}

/** Envia um e-mail transacional pelo Resend. */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<DeliveryOutcome> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      status: 'skipped',
      reason: 'E-mail não configurado (RESEND_API_KEY e RESEND_FROM_EMAIL).',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!response.ok) {
      return { status: 'failed', reason: `Resend respondeu ${response.status}.` };
    }
    return { status: 'sent' };
  } catch (err) {
    return {
      status: 'failed',
      reason: err instanceof Error ? err.message : 'Falha de rede.',
    };
  }
}
