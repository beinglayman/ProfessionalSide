/**
 * PersonaBuilder - Builds CareerPersona from user data
 *
 * Extracts domain logic from controller for persona construction.
 * In Phase 3, this will integrate with CareerPersona model.
 */

import { CareerPersona } from './pipeline/types';

/**
 * Minimal user info needed to build a persona
 */
export interface UserInfo {
  id: string;
  email: string;
  name?: string | null;
}

/**
 * Connected account info (future Phase 3)
 */
export interface ConnectedAccount {
  provider: 'github' | 'jira' | 'confluence' | 'slack' | 'google' | 'figma' | 'outlook';
  accountId: string;
  login?: string;
  email?: string;
  displayName?: string;
}

/**
 * Build a CareerPersona from user info.
 *
 * Currently creates a basic persona from email/name.
 * Phase 3 will populate identities from connected accounts.
 */
export function buildPersonaFromUser(user: UserInfo): CareerPersona {
  return {
    displayName: user.name || user.email,
    emails: [user.email],
    identities: {
      // TODO: Populate from connected accounts in Phase 3
    },
  };
}

/**
 * Enrich persona with connected account identities (Phase 3)
 */
export function enrichPersonaWithAccounts(
  persona: CareerPersona,
  accounts: ConnectedAccount[]
): CareerPersona {
  const enriched = { ...persona, identities: { ...persona.identities } };

  for (const account of accounts) {
    switch (account.provider) {
      case 'github':
        enriched.identities.github = {
          login: account.login || account.accountId,
        };
        break;
      case 'jira':
        enriched.identities.jira = {
          accountId: account.accountId,
          displayName: account.displayName,
          emailAddress: account.email,
        };
        break;
      case 'confluence':
        enriched.identities.confluence = {
          accountId: account.accountId,
          publicName: account.displayName,
        };
        break;
      case 'slack':
        enriched.identities.slack = {
          userId: account.accountId,
          displayName: account.displayName,
        };
        break;
      case 'google':
        enriched.identities.google = {
          email: account.email || persona.emails[0],
        };
        break;
      case 'figma':
        enriched.identities.figma = {
          userId: account.accountId,
          email: account.email,
        };
        break;
      case 'outlook':
        enriched.identities.outlook = {
          email: account.email || persona.emails[0],
          userId: account.accountId,
        };
        break;
    }
  }

  return enriched;
}

/**
 * PersonaBuilder class for more complex use cases
 */
export class PersonaBuilder {
  private user: UserInfo;
  private accounts: ConnectedAccount[] = [];

  private constructor(user: UserInfo) {
    this.user = user;
  }

  static fromUser(user: UserInfo): PersonaBuilder {
    return new PersonaBuilder(user);
  }

  withAccount(account: ConnectedAccount): PersonaBuilder {
    this.accounts.push(account);
    return this;
  }

  withAccounts(accounts: ConnectedAccount[]): PersonaBuilder {
    this.accounts.push(...accounts);
    return this;
  }

  build(): CareerPersona {
    const base = buildPersonaFromUser(this.user);
    return this.accounts.length > 0
      ? enrichPersonaWithAccounts(base, this.accounts)
      : base;
  }
}
