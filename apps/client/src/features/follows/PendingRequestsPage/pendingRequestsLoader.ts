import { ensureAuthHydrated } from '../../../layouts/RootLayout/rootLoader.js';
import { apiFetch } from '../../../lib/api.js';

export type RequestProfileItem = {
  id: string;
  username: string;
  profilePicture: string | null;
};

export type ReceivedRequestPayload = {
  id: string;
  createdAt: string;
  sender: RequestProfileItem;
};

export type SentRequestPayload = {
  id: string;
  createdAt: string;
  receiver: RequestProfileItem;
};

export type PendingRequestsLoaderResult = {
  initialReceived: { items: ReceivedRequestPayload[]; hasMore: boolean };
  initialSent: { items: SentRequestPayload[]; hasMore: boolean };
};

export const pendingRequestsLoader =
  async (): Promise<PendingRequestsLoaderResult> => {
    await ensureAuthHydrated();

    const [receivedRes, sentRes] = await Promise.all([
      apiFetch('/follows/requests?page=1&limit=10'),
      apiFetch('/follows/requests/sent?page=1&limit=10'),
    ]);

    if (!receivedRes.ok || !sentRes.ok) {
      throw new Response('Failed to synchronize social queue registries.', {
        status: 400,
      });
    }

    const [receivedData, sentData] = await Promise.all([
      receivedRes.json(),
      sentRes.json(),
    ]);

    return {
      initialReceived: receivedData.data,
      initialSent: sentData.data,
    };
  };
