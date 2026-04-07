import { useState, useEffect, useCallback } from 'react';
  import { createPublicClient, http, formatUnits } from 'viem';
  import { worldchain } from 'viem/chains';
  import { useApp } from '@/context/AppContext';

  const WLD_ADDRESS = '0x2cFc85d8E48F8EAB294be644d9E25C3030863003' as const;
  const WLD_DECIMALS = 18;

  const publicClient = createPublicClient({
    chain: worldchain,
    transport: http('https://worldchain-mainnet.g.alchemy.com/public'),
  });

  export const useWldBalance = () => {
    const { walletAddress } = useApp();
    const [balance, setBalance] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBalance = useCallback(async () => {
      if (!walletAddress) {
        setBalance(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const rawBalance = await publicClient.readContract({
          address: WLD_ADDRESS,
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }],
            },
          ] as const,
          functionName: 'balanceOf',
          args: [walletAddress as `0x${string}`],
        });

        const formatted = formatUnits(rawBalance, WLD_DECIMALS);
        setBalance(formatted);
      } catch (err) {
        console.error('[useWldBalance] Error:', err);
        setError('No se pudo obtener el balance');
        setBalance(null);
      } finally {
        setLoading(false);
      }
    }, [walletAddress]);

    useEffect(() => {
      fetchBalance();
      const interval = setInterval(fetchBalance, 12000);
      return () => clearInterval(interval);
    }, [fetchBalance]);

    return { balance, loading, error, refetch: fetchBalance };
  };
  