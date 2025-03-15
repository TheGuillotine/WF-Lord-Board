import { GraphQLResponse } from '../types';

const MARKETPLACE_API = 'https://marketplace-graphql.skymavis.com/graphql';
const TOKEN_ADDRESS = '0xa1ce53b661be73bf9a5edd3f0087484f0e3e7363';

export async function fetchNFTs(size = 50, from = 0): Promise<GraphQLResponse> {
  const query = `
    query LordsOwners {
      erc721Tokens(
        from: ${from}
        size: ${size}
        tokenAddress: "${TOKEN_ADDRESS}"
      ) {
        results {
          name
          owner
          tokenId
          attributes
        }
      }
    }
  `;

  const response = await fetch(MARKETPLACE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  return await response.json();
}