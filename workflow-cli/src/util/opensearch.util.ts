import {
  DescribeElasticsearchDomainCommand,
  DescribeElasticsearchDomainCommandOutput,
  ElasticsearchServiceClient,
} from '@aws-sdk/client-elasticsearch-service';

export async function describeDomain(
  client: ElasticsearchServiceClient,
  domainName: string,
): Promise<DescribeElasticsearchDomainCommandOutput | null> {
  const cmdParams = { DomainName: domainName };
  const cmd = new DescribeElasticsearchDomainCommand(cmdParams);
  try {
    return await client.send(cmd);
  } catch (error) {
    if ((error as any).name === 'ResourceNotFoundException') {
      return null;
    }
    if (
      (error as any).errno === 'ENOTFOUND' &&
      (error as any).syscall === 'getaddrinfo'
    ) {
      return describeDomain(client, domainName);
    }
    console.dir(error, { depth: 5 });
  }
  return null;
}

export async function waitForDomainStatusReady(
  client: ElasticsearchServiceClient,
  domainName: string,
): Promise<DescribeElasticsearchDomainCommandOutput> {
  let cmdOutput = await describeDomain(client, domainName);
  while (
    cmdOutput?.DomainStatus?.Processing === true ||
    !cmdOutput?.DomainStatus?.Endpoint
  ) {
    await new Promise((r) => setTimeout(r, 5000));
    console.dir(cmdOutput);
    cmdOutput = await describeDomain(client, domainName);
  }
  return cmdOutput;
}
