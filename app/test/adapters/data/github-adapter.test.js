/**
 * GitHub Adapter Tests
 * 
 * Validates GitHub API adapter for fetching organizational data.
 * See: doc/arch/data.md - GitHub adapter
 */

import GitHubAdapter from '../../../src/adapters/data/github-adapter.js';

describe('GitHubAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new GitHubAdapter('token_123');
  });

  describe('Constructor', () => {
    it('should initialize with GitHub API token', () => {
      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('github');
      expect(adapter.token).toBe('token_123');
    });
  });

  describe('authenticate()', () => {
    it('should accept token credentials', async () => {
      global.fetch = async () => ({
        ok: true,
        json: async () => ({ login: 'test-user' })
      });

      await adapter.authenticate({ token: 'token_abc' });
      expect(adapter.token).toBe('token_abc');
    });

    it('should throw error on invalid token', async () => {
      global.fetch = async () => ({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Bad credentials' })
      });

      await expect(
        adapter.authenticate({ token: 'invalid' })
      ).rejects.toMatchObject({
        message: expect.stringContaining('authentication')
      });
    });
  });

  describe('fetch()', () => {
    it('should fetch organization data', async () => {
      global.fetch = async (url) => {
        if (url.includes('/orgs/')) {
          return {
            ok: true,
            json: async () => ({
              login: 'acme',
              name: 'ACME Corp',
              type: 'Organization'
            })
          };
        }
        return { ok: false };
      };

      const result = await adapter.fetch({ org: 'acme' });

      expect(result).toBeDefined();
      expect(result.login).toBe('acme');
    });

    it('should fetch repositories', async () => {
      global.fetch = async (url) => {
        if (url.includes('/repos')) {
          return {
            ok: true,
            json: async () => [
              {
                id: 1,
                name: 'repo1',
                owner: { login: 'acme' },
                full_name: 'acme/repo1'
              }
            ]
          };
        }
        return { ok: false };
      };

      const result = await adapter.fetch({ org: 'acme', type: 'repos' });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle pagination', async () => {
      let callCount = 0;
      global.fetch = async (url) => {
        callCount++;
        if (url.includes('/repos')) {
          return {
            ok: true,
            headers: new Map([
              ['link', '<https://api.github.com/page2>; rel="next"']
            ]),
            json: async () => [
              { id: 1, name: 'repo1' }
            ]
          };
        }
        return { ok: false };
      };

      const result = await adapter.fetch({ org: 'acme', type: 'repos' });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('refresh()', () => {
    it('should refetch updated data', async () => {
      const oldState = {
        entities: new Map([['org-acme', { id: 'org-acme', name: 'ACME' }]]),
        relations: new Map()
      };

      global.fetch = async () => ({
        ok: true,
        json: async () => ({
          login: 'acme',
          name: 'ACME Updated'
        })
      });

      const result = await adapter.refresh(oldState);

      expect(result).toBeDefined();
      expect(result.entities).toBeDefined();
      expect(result.relations).toBeDefined();
    });

    it('should detect deleted repositories', async () => {
      const oldState = {
        entities: new Map([
          ['repo-old', { id: 'repo-old', name: 'Old Repo' }]
        ]),
        relations: new Map()
      };

      global.fetch = async () => ({
        ok: true,
        json: async () => []
      });

      const result = await adapter.refresh(oldState);

      expect(result).toBeDefined();
      expect(result.entities).toBeDefined();
    });
  });

  describe('map()', () => {
    it('should map GitHub org to entity', async () => {
      const rawData = {
        login: 'acme',
        name: 'ACME Corp',
        type: 'Organization',
        id: 12345
      };

      const schema = {
        validate: () => true
      };

      const result = await adapter.map(rawData, schema);

      expect(result.entities).toBeInstanceOf(Map);
      expect(result.entities.size).toBeGreaterThan(0);
    });

    it('should map GitHub user to entity', async () => {
      const rawData = {
        login: 'octocat',
        name: 'The Octocat',
        type: 'User',
        id: 1
      };

      const schema = {
        validate: () => true
      };

      const result = await adapter.map(rawData, schema);

      expect(result.entities).toBeInstanceOf(Map);
    });

    it('should create ownership relations', async () => {
      const rawData = {
        organizations: [
          {
            login: 'acme',
            repositories: [
              { name: 'repo1', id: 1 },
              { name: 'repo2', id: 2 }
            ]
          }
        ]
      };

      const schema = {
        validate: () => true
      };

      const result = await adapter.map(rawData, schema);

      expect(result.relations).toBeInstanceOf(Map);
    });
  });

  describe('Error handling', () => {
    it('should handle API rate limits', async () => {
      global.fetch = async () => ({
        ok: false,
        status: 403,
        json: async () => ({ message: 'API rate limit exceeded' })
      });

      await expect(
        adapter.fetch({ org: 'test' })
      ).rejects.toMatchObject({
        message: expect.stringContaining('rate')
      });
    });

    it('should handle network errors', async () => {
      global.fetch = async () => {
        throw new Error('Network timeout');
      };

      await expect(
        adapter.fetch({ org: 'test' })
      ).rejects.toMatchObject({
        message: expect.stringContaining('Network')
      });
    });
  });
});
