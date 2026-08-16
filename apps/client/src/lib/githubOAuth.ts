const GITHUB_STATE_KEY = 'github_oauth_state';

export const initiateGitHubLogin = (): void => {
  const state = crypto.randomUUID();
  sessionStorage.setItem(GITHUB_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GITHUB_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/github/callback`,
    state,
    scope: 'user:email',
  });

  window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
};

export const consumeGitHubState = (): string | null => {
  const stored = sessionStorage.getItem(GITHUB_STATE_KEY);
  sessionStorage.removeItem(GITHUB_STATE_KEY);
  return stored;
};
