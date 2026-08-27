// client.js calls axios.create() once at module load time and captures the
// response interceptor's error handler as a closure, so each test needs a
// *fresh* mock of both 'axios' and './client' — done here via
// jest.resetModules() + jest.doMock() + require(), all inside one helper,
// rather than a top-level `jest.mock('axios')` (which automocks axios's
// callable-function export incorrectly — its own .interceptors ends up
// undefined) or a top-level import (which would share one client.js
// instance, and its already-captured handler, across every test).
function loadClientWithMockInstance() {
  jest.resetModules();

  jest.doMock('axios', () => {
    const mockInstance = jest.fn(); // callable: client(originalRequest) re-issues the retried request
    mockInstance.interceptors = {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    };
    return {
      __esModule: true,
      default: {
        create: jest.fn(() => mockInstance),
        post: jest.fn(),
      },
    };
  });

  // eslint-disable-next-line global-require
  const axios = require('axios').default;
  // eslint-disable-next-line global-require
  const clientModule = require('./client');

  const instance = axios.create.mock.results[0].value;
  const [, responseErrorHandler] = instance.interceptors.response.use.mock.calls[0];

  return {
    instance,
    axios,
    responseErrorHandler,
    setSessionExpiredHandler: clientModule.setSessionExpiredHandler,
  };
}

beforeEach(() => {
  localStorage.clear();
});

test('a 401 with a valid refresh token retries the original request with a new access token', async () => {
  const { instance, axios, responseErrorHandler } = loadClientWithMockInstance();
  localStorage.setItem('refreshToken', 'valid-refresh-token');
  axios.post.mockResolvedValue({ data: { access_token: 'new-access-token' } });
  instance.mockResolvedValue({ data: 'retried-ok' });

  const originalRequest = { url: '/products', headers: {} };
  const result = await responseErrorHandler({ response: { status: 401 }, config: originalRequest });

  expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), {
    refresh_token: 'valid-refresh-token',
  });
  expect(localStorage.getItem('accessToken')).toBe('new-access-token');
  expect(instance).toHaveBeenCalledWith(expect.objectContaining({ _retried: true }));
  expect(originalRequest.headers.Authorization).toBe('Bearer new-access-token');
  expect(result).toEqual({ data: 'retried-ok' });
});

test('a 401 with no refresh token clears storage and notifies the session-expired handler', async () => {
  const { responseErrorHandler, setSessionExpiredHandler } = loadClientWithMockInstance();
  localStorage.setItem('accessToken', 'stale-access-token');
  const onSessionExpired = jest.fn();
  setSessionExpiredHandler(onSessionExpired);

  const originalRequest = { url: '/products', headers: {} };
  await expect(
    responseErrorHandler({ response: { status: 401 }, config: originalRequest })
  ).rejects.toBeTruthy();

  expect(localStorage.getItem('accessToken')).toBeNull();
  expect(onSessionExpired).toHaveBeenCalledTimes(1);
});

test('a 401 on /auth/* endpoints is not retried (avoids refreshing off a failed login itself)', async () => {
  const { instance, axios, responseErrorHandler } = loadClientWithMockInstance();
  localStorage.setItem('refreshToken', 'valid-refresh-token');

  const originalRequest = { url: '/auth/login', headers: {} };
  const originalError = { response: { status: 401 }, config: originalRequest };

  await expect(responseErrorHandler(originalError)).rejects.toBe(originalError);
  expect(axios.post).not.toHaveBeenCalled();
  expect(instance).not.toHaveBeenCalled();
});

test('a non-401 error passes through untouched', async () => {
  const { responseErrorHandler } = loadClientWithMockInstance();
  const originalError = { response: { status: 500 }, config: { url: '/products', headers: {} } };

  await expect(responseErrorHandler(originalError)).rejects.toBe(originalError);
});
