import { RPCResponse } from '../types';

const RONIN_RPC = 'https://api.roninchain.com/rpc';
const STAKING_CONTRACT = '0xfb597d6fa6c08f5434e6ecf69114497343ae13dd';

export async function checkStakingStatus(tokenId: string): Promise<number | null> {
  const tokenIdHex = tokenId.startsWith('0x') ? tokenId : `0x${parseInt(tokenId).toString(16)}`;
  
  const data = `0xe8b23f66${tokenIdHex.slice(2).padStart(64, '0')}`;

  const payload = {
    method: 'eth_call',
    params: [
      {
        to: STAKING_CONTRACT,
        data
      },
      'latest'
    ],
    id: Date.now(),
    jsonrpc: '2.0'
  };

  try {
    const response = await fetch(RONIN_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: RPCResponse = await response.json();

    if (data.error) {
      if (data.error.message.includes('Token not locked')) {
        return null;
      }
      throw new Error(`RPC error: ${data.error.message}`);
    }

    if (data.result) {
      return parseInt(data.result, 16);
    }

    return null;
  } catch (error) {
    console.error('Failed to check staking status:', error);
    return null;
  }
}

export async function getTokenOwner(tokenId: string): Promise<string | null> {
  const tokenIdHex = tokenId.startsWith('0x') ? tokenId : `0x${parseInt(tokenId).toString(16)}`;

  const data = `0x7a41c21c${tokenIdHex.slice(2).padStart(64, '0')}`;

  const payload = {
    method: 'eth_call',
    params: [
      {
        to: STAKING_CONTRACT,
        data
      },
      'latest'
    ],
    id: Date.now(),
    jsonrpc: '2.0'
  };

  try {
    const response = await fetch(RONIN_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: RPCResponse = await response.json();

    if (data.error) {
      console.error('RPC error fetching owner:', data.error.message);
      return null;
    }

    if (data.result) {
      return `0x${data.result.slice(26)}`.toLowerCase();
    }

    return null;
  } catch (error) {
    console.error('Failed to get token owner:', error);
    return null;
  }
}