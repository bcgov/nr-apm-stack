# NR APM (Application Performance and Monitoring) Stack

[NR APM (Application Performance and Monitoring) Stack](https://apm.io.nrs.gov.bc.ca/_plugin/_dashboards) allows teams to tactically respond to potential issues and strategically investigate their KPIs. It is delivered using OpenSearch hosted on AWS. OpenSearch is a open source search and analytics suite derived from Elasticsearch & Kibana.

<b>This README is for developers deploying NR APM Stack.</b>

# More Documentation

OpenSearch documentation is located here:

https://opensearch.org/docs/latest/

For end-users, our training, use cases and testimonials are located here:

https://apps.nrs.gov.bc.ca/int/confluence/x/GaRvBQ

For developers and product owners, our integration documentation is located here:

https://docs.fluentbit.io

# Getting Started

The product in deployed using Github actions. A Terraform cloud team server handles running the Terraform. A CI pipeline is setup to run static analysis of the Typescript.

## Built With

* [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service)
* [Amazon Lambda](https://aws.amazon.com/lambda/)
* [Terraform](https://www.terraform.io)
* [Terragrunt](https://terragrunt.gruntwork.io)
* [Typescript](https://www.typescriptlang.org)

Notes:

* Terraform is limited in the objects it can manage by the AWS Landing Zone permissions.
* Github holds the keycloak secrets.
* The folder `terragrunt/<env>` holds most of the environment specific configuration.

## Local Setup

If you want to run Terragrunt locally, you will need to setup a number of environment variables. Running the deployment locally is not recommended.

### AWS - Environment Variables

As documented in the [AWS CLI documentation](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html) which can be obtained from the [Cloud PathFinder login page](https://oidc.gov.bc.ca/auth/realms/umafubc9/protocol/saml/clients/amazon-aws) and clicking on "Click for Credentials" of the appropriate project/environment.

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN`
- `AWS_DEFAULT_REGION`

### Keycloak - Environment Variables

You will need a client service account with realm admin privilege.

- `KEYCLOAK_BASEURL`: The base URL ending with "/auth"
- `KEYCLOAK_REALM_NAME`
- `KEYCLOAK_CLIENT_ID`
- `KEYCLOAK_CLIENT_SECRET`

### Terraform cloud team token

You will need a terraform cloud team token, and have it setup in `~/terraform.d/credentials.tfrc.json`. The token is input using a secret for Github actions.

```
{
  "credentials": {
    "app.terraform.io": {
      "token": "<TERRAFORM TEAM TOKEN>"
    }
  }
}
```

# Principles
- Infrastructure as Code
- Configuration as Code
- GitOps:
  - Describe the entire system declaratively
  - Version the canonical desired system state in Git
  - Automatically apply approved changes to the desired state
  - Ensure correctness and alert on divergence with software agents
