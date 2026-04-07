import { createPublicClient, http, formatUnits } from 'viem';
  import { worldchain } from 'viem/chains';

  const WLD_CONTRACT = '0x2cFc85d8E48F8EAB294be644d9E25C3030863003' as const;
  const USDC_CONTRACT = '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1' as const;

  const ERC20_ABI = [
    {
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
    },
  ] as const;

  const publicClient = createPublicClient({
    chain: worldchain,
    transport: http('https://worldchain-mainnet.g.alchemy.com/public'),
  });

  export async function getWldBalance(wallet: string): Promise<number> {
    const raw = await publicClient.readContract({
      address: WLD_CONTRACT,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [wallet as `0x${string}`],
    });
    return parseFloat(formatUnits(raw, 18));
  }

  export async function getUsdcBalance(wallet: string): Promise<number> {
    const raw = await publicClient.readContract({
      address: USDC_CONTRACT,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [wallet as `0x${string}`],
    });
    return parseFloat(formatUnits(raw, 6));
  }

  export async function getBalances(wallet: string): Promise<{ wld: number; usdc: number }> {
    const [wld, usdc] = await Promise.all([
      getWldBalance(wallet),
      getUsdcBalance(wallet),
    ]);
    return { wld, usdc };
  }
  