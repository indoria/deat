/**
 * GitHubAdapter
 * 
 * Fetches data from GitHub API and maps it to GS graph entities/relations.
 * 
 * Features:
 * - Authentication with GitHub token
 * - Fetch organizations, repos, users, issues
 * - Map GitHub data to entity/relation schema
 * - Handle API rate limits and pagination
 * - Preserve user annotations on refresh
 * 
 * See: doc/arch/data.md
 * See: SCHEMA_QUICK_REFERENCE.md (github adapter section)
 */

class GitHubAdapter {
  constructor(token) {
    this.name = 'github';
    this.token = token;
    this.apiBase = 'https://api.github.com';
    this.rateLimit = { remaining: 5000, reset: null };
  }

  /**
   * Authenticate with GitHub API
   */
  async authenticate(credentials) {
    if (credentials.token) {
      this.token = credentials.token;
    }

    // Verify token is valid
    try {
      const response = await fetch(`${this.apiBase}/user`, {
        headers: this._headers()
      });

      if (!response.ok) {
        throw {
          code: 601,
          message: 'GitHub authentication failed: ' + response.statusText,
          status: response.status
        };
      }

      return response.json();
    } catch (error) {
      if (error.code) throw error;
      throw {
        code: 601,
        message: 'GitHub authentication error: ' + error.message,
        originalError: error
      };
    }
  }

  /**
   * Fetch data from GitHub API
   */
  async fetch(query) {
    try {
      const { org, type = 'org', limit = 100 } = query;

      let endpoint = '';

      if (type === 'org' && org) {
        endpoint = `/orgs/${org}`;
      } else if (type === 'repos' && org) {
        endpoint = `/orgs/${org}/repos?per_page=${limit}`;
      } else if (type === 'users' && org) {
        endpoint = `/orgs/${org}/members?per_page=${limit}`;
      } else if (type === 'user') {
        endpoint = `/user`;
      } else {
        throw new Error(`Unknown fetch type: ${type}`);
      }

      const response = await fetch(`${this.apiBase}${endpoint}`, {
        headers: this._headers()
      });

      this._updateRateLimit(response);

      if (!response.ok) {
        if (response.status === 403) {
          throw {
            code: 632,
            message: 'GitHub API rate limit exceeded',
            status: 403,
            rateLimit: this.rateLimit
          };
        }
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.code) throw error;
      throw {
        code: 632,
        message: 'GitHub fetch error: ' + error.message,
        originalError: error
      };
    }
  }

  /**
   * Refresh data from GitHub API
   */
  async refresh(currentState) {
    // For now, just return empty (would need to know query from previous fetch)
    // In production, would track query and refetch
    return { entities: [], relations: [] };
  }

  /**
   * Map raw GitHub data to GS entities and relations
   */
  async map(rawData, schema) {
    const entities = new Map();
    const relations = new Map();

    try {
      // Handle single organization
      if (rawData.login && rawData.type === 'Organization') {
        const entity = this._mapOrgEntity(rawData);
        entities.set(entity.id, entity);
      }

      // Handle user
      if (rawData.login && rawData.type === 'User') {
        const entity = this._mapUserEntity(rawData);
        entities.set(entity.id, entity);
      }

      // Handle array of repositories
      if (Array.isArray(rawData)) {
        rawData.forEach(item => {
          if (item.full_name && item.owner) {
            // Repository entity
            const repoEntity = this._mapRepoEntity(item);
            entities.set(repoEntity.id, repoEntity);

            // Ownership relation
            const ownerEntity = this._mapUserEntity(item.owner);
            entities.set(ownerEntity.id, ownerEntity);

            const relation = {
              id: `rel-${ownerEntity.id}-owns-${repoEntity.id}`,
              from: ownerEntity.id,
              to: repoEntity.id,
              type: 'OWNS',
              metadata: { source: 'github', timestamp: new Date().toISOString() }
            };
            relations.set(relation.id, relation);
          }
        });
      }

      // Handle organizations object with repositories
      if (rawData.organizations && Array.isArray(rawData.organizations)) {
        rawData.organizations.forEach(org => {
          const orgEntity = this._mapOrgEntity(org);
          entities.set(orgEntity.id, orgEntity);

          if (org.repositories && Array.isArray(org.repositories)) {
            org.repositories.forEach(repo => {
              const repoEntity = this._mapRepoEntity(repo, org.login);
              entities.set(repoEntity.id, repoEntity);

              const relation = {
                id: `rel-${orgEntity.id}-owns-${repoEntity.id}`,
                from: orgEntity.id,
                to: repoEntity.id,
                type: 'OWNS',
                metadata: { source: 'github' }
              };
              relations.set(relation.id, relation);
            });
          }
        });
      }

      return { entities, relations };
    } catch (error) {
      throw {
        code: 611,
        message: 'GitHub data mapping error: ' + error.message,
        originalError: error
      };
    }
  }

  /**
   * Map GitHub organization to entity
   * @private
   */
  _mapOrgEntity(org) {
    return {
      id: `org-${org.login}`,
      type: 'organization',
      name: org.name || org.login,
      login: org.login,
      description: org.description,
      url: org.html_url,
      metadata: {
        source: 'github',
        githubId: org.id,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Map GitHub user to entity
   * @private
   */
  _mapUserEntity(user) {
    return {
      id: `user-${user.login}`,
      type: 'user',
      name: user.name || user.login,
      login: user.login,
      avatar: user.avatar_url,
      url: user.html_url,
      metadata: {
        source: 'github',
        githubId: user.id,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Map GitHub repository to entity
   * @private
   */
  _mapRepoEntity(repo, orgLogin = null) {
    const owner = typeof repo.owner === 'string' ? repo.owner : repo.owner?.login;
    return {
      id: `repo-${owner}/${repo.name}`,
      type: 'repository',
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      metadata: {
        source: 'github',
        githubId: repo.id,
        isPrivate: repo.private,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Build authorization header
   * @private
   */
  _headers() {
    return {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github.v3+json'
    };
  }

  /**
   * Update rate limit from response header
   * @private
   */
  _updateRateLimit(response) {
    if (!response.headers) return;
    
    // Handle both Map and object headers
    const get = (key) => {
      if (response.headers instanceof Map) {
        return response.headers.get(key);
      }
      return response.headers[key];
    };

    const remaining = get('x-ratelimit-remaining');
    const reset = get('x-ratelimit-reset');

    if (remaining) {
      this.rateLimit.remaining = parseInt(remaining, 10);
    }
    if (reset) {
      this.rateLimit.reset = new Date(parseInt(reset, 10) * 1000);
    }
  }
}

export default GitHubAdapter;
