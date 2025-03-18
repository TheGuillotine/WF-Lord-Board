import { StakingActivity } from '../types';

const RONIN_RPC = 'https://api.roninchain.com/rpc';
const STAKING_CONTRACT = '0xfb597d6fa6c08f5434e6ecf69114497343ae13dd';

// Method signature for staking and unstaking events
const STAKE_EVENT_SIGNATURE = '0xc5ec8c8b2ed4ba4bab7c52c7a0d0bd811f1fda884c3f41693d7ca5725e3ac7f7';
const UNSTAKE_EVENT_SIGNATURE = '0xe4079ae26abd3e5f28603fab4d36af7835b5301f8c873a3e9a8fd5d7a5ea5da7';

interface LogEntry {
  address: string;
  blockNumber: string;
  data: string;
  logIndex: string;
  removed: boolean;
  topics: string[];
  transactionHash: string;
  transactionIndex: string;
}

interface RPCLogsResponse {
  jsonrpc: string;
  id: number;
  result?: LogEntry[];
  error?: {
    code: number;
    message: string;
  };
}

interface RPCBlockResponse {
  jsonrpc: string;
  id: number;
  result?: {
    timestamp: string;
    [key: string]: any;
  };
  error?: {
    code: number;
    message: string;
  };
}

export async function fetchStakingActivity(limit: number = 50, fromBlock?: number): Promise<StakingActivity[]> {
  try {
    const stakeEvents = await fetchEvents(STAKE_EVENT_SIGNATURE, limit, fromBlock);
    const unstakeEvents = await fetchEvents(UNSTAKE_EVENT_SIGNATURE, limit, fromBlock);

    // Process and combine both types of events
    const stakingActivities = await processStakeEvents(stakeEvents);
    const unstakingActivities = await processUnstakeEvents(unstakeEvents);

    // Combine and sort by timestamp (most recent first)
    const allActivities = [...stakingActivities, ...unstakingActivities]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return allActivities;
  } catch (error) {
    console.error('Failed to fetch staking activity:', error);
    return [];
  }
}

async function fetchEvents(eventSignature: string, limit: number, fromBlock?: number): Promise<LogEntry[]> {
  const payload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'eth_getLogs',
    params: [
      {
        address: STAKING_CONTRACT,
        topics: [eventSignature],
        fromBlock: fromBlock ? `0x${fromBlock.toString(16)}` : 'latest',
        toBlock: 'latest'
      }
    ]
  };

  const response = await fetch(RONIN_RPC, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data: RPCLogsResponse = await response.json();

  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  // Return the most recent events up to the limit
  return data.result ? data.result.slice(-limit) : [];
}

async function processStakeEvents(events: LogEntry[]): Promise<StakingActivity[]> {
  const activities: StakingActivity[] = [];

  for (const event of events) {
    // Extract tokenId from the second topic
    const tokenId = parseInt(event.topics[1], 16).toString();
    
    // Extract owner from the third topic
    const owner = `0x${event.topics[2].slice(26).toLowerCase()}`;

    // Get block timestamp
    const timestamp = await getBlockTimestamp(parseInt(event.blockNumber, 16));

    activities.push({
      transactionHash: event.transactionHash,
      timestamp,
      tokenId,
      owner,
      actionType: 'stake',
      blockNumber: parseInt(event.blockNumber, 16),
      attributes: {}
    });
  }

  return activities;
}

async function processUnstakeEvents(events: LogEntry[]): Promise<StakingActivity[]> {
  const activities: StakingActivity[] = [];

  for (const event of events) {
    // Extract tokenId from the second topic
    const tokenId = parseInt(event.topics[1], 16).toString();
    
    // Extract owner from the third topic
    const owner = `0x${event.topics[2].slice(26).toLowerCase()}`;

    // Get block timestamp
    const timestamp = await getBlockTimestamp(parseInt(event.blockNumber, 16));

    activities.push({
      transactionHash: event.transactionHash,
      timestamp,
      tokenId,
      owner,
      actionType: 'unstake',
      blockNumber: parseInt(event.blockNumber, 16),
      attributes: {}
    });
  }

  return activities;
}

async function getBlockTimestamp(blockNumber: number): Promise<number> {
  const payload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'eth_getBlockByNumber',
    params: [`0x${blockNumber.toString(16)}`, false]
  };

  const response = await fetch(RONIN_RPC, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data: RPCBlockResponse = await response.json();

  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  return data.result ? parseInt(data.result.timestamp, 16) : 0;
}