import { supabase } from '../supabaseClient'

export const usePayments = () => {
  const handlePayment = async (label: string, amount: number, userId: string) => {
    if (!userId) throw new Error('Usuario no autenticado')

    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        label,
        amount,
      })
      .select()
      .single()

    if (error) throw error
    return data?.id
  }

  return { handlePayment }
}
