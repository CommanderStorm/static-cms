import { Base64 } from 'js-base64';

import API from '../API';

import type { Options } from '../API';

describe('gitea API', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    global.fetch = jest.fn().mockRejectedValue(new Error('should not call fetch inside tests'));
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mockAPI(api: API, responses: Record<string, (options: Options) => any>) {
    api.request = jest.fn().mockImplementation((path, options = {}) => {
      const normalizedPath = path.indexOf('?') !== -1 ? path.slice(0, path.indexOf('?')) : path;
      const response = responses[normalizedPath];
      return typeof response === 'function'
        ? Promise.resolve(response(options))
        : Promise.reject(new Error(`No response for path '${normalizedPath}'`));
    });
  }

  describe('request', () => {
    const fetch = jest.fn();
    beforeEach(() => {
      global.fetch = fetch;
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should fetch url with authorization header', async () => {
      const api = new API({ branch: 'gh-pages', repo: 'my-repo', token: 'token' });

      fetch.mockResolvedValue({
        text: jest.fn().mockResolvedValue('some response'),
        ok: true,
        status: 200,
        headers: { get: () => '' },
      });
      const result = await api.request('/some-path');
      expect(result).toEqual('some response');
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('https://try.gitea.io/api/v1/some-path', {
        cache: 'no-cache',
        headers: {
          Authorization: 'token token',
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    });

    it('should throw error on not ok response', async () => {
      const api = new API({ branch: 'gt-pages', repo: 'my-repo', token: 'token' });

      fetch.mockResolvedValue({
        text: jest.fn().mockResolvedValue({ message: 'some error' }),
        ok: false,
        status: 404,
        headers: { get: () => '' },
      });

      await expect(api.request('some-path')).rejects.toThrow(
        expect.objectContaining({
          message: 'some error',
          name: 'API_ERROR',
          status: 404,
          api: 'Gitea',
        }),
      );
    });

    it('should allow overriding requestHeaders to return a promise ', async () => {
      const api = new API({ branch: 'gt-pages', repo: 'my-repo', token: 'token' });

      api.requestHeaders = jest.fn().mockResolvedValue({
        Authorization: 'promise-token',
        'Content-Type': 'application/json; charset=utf-8',
      });

      fetch.mockResolvedValue({
        text: jest.fn().mockResolvedValue('some response'),
        ok: true,
        status: 200,
        headers: { get: () => '' },
      });
      const result = await api.request('/some-path');
      expect(result).toEqual('some response');
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('https://try.gitea.io/api/v1/some-path', {
        cache: 'no-cache',
        headers: {
          Authorization: 'promise-token',
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    });
  });

  describe('persistFiles', () => {
    it('should create a new file', async () => {
      const api = new API({ branch: 'master', repo: 'owner/repo' });

      const responses = {
        '/repos/owner/repo/contents/content/posts/new-post.md': () => ({
          commit: { sha: 'new-sha' },
        }),
      };
      mockAPI(api, responses);

      const entry = {
        dataFiles: [
          {
            slug: 'entry',
            sha: 'abc',
            path: 'content/posts/new-post.md',
            raw: 'content',
          },
        ],
        assets: [],
      };
      await api.persistFiles(entry.dataFiles, entry.assets, {
        commitMessage: 'commitMessage',
        newEntry: true,
      });

      expect(api.request).toHaveBeenCalledTimes(1);

      expect((api.request as jest.Mock).mock.calls[0]).toEqual([
        '/repos/owner/repo/contents/content/posts/new-post.md',
        {
          method: 'POST',
          body: JSON.stringify({
            branch: 'master',
            content: Base64.encode(entry.dataFiles[0].raw),
            message: 'commitMessage',
            signoff: false,
          }),
        },
      ]);
    });
    it('should get the file sha and update the file', async () => {
      jest.clearAllMocks();
      const api = new API({ branch: 'master', repo: 'owner/repo' });

      const responses = {
        '/repos/owner/repo/git/trees/master:content%2Fposts': () => {
          return { tree: [{ path: 'update-post.md', sha: 'old-sha' }] };
        },

        '/repos/owner/repo/contents/content/posts/update-post.md': () => {
          return { commit: { sha: 'updated-sha' } };
        },
      };
      mockAPI(api, responses);

      const entry = {
        dataFiles: [
          {
            slug: 'entry',
            sha: 'abc',
            path: 'content/posts/update-post.md',
            raw: 'content',
          },
        ],
        assets: [],
      };

      await api.persistFiles(entry.dataFiles, entry.assets, {
        commitMessage: 'commitMessage',
        newEntry: false,
      });

      expect(api.request).toHaveBeenCalledTimes(1);

      expect((api.request as jest.Mock).mock.calls[0]).toEqual([
        '/repos/owner/repo/git/trees/master:content%2Fposts',
      ]);
    });
  });

  describe('listFiles', () => {
    it('should get files by depth', async () => {
      const api = new API({ branch: 'master', repo: 'owner/repo' });

      const tree = [
        {
          path: 'post.md',
          type: 'blob',
        },
        {
          path: 'dir1',
          type: 'tree',
        },
        {
          path: 'dir1/nested-post.md',
          type: 'blob',
        },
        {
          path: 'dir1/dir2',
          type: 'tree',
        },
        {
          path: 'dir1/dir2/nested-post.md',
          type: 'blob',
        },
      ];
      api.request = jest.fn().mockResolvedValue({ tree });

      await expect(api.listFiles('posts', { depth: 1 })).resolves.toEqual([
        {
          path: 'posts/post.md',
          type: 'blob',
          name: 'post.md',
        },
      ]);
      expect(api.request).toHaveBeenCalledTimes(1);
      expect(api.request).toHaveBeenCalledWith('/repos/owner/repo/git/trees/master:posts', {
        params: {},
      });

      jest.clearAllMocks();
      await expect(api.listFiles('posts', { depth: 2 })).resolves.toEqual([
        {
          path: 'posts/post.md',
          type: 'blob',
          name: 'post.md',
        },
        {
          path: 'posts/dir1/nested-post.md',
          type: 'blob',
          name: 'nested-post.md',
        },
      ]);
      expect(api.request).toHaveBeenCalledTimes(1);
      expect(api.request).toHaveBeenCalledWith('/repos/owner/repo/git/trees/master:posts', {
        params: { recursive: 1 },
      });

      jest.clearAllMocks();
      await expect(api.listFiles('posts', { depth: 3 })).resolves.toEqual([
        {
          path: 'posts/post.md',
          type: 'blob',
          name: 'post.md',
        },
        {
          path: 'posts/dir1/nested-post.md',
          type: 'blob',
          name: 'nested-post.md',
        },
        {
          path: 'posts/dir1/dir2/nested-post.md',
          type: 'blob',
          name: 'nested-post.md',
        },
      ]);
      expect(api.request).toHaveBeenCalledTimes(1);
      expect(api.request).toHaveBeenCalledWith('/repos/owner/repo/git/trees/master:posts', {
        params: { recursive: 1 },
      });
    });
  });
});
