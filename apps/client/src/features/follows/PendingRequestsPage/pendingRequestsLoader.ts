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

export type ApprovedFollowerPayload = {
  requestId: string;
  id: string;
  username: string;
  profilePicture: string | null;
};

export type PendingRequestsLoaderResult = {
  initialReceived: { items: ReceivedRequestPayload[]; hasMore: boolean };
  initialSent: { items: SentRequestPayload[]; hasMore: boolean };
  initialFollowers: { items: ApprovedFollowerPayload[]; hasMore: boolean };
};

export const pendingRequestsLoader =
  async (): Promise<PendingRequestsLoaderResult> => {
    await ensureAuthHydrated();

    const [receivedRes, sentRes, followersRes] = await Promise.all([
      apiFetch('/follows/requests?page=1&limit=20'),
      apiFetch('/follows/requests/sent?page=1&limit=20'),
      apiFetch('/follows/requests/management/followers?page=1&limit=50'),
    ]);

    if (!receivedRes.ok || !sentRes.ok || !followersRes.ok) {
      throw new Response('Failed to synchronize social queue registries.', {
        status: 400,
      });
    }

    const [receivedData, sentData, followersData] = await Promise.all([
      receivedRes.json(),
      sentRes.json(),
      followersRes.json(),
    ]);

    return {
      initialReceived: receivedData.data,
      initialSent: sentData.data,
      initialFollowers: followersData.data,
    };
  };
