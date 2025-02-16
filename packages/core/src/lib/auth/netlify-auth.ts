import trim from 'lodash/trim';
import trimEnd from 'lodash/trimEnd';

import type { User, AuthenticatorConfig } from '@staticcms/core/interface';

const NETLIFY_API = 'https://api.netlify.com';
const AUTH_ENDPOINT = 'auth';

export class NetlifyError {
  private err: Error;

  constructor(err: Error) {
    this.err = err;
  }

  toString() {
    return this.err && this.err.message;
  }
}

const PROVIDERS = {
  github: {
    width: 960,
    height: 600,
  },
  gitlab: {
    width: 960,
    height: 600,
  },
  gitea: {
    width: 960,
    height: 600,
  },
  bitbucket: {
    width: 960,
    height: 500,
  },
  email: {
    width: 500,
    height: 400,
  },
} as const;

class Authenticator {
  private site_id: string | null;
  private base_url: string;
  private auth_endpoint: string;
  private authWindow: Window | null;

  constructor(config: AuthenticatorConfig = {}) {
    this.site_id = config.site_id || null;
    this.base_url = trimEnd(config.base_url, '/') || NETLIFY_API;
    this.auth_endpoint = trim(config.auth_endpoint, '/') || AUTH_ENDPOINT;
    this.authWindow = null;
  }

  handshakeCallback(
    options: { provider?: keyof typeof PROVIDERS },
    cb: (error: Error | NetlifyError | null, data?: User) => void,
  ) {
    const fn = (e: { data: string; origin: string }) => {
      if (e.data === 'authorizing:' + options.provider && e.origin === this.base_url) {
        window.removeEventListener('message', fn, false);
        window.addEventListener('message', this.authorizeCallback(options, cb), false);
        return this.authWindow?.postMessage(e.data, e.origin);
      }
    };
    return fn;
  }

  authorizeCallback(
    options: { provider?: keyof typeof PROVIDERS },
    cb: (error: Error | NetlifyError | null, data?: User) => void,
  ) {
    const fn = (e: { data: string; origin: string }) => {
      if (e.origin !== this.base_url) {
        return;
      }

      if (e.data.indexOf('authorization:' + options.provider + ':success:') === 0) {
        const data = JSON.parse(
          e.data.match(new RegExp('^authorization:' + options.provider + ':success:(.+)$'))?.[1] ??
            '',
        );
        window.removeEventListener('message', fn, false);
        this.authWindow?.close();
        cb(null, data);
      }
      if (e.data.indexOf('authorization:' + options.provider + ':error:') === 0) {
        const err = JSON.parse(
          e.data.match(new RegExp('^authorization:' + options.provider + ':error:(.+)$'))?.[1] ??
            '',
        );
        window.removeEventListener('message', fn, false);
        this.authWindow?.close();
        cb(new NetlifyError(err));
      }
    };
    return fn;
  }

  getSiteID() {
    if (this.site_id) {
      return this.site_id;
    }
    const host = document.location.host.split(':')[0];
    return host === 'localhost' ? 'cms.netlify.com' : host;
  }

  authenticate(
    options: {
      provider?: keyof typeof PROVIDERS;
      scope?: string;
      login?: boolean;
      beta_invite?: string;
      invite_code?: string;
    },
    cb: (error: Error | NetlifyError | null, data?: User) => void,
  ) {
    const { provider } = options;
    const siteID = this.getSiteID();

    if (!provider) {
      return cb(
        new NetlifyError(
          new Error('You must specify a provider when calling netlify.authenticate'),
        ),
      );
    }
    if (!siteID) {
      return cb(
        new NetlifyError(
          new Error(
            "You must set a site_id with netlify.configure({site_id: 'your-site-id'}) to make authentication work from localhost",
          ),
        ),
      );
    }

    const conf = PROVIDERS[provider] || PROVIDERS.github;
    const left = screen.width / 2 - conf.width / 2;
    const top = screen.height / 2 - conf.height / 2;
    window.addEventListener('message', this.handshakeCallback(options, cb), false);
    let url = `${this.base_url}/${this.auth_endpoint}?provider=${options.provider}&site_id=${siteID}`;
    if (options.scope) {
      url += '&scope=' + options.scope;
    }
    if (options.login === true) {
      url += '&login=true';
    }
    if (options.beta_invite) {
      url += '&beta_invite=' + options.beta_invite;
    }
    if (options.invite_code) {
      url += '&invite_code=' + options.invite_code;
    }
    this.authWindow = window.open(
      url,
      'Netlify Authorization',
      `width=${conf.width}, height=${conf.height}, top=${top}, left=${left}`,
    );
    this.authWindow?.focus();
  }

  refresh(
    options: {
      provider: keyof typeof PROVIDERS;
      refresh_token?: string;
    },
    cb?: (error: Error | NetlifyError | null, data?: User) => void,
  ) {
    const { provider, refresh_token } = options;
    const siteID = this.getSiteID();
    const onError = cb || Promise.reject.bind(Promise);

    if (!provider || !refresh_token) {
      return onError(
        new NetlifyError(
          new Error('You must specify a provider and refresh token when calling netlify.refresh'),
        ),
      );
    }
    if (!siteID) {
      return onError(
        new NetlifyError(
          new Error(
            "You must set a site_id with netlify.configure({site_id: 'your-site-id'}) to make token refresh work from localhost",
          ),
        ),
      );
    }
    const url = `${this.base_url}/${this.auth_endpoint}/refresh?provider=${provider}&site_id=${siteID}&refresh_token=${refresh_token}`;
    const refreshPromise = fetch(url, { method: 'POST', body: '' }).then(res => res.json());

    // Return a promise if a callback wasn't provided
    if (!cb) {
      return refreshPromise;
    }

    // Otherwise, use the provided callback.
    refreshPromise.then(data => cb(null, data)).catch(cb);
  }
}

export default Authenticator;
