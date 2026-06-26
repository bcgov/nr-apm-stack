// Shared DTO: Copy in back-end and front-end should be identical

export class VaultActorPoliciesRestDto {
  approle!: {
    [key: string]: ReadonlyArray<string>;
  };
  developer!: {
    [key: string]: ReadonlyArray<string>;
  };
}

export class VaultConfigApproleRestDto {
  // non-standard
  enabled!: boolean;
  // standard
  bind_secret_id?: boolean;
  secret_id_bound_cidrs?: string | string[];
  secret_id_num_uses?: number;
  secret_id_ttl?: number | string;
  enable_local_secret_ids?: boolean;
  token_ttl?: number | string;
  token_max_ttl?: number | string;
  token_policies?: string | string[];
  token_bound_cidrs?: string | string[];
  token_explicit_max_ttl?: number | string;
  token_no_default_policy?: boolean;
  token_num_uses?: number;
  token_period?: number | string;
  token_type?: string;
}

export class VaultPolicyOptionsRest {
  /** True if an application kv policies should be able to read project kv secrets */
  kvReadProject?: boolean;
  /** Global policies to add to every environment */
  systemPolicies?: string[];
  /** Token expiration policy. The default is daily. */
  tokenPeriod?: 'hourly' | 'bidaily' | 'daily' | 'weekly';
}

export class VaultConfigRestDto {
  /** Per-environment overrides of policies for each type of actor */
  actor?: VaultActorPoliciesRestDto;
  /** How to configure the approle for this application */
  approle?: VaultConfigApproleRestDto;
  /** This application may broker logins for all other applications */
  brokerGlobal?: boolean;
  /** Array of applications this application may login for */
  brokerFor?: string[];
  /** Array of databases this application has access to */
  db?: string[];
  /** True if this application, policies, groups will be generated. */
  enabled!: boolean;
  /** Options that alter the content of policies. */
  policyOptions?: VaultPolicyOptionsRest;
}
